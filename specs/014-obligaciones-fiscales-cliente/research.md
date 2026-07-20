# Research: Obligaciones Fiscales del Cliente

## 1. Tres tablas, no dos

**Decision**: Se modelan tres tablas: `plantillas_obligaciones` (catálogo — nombre, descripción, estado), `plantilla_obligaciones_items` (detalle: qué obligaciones trae cada plantilla, con periodicidad y orden sugeridos) y `obligaciones_fiscales_cliente` (configuración real de un cliente). No se reutiliza una sola tabla para ambos propósitos.

**Rationale**: Una plantilla y la configuración de un cliente tienen reglas de integridad distintas (FR-013 exige no duplicados dentro de una plantilla; FR-003/FR-008 exigen no duplicados y orden único dentro de un cliente) y ciclos de vida distintos (una plantilla es administrada por Administrador vía el catálogo; una fila de cliente se crea por copia o alta manual y su edición no afecta la plantilla — FR-014/FR-016). Fusionarlas en una sola tabla con una columna "pertenece a plantilla o a cliente" sería el tipo de modelo genérico que la Constitución y `012`/`013` ya rechazaron explícitamente para catálogos.

**Alternatives considered**:

- Una sola tabla `obligaciones_asignadas` con una columna polimórfica `dueño_tipo` (`plantilla`/`cliente`) y `dueño_id`: rechazada — mismo argumento de FR-010 de `012` contra modelos genéricos/polimórficos, aplicado aquí por analogía aunque esta feature no sea en sí un "catálogo administrable".

## 2. `aplicar_plantilla_obligaciones` como función de base de datos

**Decision**: La copia de una plantilla a un cliente se implementa como una función PostgreSQL `security invoker` — `aplicar_plantilla_obligaciones(p_cliente_id uuid, p_plantilla_id uuid)` — que inserta en `obligaciones_fiscales_cliente` una fila por cada ítem de la plantilla, usando `on conflict (cliente_id, obligacion_fiscal_id) do nothing` para omitir las obligaciones que el cliente ya tiene configuradas (FR-015), sin fallar la operación completa.

**Rationale**: `security invoker` (no `security definer`) hace que la función se ejecute con los permisos del usuario que la invoca — la política RLS de `insert` en `obligaciones_fiscales_cliente` (`manage_clients`) se sigue aplicando normalmente, sin necesitar una verificación de capability duplicada dentro de la función. `on conflict do nothing` sobre el índice único `(cliente_id, obligacion_fiscal_id)` es la forma más simple y atómica de cumplir FR-015 (omitir duplicados sin rechazar el resto) sin una lógica de "SELECT primero, luego INSERT selectivo" desde el Server Action.

**Alternatives considered**:

- Implementar la copia completa en el Server Action de Next.js (leer los ítems de la plantilla, filtrar los ya existentes, e insertar uno por uno): rechazada — mezcla una regla de negocio (qué copiar y qué omitir) con la capa de presentación/orquestación, contra el principio de la Constitución de mantener la lógica de negocio fuera de los componentes/acciones de UI cuando existe una operación atómica más natural a nivel de base de datos.

## 3. Eliminación física real — la primera excepción al patrón de soft-delete

**Decision**: `obligaciones_fiscales_cliente` permite `DELETE` real, pero solo cuando `estado = 'activa'` — la política RLS de `delete` incluye esa condición (`using (has_capability('manage_clients') and estado = 'activa')`), de modo que una fila `no_aplica` nunca puede eliminarse, ni siquiera con `manage_clients`.

**Rationale**: El spec distingue explícitamente "eliminar" de "marcar No aplica" como dos acciones distintas (Historia 1, AC4 vs. AC3) y el Edge Case ya resuelto establece que una obligación "No aplica" no puede eliminarse. Codificar la condición de estado directamente en la política RLS (no solo ocultando el botón en la UI) es necesario porque, a diferencia de cualquier otra tabla del sistema hasta ahora, aquí SÍ existe una vía de eliminación física real que debe protegerse a nivel de base de datos.

**Alternatives considered**:

