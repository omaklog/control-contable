---
description: 'Task list template for feature implementation'
---

# Tasks: Catálogo de Obligaciones Fiscales

**Input**: Design documents from `/specs/013-catalogo-obligaciones-fiscales/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/db-functions-rls.md, quickstart.md

**Tests**: Se incluyen pruebas unitarias (validación de formulario, mapeo de errores) y de integración (RLS, unicidad de nombre, validación de periodicidad activa) — mismo patrón ya usado en `011`/`012` para reglas de negocio y catálogos administrables.

**Organization**: Tareas agrupadas por historia de usuario (spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos o casos independientes, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1..US3)

## Path Conventions

Monorepo existente: migración nueva en `supabase/migrations/`, pantalla nueva dentro del hub de catálogos en `apps/admin/src/app/(app)/catalogos/obligaciones-fiscales/`, validaciones/pruebas en `packages/utils/src/`.

---

## Phase 1: Setup

**Purpose**: Scaffold del archivo de migración.

- [x] T001 Crear `supabase/migrations/<timestamp>_obligaciones_fiscales_schema.sql` con el encabezado de referencia a este spec (`013-catalogo-obligaciones-fiscales`), siguiendo el mismo formato de comentario que `20260720120000_periodicidades_schema.sql`

**Checkpoint**: Archivo de migración listo para completarse.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquema de base de datos completo (tabla, índice, RLS, triggers) — bloquea las 3 historias, ya que todas dependen de que `obligaciones_fiscales` exista y valide correctamente su relación con `periodicidades`.

**⚠️ CRITICAL**: Ninguna historia puede implementarse hasta completar esta fase.

- [x] T002 Definir el enum `obligacion_fiscal_estado` (`activo`, `inactivo`) en la migración (data-model.md, contracts/db-functions-rls.md)
- [x] T003 Crear la tabla `obligaciones_fiscales` (`nombre`, `descripcion`, `periodicidad_id` FK a `periodicidades`, `prioridad` entero, `estado`, `created_at`/`updated_at`/`created_by`/`updated_by`) en la migración (data-model.md) (depende de T002)
- [x] T004 Crear el índice único parcial `obligaciones_fiscales_nombre_activo_unique` sobre `nombre` `where estado = 'activo'` (contracts/db-functions-rls.md, FR-002, Edge Cases) (depende de T003)
- [x] T005 Crear las políticas RLS `obligaciones_fiscales_select_all_staff` (cualquier staff autenticado con `profiles.is_active`), `obligaciones_fiscales_insert_manage_catalogs`/`_update_manage_catalogs` (`has_capability('manage_catalogs')`), sin política ni `grant` de `delete` (contracts/db-functions-rls.md, FR-001/FR-003) (depende de T003)
- [x] T006 Crear el trigger `validar_periodicidad_activa_obligacion()` (`BEFORE INSERT OR UPDATE OF periodicidad_id`) que valida que `periodicidad_id` referencie una periodicidad `activa` (contracts/db-functions-rls.md, research.md #3, FR-004) (depende de T003)
- [x] T007 Crear el trigger de auditoría `trg_obligaciones_fiscales_audit_fn()` (`AFTER INSERT/UPDATE`) que llama a `log_business_audit('obligacion_fiscal', ...)` con `accion` = `'alta'`/`'edicion'`/`'activacion'`/`'desactivacion'` según corresponda, mismo patrón que `trg_servicios_audit_fn()` (011) (contracts/db-functions-rls.md, research.md #4) (depende de T003)
- [x] T008 Aplicar la migración localmente (`supabase migration up`) y verificar el esquema con `psql`/`docker exec`: tabla, FK a `periodicidades`, índice único parcial, políticas RLS y triggers presentes (depende de T002-T007)
- [x] T009 Regenerar `packages/types/src/database.ts` (`supabase gen types typescript --local`, copiar sobre el archivo real, `npx prettier --write`) para incluir la tabla `obligaciones_fiscales` (depende de T008)

**Checkpoint**: Esquema completo y verificado — las historias de usuario pueden implementarse.

---

## Phase 3: User Story 1 - Mantener el catálogo de obligaciones fiscales del despacho (Priority: P1) 🎯 MVP

**Goal**: Pantalla de Obligaciones Fiscales dentro del hub de catálogos — crear, editar, activar, desactivar, filtrar.

**Independent Test**: Crear, editar, activar y desactivar obligaciones del catálogo, y filtrar el listado por nombre/periodicidad/estado, sin que exista todavía ninguna plantilla ni obligación fiscal de cliente.

### Implementation for User Story 1

- [x] T010 [P] [US1] Crear `packages/utils/src/obligacionFiscalForm.ts` — esquema Yup (`nombre`, `descripcion`, `periodicidadId`, `prioridad` como entero positivo) y `mapearErrorObligacionFiscalAMensaje()` (detecta la violación del índice único de nombre y sugiere inactivar/reutilizar), mismo patrón que `servicioForm.ts` (011)
- [x] T011 [P] [US1] Prueba unitaria `packages/utils/src/obligacionFiscalForm.test.ts` para la validación y el mapeo de errores (depende de T010)
- [x] T012 [US1] Crear `apps/admin/src/app/(app)/catalogos/obligaciones-fiscales/actions.ts` — Server Actions `createObligacionFiscal`, `updateObligacionFiscal`, `setObligacionFiscalEstado` (requieren `manage_catalogs`), mismo patrón `ActionResult` que `servicios/actions.ts` (depende de T005, T007)
- [x] T013 [US1] Crear `apps/admin/src/app/(app)/catalogos/obligaciones-fiscales/page.tsx` — Server Component que carga el catálogo paginado (orden alfabético por nombre, paginación solo con más de diez registros) con filtros de nombre/periodicidad/estado vía `searchParams`, más la lista de periodicidades activas para el selector del formulario, mismo patrón que `servicios/page.tsx` (depende de T005)
- [x] T014 [US1] Crear `apps/admin/src/app/(app)/catalogos/obligaciones-fiscales/ObligacionesFiscalesClient.tsx` — tabla envuelta en `Paper` con `StatusChip` para Estado, filtro nombre/periodicidad/estado, `Dialog` de alta/edición con `Autocomplete` de MUI para elegir la periodicidad (solo activas), `IconButton`+`Tooltip` para Editar/Activar/Desactivar (con confirmación al desactivar) (depende de T010, T012, T013)
- [x] T015 [US1] Agregar la entrada "Obligaciones Fiscales" en `apps/admin/src/app/(app)/catalogos/page.tsx` (hub), junto a Periodicidades (depende de T013)
- [x] T016 [P] [US1] Prueba de integración `packages/utils/src/obligacionesFiscales.integration.test.ts` — verificar que cualquier staff autenticado puede hacer `SELECT`, que `manage_catalogs` es requerido para `INSERT`/`UPDATE`, y que el nombre es único solo entre obligaciones activas (depende de T008)

**Checkpoint**: El catálogo de obligaciones fiscales es completamente funcional de forma aislada — MVP de esta feature completo.

---

## Phase 4: User Story 2 - Asignar periodicidad y prioridad como valores sugeridos (Priority: P2)

**Goal**: La periodicidad de una obligación siempre proviene de una periodicidad activa del catálogo de Periodicidades, tanto al crear como al editar; la prioridad es un valor libre y no exclusivo.

**Independent Test**: Crear una obligación seleccionando una periodicidad del catálogo de Periodicidades y asignándole una prioridad, y confirmar que ambos valores quedan guardados y son consultables, sin que exista todavía ninguna plantilla que los consuma.

### Implementation for User Story 2

- [x] T017 [P] [US2] En `packages/utils/src/obligacionesFiscales.integration.test.ts` — caso: crear una obligación con `periodicidad_id` de una periodicidad inactiva es rechazado por el trigger (FR-004) (depende de T008)
- [x] T018 [P] [US2] En el mismo archivo — caso: cambiar la periodicidad de una obligación existente hacia una periodicidad inactiva es rechazado (research.md #3) (depende de T008)
- [x] T019 [P] [US2] En el mismo archivo — caso: dos obligaciones pueden compartir el mismo valor de `prioridad` sin error (FR-008) (depende de T008)

**Checkpoint**: La relación con Periodicidades queda validada tanto en alta como en edición, y la prioridad se confirma como un valor no exclusivo.

---

## Phase 5: User Story 3 - Buscar obligaciones y conservar su historial (Priority: P3)

**Goal**: Búsqueda por nombre tipo Autocomplete (escritura anticipada) sobre el catálogo, y las obligaciones inactivadas permanecen consultables en el listado.

**Independent Test**: Buscar una obligación escribiendo parte de su nombre y confirmar que aparece entre las sugerencias seleccionables; inactivar una obligación y confirmar que sigue siendo consultable en el listado del catálogo, marcada como Inactiva, aunque ya no se ofrezca para nuevas selecciones.

### Implementation for User Story 3

- [x] T020 [US3] Extender `apps/admin/src/app/(app)/catalogos/obligaciones-fiscales/ObligacionesFiscalesClient.tsx` reemplazando el filtro de texto de nombre por un `Autocomplete` de búsqueda (escritura anticipada), mismo patrón que `PeriodicidadesClient.tsx` (012) (depende de T014)
- [x] T021 [P] [US3] En `packages/utils/src/obligacionesFiscales.integration.test.ts` — caso: el listado ordenado por nombre devuelve las obligaciones en orden alfabético (FR-006) (depende de T008)
- [x] T022 [P] [US3] En el mismo archivo — caso: una obligación inactivada sigue siendo devuelta por una consulta sin filtro de estado, pero queda excluida de una consulta filtrada a `estado = 'activo'` (FR-005) (depende de T008)

**Checkpoint**: Todas las historias de usuario quedan implementadas y verificadas de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validación final y limpieza.

- [x] T023 [P] Ejecutar `pnpm --filter admin lint` y `pnpm --filter admin type-check` — confirmar cero errores tras agregar las rutas de `catalogos/obligaciones-fiscales`
- [x] T024 [P] Ejecutar `pnpm --filter @control-contable/utils test` — confirmar que las pruebas de `obligacionFiscalForm.test.ts` y `obligacionesFiscales.integration.test.ts` pasan
- [ ] T025 Ejecutar los 3 escenarios de `quickstart.md` manualmente en el navegador (**Bloqueada para mí** — sin Playwright/chromium disponible; requiere validación manual del usuario)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — puede iniciar de inmediato.
- **Foundational (Phase 2)**: Depende de Setup — bloquea las 3 historias de usuario.
- **Historias de usuario (Phase 3-5)**: Todas dependen de Foundational.
  - US1 (catálogo completo) es el MVP natural — sin él no hay pantalla que probar.
  - US2 (validación de periodicidad/prioridad) reutiliza la misma UI de US1 (el selector de periodicidad ya se construye en T014) — sus tareas son principalmente de verificación a nivel de esquema/RLS.
  - US3 (búsqueda Autocomplete + historial) extiende la UI de US1 (T014→T020) — depende de archivo, no de una dependencia lógica de historia.
- **Polish (Phase 6)**: Depende de que todas las historias deseadas estén completas.

### Parallel Opportunities

- T010/T011 (US1) pueden ejecutarse en paralelo con T012/T013 (archivos distintos).
- T017, T018, T019 (US2) pueden diseñarse en paralelo entre sí (mismo archivo, casos independientes).
- T021, T022 (US3) igual que arriba.
- T023 y T024 (Polish) pueden ejecutarse en paralelo.

---

## Parallel Example: User Story 2

```bash
# Los tres casos de validación de periodicidad/prioridad pueden diseñarse en paralelo (mismo archivo, distintos `it()`):
Task: "Caso: crear con periodicidad inactiva es rechazado"
Task: "Caso: editar cambiando a periodicidad inactiva es rechazado"
Task: "Caso: dos obligaciones comparten la misma prioridad sin error"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea todas las historias)
3. Completar Phase 3: User Story 1 (catálogo completo, con selector de periodicidad ya incluido)
4. **DETENER Y VALIDAR**: confirmar que el catálogo es funcional de punta a punta
5. Continuar con US2/US3 para completar la validación de negocio y la experiencia de búsqueda

### Incremental Delivery

1. Setup + Foundational → esquema de `obligaciones_fiscales` listo
2. US1 → catálogo completo y funcional (MVP)
3. US2 → validación de periodicidad activa y prioridad no exclusiva confirmada
4. US3 → búsqueda Autocomplete e integridad histórica confirmadas
5. Polish → lint/type-check/tests/validación manual

---

## Notes

- [P] tareas = archivos distintos o casos independientes dentro del mismo archivo de prueba, sin dependencias pendientes.
- [Story] etiqueta cada tarea con su historia de usuario para trazabilidad.
- US2 es deliberadamente una fase de verificación a nivel de esquema/RLS — la UI que ejercita periodicidad y prioridad ya se construye como parte de US1.
- Commit tras cada tarea o grupo lógico.
- Detenerse en cada checkpoint para validar la historia de forma independiente.
