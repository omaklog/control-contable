# Implementation Plan: Contactos y Página de Detalle de Cliente

**Branch**: `008-contactos-y-detalle-cliente` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-contactos-y-detalle-cliente/spec.md`

## Summary

Agregar una página de detalle de Cliente — nueva ruta dinámica `/clientes/[clienteId]`, tanto en `apps/admin` como en `apps/portal` — que muestre los datos generales del Cliente, la lista de sus Contactos y una sección reservada (sin lógica todavía) para sus futuros pagos pendientes. Sobre esa página se construye la gestión completa de Contactos: alta, edición, y — en vez de eliminación física — marcarlos como obsoletos/reactivarlos, más la designación de un contacto principal por Cliente (a lo más uno a la vez, garantizado con un índice único parcial en base de datos). A diferencia de Cliente (cuyo listado tiene comportamiento distinto entre admin y portal), el detalle de Cliente y la gestión de Contactos es **idéntica** en ambas apps (mismo gate de capacidades, mismos campos, mismas acciones), así que el componente de UI que lo implementa se comparte desde el día uno en `packages/ui`, en vez de construirse primero en una app y promoverse después (research.md, Decisión 1).

## Technical Context

**Language/Version**: TypeScript 5.7 (strict)

**Primary Dependencies**: Next.js 15 (App Router — primera ruta dinámica `[clienteId]` del monorepo — Server Components + Server Actions), React 19, Material UI 6, Formik + Yup, `@control-contable/supabase-client` (server), `@control-contable/auth` (`requireCapability`), `@control-contable/utils` (nuevo: `contactoForm.ts`), `@control-contable/ui` (nuevo: `ContactoForm`, `ClienteDetalleClient`)

**Storage**: PostgreSQL vía Supabase — se modifica la tabla `contactos` ya existente (`005-clientes-cobranza-expedientes`) agregando dos columnas: `estado` (nuevo enum `contacto_estado`: `activo` | `obsoleto`, default `activo`) y `es_principal boolean not null default false`, con un índice único parcial (`where es_principal`) que garantiza a lo más un contacto principal por Cliente incluso ante escrituras concurrentes. No se agrega permiso de `DELETE` — los Contactos nunca se eliminan físicamente (FR-006, alineado con "preferir soft delete" de la Constitución)

**Testing**: Vitest — pruebas unitarias del nuevo esquema Yup de Contacto (`contactoForm.test.ts`) y de su mapeo de errores; prueba de integración contra Supabase local que confirme que el índice único parcial rechaza un segundo contacto principal simultáneo para el mismo Cliente

**Target Platform**: Next.js server (`apps/admin` y `apps/portal`) sobre el servidor local del despacho, igual que el resto de la app

**Project Type**: Monorepo web — nueva ruta dinámica compartida por dos apps ya existentes + nuevos componentes en `packages/ui`/`packages/utils`; no se agregan apps ni paquetes nuevos

**Performance Goals**: Sin metas específicas más allá de las ya establecidas — el volumen esperado de Contactos por Cliente es bajo (unidades, no cientos), por lo que la lista de Contactos en el detalle no pagina

**Constraints**: La designación de "contacto principal" debe ser atómica — nunca dos Contactos principales simultáneos para el mismo Cliente — incluso ante escrituras concurrentes; se resuelve con un índice único parcial en base de datos (autoridad real), no solo con lógica de la aplicación (FR-007). Los errores de guardado deben mostrarse con claridad sin perder los datos capturados, mismo patrón ya usado en Cliente

**Scale/Scope**: Mismo volumen de Clientes ya acotado en `005`/`006` (cientos); pocos Contactos por Cliente (unidades) — sin necesidad de paginar ni de búsqueda de texto en la lista de Contactos del detalle

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Arquitectura por capas / lógica fuera de React**: la invariante "a lo más un Contacto principal por Cliente" vive en un índice único parcial de la base de datos (autoridad real), no solo en el componente React que arma la petición. ✅ Cumple.
- **Monorepo / código compartido**: el detalle de Cliente y la gestión de Contactos es idéntica en ambas apps desde el diseño (mismo gate de capacidades, mismos campos) — `ContactoForm` y `ClienteDetalleClient` se construyen directamente en `packages/ui`/`packages/utils` desde esta primera iteración, sin pasar por una fase previa "solo en una app" (a diferencia de cómo se promovió `ClienteForm` en `006`→`007`, donde los dos consumidores no eran conocidos desde el inicio). ✅ Cumple.
- **Multi-Usuario / roles**: se reutiliza `view_clients` (lectura del detalle y de la lista de Contactos) y `manage_clients` (alta/edición/obsoleto/principal) — sin capacidad nueva (FR-007, FR-008). ✅ Cumple.
- **Seguridad**: toda mutación de Contacto pasa por una Server Action autenticada (`requireCapability('manage_clients')`) propia de cada app (mismo patrón que `clientes/actions.ts`, sin compartir funciones `'use server'` entre apps); RLS de `contactos` sigue sin exponer `DELETE`. ✅ Cumple.
- **Base de Datos (trazabilidad, soft-delete)**: "obsoleto" reemplaza a la eliminación física — cumple directamente el principio "preferir soft delete, evitar eliminaciones físicas" de la Constitución; `contactos` ya tenía `created_by`/`updated_by`/`created_at`/`updated_at`, sin cambios ahí. ✅ Cumple.
- **UI**: Material UI, Formik + Yup, confirmación antes de marcar un Contacto como obsoleto (mismo patrón que la baja de Cliente en `006`). ✅ Cumple.

No se detectan violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/008-contactos-y-detalle-cliente/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
supabase/migrations/
└── <timestamp>_contactos_estado_principal.sql
    # NUEVO: agrega a public.contactos las columnas `estado` (nuevo enum
    # public.contacto_estado: 'activo' | 'obsoleto', default 'activo') y
    # `es_principal boolean not null default false`; índice único parcial
    # `contactos_principal_unico` en (cliente_id) where es_principal — a lo
    # más un contacto principal por cliente. No se agrega grant de DELETE.

packages/types/src/database.ts
    # Actualizar los tipos generados de Supabase para incluir las columnas
    # nuevas de `contactos`.

packages/utils/src/
├── contactoForm.ts        # NUEVO: ContactoFormValues, contactoFormSchema (Yup),
│                           #   mapearErrorContactoAMensaje(error)
└── contactoForm.test.ts   # NUEVO

packages/ui/src/
├── ContactoForm.tsx
│   # NUEVO: Dialog + Formik, prop opcional `contacto` (alta/edición, mismo
│   #   patrón que ClienteForm), compartido desde el día uno por admin y portal.
├── ClienteDetalleClient.tsx
│   # NUEVO: Client Component compartido — tarjeta de datos generales del
│   #   Cliente, lista de Contactos (filtro "mostrar obsoletos", badge de
│   #   contacto principal, acciones Editar/Marcar-obsoleto-o-reactivar/
│   #   Marcar-como-principal cuando canManage), botón "Agregar contacto"
│   #   (visible solo si canManage), sección "Pagos pendientes" (placeholder
│   #   visual, FR-011). Recibe canManage e invoca las Server Actions que le
│   #   pasa cada app (inyectadas por props, no importadas directamente, para
│   #   no acoplar el componente compartido a la ruta de cada app).
└── index.ts                # export de ContactoForm y ClienteDetalleClient

apps/admin/src/app/(app)/clientes/
├── [clienteId]/
│   ├── page.tsx
│   │   # NUEVO Server Component: requireCapability('view_clients'); fetch
│   │   #   del Cliente + sus Contactos; notFound() si no existe o RLS lo
│   │   #   oculta; calcula canManage; renderiza ClienteDetalleClient.
│   └── actions.ts
│       # NUEVO 'use server': createContacto, updateContacto,
│       #   setContactoEstado (activo/obsoleto), setContactoPrincipal — todas
│       #   requireCapability('manage_clients').
└── ClientesClient.tsx
    # Agrega un enlace "Ver detalle" por fila (FR-012) hacia
    #   /clientes/[id], sin quitar Editar/Dar de baja.

apps/portal/src/app/(app)/clientes/
├── [clienteId]/
│   ├── page.tsx     # NUEVO — mismo patrón que admin.
│   └── actions.ts   # NUEVO — mismas 4 Server Actions que admin (misma
│                     #   firma; no se comparte código 'use server' entre
│                     #   apps, mismo criterio ya usado en clientes/actions.ts).
└── ClientesPortalClient.tsx
    # Agrega un enlace "Ver detalle" por fila (FR-012).
```

**Structure Decision**: Se introduce la primera ruta dinámica (`[clienteId]`) del monorepo, replicada en ambas apps con el mismo patrón ya usado para `/clientes` (Server Component con `requireCapability` + fetch, Server Actions `'use server'` propias de cada app, Client Component para la interacción). A diferencia del listado de Clientes — donde `apps/admin` y `apps/portal` divergen deliberadamente (acciones inline vs. solo alta) y por eso NO comparten un componente de tabla — el detalle de Cliente y la gestión de Contactos es exactamente igual en ambas apps, así que `ClienteDetalleClient` y `ContactoForm` se construyen directamente como componentes compartidos en `packages/ui`, y su esquema de validación directamente en `packages/utils`, evitando la ronda de "construir en una app, promover después" que sí tuvo sentido para `ClienteForm` (donde el segundo consumidor apareció en una iteración posterior).

## Complexity Tracking

> No violations — section not applicable.
