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
- **Actualización 2026-07-16 (tercera sesión de clarificación)**: tres refinamientos de UX/datos detectados durante revisión — (1) el nombre completo pasa a ser obligatorio en el alta de cuenta (FR-015, SC-008), para que la tabla de usuarios deje de mostrar el identificador interno como respaldo; (2) se agrega un control de mostrar/ocultar contraseña tanto en el inicio de sesión como en el formulario de nueva contraseña (FR-016); (3) se reserva un espacio de logotipo en el login y en el `AppBar` de `apps/portal` (FR-017, con marcador de posición mientras no exista el archivo real — este último punto toca un componente de la feature `004-portal-main-layout` ya completada). Re-validados todos los ítems del checklist: siguen pasando 16/16 sin regresiones.
- **Actualización 2026-07-16 (cuarta sesión de clarificación, mismo día)**: se detectó que las cuentas ya existentes (creadas antes de FR-015) seguían mostrando el identificador interno, ya que el nombre obligatorio solo aplicaba al alta — se agrega FR-018 (editar nombre de una cuenta existente mediante diálogo dedicado) y se actualiza el Edge Case correspondiente para reflejar que ya no es un caso sin resolver. También se agrega FR-019 (columna de correo electrónico en la tabla de gestión de usuarios, obtenida server-side con `service_role`, sin duplicar el dato en `profiles`) y SC-009. Re-validados todos los ítems del checklist: siguen pasando 16/16 sin regresiones.