- Prohibir el DELETE por completo y usar únicamente `estado` (como el resto del sistema): rechazada — contradice explícitamente el spec (FR-006, Historia 1 AC4), que exige una acción de eliminación distinta de "No aplica".
- Permitir DELETE sin restricción de estado (dejar que la UI decida cuándo mostrar el botón): rechazada — repetiría el error que `012`/`013` ya identificaron de no confiar únicamente en el frontend para una regla de negocio con implicaciones de integridad histórica.

## 4. Auditoría de una eliminación física

**Decision**: El trigger de auditoría de `obligaciones_fiscales_cliente` se dispara en `AFTER INSERT OR UPDATE OR DELETE`, y para el caso `DELETE` llama a `log_business_audit('obligacion_fiscal_cliente', OLD.id, 'eliminacion', to_jsonb(OLD))` — usando `OLD` en vez de `NEW`, ya que `NEW` no existe en un trigger de `DELETE`.

**Rationale**: `business_audit_log` (005) es un log de auditoría de negocio append-only, independiente de si la fila que describe sigue existiendo — por eso puede registrar la eliminación de una fila que ya no está, igual que registra cualquier otra transición de estado. Es el primer trigger de auditoría del sistema que necesita manejar `TG_OP = 'DELETE'`.

## 5. Estados con etiquetas distintas al resto del sistema

**Decision**: El enum de `obligaciones_fiscales_cliente` usa los valores `activa`/`no_aplica` (no `activo`/`inactivo` como el resto de catálogos), reflejando el lenguaje exacto del spec ("Activa"/"No aplica"). `StatusChip` (`packages/ui`) no tiene estos valores en su mapa por defecto (`STATUS_VARIANT_BY_VALUE`/`DEFAULT_LABEL_BY_VALUE` solo conocen `activo`/`inactivo`/`obsoleto`/`vencido`), así que la sección de Obligaciones Fiscales del Cliente le pasa explícitamente `variant`/`label` (`variant="positivo"`, `label="Activa"` para `activa`; `variant="neutro"`, `label="No aplica"` para `no_aplica`) en vez de depender del mapeo por defecto.

**Rationale**: `StatusChip` ya está diseñado para aceptar overrides explícitos precisamente para este caso — dominios cuyo vocabulario de estado no coincide textualmente con Activo/Inactivo (FR-004 del spec usa "Activa"/"No aplica", no "Activo"/"Inactivo"), sin necesitar ampliar el mapa por defecto del componente compartido para un vocabulario específico de un solo módulo.

## 6. Ubicación de la sección "Obligaciones Fiscales" del cliente

**Decision**: Se agrega como una nueva sección `Paper` dentro de `ClienteDetalleClient.tsx` (packages/ui), entre "Servicios" e "Historial" (siguiendo el orden de la maqueta de la descripción de origen), disponible en ambas apps (`admin`, `portal`) — mismo patrón exacto que la sección "Servicios" agregada en `011`.

**Rationale**: `ClienteDetalleClient.tsx` ya es un componente compartido con secciones apiladas (no pestañas reales — ver Assumptions de spec.md); agregar una sección más sigue el patrón establecido sin introducir una reestructuración de navegación de toda la pantalla.

## 7. Plantillas de Obligaciones: mismo patrón de catálogo editable que `013`

**Decision**: `plantillas_obligaciones` sigue exactamente el mismo contrato que `obligaciones_fiscales` (`013`): nombre único entre activas (índice único parcial), estado Activo/Inactivo, auditoría de negocio, RLS `select` abierto a cualquier staff activo y `insert`/`update` gateados por `manage_catalogs`, sin política de `delete`. Vive como una nueva entrada en el hub "Administración > Catálogos" (`012`).

**Rationale**: Es exactamente el escenario que `012` anticipó — un segundo catálogo editable real (después de Obligaciones Fiscales en `013`) que hereda el mismo contrato sin redefinirlo.

**Alternatives considered**:

- Administrar plantillas desde dentro de la vista de Cliente (ad-hoc, sin catálogo central): rechazada — contradice FR-011/FR-016 (una plantilla se administra una vez y se aplica a múltiples clientes) y el propio principio de "único punto de entrada" ya establecido por `012` para cualquier catálogo administrable.
