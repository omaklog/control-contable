# Contrato: Server Actions de `apps/admin/src/app/clientes/actions.ts`

**Feature**: [../spec.md](../spec.md) | **Data Model**: [../data-model.md](../data-model.md)

Todas las acciones son `'use server'`, requieren `requireCapability('manage_clients')` y devuelven `{ error: string | null }` (más el dato relevante en caso de éxito), siguiendo el mismo patrón ya usado en `apps/admin/src/app/usuarios/actions.ts`. Esta feature **no** define una acción de creación — la alta de clientes se construye en una feature futura dentro de `apps/portal` (ver spec.md, Clarifications).

## `updateCliente(clienteId: string, values: ClienteFormValues): Promise<{ error: string | null }>`

- **Requiere**: capacidad `manage_clients`.
- **Contrato**: actualiza los campos propios del Cliente indicado, sin importar si su `estado` actual es `activo` o `inactivo` (FR-009) — nunca cambia `estado` como efecto secundario de esta acción. Si la base de datos rechaza la operación (RFC duplicado entre activos, régimen fiscal incompatible o no vigente), DEBE devolver `{ error: <mensaje claro> }` sin lanzar una excepción no controlada (FR-006).

## `setClienteEstado(clienteId: string, estado: 'activo' | 'inactivo'): Promise<{ error: string | null }>`

- **Requiere**: capacidad `manage_clients`.
- **Contrato**: cambia únicamente el campo `estado` del Cliente indicado (soft-delete al pasar a `'inactivo'`, reactivación al pasar a `'activo'`); NUNCA ejecuta un `DELETE` físico (FR-008). Se invoca exclusivamente después de que el Client Component confirme el diálogo de advertencia (FR-007) — esta Server Action en sí no vuelve a pedir confirmación, esa responsabilidad es de la UI que la invoca.

## Lectura (no es una Server Action, vive en `page.tsx` como Server Component)

- **Contrato de paginación**: dado `page` (1-indexed) y `mostrarInactivos`, la consulta DEBE filtrar por `estado = 'activo'` salvo que `mostrarInactivos` sea `true` (en cuyo caso incluye ambos estados), y DEBE devolver únicamente la página solicitada más el conteo total necesario para calcular el número de páginas (FR-001, FR-011, FR-014).
- **Contrato de acceso**: la página DEBE llamar `requireCapability('view_clients')` como mínimo (permite a Auxiliar, Contador y Administrador ver el listado — aunque en la práctica solo Administrador llega a esta pantalla, ya que Contador y Auxiliar no tienen acceso a `apps/admin`, `003-supabase-auth-roles`); las acciones de editar/dar de baja en la columna de acciones DEBEN ocultarse en el Client Component cuando el usuario actual no tenga `manage_clients` (FR-010).
