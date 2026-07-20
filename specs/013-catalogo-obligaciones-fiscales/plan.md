# Implementation Plan: Catálogo de Obligaciones Fiscales

**Branch**: `013-catalogo-obligaciones-fiscales` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-catalogo-obligaciones-fiscales/spec.md`

## Summary

Catálogo administrable de Obligaciones Fiscales (nombre, descripción opcional, periodicidad tomada del catálogo de Periodicidades, prioridad como orden sugerido, estado Activo/Inactivo) que servirá de base a las futuras Plantillas de Obligaciones y Obligaciones Fiscales del Cliente. A diferencia de Periodicidades, es un catálogo **editable** (no protegido): el Administrador puede darlo de alta, editarlo, activarlo e inactivarlo, siguiendo el mismo contrato común de `012-administracion-catalogos` (estado, soft-delete, nombre único entre activos, auditoría, búsqueda/Autocomplete/paginación condicional). Se agrega como una nueva entrada dentro del hub "Administración > Catálogos" ya existente, junto a Periodicidades.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict), SQL (PostgreSQL vía Supabase migrations)

**Primary Dependencies**: Next.js App Router (Server Components + Server Actions), MUI 6 (`Autocomplete` — ahora usado por segunda vez, primero como picker de periodicidad dentro del formulario de una obligación, no solo como buscador del propio catálogo; `Table`, `Paper`, `Chip` vía `StatusChip` de `packages/ui`), Supabase JS client, `@control-contable/auth` (`has_capability`/`requireCapability`, capability `manage_catalogs` ya existente desde 011)

**Storage**: PostgreSQL (Supabase). Una tabla nueva: `obligaciones_fiscales`, con FK a `periodicidades` (`012`). Reutiliza `business_audit_log`/`log_business_audit()` (005) para auditar alta/edición/activación/desactivación, mismo patrón que `servicios` (011) — a diferencia de Periodicidades, que al ser protegido no tiene eventos que auditar.

**Testing**: Vitest (`packages/utils` para el esquema Yup y el mapeo de errores de formulario; `packages/utils/*.integration.test.ts` contra Supabase local para RLS: `select` abierto a cualquier staff activo, `insert`/`update` solo con `manage_catalogs`; unicidad de nombre solo entre activas; rechazo de periodicidad inactiva al crear o editar)

**Target Platform**: `apps/admin` únicamente (administración de catálogos es exclusiva de Administrador, FR-001 — mismo criterio que 011/012). `apps/portal` no requiere cambios en esta feature.

**Project Type**: Web application (monorepo Next.js, `apps/admin` + paquetes compartidos)

**Performance Goals**: N/A explícito — catálogo de bajo volumen (decenas de registros), sin metas de throughput/latencia particulares.

**Constraints**: El nombre debe ser único solo entre obligaciones activas (FR-002); la periodicidad DEBE tomarse únicamente de periodicidades activas, tanto al crear como al editar (FR-004); la prioridad no necesita ser única (FR-008); no se debe introducir un modelo de tabla genérica/polimórfica (heredado de `012`, FR-010).

**Scale/Scope**: 1 tabla nueva (`obligaciones_fiscales`), 1 nueva subruta dentro de `apps/admin/src/app/(app)/catalogos/`, actualización del hub de catálogos para listar la nueva entrada. Sin cambios de navegación de nivel superior (no es un ítem de menú nuevo, ya que vive dentro del hub existente).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio de la Constitución                                               | Cumplimiento                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Reglas de negocio fuera de componentes React                               | La validación "periodicidad debe estar activa" y la unicidad de nombre entre activas se aplican en la base de datos (trigger + índice único parcial), no solo en el formulario del cliente.                                                                                                                                                                  |
| Monorepo / código compartido, evitar duplicación                           | Reutiliza `StatusChip`, `has_capability`/`requireCapability`, el patrón de Dialog+useState de `ServiciosClient.tsx`, y el patrón de `Autocomplete` introducido en `PeriodicidadesClient.tsx` (012) — ahora aplicado a un segundo caso de uso real (selector de periodicidad), sin forzar una abstracción genérica prematura de "catálogo" (ver research.md). |
| Seguridad: control de permisos por usuario, nunca confiar solo en frontend | RLS exige `manage_catalogs` para `insert`/`update`, y `is_active` en `profiles` para `select` — igual que `servicios` (011).                                                                                                                                                                                                                                 |
| Base de datos: trazabilidad, soft-delete, nunca eliminación física         | `obligaciones_fiscales` incluye `created_at`/`updated_at`/`created_by`/`updated_by`; sin eliminación física, solo `estado` (FR-003).                                                                                                                                                                                                                         |
| Calidad de código: TypeScript strict, sin `any`, ESLint/Prettier           | Sin excepciones necesarias.                                                                                                                                                                                                                                                                                                                                  |

No se identifican violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/013-catalogo-obligaciones-fiscales/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── db-functions-rls.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
supabase/migrations/
└── <timestamp>_obligaciones_fiscales_schema.sql   # tabla, FK a periodicidades, índice único parcial, RLS, triggers de validación y auditoría

apps/admin/src/app/(app)/catalogos/
├── page.tsx                                # (modificado) hub: agrega la entrada "Obligaciones Fiscales"
└── obligaciones-fiscales/
    ├── page.tsx                            # Server Component: listado paginado + filtros (nombre/periodicidad/estado)
    ├── ObligacionesFiscalesClient.tsx       # Client Component: tabla + Dialog de alta/edición (patrón ServiciosClient) + Autocomplete de periodicidad
    └── actions.ts                          # Server Actions: createObligacionFiscal, updateObligacionFiscal, setObligacionFiscalEstado

packages/utils/src/
├── obligacionFiscalForm.ts                 # esquema Yup + mapearErrorObligacionFiscalAMensaje
├── obligacionFiscalForm.test.ts
└── obligacionesFiscales.integration.test.ts

packages/types/src/database.ts
└── (regenerado) incluye la tabla obligaciones_fiscales tras la migración
```

**Structure Decision**: Se sigue el mismo patrón ya usado por `servicios` (011) para un catálogo editable dentro de `apps/admin` — Dialog con `useState` (no Formik) para el formulario, Server Actions con `requireCapability('manage_catalogs')`, Yup solo para el contrato de validación y el mapeo de errores en `packages/utils`. La única pieza nueva reutilizada de `012` es el patrón `Autocomplete` de MUI, ahora aplicado por primera vez como selector de un valor de catálogo dentro del formulario de otra entidad (no solo como buscador del propio catálogo) — se implementa directamente en `ObligacionesFiscalesClient.tsx`, sin extraer todavía un componente `CatalogoAutocompleteField` genérico a `packages/ui`: dos usos con props y comportamiento distintos (buscador de una lista propia vs. selector de FK ligado a otra entidad) no justifican aún la abstracción compartida.

## Complexity Tracking

> No violations to justify — table intentionally omitted.
