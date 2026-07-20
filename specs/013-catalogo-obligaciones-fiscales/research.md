# Research: Catálogo de Obligaciones Fiscales

## 1. Esquema de la tabla `obligaciones_fiscales`

**Decision**: Tabla dedicada `public.obligaciones_fiscales` (no polimórfica, heredado de FR-010 de `012`), con las columnas del contrato común más los atributos propios del catálogo:

| Columna           | Tipo          | Notas                                                              |
| ----------------- | ------------- | ------------------------------------------------------------------ |
| `id`              | `uuid`        | PK, `gen_random_uuid()`                                            |
| `nombre`          | `text`        | obligatorio; único solo entre registros `activo` (índice parcial)  |
| `descripcion`     | `text`        | opcional                                                           |
| `periodicidad_id` | `uuid`        | FK a `periodicidades(id)`, obligatoria                             |
| `prioridad`       | `integer`     | obligatoria; no única entre registros (FR-008)                     |
| `estado`          | enum          | `obligacion_fiscal_estado` (`activo`/`inactivo`), default `activo` |
| `created_at`      | `timestamptz` | default `now()`                                                    |
| `updated_at`      | `timestamptz` | default `now()`                                                    |
| `created_by`      | `uuid`        | FK `auth.users`, nullable                                          |
| `updated_by`      | `uuid`        | FK `auth.users`, nullable                                          |

**Rationale**: Mismo patrón de columnas que `servicios` (011) y `periodicidades` (012). `periodicidad_id` referencia `periodicidades(id)` sin restricción de estado a nivel de FK (una obligación conserva la periodicidad que tenía aunque esa periodicidad deje de estar activa en el futuro — integridad histórica, FR-005) — la regla "solo periodicidades activas" (FR-004) se valida en el momento de asignar/cambiar el valor, no como una restricción permanente del esquema.

**Alternatives considered**:

- Guardar el nombre de la periodicidad como texto libre en vez de una FK: rechazado — el spec es explícito en que la periodicidad "será seleccionada desde el catálogo Periodicidades" (FK real), no un campo de texto duplicado.

## 2. Unicidad de nombre y prioridad no única

**Decision**: Índice único parcial `obligaciones_fiscales_nombre_activo_unique` sobre `nombre` `where estado = 'activo'` — exactamente el mismo patrón que `periodicidades` (012) y `clientes` (RFC). `prioridad` no lleva ningún índice único: es un entero libre, sin restricción, tal como dispone FR-008 ("el sistema NO DEBE exigir que sea un valor único").

**Rationale**: El propio contrato de `012` (`contracts/db-functions-rls.md` sección B) ya prescribe este patrón para cualquier catálogo editable futuro — esta es la primera especificación que lo implementa concretamente.

**Alternatives considered**:

- Constraint `unique(nombre)` simple: rechazado por la misma razón que en `012` — impediría reutilizar un nombre tras inactivar el registro que lo tenía (Edge Cases del spec).
- Hacer `prioridad` única (una suerte de posición estricta en una lista): rechazado explícitamente por FR-008 — es solo un valor sugerido para consumidores futuros, no un ranking exclusivo.

## 3. Validación de periodicidad activa — en alta y en edición

**Decision**: Trigger `BEFORE INSERT OR UPDATE OF periodicidad_id ON obligaciones_fiscales` que valida que `periodicidad_id` referencie una fila `activa` en `periodicidades`, análogo a `validar_servicio_activo_contratado()` (011) pero dos veces disparado: en alta (`INSERT`) y también cuando se cambia la periodicidad de una obligación ya existente (`UPDATE OF periodicidad_id`).

