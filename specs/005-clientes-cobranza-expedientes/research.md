# Research: Modelado de Datos — Clientes, Cobranza y Expedientes

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

No quedaron `NEEDS CLARIFICATION` en el Technical Context del plan (todas las decisiones técnicas usan defaults ya establecidos por el proyecto: TypeScript strict, Supabase/Postgres, Vitest). Este documento registra las decisiones de diseño de datos que sí requerían investigación/elección explícita, derivadas de la especificación y de la constitución.

## Decisión 1: Relación Pago ↔ Cargo de cobranza (muchos a muchos)

- **Decision**: Se modela con una tabla puente `cargo_pagos` (`cargo_id`, `pago_id`, `monto_aplicado`) en vez de una FK directa en `pagos.cargo_id`.
- **Rationale**: La especificación (Edge Cases + FR-006) exige que un Pago pueda cubrir varios Cargos y que un Cargo pueda recibir varios pagos parciales. Una FK simple no soporta ninguno de los dos casos. La tabla puente con `monto_aplicado` permite calcular el saldo pendiente de cada Cargo sumando los montos aplicados, sin duplicar el monto total del Pago.
- **Alternatives considered**: FK `pagos.cargo_id` única (rechazada: no soporta pago que cubre varios cargos, ni pago parcial dividido); guardar `cargos_cubiertos` como arreglo/JSON en `pagos` (rechazada: rompe integridad referencial y dificulta calcular saldos por cargo con SQL estándar).

## Decisión 2: Estado del Cargo de cobranza — calculado vs. almacenado

- **Decision**: `estado` se almacena como columna (enum `pendiente | pagado | vencido | cancelado`) y se mantiene sincronizada mediante un trigger que recalcula tras cada inserción/actualización en `cargo_pagos`, más un job/consulta que marca `vencido` cuando `fecha_vencimiento < hoy` y el saldo es mayor a cero.
- **Rationale**: SC-002 exige que el personal identifique el estado de cobranza en menos de 10 segundos — un estado almacenado e indexado permite un `WHERE estado = ...` directo, sin recalcular saldos en cada consulta de listado. El recálculo vía trigger evita inconsistencias entre el estado y los pagos reales.
- **Alternatives considered**: Calcular el estado en cada lectura con una subconsulta de suma de pagos (rechazada por rendimiento en listados grandes, y porque "vencido" depende de la fecha actual, no solo de los pagos, complicando un índice útil).

## Decisión 3: Generación automática de Recibo

- **Decision**: Un trigger `AFTER INSERT` en `cargo_pagos` (no en `pagos`) crea automáticamente el `Recibo` correspondiente la primera vez que se registra qué Cargo(s) cubre un Pago (folio autogenerado, monto = monto del pago, fecha de emisión = ahora); si el mismo Pago cubre más de un Cargo, cada fila adicional de `cargo_pagos` actualiza el Recibo ya creado en vez de generar uno nuevo.
- **Rationale**: La clarificación del feature fijó que el Recibo se genera automáticamente al registrar el Pago (no requiere acción manual). Sin embargo, en el momento de insertar la fila de `pagos` aún no se sabe qué Cargo(s) cubre — esa asociación se registra después, en una o más filas de `cargo_pagos` (ver quickstart.md Escenario 2). Un trigger en `pagos` no tendría esa información todavía; el trigger debe vivir en `cargo_pagos`, que es donde se conoce el Cargo cubierto. Hacerlo vía trigger de base de datos garantiza que ningún camino de escritura (Server Action, script, futura Edge Function) pueda cubrir un Cargo con un Pago sin que exista su Recibo, cumpliendo SC-005 (100% de pagos con recibo) sin depender de que cada capa de aplicación lo implemente correctamente.
- **Alternatives considered**: Trigger `AFTER INSERT` en `pagos` (rechazada tras detectarse en implementación: no tiene acceso a los Cargos cubiertos en ese momento, ya que `cargo_pagos` se inserta en una sentencia aparte); generarlo en la capa de servicio (Server Action) tras insertar el pago (rechazada: exige que toda ruta de escritura futura recuerde replicar la lógica; el trigger es la única garantía a nivel de dato).

## Decisión 4: Versionado de Documento de expediente

- **Decision**: Cada nueva versión de un documento crea una fila nueva en `documentos` con `version` incrementada y `documento_anterior_id` apuntando a la fila previa; la fila previa cambia su `estado` a `reemplazado` (nunca se borra). La fila "vigente" de un documento lógico es la de mayor `version` con `documento_anterior_id` encadenado, identificable por `estado = 'activo'`.
- **Rationale**: FR-013/FR-015 exigen historial de versiones sin eliminación física. Modelar cada versión como fila propia (en vez de una tabla `documento_versiones` separada) simplifica las consultas más comunes ("dame el documento vigente de esta categoría") a un simple filtro por `estado = 'activo'`, mientras el encadenamiento por `documento_anterior_id` reconstruye el historial completo cuando se necesita.
- **Alternatives considered**: Tabla `documentos` (metadato lógico, 1 por documento) + tabla `documento_versiones` (N por documento) — más normalizado, pero añade un join en la consulta más frecuente (obtener el documento vigente) a cambio de una ventaja que esta escala de datos (cientos de clientes) no requiere.

## Decisión 5: Auditoría de negocio

