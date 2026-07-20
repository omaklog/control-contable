# Quickstart: Módulo de Administración de Catálogos

## Prerrequisitos

- Supabase local corriendo (`supabase start`) con la migración `<timestamp>_periodicidades_schema.sql` aplicada (`supabase db reset` o `supabase migration up`).
- `packages/types/src/database.ts` regenerado tras la migración (`supabase gen types typescript --local`, luego `npx prettier --write`).
- `apps/admin` corriendo (`pnpm --filter admin dev`), sesión iniciada con un usuario cuyo rol tenga la capability `manage_catalogs` (Administrador o Contador, según `ROLE_DEFAULT_CAPABILITIES`).

## Escenario 1 — Punto de entrada único (Historia 1, FR-012)

1. Iniciar sesión en `apps/admin` con un usuario con capability `manage_catalogs`.
2. Confirmar que el menú lateral muestra una entrada **Catálogos**.
3. Entrar a `/catalogos` y confirmar que se lista Periodicidades como catálogo disponible.
4. Con un usuario sin `manage_catalogs`, confirmar que la entrada de menú no aparece y que `/catalogos` no es accesible.

**Resultado esperado**: un único punto de entrada de navegación, visible solo para roles con `manage_catalogs` (SC-001).

## Escenario 2 — Consulta de Periodicidades: búsqueda, orden, Autocomplete (Historia 3 y 4, FR-007/FR-008)

1. Entrar a `/catalogos/periodicidades`.
2. Confirmar que los registros se listan en orden alfabético por nombre.
3. Escribir parte de un nombre (ej. "mens") en el campo de búsqueda (`Autocomplete`) y confirmar que aparece "Mensual" como sugerencia seleccionable.
4. Con 10 o menos registros, confirmar que no aparecen controles de paginación; si se insertan manualmente más de 10 vía SQL de prueba, confirmar que sí aparecen (FR-008).

**Resultado esperado**: búsqueda tipo Autocomplete funcional, orden alfabético correcto, paginación condicional (SC-002, SC-004).

## Escenario 3 — Periodicidades es de solo consulta, incluso para Administrador (Historia 3, FR-014)

1. Como Administrador, entrar a `/catalogos/periodicidades`.
2. Confirmar que la pantalla NO muestra ningún botón de "Agregar", "Editar", "Activar" ni "Inactivar".
3. Intentar una escritura directa contra la API de Supabase (`insert`/`update` sobre `periodicidades`) autenticado como Administrador y confirmar que RLS la rechaza (sin política de escritura otorgada).

**Resultado esperado**: ninguna vía de escritura, ni desde la UI ni directamente contra la API, para ningún rol (SC-005).

## Escenario 4 — Integridad histórica de un catálogo editable (Historia 2 y 5, validado con el contrato, no con Periodicidades)

Dado que Periodicidades es protegido y no tiene UI de escritura en v1, este escenario documenta cómo una prueba de integración validaría el contrato común (`contracts/db-functions-rls.md`, sección B) cuando la próxima especificación de catálogo editable lo implemente:

1. Crear un registro de catálogo con un nombre.
2. Inactivarlo.
3. Confirmar que ya no aparece en el `Autocomplete` de selección para nuevos procesos, pero sigue visible en la tabla de administración del catálogo.
4. Confirmar que se puede crear un nuevo registro reutilizando el mismo nombre (ya que el anterior está inactivo, FR-004/Edge Cases).

**Resultado esperado**: ningún catálogo editable pierde información histórica ni bloquea la reutilización de nombres inactivados (SC-003, SC-006).
