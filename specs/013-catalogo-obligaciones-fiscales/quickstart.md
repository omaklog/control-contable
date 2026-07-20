# Quickstart: Catálogo de Obligaciones Fiscales

## Prerrequisitos

- Supabase local corriendo (`supabase start`) con la migración `<timestamp>_obligaciones_fiscales_schema.sql` aplicada.
- `packages/types/src/database.ts` regenerado tras la migración.
- `apps/admin` corriendo (`pnpm --filter admin dev`), sesión iniciada con un usuario con capability `manage_catalogs`.
- El catálogo de Periodicidades (`012`) ya sembrado (Mensual, Bimestral, Trimestral, Semestral, Anual, etc.).

## Escenario 1 — Mantener el catálogo (Historia 1, FR-001/FR-002/FR-003)

1. Entrar a "Administración > Catálogos" y abrir "Obligaciones Fiscales".
2. Crear una obligación con nombre "Declaración Mensual ISR", periodicidad "Mensual" y una prioridad.
3. Confirmar que queda creada en estado Activo.
4. Intentar crear otra obligación con el mismo nombre mientras la primera sigue activa — confirmar que el sistema lo rechaza.
5. Inactivar la obligación y confirmar que sigue apareciendo en el listado, marcada como Inactiva.
6. Reactivarla y confirmar que vuelve a estar disponible.
7. Con un usuario sin `manage_catalogs`, confirmar que no puede crear, editar, activar ni inactivar (SC-005).

**Resultado esperado**: ciclo de vida completo (alta/edición/activación/inactivación) funcional y restringido a Administrador.

## Escenario 2 — Periodicidad y prioridad (Historia 2, FR-004/FR-008)

1. Al crear/editar una obligación, confirmar que el selector de periodicidad (Autocomplete) solo ofrece periodicidades activas.
2. Cambiar la periodicidad de una obligación ya existente y confirmar que el cambio se guarda.
3. Asignar una prioridad repetida (el mismo número) a dos obligaciones distintas y confirmar que el sistema lo permite (FR-008).

**Resultado esperado**: la periodicidad siempre proviene de las activas del catálogo de Periodicidades; la prioridad es libre y no exclusiva.

## Escenario 3 — Búsqueda y conservación de historial (Historia 3, FR-005/FR-006)

1. Buscar una obligación escribiendo parte de su nombre y confirmar que aparece como sugerencia seleccionable.
2. Confirmar que el listado se muestra en orden alfabético.
3. Con 10 registros o menos, confirmar que no hay controles de paginación; con más de 10, confirmar que sí aparecen.
4. Inactivar una obligación y confirmar que sigue siendo consultable en el listado del catálogo.

**Resultado esperado**: experiencia de búsqueda/orden/paginación consistente con el resto de catálogos (`012`), y ninguna obligación desaparece de la vista del catálogo al inactivarse.