- **Decision**: Se crea una tabla de auditoría genérica `business_audit_log` (`entidad`, `entidad_id`, `accion`, `actor_id`, `detalle` jsonb, `creado_en`), poblada por triggers `AFTER INSERT/UPDATE/DELETE` en `clientes`, `pagos`, `documentos` y `recibos`, en vez de una tabla de auditoría por entidad.
- **Rationale**: FR-018 exige auditar cuatro tipos de evento distintos sobre cuatro entidades distintas; una tabla genérica evita crear y mantener cuatro esquemas de auditoría casi idénticos, y es consistente con el principio de evolución de la constitución (favorecer incorporación de nuevos módulos sin modificar los existentes) — nuevas entidades auditables solo añaden un trigger, no una tabla nueva.
- **Alternatives considered**: Reutilizar/extender `profile_change_history` (rechazada: esa tabla es específica del dominio de usuarios/roles de `003-supabase-auth-roles`, mezclar dominios de auditoría distintos en la misma tabla degradaría su claridad); tabla de auditoría por entidad (rechazada por duplicación de esquema).

## Decisión 6: Unicidad de RFC solo entre Clientes activos

- **Decision**: Constraint de unicidad parcial (`unique index ... where estado = 'activo'`) sobre `rfc`, en vez de `unique` global.
- **Rationale**: El Edge Case de la especificación permite reactivar o rechazar el alta de un RFC que ya perteneció a un cliente dado de baja; una unicidad parcial (solo entre activos) deja abierta la posibilidad de dar de alta un nuevo registro con el mismo RFC de uno inactivo sin violar la integridad, dejando la decisión final (reactivar vs. crear nuevo) a la capa de servicio en una fase de implementación posterior.
- **Alternatives considered**: `unique` global sobre `rfc` (rechazada: forzaría siempre "reactivar", eliminando la opción de crear un registro nuevo independiente que la especificación deja abierta).

## Decisión 7: Catálogo de Régimen Fiscal como tabla sembrada, con validación de compatibilidad y vigencia

- **Decision**: `regimenes_fiscales` es una tabla (no un enum) con columnas `codigo` (PK, texto, p. ej. `'601'`), `descripcion`, `aplica_persona_fisica` (boolean), `aplica_persona_moral` (boolean), `fecha_inicio_vigencia`, `fecha_fin_vigencia` (nullable). Se siembra en la misma migración con los 24 registros de `specs/005-clientes-cobranza-expedientes/assets/regimenes.json`. Un trigger `BEFORE INSERT OR UPDATE ON clientes` valida que el `regimen_fiscal_codigo` asignado sea compatible con `tipo_persona` (columna `aplica_persona_fisica`/`aplica_persona_moral`) y, solo para asignaciones nuevas o cambios de régimen, que esté vigente (`fecha_fin_vigencia is null or fecha_fin_vigencia >= current_date`).
- **Rationale**: Modelarlo como enum impediría añadir regímenes nuevos sin una migración de esquema (contradice "debemos poder agregar otros" del usuario); una tabla catálogo permite crecer el catálogo con solo `INSERT`s. La validación de compatibilidad/vigencia se hace en el trigger de `clientes` (no en `regimenes_fiscales`) porque la regla depende de la combinación cliente+régimen, no del régimen en sí; validar solo en la asignación (no reevaluar retroactivamente cuando un régimen vence) preserva los clientes que ya lo tenían asignado, tal como se aclaró en el Clarifications de la spec.
- **Alternatives considered**: Enum `regimen_fiscal` (rechazado: no extensible sin migración); validar la compatibilidad/vigencia únicamente en la capa de aplicación (rechazado: el proyecto exige "nunca confiar únicamente en validaciones del frontend"; un trigger garantiza la regla sin importar la vía de escritura).

## Decisión 8: Catálogo de Método de Pago sustituye al enum `metodo_pago`

- **Decision**: Se reemplaza el enum `metodo_pago` (definido en la versión anterior de este research) por una tabla `metodos_pago` (`id`, `nombre`, `activo`, trazabilidad), gobernada exactamente igual que `categorias_documento` (solo Administrador puede escribir). `pagos.metodo_pago_id` pasa a ser FK en vez de un valor de enum. Se siembra con: `efectivo`, `cheque`, `saldo`, `deposito`, `transferencia`, `banco`.
- **Rationale**: La clarificación del usuario pidió explícitamente un catálogo editable desde el Administrador, no una lista fija en código — un enum de Postgres no puede desactivarse ni editarse sin una migración, mientras que una tabla catálogo sí.
- **Alternatives considered**: Mantener el enum y agregar los valores nuevos (`cheque`, `saldo`, `deposito`, `banco`) en vez de `tarjeta`/`otro` (rechazado: no cumple con "editable desde el administrador"; cualquier valor futuro seguiría requiriendo una migración de esquema).

## Decisión 9: Concepto del Recibo como snapshot inmutable, no como consulta en vivo

- **Decision**: `recibos.concepto` es una columna de texto poblada por el mismo trigger `AFTER INSERT ON cargo_pagos` que genera/actualiza el recibo (Decisión 3): concatena (separados por `; `) el `concepto` de cada `cargos_cobranza` cubierto por ese pago, a medida que se van registrando sus filas de `cargo_pagos`. No se vuelve a tocar después.
- **Rationale**: Confirmado explícitamente por el usuario en la clarificación — un recibo ya emitido no debe cambiar si el concepto del cargo original se edita después (relevante para un documento fiscal exportable a PDF y sujeto a auditoría). Guardar el snapshot en el propio trigger que ya genera el recibo evita una segunda pieza de lógica que alguien podría olvidar mantener sincronizada.
- **Alternatives considered**: Calcular el concepto en el momento de exportar el PDF vía join a través de `cargo_pagos` (rechazado explícitamente por el usuario: un recibo debe conservar el texto que mostraba al emitirse, no reflejar ediciones posteriores del cargo).
