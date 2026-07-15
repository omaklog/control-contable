# Specification Quality Checklist: Autenticación y Roles con Supabase

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-14
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

- La especificación menciona "Supabase" únicamente en el campo `Input` (petición original del usuario) y en `Assumptions`/contexto de arquitectura del monorepo (apps `admin`/`portal`), no como requisito de implementación dentro de los criterios funcionales o de éxito.
- Se optó por resolver mediante supuestos documentados (roles Administrador/Contador/Auxiliar, sin MFA obligatoria, sin autoregistro) en lugar de marcadores [NEEDS CLARIFICATION], ya que el contexto del proyecto (constitución + separación de apps `admin`/`portal`) ofrece un valor por defecto razonable. Estos supuestos deben confirmarse con el usuario antes o durante `/speckit-plan` si el detalle fino de permisos por rol resulta crítico. (El rol "Cliente" mencionado originalmente aquí se eliminó en la sesión de clarificación del 2026-07-15 — ver Notes más abajo.)
- Todos los items pasan validación en la primera iteración.
- **Actualización 2026-07-15 (sesión de clarificación)**: FR-008/FR-013 y SC-005 mencionan "SMTP"/"correo electrónico" como una restricción de negocio explícita (el sistema NO debe depender de ese proveedor para el restablecimiento de contraseña), no como una elección de implementación prescrita — se mantiene consistente con el criterio de "sin detalles de implementación" de este checklist, igual que las menciones existentes de "Supabase". Los tres cambios de esta sesión (alcance limitado al restablecimiento, mecanismo `must_change_password`, contraseña temporal generada por el sistema) se re-validaron contra todos los ítems y siguen pasando sin cambios de estado.
- **Actualización 2026-07-15 (segunda sesión de clarificación, mismo día)**: cinco cambios adicionales — (1) el alta de cuentas nuevas pasa de invitación por correo a alta manual con contraseña temporal (mismo mecanismo que el restablecimiento); (2) se elimina la entidad "Invitación de cuenta"/`account_invitations`; (3) se elimina el rol Cliente y el concepto de `account_type` (personal/cliente); (4) `apps/portal` se repropone como segunda aplicación de personal (Administrador, Contador, Auxiliar), con `apps/admin` restringida exclusivamente a Administrador; (5) se agrega un nuevo FR-014/SC-007 para ajustes de permisos individuales por usuario, gestionados por un Administrador. Historia 1 y Historia 2 se reescribieron completas; Historia 3, Edge Cases, Key Entities, Success Criteria y Assumptions se actualizaron en consistencia. Re-validados todos los ítems del checklist contra la spec resultante: siguen pasando 16/16 sin regresiones — los cambios son coherentes con "sin detalles de implementación", criterios medibles y testables, y no introducen marcadores `[NEEDS CLARIFICATION]`.