**Rationale**: A diferencia de `servicio_id` en `servicios_contratados` (011, donde el servicio contratado no cambia de servicio del catálogo tras su alta), el spec de esta feature permite explícitamente cambiar la periodicidad de una obligación ya existente (Historia 2, Acceptance Scenario 3: "se cambia su periodicidad... el cambio se guarda"), y FR-004 exige que la periodicidad sea siempre una activa — tanto al crear como al editar. Disparar la validación también en `UPDATE OF periodicidad_id` (y no solo en `INSERT`) es necesario para que esa regla se cumpla en todo momento, no solo en el alta.

**Alternatives considered**:

- Validar solo en el `INSERT` (como el precedente de `servicios_contratados`): rechazado — dejaría una vía para asignar una periodicidad inactiva al editar una obligación existente, violando FR-004.

## 4. Auditoría de negocio

**Decision**: Trigger `trg_obligaciones_fiscales_audit_fn()` (`AFTER INSERT/UPDATE`) que llama a `log_business_audit('obligacion_fiscal', NEW.id, accion, to_jsonb(NEW))` con `accion` = `'alta'`/`'edicion'`/`'activacion'`/`'desactivacion'` según corresponda — mismo patrón exacto que `trg_servicios_audit_fn()` (011).

**Rationale**: A diferencia de Periodicidades (protegido, sin escritura, sin eventos que auditar), Obligaciones Fiscales es un catálogo editable — igual que Servicios — y debe dejar el mismo rastro de auditoría de negocio.

## 5. Selector de periodicidad: primer uso real del patrón `Autocomplete` fuera de su propio catálogo

**Decision**: El formulario de alta/edición de una obligación usa `@mui/material/Autocomplete` para elegir la periodicidad, mostrando solo las periodicidades activas (consultadas una sola vez al cargar la página, igual que el listado de nombres que ya usa `PeriodicidadesClient.tsx` para su propio buscador). Se implementa directamente en `ObligacionesFiscalesClient.tsx`, reutilizando la misma solución ya encontrada en `012` para el conflicto de tipos entre `Autocomplete` de MUI y `exactOptionalPropertyTypes` (desestructurar `InputLabelProps`/`InputProps` de `renderInput` y pasarlos vía `slotProps` de `TextField`, en vez de hacer spread directo).

**Rationale**: Es la primera vez que el patrón de selección por Autocomplete de un catálogo (FR-007 de `012`) se usa como selector de una FK dentro de OTRA entidad, no como buscador del propio catálogo — un caso de uso distinto al de `PeriodicidadesClient.tsx`. Con solo dos usos concretos y con props/comportamiento distintos (buscador de texto libre con navegación por URL vs. selector de un valor fijo que se guarda como parte de un formulario), no se justifica todavía extraer un componente compartido `CatalogoAutocompleteField` a `packages/ui` — se documenta aquí la solución al conflicto de tipos para que no se resuelva de cero en cada nuevo consumidor, y se reconsiderará la extracción cuando exista un tercer caso real.

**Alternatives considered**:

- Un `Select` simple (lista desplegable) en vez de `Autocomplete`: rechazado — el propio catálogo de Periodicidades ya estableció el patrón de selección por escritura anticipada (FR-007 de `012`) como el estándar de UX para elegir un valor de catálogo; usar un control distinto aquí rompería la consistencia que `012` exige entre catálogos.

## 6. Ubicación en la navegación

**Decision**: Se agrega como una nueva entrada dentro de la página existente `apps/admin/src/app/(app)/catalogos/page.tsx` (el hub "Administración > Catálogos" de `012`), en una subruta `apps/admin/src/app/(app)/catalogos/obligaciones-fiscales/`. No se agrega ningún ítem nuevo en `MENU_ITEMS` (`navigation.ts`).

**Rationale**: A diferencia de Servicios (011, que ya vivía en su propia pantalla de nivel superior antes de que el hub de catálogos existiera), Obligaciones Fiscales se construye después de `012` y encaja directamente en el punto único de entrada que ese módulo ya definió (FR-012 de `012`) — es exactamente el escenario que `012` anticipó para catálogos futuros.
