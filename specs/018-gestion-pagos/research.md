# Phase 0 Research: Gestión de Pagos

## Decisión 1 — Extender `pagos` (017), no reemplazar

**Decisión**: Agregar a la tabla `pagos` ya construida en 017 una columna `estado` (enum `pago_estado`: `activo` | `revertido` | `eliminado`, default `activo`) y una columna `motivo_reversion` (nullable), en vez de crear una tabla nueva o reemplazar la existente.

**Rationale**: A diferencia de 017 (que reemplazó `cargos_cobranza`/`cargo_pagos` de 005 porque no había UI ni datos de producción), `pagos` ya tiene UI, RLS y datos reales tras 017. 018 solo necesita añadir un ciclo de vida de estado sobre lo ya existente — un caso claro de extensión aditiva, el patrón seguido en 013-016.

**Alternatives considered**: Tabla `pago_estados` separada tipo historial — rechazada por sobre-ingeniería; FR-009 solo exige que el estado actual sea consultable y que las transiciones queden en auditoría (ya cubierto por `business_audit_log`), no un historial de estados como entidad de negocio propia.

## Decisión 2 — Estados terminales vía trigger, mismo patrón que `validar_transicion_cobranza` (017)

**Decisión**: Un trigger `BEFORE UPDATE` en `pagos` bloquea cualquier cambio de estado una vez que este es `revertido` o `eliminado` (FR-009): no puede volver a `activo` ni transicionar entre sí. Los únicos cambios de estado permitidos son `activo → revertido` (exige `motivo_reversion` no nulo) y `activo → eliminado`.

**Rationale**: Mismo patrón exacto de estado terminal ya usado en `cobranzas.estado` (017) — reutilizar la forma en vez de inventar una nueva.

**Alternatives considered**: Enforzar solo en la capa de Server Action (TypeScript) — rechazado porque la Constitución exige "nunca confiar únicamente en validaciones del frontend" y todo el resto del sistema aplica estas reglas también a nivel de base de datos.

## Decisión 3 — Un solo trigger de auditoría distingue modificación / eliminación lógica / reversión

**Decisión**: Redefinir `trg_pagos_audit_fn()` (existente desde 005) para que, en `UPDATE`, inspeccione la transición de `estado`:

- `activo → eliminado` → evento `eliminacion_logica`.
- `activo → revertido` → evento `reversion`, payload incluye `motivo_reversion`.
- Sin cambio de `estado` → evento `modificacion`, payload `{"campos": {"<campo>": {"antes": ..., "despues": ...}}}` incluyendo únicamente los campos de negocio que realmente cambiaron (`monto`, `fecha_pago`, `metodo_pago_id`, `comentario`) — satisface FR-005/FR-012 (campo, valor anterior, valor nuevo) sin introducir una tabla de auditoría paralela.

**Rationale**: Mismo mecanismo (`log_business_audit`) y misma forma (un evento por `UPDATE`, distinguido por tipo de transición) que ya usan `trg_cobranzas_audit_fn` y `trg_cargos_extraordinarios_audit_fn` (017).

**Alternatives considered**: Un evento de auditoría por cada campo modificado — rechazado, ningún trigger existente en el proyecto lo hace así y complicaría la consulta del historial sin beneficio real (el payload jsonb ya distingue cada campo).

## Decisión 4 — Revalidación de saldo en `UPDATE`, reutilizando la lógica de `validar_pago_cobranza`

**Decisión**: Extender el trigger `validar_pago_cobranza()` (o uno hermano `BEFORE UPDATE`) para que, al modificar `monto` de un pago activo, vuelva a validar que la suma de pagos activos de la cobranza (excluyendo el monto anterior de este mismo pago, incluyendo el nuevo) no exceda el total de conceptos — mismo mensaje de error ya usado por el registro de pagos nuevos ("El pago excede el saldo pendiente de la cobranza"), reutilizado por `mapearErrorPagoCobranzaAMensaje` sin cambios.

**Rationale**: FR-004 lo exige explícitamente ("la modificación del monto deberá volver a validar las reglas de saldo"); reutilizar el mismo mensaje evita duplicar el mapeo de errores en la UI.

