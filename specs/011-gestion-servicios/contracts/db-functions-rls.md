# Contract: Funciones de base de datos y RLS — Módulo de Servicios

## Tablas y RLS

### `public.servicios`

| Política                           | Regla                                                                                                                                                                                           |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `servicios_select_all_staff`       | `SELECT` para cualquier usuario autenticado activo (mismo patrón que `regimenes_fiscales_select_all_staff`, `005`) — necesario para poblar el selector de servicios al agregar uno a un cliente |
| `servicios_insert_manage_catalogs` | `INSERT` solo si `has_capability('manage_catalogs')`                                                                                                                                            |
| `servicios_update_manage_catalogs` | `UPDATE` solo si `has_capability('manage_catalogs')` (incluye editar y activar/desactivar)                                                                                                      |

Sin política de `DELETE` — nunca se elimina físicamente (Constitución).

### `public.servicios_contratados`

| Política                                      | Regla                                                                                                 |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `servicios_contratados_select_view_clients`   | `SELECT` solo si `has_capability('view_clients')`                                                     |
| `servicios_contratados_insert_manage_clients` | `INSERT` solo si `has_capability('manage_clients')`                                                   |
| `servicios_contratados_update_manage_clients` | `UPDATE` solo si `has_capability('manage_clients')` (cambiar precio, suspender, reactivar, finalizar) |

Sin política de `DELETE` — nunca se elimina físicamente (Constitución).

## Constraints

- `servicios_contratados`: `UNIQUE (cliente_id, servicio_id)` — garantiza FR-005/Clarifications Q1 a nivel de base de datos, no solo en la capa de Server Actions.
- `servicios_contratados.servicio_id` y `.cliente_id`: `FOREIGN KEY` hacia `servicios.id` y `clientes.id` respectivamente, sin `ON DELETE CASCADE` (ningún registro se elimina físicamente).

## Triggers

### `trg_servicios_audit_fn()` (sobre `servicios`)

Reutiliza `log_business_audit('servicio', NEW.id, accion, detalle)` — `AFTER INSERT` → `accion = 'alta'`; `AFTER UPDATE` → `accion = 'edicion'`, salvo que el único cambio sea `estado`, en cuyo caso `accion = 'activacion'` o `'desactivacion'` según el nuevo valor.

### `trg_servicios_contratados_audit_fn()` (sobre `servicios_contratados`)

Reutiliza `log_business_audit('servicio_contratado', NEW.id, accion, detalle)` (research.md #6):

| Condición                                                                                                | `accion`          | `detalle`                           |
| -------------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------- |
| `AFTER INSERT`                                                                                           | `'alta'`          | Registro completo (`to_jsonb(NEW)`) |
| `AFTER UPDATE`, `OLD.precio_acordado <> NEW.precio_acordado`                                             | `'cambio_precio'` | `{precio_anterior, precio_nuevo}`   |
| `AFTER UPDATE`, `OLD.estado <> NEW.estado` y `NEW.estado = 'suspendido'`                                 | `'suspension'`    | —                                   |
| `AFTER UPDATE`, `OLD.estado <> NEW.estado` y `NEW.estado = 'finalizado'`                                 | `'finalizacion'`  | `{fecha_fin}`                       |
| `AFTER UPDATE`, `OLD.estado <> NEW.estado` y `NEW.estado = 'activo'` (desde `suspendido` o `finalizado`) | `'reactivacion'`  | —                                   |
| `AFTER UPDATE`, cualquier otro cambio (observaciones, etc.)                                              | `'edicion'`       | `{before, after}`                   |

Si un mismo `UPDATE` cambia tanto `precio_acordado` como `estado` a la vez, se registran dos eventos de auditoría (uno por cada tipo de cambio), para que el historial (Historia 5) no oculte ninguno de los dos.

### `trg_servicios_contratados_validar_servicio_activo()`

`BEFORE INSERT` — valida que `servicio_id` referencie un servicio en estado `activo` en el catálogo (FR-004); mismo patrón que `validar_regimen_fiscal_cliente()` (`005`). No se re-valida en `UPDATE` (un servicio desactivado después no afecta los servicios contratados que ya lo referencian — FR-012, Edge Cases).

## Server Actions (contrato funcional, sin detalle de implementación)

| Acción                                                                                        | Entrada                                                                | Salida                    | Regla                                                                                                                                        |
| --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `createServicio`                                                                              | nombre, descripción, categoría, observaciones                          | `{error: string \| null}` | Requiere `manage_catalogs`                                                                                                                   |
| `updateServicio`                                                                              | id, campos editables                                                   | `{error: string \| null}` | Requiere `manage_catalogs`                                                                                                                   |
| `setServicioEstado`                                                                           | id, nuevo estado (activo/inactivo)                                     | `{error: string \| null}` | Requiere `manage_catalogs`                                                                                                                   |
| `agregarServicioContratado`                                                                   | clienteId, servicioId, precio acordado, fecha de inicio, observaciones | `{error: string \| null}` | Requiere `manage_clients`; rechaza si ya existe un servicio contratado para esa combinación (FR-005) con un mensaje que dirige a "Reactivar" |
| `cambiarPrecioServicioContratado`                                                             | servicioContratadoId, nuevo precio                                     | `{error: string \| null}` | Requiere `manage_clients`; no retroactivo (FR-006)                                                                                           |
| `suspenderServicioContratado` / `reactivarServicioContratado` / `finalizarServicioContratado` | servicioContratadoId                                                   | `{error: string \| null}` | Requiere `manage_clients`; mismo registro siempre (Clarifications Q1)                                                                        |

**Garantía**: el mensaje de error de `agregarServicioContratado` ante una duplicación (FR-005) sigue el mismo patrón ya establecido de mensajes genéricos y accionables (`mapearErrorClienteAMensaje`/`mapearErrorContactoAMensaje`, `005`/`008`) — nunca un mensaje crudo de Postgres.
