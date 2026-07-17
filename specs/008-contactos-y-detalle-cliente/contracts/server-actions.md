# Contrato: Server Actions de `apps/{admin,portal}/src/app/(app)/clientes/[clienteId]/actions.ts`

**Feature**: [../spec.md](../spec.md) | **Data Model**: [../data-model.md](../data-model.md)

Las cuatro Server Actions siguientes se implementan de forma idéntica (misma firma, mismo cuerpo) en `apps/admin` y `apps/portal`, siguiendo el mismo criterio ya usado en `clientes/actions.ts`: el código `'use server'` no se comparte entre apps, solo la lógica pura y los componentes de UI (`packages/utils`, `packages/ui`).

## `createContacto(clienteId: string, values: ContactoFormValues): Promise<{ error: string | null; contactoId?: string }>`

- **Requiere**: capacidad `manage_clients`.
- **Contrato**: inserta un nuevo Contacto para `clienteId` con `estado = 'activo'` (default) y `es_principal = false` (default). Si la base de datos rechaza la operación, DEBE devolver `{ error: <mensaje claro> }` vía `mapearErrorContactoAMensaje()` sin lanzar una excepción no controlada (FR-010). En éxito, DEBE devolver `{ error: null, contactoId: <id nuevo> }`; el Contacto creado DEBE aparecer de inmediato en la página de detalle del mismo Cliente en la otra app tras refrescar (FR-009).

## `updateContacto(contactoId: string, values: ContactoFormValues): Promise<{ error: string | null }>`

- **Requiere**: capacidad `manage_clients`.
- **Contrato**: actualiza `nombre`, `telefono`, `email` del Contacto indicado. No modifica `estado` ni `es_principal` (esas transiciones tienen sus propias Server Actions). Mismo manejo de error que `createContacto` (FR-005, FR-010).

## `setContactoEstado(contactoId: string, estado: 'activo' | 'obsoleto'): Promise<{ error: string | null }>`

- **Requiere**: capacidad `manage_clients`.
- **Contrato**: cambia únicamente `estado`. Nunca ejecuta un `DELETE` físico (FR-006, research.md Decisión 2). Se invoca tras que la UI confirme el diálogo de advertencia al marcar como obsoleto (mismo patrón que `setClienteEstado` de Cliente); reactivar no requiere confirmación. Es idempotente: invocarla dos veces con el mismo `estado` no produce error (Edge Cases de spec.md).

## `setContactoPrincipal(clienteId: string, contactoId: string): Promise<{ error: string | null }>`

- **Requiere**: capacidad `manage_clients`.
- **Contrato**: primero pone `es_principal = false` en cualquier Contacto de `clienteId` que lo tuviera en `true` (si existía), luego pone `es_principal = true` en `contactoId` (research.md Decisión 3). Si el índice único parcial `contactos_principal_unico` rechaza la segunda actualización (carrera con otra solicitud concurrente), DEBE devolver `{ error: 'Otro contacto ya fue marcado como principal. Actualiza la página e inténtalo de nuevo.' }` (FR-007, SC-005) sin dejar el Cliente sin ningún contacto principal de forma inconsistente.

## Lectura (no son Server Actions, viven en `page.tsx` como Server Component)

- **Contrato de acceso**: la página DEBE llamar `requireCapability('view_clients')`; si el Cliente no existe o RLS lo oculta, DEBE responder con `notFound()` de Next.js (FR-001, Edge Cases de spec.md) — nunca debe filtrar si el Cliente existe pero no es accesible vs. si de plano no existe.
- **Contrato de datos**: la página DEBE obtener los datos generales del Cliente (mismos campos que el listado de `006`) y la lista completa de sus Contactos (activos y obsoletos — el filtro "mostrar obsoletos" es responsabilidad del Client Component, no de la consulta, dado el volumen bajo esperado por Cliente).
- **Contrato de capacidad de escritura**: la página DEBE calcular `canManage = profile.capabilities.includes('manage_clients')` y pasarlo a `ClienteDetalleClient`, que oculta todas las acciones de gestión de Contactos (agregar, editar, marcar obsoleto/reactivar, marcar principal) cuando es `false` (FR-008); la autoridad real sigue siendo `requireCapability('manage_clients')` dentro de cada Server Action.
