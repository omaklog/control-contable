# Implementation Plan: Control de Cumplimiento Fiscal

**Branch**: `015-control-cumplimiento-fiscal` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-control-cumplimiento-fiscal/spec.md`

## Summary

Bandeja operativa cruzada entre clientes para dar seguimiento al cumplimiento de las obligaciones fiscales ya configuradas en Gestión Fiscal del Cliente (`014`). Genera automáticamente (mensual, idempotente, vía `pg_cron`) y manualmente un registro de cumplimiento por obligación activa y periodo (según la periodicidad de `012`), permite avanzar su estado (Pendiente → En proceso → Presentada, o No aplica), asociar evidencia documental del Expediente Fiscal (`005`) y conservar un historial completo de cambios reutilizando `business_audit_log` (005). "Vencida" es una condición calculada, nunca un estado almacenado (Clarifications). También admite cumplimientos extraordinarios fuera de la configuración habitual del cliente.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict), SQL/PL-pgSQL (PostgreSQL vía Supabase migrations)

**Primary Dependencies**: Next.js App Router (Server Components + Server Actions), MUI 6 (`Table`/`Paper`/`Chip` vía `StatusChip`, `Autocomplete` para filtros y para elegir documentos/obligación extraordinaria), Supabase JS client, `@control-contable/auth` (`view_clients`/`manage_clients`, mismas capacidades ya usadas por Servicios Contratados `011` y Obligaciones Fiscales del Cliente `014` — sin capability nueva), extensión PostgreSQL `pg_cron` (disponible pero no habilitada en la imagen local, confirmado vía `pg_available_extensions`) para la generación automática mensual.

**Storage**: PostgreSQL (Supabase). Dos tablas nuevas: `cumplimientos_fiscales` (registro central) y `cumplimiento_fiscal_documentos` (asociación N:N con `documentos` del Expediente Fiscal, `005`). Reutiliza `business_audit_log`/`log_business_audit()` (005) como fuente única del historial de cambios — no se crea una tabla de historial propia (consistente con cómo `ServicioHistorialDialog` de `011` ya lee `business_audit_log` directamente).

**Testing**: Vitest (`packages/utils` para el cálculo de periodos por periodicidad y el mapeo de errores; `packages/utils/*.integration.test.ts` contra Supabase local para RLS, idempotencia de la generación, unicidad por obligación+periodo, rechazo de documentos de otro cliente, y que "Presentada" nunca vuelva a "Vencida")

**Target Platform**: `apps/portal` únicamente — es una bandeja operativa de uso diario del personal del despacho (Constitución: "Portal... gestión diaria de clientes, expedientes, cobranza"), no una tarea de administración/configuración (`apps/admin`). Reutiliza el ítem de navegación de nivel superior **ya reservado** en `apps/portal/src/components/layout/navigation.ts` ("Obligaciones Fiscales", `href: '/obligaciones-fiscales'`, `implemented: false`, sin capability — el propio comentario del archivo dice "no existe ese módulo").

**Project Type**: Web application (monorepo Next.js, `apps/portal` + paquetes compartidos)

**Performance Goals**: N/A explícito — volumen esperado del orden de cientos de registros por despacho por mes; sin metas de throughput/latencia particulares.

**Constraints**: No pueden existir dos cumplimientos para la misma obligación configurada del cliente y el mismo periodo (FR-017); un documento asociado debe pertenecer al mismo cliente del cumplimiento (FR-009); "Vencida" es siempre derivado, nunca almacenado (FR-004/FR-005); ningún registro se elimina físicamente (FR-015).

**Scale/Scope**: 2 tablas nuevas, 1 función de generación (`generar_cumplimientos_fiscales`) programada mensualmente vía `pg_cron` y también invocable manualmente, 1 función de validación de documento, 2 triggers de auditoría, 1 nueva ruta en `apps/portal` (bandeja + detalle), actualización de un ítem de navegación ya reservado.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio de la Constitución                                               | Cumplimiento                                                                                                                                                                                                                                |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reglas de negocio fuera de componentes React                               | La generación (idempotente, basada en periodicidad), el cálculo de "Vencida" y la validación "documento del mismo cliente" se implementan en funciones/triggers de base de datos, no en el cliente React.                                   |
| Monorepo / código compartido, evitar duplicación                           | Reutiliza `StatusChip`, `has_capability`/`requireCapability`, `business_audit_log` como fuente de historial (mismo patrón que `ServicioHistorialDialog`, 011), y el patrón de tabla+filtros+`Autocomplete` ya usado en catálogos (012/013). |
| Seguridad: control de permisos por usuario, nunca confiar solo en frontend | RLS exige `manage_clients` para escribir (cambiar estado, fecha límite, responsable, asociar/desasociar documentos) y `view_clients`/`manage_clients` para consultar — igual que el resto de datos operativos de cliente.                   |
| Base de datos: trazabilidad, soft-delete, nunca eliminación física         | `cumplimientos_fiscales` no tiene política de `delete`; el estado es el único mecanismo de cambio (FR-015).                                                                                                                                 |
| Calidad de código: TypeScript strict, sin `any`, ESLint/Prettier           | Sin excepciones necesarias.                                                                                                                                                                                                                 |

No se identifican violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/015-control-cumplimiento-fiscal/
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
└── <timestamp>_cumplimientos_fiscales_schema.sql
    # cumplimientos_fiscales, cumplimiento_fiscal_documentos, RLS, triggers de
    # validación/auditoría, función de cálculo de periodos, función de
    # generación, programación vía pg_cron

apps/portal/src/app/(app)/obligaciones-fiscales/
├── page.tsx                              # Server Component: bandeja con filtros (cliente/RFC/obligación/periodo/estado/responsable), vencidos primero
├── ObligacionesFiscalesClient.tsx         # Client Component: tabla principal + acción "Generar cumplimientos"
├── [cumplimientoId]/
│   ├── page.tsx                          # Detalle: datos, documentos asociados, acuse, historial
│   └── CumplimientoDetalleClient.tsx     # Cambiar estado, fecha límite, responsable, asociar/desasociar documentos
└── actions.ts                            # Server Actions: generarCumplimientos, cambiarEstado, cambiarFechaLimite, cambiarResponsable, asociarDocumento, desasociarDocumento, crearCumplimientoExtraordinario

apps/portal/src/components/layout/navigation.ts
└── (modificado) el ítem "Obligaciones Fiscales" pasa a implemented: true con capability: 'view_clients'

packages/utils/src/
├── cumplimientoFiscalForm.ts              # esquema Yup (extraordinario, cambios de fecha/responsable) + mapeo de errores
├── cumplimientoFiscalForm.test.ts
└── cumplimientosFiscales.integration.test.ts

packages/types/src/database.ts             # (regenerado) incluye las 2 tablas nuevas
```

**Structure Decision**: Primera pantalla "cruzada entre clientes" del sistema — a diferencia de Servicios Contratados (011) y Obligaciones Fiscales del Cliente (014), que viven anidadas en `ClienteDetalleClient.tsx` (un cliente a la vez), esta bandeja lista cumplimientos de TODOS los clientes en una sola vista, por lo que se construye como una ruta de nivel superior en `apps/portal`, no como una sección más del detalle de cliente. Reutiliza el ítem de navegación "Obligaciones Fiscales" que `004-portal-main-layout` ya dejó reservado sin implementar.

## Complexity Tracking

> No violations to justify — table intentionally omitted.
