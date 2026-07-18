# Data Model: Módulo de Servicios

## Servicio (catálogo)

| Campo                     | Tipo                                                            | Regla                                                                                                    |
| ------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `id`                      | uuid, PK                                                        | —                                                                                                        |
| `nombre`                  | text, requerido                                                 | Nombre del servicio (ej. "Contabilidad mensual")                                                         |
| `descripcion`             | text, opcional                                                  | —                                                                                                        |
| `categoria`               | text, requerido                                                 | Texto libre capturado al crear/editar (Clarifications, Q2) — no es un catálogo administrado por separado |
| `estado`                  | enum `servicio_estado` (`activo`, `inactivo`), default `activo` | Soft-delete vía estado — nunca eliminación física (Constitución)                                         |
| `observaciones`           | text, opcional                                                  | Observaciones internas (FR-001)                                                                          |
| `created_at`/`updated_at` | timestamptz                                                     | Trazabilidad (Constitución)                                                                              |
| `created_by`/`updated_by` | uuid → `auth.users`                                             | Trazabilidad (Constitución)                                                                              |

**Reglas de validación**:

- No almacena precio (FR-003) — el precio vive exclusivamente en `servicios_contratados`.
- Solo un servicio en estado `activo` puede asignarse a un cliente (FR-004); un servicio `inactivo` no aparece como opción para nuevas asignaciones, pero no afecta los servicios contratados que ya lo referencian (FR-012, Edge Cases).

**Transiciones de estado**: `activo` ↔ `inactivo`, sin restricciones (Historia 1, AS3 y Edge Cases — reactivar un servicio inactivo del catálogo es la misma acción "Activar").

## Servicio Contratado

| Campo                     | Tipo                                                                                       | Regla                                                                                                 |
| ------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `id`                      | uuid, PK                                                                                   | —                                                                                                     |
| `cliente_id`              | uuid → `clientes.id`, requerido                                                            | —                                                                                                     |
| `servicio_id`             | uuid → `servicios.id`, requerido                                                           | —                                                                                                     |
| `precio_acordado`         | numeric, requerido                                                                         | Precio vigente para ese cliente y ese servicio (FR-003/FR-004)                                        |
| `fecha_inicio`            | date, requerido                                                                            | Fija — no cambia al reactivar (FR-011, Edge Cases)                                                    |
| `fecha_fin`               | date, opcional                                                                             | Presente solo mientras `estado = finalizado`; se limpia al reactivar (FR-010)                         |
| `estado`                  | enum `servicio_contratado_estado` (`activo`, `suspendido`, `finalizado`), default `activo` | Libremente transicionable entre los tres valores sobre el mismo registro (Clarifications, Q1; FR-008) |
| `observaciones`           | text, opcional                                                                             | —                                                                                                     |
| `created_at`/`updated_at` | timestamptz                                                                                | Trazabilidad                                                                                          |
| `created_by`/`updated_by` | uuid → `auth.users`                                                                        | Trazabilidad                                                                                          |

**Reglas de validación**:

- Restricción `UNIQUE (cliente_id, servicio_id)` — como máximo un servicio contratado por combinación de cliente y servicio del catálogo, sin importar su estado (FR-005, Clarifications Q1). Esto reemplaza la necesidad de una regla de "unicidad solo entre vigentes": nunca hay una segunda fila que pudiera colisionar.
- Al asignar (`INSERT`), el `servicio_id` referenciado debe estar en estado `activo` en el catálogo al momento de la asignación (FR-004) — validado por trigger, mismo patrón que `validar_regimen_fiscal_cliente()` de `005`.
- Al finalizar (`estado → finalizado`), `fecha_fin` se establece a la fecha actual si no se proporcionó una explícita (FR-010).
- Al reactivar (`estado → activo` desde `suspendido` o `finalizado`), `fecha_fin` se limpia (`null`) y `fecha_inicio` NO se modifica (FR-010/FR-011).
- Un cambio de `precio_acordado` no afecta información ya generada antes del cambio — no hay ninguna referencia hacia atrás desde otros módulos en el alcance de este spec (FR-006; el futuro módulo de Cobranza es responsable de copiar el precio vigente al momento de generar un cargo, mismo principio ya usado por `recibos` en `005`, research.md Decisión 9).

**Transiciones de estado** (Clarifications, Q1 — libres en cualquier dirección):

```text
activo ⇄ suspendido
activo ⇄ finalizado
suspendido ⇄ finalizado
```

## Evento de Historial/Auditoría (`business_audit_log`, ya existente)

No es una tabla nueva — se reutiliza `business_audit_log` (`005-clientes-cobranza-expedientes`). Para este módulo:

| Campo        | Valor                                                                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `entidad`    | `'servicio'` o `'servicio_contratado'`                                                                                                                                         |
| `entidad_id` | `id` del `servicio` o `servicio_contratado` afectado                                                                                                                           |
| `accion`     | `'alta'`, `'edicion'`, `'cambio_precio'`, `'suspension'`, `'reactivacion'`, `'finalizacion'`, `'activacion'`, `'desactivacion'` según corresponda (research.md #6)             |
| `actor_id`   | Usuario autenticado que realizó la acción (`auth.uid()`, vía `log_business_audit()`)                                                                                           |
| `detalle`    | jsonb — para `cambio_precio`: `{precio_anterior, precio_nuevo}`; para otros: estado antes/después o el registro completo, según el patrón ya usado por `trg_clientes_audit_fn` |
| `creado_en`  | Fecha del evento                                                                                                                                                               |

## Relación con entidades ya existentes (sin cambios)

- **Cliente** (`005-clientes-cobranza-expedientes`): un cliente puede tener múltiples Servicios Contratados (uno por cada servicio del catálogo que haya contratado alguna vez). Este módulo no modifica el modelo de `clientes`.
- **Cobranza / Gestión Fiscal / Reportes** (fuera de alcance, `001-business-domain-model`): consultarán `servicios_contratados` (precio vigente, estado) bajo sus propias reglas — este módulo no expone una API distinta para ellos más allá de las tablas y RLS ya definidas aquí.
