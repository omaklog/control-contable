# Implementation Plan: Módulo de Administración de Catálogos

**Branch**: `012-administracion-catalogos` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-administracion-catalogos/spec.md`

## Summary

Este módulo define el contrato de comportamiento común que todo catálogo administrable del sistema debe cumplir (estado Activo/Inactivo, soft-delete, nombre único entre activos, auditoría de creación/actualización, búsqueda + orden alfabético + selección por Autocomplete, paginación solo con más de diez registros, catálogos "protegidos" de solo consulta) y construye, como única referencia concreta de esta feature, el punto de entrada de navegación **Administración > Catálogos** en `apps/admin` junto con el primer catálogo protegido: **Periodicidades**. Los demás catálogos (Tipos de Documento, Régimen Fiscal, Obligaciones Fiscales) quedan fuera de alcance — cada uno tendrá su propia especificación futura que reutilizará este mismo contrato — y Servicios (011) permanece sin cambios, ya que se construyó antes de que este contrato existiera.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict), SQL (PostgreSQL vía Supabase migrations)

**Primary Dependencies**: Next.js App Router (Server Components + Server Actions), MUI 6 (`Autocomplete`, `Table`, `Paper`, `Chip` — reutilizando `StatusChip` de `packages/ui`), Supabase JS client, `@control-contable/auth` (`has_capability`/`requireCapability`, capability `manage_catalogs` ya existente desde 011)

**Storage**: PostgreSQL (Supabase). Una tabla nueva: `periodicidades`. Sin tabla de auditoría propia — este catálogo es protegido (sin escritura vía app), por lo que no hay eventos de negocio que registrar en `business_audit_log` más allá de la carga inicial por migración.

**Testing**: Vitest (`packages/utils` para lógica pura si aplica, `packages/utils/*.integration.test.ts` contra Supabase local para RLS: confirmar que ningún rol —incluido Administrador— puede insertar/actualizar/eliminar en `periodicidades` vía PostgREST, y que todos los roles activos pueden hacer `select`)

**Target Platform**: `apps/admin` únicamente (administración de catálogos es exclusiva de Administrador, FR-001/FR-014 — mismo criterio que 011 aplicó a Servicios). `apps/portal` no requiere cambios en esta feature.

**Project Type**: Web application (monorepo Next.js, `apps/admin` + paquetes compartidos)

**Performance Goals**: N/A explícito — catálogos de bajo volumen (decenas de registros); sin metas de throughput/latencia particulares más allá de lo ya establecido para el resto del panel administrativo.

**Constraints**: El nombre de catálogo debe ser único solo entre registros con estado Activo (FR-004); un catálogo protegido no debe exponer ninguna operación de escritura ni siquiera a Administrador (FR-014, Edge Cases); no se debe introducir un modelo de tabla genérica/polimórfica para representar catálogos (FR-010).

**Scale/Scope**: 1 tabla nueva (`periodicidades`), 1 entrada de navegación nueva + 1 página "hub" de catálogos, 1 pantalla de catálogo protegido (Periodicidades) con búsqueda + Autocomplete + orden alfabético + paginación condicional. Sin escritura en UI para Periodicidades en v1.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio de la Constitución                                               | Cumplimiento                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Reglas de negocio fuera de componentes React                               | La regla "protegido = sin escritura" se aplica en RLS (sin políticas `insert`/`update`/`delete` para `authenticated`), no solo ocultando botones en el cliente.                                                                                        |
| Monorepo / código compartido, evitar duplicación                           | `StatusChip`, `has_capability`/`requireCapability`, patrón de paginación y filtro de `ServiciosClient.tsx` se reutilizan; no se crea una abstracción genérica de catálogo prematura (un solo catálogo protegido concreto por ahora — ver research.md). |
| Seguridad: control de permisos por usuario, nunca confiar solo en frontend | RLS en `periodicidades` exige `is_active` en `profiles` para `select`; `manage_catalogs` gatea la entrada de navegación y la página del hub, aunque no hay escritura que proteger en Periodicidades.                                                   |
| Base de datos: trazabilidad, soft-delete, nunca eliminación física         | `periodicidades` incluye `created_at`/`updated_at`/`created_by`/`updated_by` por contrato (FR-006), aun cuando en v1 nadie los modifica vía UI; sin eliminación física en ningún catálogo (FR-002/FR-003).                                             |
| Calidad de código: TypeScript strict, sin `any`, ESLint/Prettier           | Sin excepciones necesarias.                                                                                                                                                                                                                            |

No se identifican violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/012-administracion-catalogos/
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
└── <timestamp>_periodicidades_schema.sql   # tabla periodicidades + RLS (solo select) + seed inicial

apps/admin/src/app/(app)/catalogos/
├── page.tsx                       # Hub "Administración > Catálogos": lista de catálogos disponibles
└── periodicidades/
    ├── page.tsx                   # Server Component: carga periodicidades (búsqueda, orden alfabético, paginación >10)
    └── PeriodicidadesClient.tsx   # Client Component: Autocomplete de búsqueda + tabla de solo lectura, sin acciones de escritura

apps/admin/src/components/layout/navigation.ts
└── (modificado) nueva entrada "Catálogos" (capability: manage_catalogs, href: /catalogos)

packages/types/src/database.ts
└── (regenerado) incluye la tabla periodicidades tras la migración
```

**Structure Decision**: Página de catálogos autocontenida en `apps/admin` (no se extrae un componente "genérico de catálogo" a `packages/ui` todavía). El contrato de comportamiento común (estado, unicidad de nombre, auditoría, búsqueda/Autocomplete/paginación) se documenta en `data-model.md`/`contracts/db-functions-rls.md` como una guía a seguir por las especificaciones futuras de cada catálogo editable, pero la implementación concreta de Periodicidades no se abstrae prematuramente: solo existe un catálogo protegido en v1, y extraer un componente compartido para un único consumidor violaría la guía del proyecto de evitar abstracciones antes de que la duplicación real aparezca. Cuando una segunda especificación de catálogo (p. ej. Tipos de Documento) lo reutilice, ese momento es el correcto para extraer las piezas comunes a `packages/ui`/`packages/utils`.

## Complexity Tracking

> No violations to justify — table intentionally omitted.
