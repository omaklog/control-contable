# Specification Quality Checklist: Contactos y Página de Detalle de Cliente

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-17
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- 2026-07-17: Borrador inicial con 3 marcadores [NEEDS CLARIFICATION] (borrado de Contacto, alcance de la sección de pagos pendientes, alcance del enlace hacia el detalle desde los listados).
- 2026-07-17: Las 3 preguntas se resolvieron directamente durante `/speckit-specify` (sin necesidad de una sesión `/speckit-clarify` separada): (1) los Contactos no se eliminan — se marcan como obsoletos/reactivan y se agrega un indicador de "contacto principal" (FR-006, FR-007); (2) la sección de "Pagos pendientes" es visible en el detalle desde ahora, sin lógica de cobranza (FR-011, Assumptions); (3) el enlace al detalle se agrega junto a las acciones existentes de los listados, sin reemplazarlas (FR-012). 16/16 ítems del checklist pasan.
- **Actualización 2026-07-18 (bugfix detectado al refinar `005-clientes-cobranza-expedientes`)**: `setContactoEstado` en `apps/admin`/`apps/portal` no implementaba el edge case ya documentado aquí ("si el único contacto principal se marca como obsoleto, el cliente queda temporalmente sin contacto principal marcado") — el spec ya lo describía correctamente, era el código el que no lo hacía. Corregido en ambas apps (`tasks.md` T028-T030). No requirió cambios en `spec.md`.
- **Actualización 2026-07-18 (alineación con `001-business-domain-model` y `docs/ux/design-system.md`, sin cambio de alcance funcional)**: se agregó a Assumptions una referencia al gap de UX detectado en `ClienteDetalleClient.tsx` (dos columnas de "Estado" como texto plano, sin registrar hasta ahora en `docs/ux/design-system.md` §10 — agregado como punto 9) y otra referencia a la migración futura de esta pantalla hacia "Cliente 360" (§10, punto 4), incluyendo la relación entre la sección "Pagos pendientes" y el futuro tab "Cobranza". Re-validados todos los ítems del checklist: siguen pasando 16/16 sin regresiones.
- **Actualización 2026-07-18 (pasada de `/speckit-clarify`)**: confirmado que no quedaban marcadores `[NEEDS CLARIFICATION]`. Se detectó que el `Input` original mencionaba agregar "contactos o servicios" desde la página de detalle, pero ningún FR/Assumption explicaba por qué "Servicios" quedó fuera del alcance final — se documentó que ese módulo (`001-business-domain-model`) no tiene modelo de datos propio todavía. 16/16 items siguen pasando.