**Alternatives considered**: Ninguna — es la única forma consistente con la regla ya vigente para inserciones.

## Decisión 5 — `cobranzas_resumen` y `validar_pago_cobranza` deben filtrar por `estado = 'activo'`

**Decisión**: La subconsulta de `total_pagado` en la vista `cobranzas_resumen` y la de saldo dentro de `validar_pago_cobranza()` deben agregar únicamente `pagos` con `estado = 'activo'` — actualmente ambas suman todos los pagos sin filtrar, lo cual era correcto en 017 (no existía otro estado) pero deja de serlo en cuanto `pagos` gana estados `revertido`/`eliminado`.

**Rationale**: FR-016 lo exige explícitamente ("el cálculo del importe pagado y del saldo pendiente... MUST considerar únicamente los pagos en estado Activo"). Es un ajuste obligatorio, no opcional, para que 017 seguir siendo correcto tras 018.

**Alternatives considered**: Ninguna — sin este ajuste, un pago revertido o eliminado seguiría contando en el saldo, contradiciendo directamente FR-016/FR-006/FR-007.

## Decisión 6 — Nueva tabla `comprobantes_pago` + bucket de Storage dedicado

**Decisión**: Tabla nueva `comprobantes_pago` (`id, pago_id, nombre_original, tipo_archivo, tamano_bytes, ruta_almacenamiento, created_at, created_by`), sin política de `UPDATE` (metadata inmutable, mismo patrón que `conceptos_cobranza` en 017). Bucket privado de Storage `comprobantes-pago` (no reutiliza el bucket `expedientes` de 016, que está gateado por `view_documents`/`manage_documents` — un dominio de capacidades distinto al de Cobranza).

**Rationale**: Los comprobantes de pago son un dominio de negocio distinto a los documentos del expediente fiscal (016); reutilizar ese bucket obligaría a mezclar capacidades (`view_documents` vs `view_billing`) sin ninguna ventaja. Un bucket propio gateado por `view_billing`/`manage_billing` mantiene el mismo mecanismo de RLS de Storage ya usado en 016 (policies sobre `storage.objects` filtradas por `bucket_id`).

**Alternatives considered**: Reutilizar el bucket `expedientes` — rechazado por la razón anterior. Guardar el archivo como `bytea` en la base de datos — rechazado, la Constitución especifica "Storage de Supabase" como mecanismo de archivos, no la base de datos.

## Decisión 7 — Eliminación de un comprobante: `DELETE` físico + trigger de auditoría en la tabla, borrado de Storage desde el Server Action

**Decisión**: Eliminar un comprobante es un `DELETE` físico de la fila en `comprobantes_pago` (no un soft delete — no hay razón de negocio para conservar metadata de un archivo que ya no existe) con un trigger `AFTER DELETE` que registra el evento en auditoría (mismo patrón que la eliminación de `cargos_extraordinarios` pendientes en 017). El Server Action correspondiente primero borra el objeto del bucket vía `supabase.storage.from('comprobantes-pago').remove([ruta])`, y solo si eso tiene éxito ejecuta el `DELETE` de la fila.

**Rationale**: FR-012 exige remoción física del archivo del almacenamiento — no hay forma de "soft-delete" un archivo real sin dejar basura ocupando espacio; el registro del evento (qué archivo, qué pago, quién, cuándo) vive en `business_audit_log`, que sí es permanente, cumpliendo el espíritu de "nunca eliminar sin autorización explícita" de la Constitución mediante el gate de capacidad (`manage_billing`) más el rastro de auditoría.

**Alternatives considered**: Marcar el comprobante como eliminado sin borrar el archivo — rechazado, contradice FR-012 explícitamente ("la eliminación del comprobante deberá eliminar físicamente el archivo").

## Decisión 8 — Vista global de pagos: página nueva en `apps/portal`, mismo patrón de filtros que `/cobranza`

**Decisión**: Nueva ruta `apps/portal/src/app/(app)/pagos/page.tsx`, Server Component que aplica `requireCapability('view_billing')`, consulta `pagos` unido a `cobranzas`/`clientes`/`metodos_pago`/`profiles` (usuario que registró), y filtra/pagina combinando los `searchParams` (cliente, RFC, fecha de pago inicial/final, método, estado, cobranza, usuario) igual que `apps/portal/.../cobranza/page.tsx` ya hace con sus propios filtros.

