# Implementation Plan: Alta de Cliente desde el Portal

**Branch**: `007-alta-cliente-portal` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-alta-cliente-portal/spec.md`

## Summary

Construir, dentro de `apps/portal`, una tabla paginada con todos los Clientes (filtro por nombre/RFC, filtro de inactivos) y un botón "Agregar cliente" que abre un modal con el formulario de alta — reemplazando la primera versión de esta feature (solo formulario, sin listado, ya implementada) por la versión ampliada que la segunda sesión de clarificación pidió. La promoción del formulario de Cliente (`ClienteForm` + su lógica de validación) a `packages/ui`/`packages/utils`, hecha en la primera iteración, se conserva sin cambios — solo cambia cómo y dónde se invoca (ahora desde un modal sobre una tabla, no como pantalla única). Se reutiliza además el mismo patrón de tabla paginada ya construido en `006-crud-clientes-admin` (Server Component + `searchParams` + Client Component), promoviendo `calcularTotalPaginas()` a `packages/utils` ahora que también lo necesita `apps/portal`.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict)

**Primary Dependencies**: Next.js 15 (App Router, Server Components + Server Actions), React 19, Material UI 6, Formik + Yup, `@control-contable/supabase-client` (server), `@control-contable/auth` (`requireCapability`), `@control-contable/utils` (`esRfcValido`, `calcularTotalPaginas`, lógica de validación de Cliente), `@control-contable/ui` (`ClienteForm` compartido)

**Storage**: PostgreSQL vía Supabase — tabla `clientes` y `regimenes_fiscales` ya existentes (`005-clientes-cobranza-expedientes`); esta feature no agrega tablas ni columnas. El filtro por nombre/RFC se resuelve con un `or(ilike...)` de PostgREST, sin necesidad de un índice nuevo dado el volumen esperado (`005`, Scale/Scope)

**Testing**: Vitest — pruebas unitarias de la lógica ya movida a paquete compartido (esquema Yup, filtrado de régimenes, mapeo de errores, cálculo de paginación); sin pruebas de integración nuevas contra Supabase (no hay cambios de esquema)

**Target Platform**: Next.js server (`apps/portal`) sobre el servidor local del despacho, igual que el resto de la app

**Project Type**: Monorepo web — feature de UI dentro de una app ya existente (`apps/portal`), reutilizando código ya promovido a `packages/*` en la primera iteración de esta misma feature

**Performance Goals**: Paginación server-side (nunca cargar todos los clientes al navegador de una sola vez), consistente con "Rendimiento" de la constitución y con el mismo criterio ya aplicado en `006-crud-clientes-admin`

**Constraints**: Reutilizar las reglas de integridad ya impuestas por la base de datos (RFC único, régimen fiscal compatible/vigente) en vez de duplicarlas; los errores deben mostrarse con claridad sin perder los datos capturados (FR-007). La tabla del portal NO DEBE incluir acciones de editar/eliminar (FR-004) — esas siguen siendo exclusivas de `apps/admin`

**Scale/Scope**: Mismo volumen ya acotado en `005`/`006` (cientos de clientes) — paginación server-side suficiente, sin necesidad de búsqueda de texto completo ni de un índice dedicado para el filtro

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Arquitectura por capas / lógica fuera de React**: las reglas de negocio (unicidad de RFC, compatibilidad/vigencia de régimen fiscal) ya viven en la base de datos; el formulario y la tabla solo capturan/muestran datos. ✅ Cumple.
- **Monorepo / código compartido**: `ClienteForm` y su lógica de validación ya viven en `packages/ui`/`packages/utils` desde la primera iteración; esta ampliación promueve además `calcularTotalPaginas()` (antes solo en `apps/admin`) al mismo paquete compartido, evitando duplicar esa lógica ahora que `apps/portal` también pagina una tabla de Clientes. ✅ Cumple.
- **Multi-Usuario / roles**: el acceso de solo consulta a la tabla requiere `view_clients`; el botón "Agregar cliente" (y la creación en sí) requiere además `manage_clients` — mismo patrón de capacidad de lectura vs. escritura ya usado en `apps/admin` (FR-008). ✅ Cumple.
- **Seguridad**: la mutación pasa por una Server Action autenticada (`requireCapability('manage_clients')`), nunca por una llamada directa desde el cliente; el filtro de nombre/RFC se aplica en la consulta del Server Component, no en el cliente. ✅ Cumple.
- **UI**: Material UI, tabla y modal consistentes con los ya usados en `apps/admin`; confirmaciones visuales tras operaciones (alta exitosa). ✅ Cumple.

No se detectan violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/007-alta-cliente-portal/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
packages/utils/
└── src/
    ├── clienteForm.ts         # Ya existente (primera iteración) — sin cambios
    └── paginacion.ts          # NUEVO en esta ampliación: movido desde apps/admin/src/app/(app)/clientes/paginacion.ts
                                #   (calcularTotalPaginas, más su prueba paginacion.test.ts)

packages/ui/
└── src/
    └── ClienteForm.tsx         # Ya existente (primera iteración) — sin cambios

apps/admin/
└── src/app/(app)/clientes/
    ├── page.tsx                # Importa calcularTotalPaginas desde @control-contable/utils en vez del archivo local
    ├── actions.ts               # Sin cambios
    └── ClientesClient.tsx       # Sin cambios

apps/portal/
└── src/app/(app)/clientes/
    ├── page.tsx                 # Server Component: requireCapability('view_clients') (ahora sí hay algo que consultar de solo lectura, research.md Decisión 4 revisada); lee `page`, `mostrarInactivos`, `q` (filtro nombre/RFC) de searchParams; fetch paginado con `.or(ilike...)` cuando hay `q`; fetch del catálogo de regimenes_fiscales
    ├── actions.ts                # 'use server': createCliente(values) — ya existente, sin cambios
    └── ClientesPortalClient.tsx  # Client Component: tabla paginada (Nombre/RFC/Correo/Estado, SIN columna de acciones), encabezado con filtro de texto + toggle "Mostrar inactivos" + botón "Agregar cliente" (visible solo si canManage); el botón abre `ClienteForm` de @control-contable/ui en un Dialog, en modo alta; al guardar con éxito, cierra el modal y refresca la tabla (FR-011, research.md Decisión 3 revisada)
```

**Structure Decision**: Se reutiliza sin cambios la promoción de `ClienteForm`/lógica de validación ya hecha en la primera iteración de esta feature. Se agrega la promoción de `calcularTotalPaginas()` (de `apps/admin` a `packages/utils`) porque ahora `apps/portal` también necesita paginar una tabla de Clientes — mismo criterio de "promover al aparecer un segundo consumidor real" ya aplicado dos veces antes (`MainLayoutClient` en `004`, `ClienteForm` en la primera iteración de `007`). La tabla y sus filtros son código propio de `apps/portal` (no se comparte con `apps/admin` como componente único, ya que sus columnas de acciones difieren — ver research.md Decisión 5).

## Complexity Tracking

> No violations — section not applicable.
