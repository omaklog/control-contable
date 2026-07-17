# Contrato: Server Action de `apps/portal/src/app/(app)/clientes/actions.ts`

**Feature**: [../spec.md](../spec.md) | **Data Model**: [../data-model.md](../data-model.md)

## `createCliente(values: ClienteFormValues): Promise<{ error: string | null; clienteId?: string }>`

_Sin cambios respecto a la primera iteración._

- **Requiere**: capacidad `manage_clients`.
- **Contrato**: inserta un nuevo Cliente con `estado = 'activo'` (default de la base de datos). Si la base de datos rechaza la operación (RFC duplicado entre activos, régimen fiscal incompatible o no vigente), DEBE devolver `{ error: <mensaje claro> }` sin lanzar una excepción no controlada (FR-007), usando `mapearErrorClienteAMensaje()` de `packages/utils`. En éxito, DEBE devolver `{ error: null, clienteId: <id nuevo> }`; el cliente creado DEBE aparecer de inmediato tanto en la tabla del portal (tras refrescar) como en la de `apps/admin` (FR-009).

## Lectura (no es una Server Action, vive en `page.tsx` como Server Component) — _revisado_

- **Contrato de acceso**: la página DEBE llamar `requireCapability('view_clients')` (research.md Decisión 4 revisada) — Auxiliar accede y ve la tabla, pero el Client Component NO le muestra el botón "Agregar cliente" (`canManage = capabilities.includes('manage_clients')`); si Auxiliar invocara `createCliente` de cualquier otra forma, la Server Action la rechaza igual (`requireCapability('manage_clients')` ahí es la autoridad real).
- **Contrato de paginación y filtro**: dados `page` (1-indexed), `mostrarInactivos` y `q`, la consulta DEBE filtrar por `estado = 'activo'` salvo que `mostrarInactivos` sea `true`, DEBE aplicar `q` como coincidencia parcial contra `nombre` o `rfc` cuando esté presente, y DEBE devolver únicamente la página solicitada más el conteo total para calcular el número de páginas con `calcularTotalPaginas()` de `packages/utils` (FR-001, FR-002, FR-003).
- **Contrato de datos**: la página DEBE obtener también el catálogo completo de `regimenes_fiscales` para poblar el selector del formulario compartido dentro del modal.