**Rationale**: Mismo patrón ya validado en 015/017 para bandejas filtrables; no requiere un mecanismo nuevo de paginación/filtrado.

**Alternatives considered**: Extender `/cobranza` con una pestaña — rechazado, FR-017 pide explícitamente una vista "independiente... sin necesidad de acceder previamente a una cobranza".

## Decisión 9 — Nueva entrada de navegación "Pagos"

**Decisión**: A diferencia de 015/016/017 (que activaron placeholders de navegación ya reservados desde 004), 018 agrega una entrada de menú genuinamente nueva ("Pagos", `/pagos`, `view_billing`) — no existe un placeholder previo para la vista global de pagos.

**Rationale**: 004-portal-main-layout nunca previó una vista de pagos independiente de Cobranza; es la primera vez en el proyecto que se añade una entrada de menú sin un placeholder pre-reservado.

**Alternatives considered**: Ninguna — es simplemente el primer caso de este tipo, documentado para que quede explícito en el historial de decisiones del proyecto.

## Decisión 10 — Sin cambios a `validar_transicion_cobranza` ni a `generar_recibo_pago` (Clarifications)

**Decisión**: La regla de 017 de que una cobranza con pagos nunca puede eliminarse (solo cancelarse/anularse) permanece sin cambios; tampoco se toca el trigger que genera automáticamente un `recibo` por cada `pago` insertado. Ambos puntos fueron resueltos explícitamente en las Clarifications del spec.

**Rationale**: Ya decidido con el usuario durante `/speckit-specify`; no requiere investigación adicional.

## Decisión 11 — Los `recibos` ya emitidos no se sincronizan cuando su pago origen se modifica, revierte o elimina

**Decisión**: Un `recibo` generado al insertar un pago conserva su `monto`/`concepto` originales aunque el pago que lo originó se modifique, revierta o elimine después — no hay trigger que actualice o elimine el recibo en cascada.

**Rationale**: El spec de 018 no menciona sincronizar recibos ante estas operaciones; es consistente con la filosofía de "montos congelados" ya establecida en 017 (Decisión 6: los conceptos de cobranza se congelan al incorporarse). Un recibo es, por naturaleza, una constancia de un momento dado — igual que una cobranza cancelada conserva su historial completo (017, FR-020), un recibo emitido sobre un pago que después se revierte sigue siendo evidencia de que ese pago existió y fue documentado en su momento.

**Alternatives considered**: Marcar el recibo como inválido/revertido en cascada — fuera de alcance de este spec (no hay ningún FR que lo pida); se deja como posible trabajo futuro del módulo "Recibos de Pago" mencionado en la sección de Consideraciones Futuras del documento fuente.

## Decisión 12 — Permisos: reutilizar `manage_billing`/`view_billing`, sin capacidades nuevas

**Decisión**: Registrar, modificar, eliminar y revertir pagos, y gestionar comprobantes, se gatean con `manage_billing` (ya asignada a Administrador y Contador); consultar (vista global, historial en cobranza) se gatea con `view_billing`/`manage_billing` (los tres roles). No se introduce ninguna capacidad granular por operación pese a que la sección 20 del documento fuente las enumera por separado.

**Rationale**: Mismo patrón seguido consistentemente en 016 (regla de antigüedad para eliminar documentos, aplicada con un trigger, no con una capacidad nueva) y 017 (configuración exclusiva de Administrador, aplicada con un chequeo de rol en el Server Action, no con una capacidad nueva) — este proyecto nunca ha introducido una capacidad granular por acción cuando la distinción podía resolverse con una regla de negocio explícita.

**Alternatives considered**: Capacidades separadas `manage_payments_modify`/`manage_payments_revert`/`manage_payments_delete`/`manage_payment_receipts` — rechazadas por romper el patrón establecido sin que el spec exija una separación de roles real (ningún FR asigna una de estas operaciones a un rol distinto de las demás).
