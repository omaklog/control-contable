# Implementation Plan: Obligaciones Fiscales del Cliente

**Branch**: `014-obligaciones-fiscales-cliente` | **Date**: 2026-07-20 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-obligaciones-fiscales-cliente/spec.md`

## Summary

Configuración de las obligaciones fiscales de un cliente (agregar/editar periodicidad y orden/marcar "No aplica"/eliminar), con Plantillas de Obligaciones como mecanismo opcional de carga inicial (copia única, sin relación permanente con el cliente). Ambos conceptos — la configuración por cliente y el catálogo de plantillas — se definen en esta feature (Clarifications de spec.md), no en un módulo futuro. La configuración de obligaciones vive dentro de la vista de Detalle del Cliente ya existente (como una nueva sección, igual que Servicios Contratados en `011`), disponible en `apps/admin` y `apps/portal`; la administración de plantillas vive en el hub "Administración > Catálogos" (`012`), exclusiva de `apps/admin`. Cada acción se persiste de inmediato (Clarifications) — sin un paso de "Guardar" en borrador.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict), SQL (PostgreSQL vía Supabase migrations)

**Primary Dependencies**: Next.js App Router (Server Components + Server Actions), MUI 6 (`Autocomplete` para elegir obligación/periodicidad, `Table`/`Paper`/`Chip` vía `StatusChip`), Supabase JS client, `@control-contable/auth` (`has_capability`/`requireCapability`; `manage_catalogs` para plantillas, `view_clients`/`manage_clients` para la configuración del cliente — mismo patrón que Servicios Contratados en `011`)

**Storage**: PostgreSQL (Supabase). Tres tablas nuevas: `plantillas_obligaciones` (catálogo), `plantilla_obligaciones_items` (detalle ordenado de cada plantilla) y `obligaciones_fiscales_cliente` (configuración por cliente). Reutiliza `business_audit_log`/`log_business_audit()` (005) para auditar alta/edición/activación/desactivación de plantillas y alta/edición/no_aplica/reactivación/**eliminación** de obligaciones de cliente — el primer caso en el sistema donde una eliminación física real (FR-006) también debe auditarse.

**Testing**: Vitest (`packages/utils` para los esquemas Yup y el mapeo de errores; `packages/utils/*.integration.test.ts` contra Supabase local para RLS: `select` abierto a cualquier staff activo en plantillas, `view_clients`/`manage_clients` en la configuración del cliente; unicidad de obligación por cliente y por plantilla; orden único por cliente; rechazo de periodicidad/obligación inactiva; aplicar plantilla omite duplicados; eliminación bloqueada para obligaciones "No aplica")

**Target Platform**: La configuración de obligaciones de un cliente vive en `apps/admin` **y** `apps/portal` (misma vista de Detalle del Cliente compartida, mismo criterio que Servicios Contratados en `011`). La administración de plantillas vive únicamente en `apps/admin`, dentro del hub de catálogos (`012`) — exclusiva de Administrador.

**Project Type**: Web application (monorepo Next.js, `apps/admin` + `apps/portal` + paquetes compartidos)

**Performance Goals**: N/A explícito — volumen por cliente del orden de decenas de obligaciones; sin metas de throughput/latencia particulares.

**Constraints**: Una obligación fiscal no puede repetirse para el mismo cliente (FR-003) ni dentro de la misma plantilla (FR-013); el orden es único por cliente (FR-008); solo obligaciones activas del catálogo pueden agregarse a un cliente o a una plantilla (FR-002); solo periodicidades activas pueden asignarse (heredado de `013`); una obligación "No aplica" no puede eliminarse (FR-005) — sí puede eliminarse una obligación Activa (FR-006), la primera eliminación física real en el sistema.

**Scale/Scope**: 3 tablas nuevas, 1 función de base de datos (`aplicar_plantilla_obligaciones`), 1 nueva sección en `ClienteDetalleClient.tsx` (compartida por ambas apps) + Server Actions en `apps/{admin,portal}/.../clientes/[clienteId]/actions.ts`, 1 nueva pantalla de administración de plantillas dentro de `apps/admin/.../catalogos/`, actualización del hub de catálogos.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio de la Constitución                                               | Cumplimiento                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reglas de negocio fuera de componentes React                               | "Aplicar plantilla" se implementa como función de base de datos (`aplicar_plantilla_obligaciones`), no como lógica de copia en el cliente React; la validación de periodicidad/obligación activa y la restricción de eliminar solo obligaciones Activas se aplican en triggers/RLS. |
| Monorepo / código compartido, evitar duplicación                           | Reutiliza `StatusChip`, `has_capability`/`requireCapability`, el patrón de sección dentro de `ClienteDetalleClient.tsx` ya usado por Servicios Contratados (`011`), y el patrón `Autocomplete` ya usado por Periodicidades/Obligaciones Fiscales (`012`/`013`).                     |
| Seguridad: control de permisos por usuario, nunca confiar solo en frontend | RLS exige `manage_clients` para escribir en la configuración de un cliente (incluida la eliminación) y `manage_catalogs` para administrar plantillas — igual que el resto de catálogos y datos de cliente ya construidos.                                                           |
| Base de datos: trazabilidad, soft-delete, nunca eliminación física         | Excepción explícita y justificada por el propio spec (FR-006): una obligación Activa de un cliente sí puede eliminarse físicamente; una "No aplica" nunca (FR-005). Ver Complexity Tracking.                                                                                        |
| Calidad de código: TypeScript strict, sin `any`, ESLint/Prettier           | Sin excepciones necesarias.                                                                                                                                                                                                                                                         |

## Project Structure

### Documentation (this feature)

```text
specs/014-obligaciones-fiscales-cliente/
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
└── <timestamp>_obligaciones_fiscales_cliente_schema.sql
    # plantillas_obligaciones, plantilla_obligaciones_items, obligaciones_fiscales_cliente
    # + RLS + triggers de validación/auditoría + función aplicar_plantilla_obligaciones

apps/admin/src/app/(app)/catalogos/
├── page.tsx                                 # (modificado) hub: agrega la entrada "Plantillas de Obligaciones"
└── plantillas-obligaciones/
    ├── page.tsx                             # Server Component: listado + filtros
    ├── PlantillasObligacionesClient.tsx      # Client Component: alta/edición de plantilla + su lista ordenada de obligaciones
    └── actions.ts                           # Server Actions: crear/editar/activar/desactivar plantilla, agregar/quitar ítems

apps/{admin,portal}/src/app/(app)/clientes/[clienteId]/
├── page.tsx                                 # (modificado) carga obligaciones del cliente + plantillas activas disponibles
└── actions.ts                               # (modificado) agrega Server Actions de obligaciones del cliente (agregar, editar, marcar No aplica, reactivar, eliminar, aplicar plantilla)

packages/ui/src/ClienteDetalleClient.tsx      # (modificado) nueva sección "Obligaciones Fiscales"

packages/utils/src/
├── obligacionFiscalClienteForm.ts            # esquema Yup + mapeo de errores
├── obligacionFiscalClienteForm.test.ts
├── plantillaObligacionesForm.ts
├── plantillaObligacionesForm.test.ts
└── obligacionesFiscalesCliente.integration.test.ts

packages/types/src/database.ts                # (regenerado) incluye las 3 tablas nuevas
```

**Structure Decision**: Misma separación ya usada por Servicios (011, catálogo) y Servicios Contratados (011, dato de cliente): la administración de Plantillas de Obligaciones es un catálogo más dentro de `apps/admin`/`Administración > Catálogos`, mientras que la configuración de Obligaciones Fiscales del Cliente extiende `ClienteDetalleClient.tsx` (compartido) y sus Server Actions en ambas apps. No se introduce un componente `CatalogoAutocompleteField` genérico todavía — se reutiliza directamente el patrón `Autocomplete` ya resuelto en `012`/`013` (destructurar `InputLabelProps`/`InputProps`/`size` de `renderInput` y pasarlos vía `slotProps`).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                                                                   | Why Needed                                                                                                                                                                                                           | Simpler Alternative Rejected Because                                                                                                                                                                                                                                 |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Eliminación física real de una obligación fiscal de cliente Activa (FR-006) | El spec lo exige explícitamente como una acción distinta de "marcar No aplica" (Historia 1 AC4) — la única vía prevista para retirar una obligación agregada por error, sin dejar un registro histórico irrelevante. | Un soft-delete uniforme (como en el resto del sistema) obligaría a fusionar "eliminar" con "No aplica" en una sola acción, contradiciendo explícitamente la Historia 1 (que las distingue) y el Edge Case que impide eliminar una obligación ya marcada "No aplica". |
