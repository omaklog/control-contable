# Implementation Plan: Modelo de Dominios de Negocio — Seguimiento de Ajustes Pendientes

**Branch**: `001-business-domain-model` | **Date**: 2026-07-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-business-domain-model/spec.md`

## Summary

`001-business-domain-model` es un documento de referencia conceptual (FR-014: no define esquema de base de datos, interfaces, endpoints ni reglas de módulo) — no produce código, por lo que este plan no cubre una implementación técnica en el sentido habitual. En su lugar, cubre el **seguimiento accionable** de la sección "Actualizaciones Pendientes en Specs Existentes" del spec:

1. **Accionable ahora**: proponer y, con aprobación explícita, aplicar la actualización de la lista de módulos en `.specify/memory/constitution.md` para alinearla con los dominios de `001` (punto 3 de Actualizaciones Pendientes).
2. **Diferido, no accionable todavía**: los puntos 1 y 2 (catálogo de Servicios detrás de los cargos de Cobranza; relación de Documentos con un futuro Periodo Fiscal) requieren que se escriba primero el spec funcional del dominio correspondiente (Servicios, Gestión Fiscal) — este plan solo registra el disparador y el orden en que deben abordarse, sin diseñarlos.
3. **Notificaciones**: confirmado como dominio enteramente nuevo sin acción de seguimiento pendiente (no hay spec ni implementación previa que ajustar).

## Technical Context

Este plan no introduce ni modifica código, esquema de base de datos, dependencias ni infraestructura — los campos técnicos habituales de esta sección no aplican:

**Language/Version**: N/A — sin cambios de código.

**Primary Dependencies**: N/A.

**Storage**: N/A — no se modifica ningún esquema de Supabase en este plan (los ajustes de esquema de Servicios/Gestión Fiscal quedan diferidos a sus propios specs, ver Summary).

**Testing**: N/A — no hay comportamiento ejecutable que probar; la validación es documental (ver quickstart.md).

**Target Platform**: N/A.

**Project Type**: Documentación/gobernanza del monorepo — actualización de `.specify/memory/constitution.md` y registro de seguimiento, no una app/paquete.

**Performance Goals**: N/A.

**Constraints**: La actualización de la Constitución es un cambio de gobernanza del proyecto — no se aplica sin que el equipo confirme la redacción exacta propuesta (research.md, Decisión 1). No se toca ningún esquema de base de datos ya construido (`clientes`, `cargos_cobranza`, `documentos`, etc.) en este plan.

**Scale/Scope**: Un archivo de gobernanza (`constitution.md`) + los registros de seguimiento de este spec; sin alcance de datos ni UI.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Principio de Evolución** ("la arquitectura deberá favorecer la incorporación de nuevos módulos... siguiendo las convenciones definidas en esta Constitución"): este plan es precisamente el mecanismo para mantener la Constitución alineada con los dominios reales del sistema a medida que aparecen (Servicios, Gestión Fiscal, Notificaciones). ✅ Cumple, es el propósito del plan.
- **Gobernanza del documento que se modifica**: dado que este plan propone editar la propia Constitución, la aprobación no puede ser automática — el gate real es la confirmación explícita del equipo sobre la redacción exacta antes de aplicarla (ver research.md, Decisión 1). ⚠️ Gate condicionado a esa confirmación, no a un criterio técnico.
- **No reemplazar decisiones existentes sin justificar** (spec.md FR-013): los puntos 1 y 2 de Actualizaciones Pendientes se dejan explícitamente diferidos, no se fuerza su resolución aquí. ✅ Cumple.

No se detectan violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-business-domain-model/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command) — documental, sin entidades de datos nuevas
├── quickstart.md        # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
.specify/memory/constitution.md
    # Único archivo candidato a modificarse como efecto de este plan: la
    #   sección "Arquitectura de la Aplicación" → lista de módulos.
    #   Redacción exacta propuesta en research.md, Decisión 1 — se aplica
    #   solo tras confirmación explícita (no es parte automática de /speckit-implement).

specs/001-business-domain-model/spec.md
    # Sin cambios de contenido; ya contiene la sección "Actualizaciones
    #   Pendientes" que este plan da seguimiento.

(sin cambios en apps/admin, apps/portal, packages/*, supabase/migrations/)
```

**Structure Decision**: No hay una "estructura de código" que decidir — este plan no toca `apps/*` ni `packages/*` ni `supabase/migrations/`. El único artefacto candidato a modificarse es la Constitución (gobernanza), y solo tras confirmación explícita. Los dos ajustes restantes (Servicios, Gestión Fiscal) permanecen como trabajo diferido documentado, sin estructura propia todavía — la tendrán cuando se escriba el spec funcional de cada uno.

## Complexity Tracking

> No violations — section not applicable.
