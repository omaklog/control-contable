# Contrato: Funciones de base de datos y políticas RLS

**Feature**: [../spec.md](../spec.md) | **Data Model**: [../data-model.md](../data-model.md)

Este contrato describe el comportamiento observable de las funciones/triggers de Postgres y las políticas RLS que la migración de esta feature debe implementar. No es código — define el contrato que la migración SQL (fase de implementación) debe cumplir, y contra el cual se validan las pruebas de integración.

## Triggers

### `trg_clientes_validar_regimen_fiscal`

- **Disparo**: `BEFORE INSERT OR UPDATE OF regimen_fiscal_codigo ON clientes`
- **Contrato**: si el `regimen_fiscal_codigo` no es compatible con `tipo_persona` (según `aplica_persona_fisica`/`aplica_persona_moral` en `regimenes_fiscales`), o si su `fecha_fin_vigencia` ya pasó, la operación DEBE fallar con un error explícito (FR-021, FR-022). Esta validación solo aplica al momento de asignar/cambiar el régimen — no se reevalúa automáticamente cuando un régimen vigente vence después para clientes que ya lo tenían asignado.

### `trg_cargos_cobranza_bloquear_cliente_inactivo`

- **Disparo**: `BEFORE INSERT ON cargos_cobranza`
- **Contrato**: si `clientes.estado` del `cliente_id` referenciado no es `'activo'`, la inserción DEBE fallar con un error explícito (FR-009).

### `trg_cargo_pagos_generar_recibo`

- **Disparo**: `AFTER INSERT ON cargo_pagos`
- **Contrato**: la primera vez que se registra una fila de `cargo_pagos` para un `pago_id` dado, DEBE crearse exactamente una fila en `recibos` con `pago_id` igual a ese pago, `folio` único autogenerado, `monto` igual al monto del pago, `cliente_id` igual al del pago, y `concepto` igual al `concepto` del `cargos_cobranza` cubierto (FR-008, FR-025, Decisión 3, Decisión 9). Si el mismo `pago_id` recibe una fila adicional de `cargo_pagos` (el pago cubre más de un Cargo), el `concepto` del recibo ya existente se actualiza anexando el nuevo concepto (separados por `; `), sin crear un segundo recibo. Nunca debe quedar un `pago` con al menos una fila en `cargo_pagos` sin `recibo` correspondiente. Una vez escrito, el `concepto` de un recibo NUNCA se recalcula a partir de ediciones posteriores al `concepto` del cargo original.

### `trg_cargo_pagos_recalcular_estado`

- **Disparo**: `AFTER INSERT OR UPDATE OR DELETE ON cargo_pagos`
- **Contrato**: tras cualquier cambio en `cargo_pagos`, el `cargos_cobranza.estado` del `cargo_id` afectado DEBE recalcularse: `pagado` si la suma de `monto_aplicado` ≥ `monto` del cargo; en caso contrario permanece `pendiente` o `vencido` según la fecha de vencimiento (FR-005, Decisión 2). Nunca reduce un cargo `cancelado` a otro estado.

### `trg_documentos_bloquear_delete`

- **Disparo**: `BEFORE DELETE ON documentos`
- **Contrato**: toda operación `DELETE` sin marcador de autorización explícita DEBE rechazarse (FR-015). El reemplazo de un documento se modela como `INSERT` de una nueva fila + `UPDATE` de `estado` a `reemplazado` en la fila anterior, nunca como `DELETE`.

### `trg_business_audit_*` (uno por tabla auditada: `clientes`, `pagos`, `documentos`, `recibos`)

- **Disparo**: `AFTER INSERT OR UPDATE OR DELETE` en cada tabla auditada
- **Contrato**: cada operación exitosa DEBE producir exactamente una fila nueva en `business_audit_log` con `entidad`, `entidad_id`, `accion` y `actor_id` (`auth.uid()`) correctos (FR-018).

## Políticas RLS (resumen por tabla)

Todas las tablas de esta feature tienen RLS habilitado. El patrón general, salvo excepciones anotadas:

| Tabla                                                | `SELECT`                                                                                                                       | `INSERT` / `UPDATE`                                                                                                                                                | `DELETE`                                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `clientes`                                           | Cualquier miembro del personal autenticado (Administrador, Contador, Auxiliar) con capacidad `manage_clients` o `view_clients` | Requiere capacidad `manage_clients`                                                                                                                                | Bloqueado a nivel de aplicación (solo `service_role`, procedimiento explícito) |
| `contactos`                                          | Igual que `clientes` (`view_clients`/`manage_clients`)                                                                         | Requiere capacidad `manage_clients`                                                                                                                                | Bloqueado a nivel de aplicación                                                |
| `regimenes_fiscales`                                 | Todo el personal autenticado                                                                                                   | Sin política de escritura en esta feature — el mecanismo de administración se define en una fase posterior (ver `research.md` Decisión 7 y Assumptions de la spec) | Sin política                                                                   |
| `categorias_documento`, `metodos_pago`               | Todo el personal autenticado                                                                                                   | Solo Administrador (capacidad `manage_catalogs`)                                                                                                                   | Solo Administrador                                                             |
| `cargos_cobranza`, `pagos`, `cargo_pagos`, `recibos` | Todo el personal con capacidad `view_billing` o `manage_billing`                                                               | Requiere capacidad `manage_billing`                                                                                                                                | Bloqueado (los cargos se `cancelan`, nunca se borran)                          |
| `documentos`                                         | Todo el personal con capacidad `view_documents` o `manage_documents`                                                           | Requiere capacidad `manage_documents`                                                                                                                              | Bloqueado por trigger (ver arriba)                                             |
| `business_audit_log`                                 | Todo el personal con capacidad `view_clients` o `manage_clients` (corregido 2026-07-18, ver Nota)                              | Solo vía trigger (`security definer`), nunca directo desde un rol de aplicación                                                                                    | Bloqueado siempre (append-only)                                                |

Nota: los nombres exactos de capacidad (`manage_clients`, `view_billing`, etc.) se confirman/ajustan en la fase de implementación contra el catálogo de `Capability` de `packages/auth` (extendiéndolo si no existen aún), reutilizando el mecanismo de plantilla-por-rol + `permission_overrides` ya definido en `003-supabase-auth-roles` (FR-019).

**Nota (2026-07-18, corrección detectada al refinar `007-alta-cliente-portal`)**: la política original de `business_audit_log` restringía el `SELECT` exclusivamente a `is_administrador()` — pero `docs/ux/design-system.md` §9.2 (Cliente 360) describe que la pestaña "Auditoría" de un cliente es visible para cualquier usuario que pueda ver ese cliente (incluido Auxiliar, en solo lectura), no solo Administrador. Se corrigió con la migración `20260718100000_business_audit_log_select_staff.sql`, reemplazando la política por el mismo gate ya usado en `clientes`/`contactos` (`view_clients` o `manage_clients`). No es un cambio de alcance funcional — corrige el RLS para que coincida con la UX ya documentada.
