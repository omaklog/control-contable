---
description: 'Task list template for feature implementation'
---

# Tasks: Módulo de Administración de Catálogos

**Input**: Design documents from `/specs/012-administracion-catalogos/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/db-functions-rls.md, quickstart.md

**Tests**: Se incluyen pruebas de integración (RLS de `periodicidades`: solo `select` para cualquier staff activo, ningún rol —ni siquiera Administrador— puede escribir; unicidad de nombre solo entre activos) — mismo patrón ya usado en `011` para reglas de negocio y procesos críticos (Constitución, sección Testing).

**Organization**: Tareas agrupadas por historia de usuario (spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1..US5)

## Path Conventions

Monorepo existente: migración nueva en `supabase/migrations/`, hub y pantalla nueva en `apps/admin/src/app/(app)/catalogos/`, entrada de navegación en `apps/admin/src/components/layout/navigation.ts`, pruebas de integración en `packages/utils/src/`.

---

## Phase 1: Setup

**Purpose**: Scaffold del archivo de migración.

- [x] T001 Crear `supabase/migrations/<timestamp>_periodicidades_schema.sql` con el encabezado de referencia a este spec (`012-administracion-catalogos`), siguiendo el mismo formato de comentario que `20260718110000_servicios_schema.sql`

**Checkpoint**: Archivo de migración listo para completarse.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquema de base de datos completo (tabla, índice, RLS, seed) — bloquea las 5 historias, ya que todas dependen de que `periodicidades` exista y esté sembrada.

**⚠️ CRITICAL**: Ninguna historia puede implementarse hasta completar esta fase.

- [x] T002 Definir el enum `periodicidad_estado` (`activo`, `inactivo`) en la migración (data-model.md, contracts/db-functions-rls.md sección A)
- [x] T003 Crear la tabla `periodicidades` (`nombre`, `descripcion`, `estado` default `activo`, `created_at`/`updated_at`/`created_by`/`updated_by`) en la migración (data-model.md) (depende de T002)
- [x] T004 Crear el índice único parcial `periodicidades_nombre_activo_unique` sobre `nombre` `where estado = 'activo'` (contracts/db-functions-rls.md sección A, FR-004, Edge Cases) (depende de T003)
- [x] T005 Crear la política RLS `periodicidades_select_all_staff` (cualquier staff autenticado con `profiles.is_active`) y `grant select` a `authenticated` — sin crear ninguna política de `insert`/`update`/`delete` para `authenticated` (contracts/db-functions-rls.md sección A, FR-014) (depende de T003)
- [x] T006 Agregar el seed inicial (`Mensual`, `Bimestral`, `Trimestral`, `Semestral`, `Anual`) en la misma migración (research.md #6, contracts/db-functions-rls.md sección A) (depende de T003, T004)
- [x] T007 Aplicar la migración localmente (`supabase migration up` o `supabase db reset`) y verificar el esquema con `psql` (quickstart.md prerrequisitos): tabla, índice único parcial, política RLS, seed presentes (depende de T002-T006)
- [x] T008 Regenerar `packages/types/src/database.ts` (`supabase gen types typescript --local`, copiar sobre el archivo real, `npx prettier --write`) para incluir la tabla `periodicidades` (depende de T007)

**Checkpoint**: Esquema completo, sembrado y verificado — las historias de usuario pueden implementarse.

---

## Phase 3: User Story 1 - Un único punto de entrada para administrar catálogos (Priority: P1) 🎯 MVP

**Goal**: Entrada de navegación "Catálogos" en `apps/admin` que lleva a un hub listando los catálogos disponibles (en v1, solo Periodicidades), accesible únicamente para Administrador.

**Independent Test**: Entrar a "Administración > Catálogos" como Administrador y confirmar que ahí aparece listado el catálogo de Periodicidades, con acceso a su propia pantalla; confirmar que un usuario sin `manage_catalogs` no puede acceder.

### Implementation for User Story 1

- [x] T009 [US1] Crear `apps/admin/src/app/(app)/catalogos/page.tsx` — Server Component con `requireCapability('manage_catalogs')` que renderiza la lista de catálogos disponibles (en v1: una tarjeta/enlace "Periodicidades" apuntando a `/catalogos/periodicidades`), mismo patrón de página protegida que `servicios/page.tsx` (depende de T008)
- [x] T010 [US1] Agregar el ítem de navegación "Catálogos" en `apps/admin/src/components/layout/navigation.ts`, gateado por `manage_catalogs`, y actualizar el comentario del archivo que anticipaba "módulos administrativos futuros (Catálogos, Configuración) aún no especificados" ya que Catálogos deja de estar sin especificar (research.md #1) (depende de T009)

**Checkpoint**: El punto de entrada "Administración > Catálogos" es funcional y protegido — MVP de esta feature completo (aunque el hub solo lista un catálogo por ahora).

---

## Phase 4: User Story 2 - Ciclo de vida consistente de cualquier catálogo (Priority: P1)

**Goal**: Documentar y demostrar, usando `periodicidades` como referencia visible, que el contrato común (estado Activo/Inactivo, nunca eliminación física, nombre único solo entre activos) ya está correctamente implementado a nivel de esquema — aun cuando Periodicidades en sí no expone esas acciones en su UI (Historia 3).

**Independent Test**: Confirmar, contra el esquema de `periodicidades`, que el patrón de estado funciona como lo haría en cualquier catálogo editable futuro: los registros nuevos nacen `activo`, ningún mecanismo de la aplicación permite eliminarlos físicamente, y un nombre puede reutilizarse una vez que el registro que lo tenía queda `inactivo`.

### Implementation for User Story 2

- [x] T011 [P] [US2] Prueba de integración `packages/utils/src/periodicidades.integration.test.ts` — caso 1: un registro nuevo insertado (vía rol de servicio en el setup de la prueba) nace con `estado = 'activo'` por defecto (depende de T007)
- [x] T012 [P] [US2] En el mismo archivo — caso 2: ningún rol autenticado (incluido uno con `manage_catalogs`) puede ejecutar `delete` sobre `periodicidades` vía PostgREST (no hay política de `delete`, FR-003) (depende de T007)
- [x] T013 [P] [US2] En el mismo archivo — caso 3: al marcar `inactivo` un registro existente (vía rol de servicio) su `nombre` puede reutilizarse en un nuevo registro `activo` sin violar el índice único parcial (Edge Cases, FR-004) (depende de T007)

**Checkpoint**: El contrato de ciclo de vida (estado, soft-delete, unicidad entre activos) queda demostrado y verificado a nivel de esquema — listo para que los specs futuros de catálogos editables (Tipos de Documento, Régimen Fiscal, Obligaciones Fiscales) lo hereden sin redefinirlo.

---

## Phase 5: User Story 3 - Catálogos protegidos, de solo consulta (Priority: P2)

**Goal**: La pantalla de Periodicidades permite únicamente consultar (buscar, ordenar, ver detalle), sin ningún botón ni ruta de alta/edición/activación/inactivación — ni en la UI ni contra la API, para ningún usuario.

**Independent Test**: Entrar al catálogo de Periodicidades y confirmar que solo se puede consultar, sin ninguna acción de escritura disponible; confirmar además que un intento directo de `insert`/`update` contra la API (incluso autenticado como Administrador) es rechazado por RLS.

### Implementation for User Story 3

- [x] T014 [US3] Crear `apps/admin/src/app/(app)/catalogos/periodicidades/page.tsx` — Server Component con `requireCapability('manage_catalogs')` que carga todos los registros de `periodicidades` ordenados por `nombre`, sin ninguna ruta de escritura (sin `actions.ts` en este directorio) (depende de T008)
- [x] T015 [US3] Crear `apps/admin/src/app/(app)/catalogos/periodicidades/PeriodicidadesClient.tsx` — tabla envuelta en `Paper` (patrón `009`) con `StatusChip` para Estado, sin ningún botón ni acción de escritura (sin Editar/Activar/Desactivar/Agregar) (depende de T014)
- [x] T016 [P] [US3] En `packages/utils/src/periodicidades.integration.test.ts` — caso 4: un usuario con rol Administrador (capability `manage_catalogs`) recibe error de RLS al intentar `insert` o `update` sobre `periodicidades` vía PostgREST (FR-014, Edge Cases, SC-005) (depende de T007)

**Checkpoint**: Periodicidades es un catálogo de solo consulta verificable tanto en la UI como a nivel de API — ninguna vía de escritura existe para nadie.

---

## Phase 6: User Story 4 - Buscar y seleccionar valores de catálogo de forma consistente (Priority: P2)

**Goal**: La pantalla de Periodicidades ofrece búsqueda tipo Autocomplete (escritura anticipada), orden alfabético, y paginación solo cuando hay más de diez registros.

**Independent Test**: Buscar un valor del catálogo de Periodicidades escribiendo parte de su nombre y confirmar que aparece como sugerencia seleccionable; confirmar que el listado completo se ordena alfabéticamente; confirmar que no hay controles de paginación con 10 o menos registros.

### Implementation for User Story 4

- [x] T017 [US4] Extender `apps/admin/src/app/(app)/catalogos/periodicidades/page.tsx` para leer `searchParams` (`page`) y aplicar paginación (`range`) solo cuando `count(*) > 10`, mismo patrón condicional que `servicios/page.tsx` pero con el umbral de diez (FR-008) (depende de T014)
- [x] T018 [US4] Extender `apps/admin/src/app/(app)/catalogos/periodicidades/PeriodicidadesClient.tsx` con un campo de búsqueda implementado con `Autocomplete` de MUI sobre `nombre` (escritura anticipada), y controles de paginación (`TablePagination` o equivalente) que solo se renderizan cuando el total supera diez registros (research.md #2, contracts/db-functions-rls.md sección C, FR-007/FR-008) (depende de T015, T017)
- [x] T019 [P] [US4] En `packages/utils/src/periodicidades.integration.test.ts` — caso 5: una consulta `select` con `order by nombre` devuelve los registros en orden alfabético (FR-007, SC-002) (depende de T007)

**Checkpoint**: La experiencia de consulta (búsqueda, orden, paginación condicional) queda completa y es la referencia que los catálogos editables futuros deben replicar.

---

## Phase 7: User Story 5 - Conservar la integridad de la información histórica (Priority: P3)

**Goal**: Demostrar, a nivel de contrato de consulta, que un elemento inactivo sigue siendo consultable (visible en el listado de administración del catálogo) aunque deje de estar disponible para nuevas selecciones — el patrón que todo catálogo editable futuro debe seguir cuando otro módulo lo referencie.

**Independent Test**: Con un registro de `periodicidades` marcado `inactivo` (vía rol de servicio, ya que Periodicidades no expone inactivación en su UI), confirmar que sigue apareciendo en el listado completo de la pantalla de administración del catálogo, pero no en una consulta filtrada a `estado = 'activo'` (la que usaría cualquier selector de "nuevos procesos").

### Implementation for User Story 5

- [x] T020 [P] [US5] En `packages/utils/src/periodicidades.integration.test.ts` — caso 6: un registro marcado `inactivo` (vía rol de servicio) sigue siendo devuelto por una consulta `select` sin filtro de estado, pero queda excluido de una consulta filtrada a `estado = 'activo'` (FR-009, SC-004, Historia 5) (depende de T007)

**Checkpoint**: Todas las historias de usuario quedan implementadas y verificadas de forma independiente.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validación final y limpieza.

- [x] T021 [P] Ejecutar `pnpm --filter admin lint` y `pnpm --filter admin type-check` — confirmar cero errores tras agregar las rutas de `/catalogos`
- [x] T022 [P] Ejecutar `pnpm --filter @control-contable/utils test` — confirmar que las pruebas de `periodicidades.integration.test.ts` pasan
- [ ] T023 Ejecutar los 4 escenarios de `quickstart.md` manualmente en el navegador (**Bloqueada para mí** — sin Playwright/chromium disponible; requiere validación manual del usuario)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — puede iniciar de inmediato.
- **Foundational (Phase 2)**: Depende de Setup — bloquea las 5 historias de usuario.
- **Historias de usuario (Phase 3-7)**: Todas dependen de Foundational.
  - US1 (hub + navegación) no depende de las demás historias, pero es el MVP natural por ser el punto de entrada.
  - US2 (contrato de ciclo de vida) es solo verificación de esquema — no depende de US1, US3 o US4.
  - US3 (pantalla protegida) depende de que exista la tabla (Foundational) pero no de US1/US2/US4 para poder probarse de forma aislada (aunque en la práctica se navega a ella desde US1).
  - US4 (búsqueda/orden/paginación) extiende los mismos archivos que US3 — se implementa después de US3 por dependencia de archivo, no por dependencia lógica de historia.
  - US5 (integridad histórica) es solo verificación de esquema — no depende de US1/US3/US4.
- **Polish (Phase 8)**: Depende de que todas las historias deseadas estén completas.

### Parallel Opportunities

- T011, T012, T013 (US2) pueden ejecutarse en paralelo entre sí (mismo archivo pero casos independientes — coordinar al escribir, no al ejecutar `describe`/`it`).
- T016 (US3), T019 (US4) y T020 (US5) se agregan al mismo archivo de prueba de integración que T011-T013 — desarrollarlos secuencialmente para evitar conflictos de edición concurrente, aunque lógicamente son independientes.
- T021 y T022 (Polish) pueden ejecutarse en paralelo.

---

## Parallel Example: User Story 2

```bash
# Los tres casos de prueba de ciclo de vida pueden diseñarse en paralelo (mismo archivo, distintos `it()`):
Task: "Caso: un registro nuevo nace con estado 'activo' por defecto"
Task: "Caso: ningún rol puede hacer delete sobre periodicidades"
Task: "Caso: un nombre se puede reutilizar tras inactivar el registro que lo tenía"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea todas las historias)
3. Completar Phase 3: User Story 1 (hub + navegación)
4. **DETENER Y VALIDAR**: confirmar que "Administración > Catálogos" es accesible y protegido
5. Continuar con US3/US4 para que el hub tenga un catálogo real que mostrar de punta a punta

### Incremental Delivery

1. Setup + Foundational → esquema de `periodicidades` listo
2. US1 → hub navegable (MVP)
3. US2 → contrato de ciclo de vida verificado a nivel de esquema
4. US3 → pantalla de Periodicidades, de solo consulta
5. US4 → búsqueda/orden/paginación en esa misma pantalla
6. US5 → integridad histórica verificada
7. Polish → lint/type-check/tests/validación manual

---

## Notes

- [P] tareas = archivos distintos o casos independientes dentro del mismo archivo de prueba, sin dependencias pendientes.
- [Story] etiqueta cada tarea con su historia de usuario para trazabilidad.
- US2 y US5 son deliberadamente tareas de verificación de esquema/RLS, no de UI — Periodicidades es protegido y no expone las acciones que esas historias documentan como contrato para catálogos editables futuros.
- Commit tras cada tarea o grupo lógico.
- Detenerse en cada checkpoint para validar la historia de forma independiente.
