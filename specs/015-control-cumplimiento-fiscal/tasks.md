---
description: 'Task list template for feature implementation'
---

# Tasks: Control de Cumplimiento Fiscal

**Input**: Design documents from `/specs/015-control-cumplimiento-fiscal/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/db-functions-rls.md, quickstart.md

**Tests**: Se incluyen pruebas unitarias (validación de formulario, mapeo de errores) y de integración (RLS, idempotencia de la generación, unicidad por obligación+periodo, rechazo de documentos de otro cliente, "Vencida" derivada, "Presentada" nunca vuelve a Vencida) — mismo patrón ya usado en `011`/`013`/`014`.

**Organization**: Tareas agrupadas por historia de usuario (spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos o casos independientes, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1..US5)

## Path Conventions

Monorepo existente: migración nueva en `supabase/migrations/`, nueva ruta de nivel superior en `apps/portal/src/app/(app)/obligaciones-fiscales/` (bandeja + detalle), actualización de `apps/portal/src/components/layout/navigation.ts`, validaciones/pruebas en `packages/utils/src/`.

---

## Phase 1: Setup

**Purpose**: Scaffold del archivo de migración.

- [x] T001 Crear `supabase/migrations/<timestamp>_cumplimientos_fiscales_schema.sql` con el encabezado de referencia a este spec (`015-control-cumplimiento-fiscal`), siguiendo el mismo formato de comentario que `20260721090000_obligaciones_fiscales_cliente_schema.sql`

**Checkpoint**: Archivo de migración listo para completarse.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquema de base de datos completo (2 tablas, RLS, triggers, funciones de cálculo y generación, programación vía `pg_cron`) — bloquea las 5 historias.

**⚠️ CRITICAL**: Ninguna historia puede implementarse hasta completar esta fase.

- [x] T002 Definir el enum `cumplimiento_fiscal_estado` (`pendiente`, `en_proceso`, `presentada`, `no_aplica` — sin `vencida`, Clarifications) y crear la tabla `cumplimientos_fiscales` con el check constraint de extraordinario y el índice único parcial `(obligacion_fiscal_cliente_id, periodo_inicio)` (contracts/db-functions-rls.md sección A, data-model.md) (depende de T001)
- [x] T003 Crear la tabla `cumplimiento_fiscal_documentos` con `unique (cumplimiento_id, documento_id)` y el índice único parcial que garantiza a lo sumo un acuse por cumplimiento (contracts/db-functions-rls.md sección B) (depende de T002)
- [x] T004 Crear las políticas RLS de `cumplimientos_fiscales`: `_select_view_clients`, `_insert_manage_clients`/`_update_manage_clients`, sin política de `delete` (FR-015) (contracts/db-functions-rls.md sección A) (depende de T002)
- [x] T005 Crear las políticas RLS de `cumplimiento_fiscal_documentos`: `_select_view_clients`, `_insert_manage_clients`, `_delete_manage_clients` (contracts/db-functions-rls.md sección B) (depende de T003)
- [x] T006 Crear el trigger `validar_documento_mismo_cliente_cumplimiento()` (`BEFORE INSERT` en `cumplimiento_fiscal_documentos`) que rechaza documentos de un cliente distinto (FR-009) (depende de T003)
- [x] T007 Crear el trigger de auditoría `trg_cumplimientos_fiscales_audit_fn()` (`AFTER INSERT/UPDATE`) que distingue `alta`/`cambio_estado`/`cambio_fecha_limite`/`cambio_responsable` (contracts/db-functions-rls.md sección C) (depende de T002)
- [x] T008 Crear el trigger de auditoría `trg_cumplimiento_fiscal_documentos_audit_fn()` (`AFTER INSERT/DELETE`) que registra `asociacion_documento`/`desasociacion_documento` (contracts/db-functions-rls.md sección C) (depende de T003)
- [x] T009 Crear la función `calcular_periodo_fiscal(periodicidad_nombre, fecha)` que devuelve el inicio/fin del periodo calendario según el nombre de periodicidad (contracts/db-functions-rls.md sección D, research.md #4)
- [x] T010 Crear la función `generar_cumplimientos_fiscales()` (`security definer`, recorre clientes/obligaciones activas, usa `calcular_periodo_fiscal`, `on conflict do nothing`) (contracts/db-functions-rls.md sección E, research.md #5, FR-001/FR-002/FR-003/FR-011) (depende de T002, T009)
- [x] T011 Habilitar `pg_cron` (`create extension if not exists pg_cron`) y programar `generar_cumplimientos_fiscales()` el primer día de cada mes (contracts/db-functions-rls.md sección E) (depende de T010)
- [x] T012 Aplicar la migración localmente (`supabase migration up`) y verificar el esquema con `psql`/`docker exec`: tablas, índices únicos, políticas RLS, triggers, funciones y el cron job presentes (depende de T002-T011)
- [x] T013 Regenerar `packages/types/src/database.ts` (`supabase gen types typescript --local`, copiar sobre el archivo real, `npx prettier --write`) (depende de T012)

**Checkpoint**: Esquema completo y verificado — las historias de usuario pueden implementarse.

---

## Phase 3: User Story 1 - Ver y priorizar las obligaciones pendientes de atención (Priority: P1) 🎯 MVP

**Goal**: Bandeja operativa en `apps/portal` que lista los cumplimientos de todos los clientes, filtra por cliente/RFC/obligación/periodo/estado/responsable, y prioriza los vencidos.

**Independent Test**: Generar cumplimientos (manual o automáticamente) y confirmar que la bandeja los lista, filtra correctamente, y muestra primero los vencidos.

### Implementation for User Story 1

- [x] T014 [US1] Crear `apps/portal/src/app/(app)/obligaciones-fiscales/actions.ts` — Server Action `generarCumplimientos` que invoca el RPC `generar_cumplimientos_fiscales` (`requireCapability('manage_clients')`) (depende de T010)
- [x] T015 [US1] Crear `apps/portal/src/app/(app)/obligaciones-fiscales/page.tsx` — Server Component: consulta `cumplimientos_fiscales` con joins a `clientes` (nombre/RFC), `obligaciones_fiscales_cliente→obligaciones_fiscales` (nombre) y `profiles` (responsable), calcula "Vencida" en la consulta (`estado in (pendiente,en_proceso) and fecha_limite < hoy`), aplica filtros vía `searchParams`, ordena vencidas primero y luego por fecha límite ascendente (depende de T004)
- [x] T016 [US1] Crear `apps/portal/src/app/(app)/obligaciones-fiscales/ObligacionesFiscalesClient.tsx` — tabla envuelta en `Paper` con `StatusChip` (incluyendo variante visual para "Vencida" derivada), barra de filtros, botón "Generar cumplimientos" (depende de T014, T015)
- [x] T017 [US1] Actualizar `apps/portal/src/components/layout/navigation.ts` — el ítem "Obligaciones Fiscales" pasa a `implemented: true` con `capability: 'view_clients'` (research.md #8) (depende de T015)
- [x] T018 [P] [US1] Crear `packages/utils/src/cumplimientosFiscales.integration.test.ts` — casos: la generación crea un registro por obligación activa y periodo; ejecutarla dos veces no duplica (FR-002); `select` requiere `view_clients`/`manage_clients`, `insert`/`update` requieren `manage_clients` (depende de T012)

**Checkpoint**: La bandeja operativa es funcional de forma aislada — MVP de esta feature completo.

---

## Phase 4: User Story 2 - Dar seguimiento al estado de un cumplimiento (Priority: P1)

**Goal**: Cambiar el estado de un cumplimiento (Pendiente → En proceso → Presentada, o No aplica) y asociar evidencia documental al marcarlo Presentada.

**Independent Test**: Tomar un cumplimiento Pendiente, marcarlo En proceso y luego Presentada, adjuntando al menos un documento del Expediente Fiscal del mismo cliente.

### Implementation for User Story 2

- [x] T019 [P] [US2] Crear `packages/utils/src/cumplimientoFiscalForm.ts` — esquema Yup para el alta de un cumplimiento extraordinario (`obligacionFiscalId` opcional, `descripcion`, `periodoInicio`, `periodoFin`, `fechaLimite`, `responsableId` opcional) y `mapearErrorCumplimientoFiscalAMensaje()` (detecta el error del trigger de documento de otro cliente)
- [x] T020 [P] [US2] Prueba unitaria `packages/utils/src/cumplimientoFiscalForm.test.ts` (depende de T019)
- [x] T021 [US2] Crear `apps/portal/src/app/(app)/obligaciones-fiscales/[cumplimientoId]/actions.ts` — Server Actions `cambiarEstadoCumplimiento`, `asociarDocumentoCumplimiento`, `desasociarDocumentoCumplimiento` (`requireCapability('manage_clients')`) (depende de T004, T006, T007, T008, T019)
- [x] T022 [US2] Crear `apps/portal/src/app/(app)/obligaciones-fiscales/[cumplimientoId]/page.tsx` — Server Component: carga el cumplimiento, los documentos del Expediente Fiscal del cliente (para el selector) y los ya asociados (depende de T004)
- [x] T023 [US2] Crear `apps/portal/src/app/(app)/obligaciones-fiscales/[cumplimientoId]/CumplimientoDetalleClient.tsx` — cambiar estado, asociar/desasociar documentos marcando cuál es el acuse (depende de T021, T022)
- [x] T024 [P] [US2] En `packages/utils/src/cumplimientosFiscales.integration.test.ts` — casos: asociar un documento de otro cliente es rechazado (FR-009); un cumplimiento Presentada nunca se muestra como Vencida, sin importar la fecha límite (FR-006); un cumplimiento Pendiente con fecha límite pasada se muestra como Vencida (FR-005) (depende de T012)

**Checkpoint**: El seguimiento diario de estado y evidencia documental es completamente funcional.

---

## Phase 5: User Story 3 - Ajustar fecha límite y responsable de un cumplimiento (Priority: P2)

**Goal**: Modificar la fecha límite o el responsable de un cumplimiento individual sin afectar otros registros.

**Independent Test**: Cambiar la fecha límite de un cumplimiento y confirmar que ningún otro cumplimiento (mismo cliente u otro) se ve afectado.

### Implementation for User Story 3

- [x] T025 [US3] Extender `apps/portal/src/app/(app)/obligaciones-fiscales/[cumplimientoId]/actions.ts` — agregar `cambiarFechaLimiteCumplimiento`, `cambiarResponsableCumplimiento` (depende de T021)
- [x] T026 [US3] Extender `CumplimientoDetalleClient.tsx` — edición de fecha límite y selector de responsable (staff activo) (depende de T023, T025)
- [x] T027 [P] [US3] En `packages/utils/src/cumplimientosFiscales.integration.test.ts` — casos: cambiar la fecha límite de un cumplimiento no afecta otros registros del mismo cliente ni de otros clientes (FR-010); un cumplimiento generado después de cambiar el responsable del cliente usa el nuevo responsable, mientras que los ya generados conservan el anterior (FR-011) (depende de T012)

**Checkpoint**: Los ajustes individuales de fecha límite y responsable quedan validados de forma aislada.

---

## Phase 6: User Story 4 - Registrar una obligación fiscal extraordinaria (Priority: P2)

**Goal**: Registrar un cumplimiento fuera de la configuración fiscal habitual del cliente, con o sin obligación del catálogo.

**Independent Test**: Registrar un cumplimiento extraordinario con y sin seleccionar una obligación del catálogo, y confirmar que admite las mismas acciones que uno ordinario.

### Implementation for User Story 4

- [x] T028 [US4] Extender `apps/portal/src/app/(app)/obligaciones-fiscales/actions.ts` — agregar `crearCumplimientoExtraordinario` (depende de T014, T019)
- [x] T029 [US4] Extender `ObligacionesFiscalesClient.tsx` — botón/Dialog "Registrar extraordinario" con `Autocomplete` opcional de obligación del catálogo (solo activas) + descripción + periodo + fecha límite + responsable (depende de T016, T028)
- [x] T030 [P] [US4] En `packages/utils/src/cumplimientosFiscales.integration.test.ts` — casos: un extraordinario con obligación del catálogo y uno sin ella se crean correctamente; ambos admiten periodo, fecha límite, estado, responsable y documentos igual que uno ordinario (FR-012/FR-013) (depende de T012)

**Checkpoint**: Los cumplimientos extraordinarios quedan disponibles junto a los ordinarios.

---

## Phase 7: User Story 5 - Consultar el historial de cambios de un cumplimiento (Priority: P3)

**Goal**: Ver el historial completo de cambios de un cumplimiento (usuario, fecha/hora, valores anterior/nuevo).

**Independent Test**: Realizar varios cambios sobre un mismo cumplimiento y confirmar que su historial los lista en orden cronológico.

### Implementation for User Story 5

- [x] T031 [US5] Agregar `obtenerHistorialCumplimiento` en `apps/portal/src/app/(app)/obligaciones-fiscales/[cumplimientoId]/actions.ts` — lee `business_audit_log` filtrado por `entidad = 'cumplimiento_fiscal'` y `entidad_id`, mismo patrón que `obtenerHistorialServicioContratado` (011) (depende de T007, T008)
- [x] T032 [US5] Extender `CumplimientoDetalleClient.tsx` — sección/Dialog de historial, reutilizando el patrón visual de `ServicioHistorialDialog` (depende de T023, T031)
- [x] T033 [P] [US5] En `packages/utils/src/cumplimientosFiscales.integration.test.ts` — caso: cambios de estado, fecha límite, responsable y asociación/desasociación de documentos generan eventos distinguibles y en orden en `business_audit_log` (FR-014) (depende de T012)

**Checkpoint**: Todas las historias de usuario quedan implementadas y verificadas de forma independiente.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validación final y limpieza.

- [x] T034 [P] Ejecutar `pnpm --filter portal lint` y `pnpm --filter portal type-check` — confirmar cero errores tras agregar las rutas de `/obligaciones-fiscales`
- [x] T035 [P] Ejecutar `pnpm --filter @control-contable/utils test` — confirmar que las pruebas nuevas pasan
- [ ] T036 Ejecutar los 5 escenarios de `quickstart.md` manualmente en el navegador (**Bloqueada para mí** — sin Playwright/chromium disponible; requiere validación manual del usuario)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias.
- **Foundational (Phase 2)**: Depende de Setup — bloquea las 5 historias.
- **Historias de usuario (Phase 3-7)**: Todas dependen de Foundational.
  - US1 (bandeja + generación) es el MVP — sin ella no hay nada que ver ni filtrar.
  - US2 (seguimiento de estado + documentos) extiende la misma ruta con una subruta de detalle.
  - US3 (fecha límite/responsable) extiende el mismo detalle que US2 — depende de archivo, no de una dependencia lógica de historia.
  - US4 (extraordinarios) extiende la bandeja de US1 con una acción adicional.
  - US5 (historial) es la última capa sobre el detalle ya construido en US2/US3.
- **Polish (Phase 8)**: Depende de que todas las historias deseadas estén completas.

### Parallel Opportunities

- T019/T020 (US2) pueden prepararse en paralelo con el resto de la Fase 2 una vez lista T002.
- T018, T024, T027, T030, T033 agregan casos al mismo archivo de prueba de integración — desarrollarlos secuencialmente si comparten archivo, en paralelo si no.
- T034 y T035 (Polish) pueden ejecutarse en paralelo.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — incluye la función de generación y `pg_cron`)
3. Completar Phase 3: User Story 1 (bandeja + generación)
4. **DETENER Y VALIDAR**: confirmar que la bandeja lista y prioriza cumplimientos generados
5. Continuar con US2 (seguimiento de estado) como la siguiente pieza de valor más urgente

### Incremental Delivery

1. Setup + Foundational → esquema y generación listos
2. US1 → bandeja operativa (MVP)
3. US2 → seguimiento de estado + evidencia documental
4. US3 → ajustes individuales de fecha límite/responsable
5. US4 → cumplimientos extraordinarios
6. US5 → historial de cambios
7. Polish → lint/type-check/tests/validación manual

---

## Notes

- [P] tareas = archivos distintos o casos independientes dentro del mismo archivo de prueba, sin dependencias pendientes.
- [Story] etiqueta cada tarea con su historia de usuario para trazabilidad.
- `cliente.responsable_id` existe en el esquema desde `005` pero no tiene todavía ninguna pantalla que lo asigne — para probar la Historia 3 (responsable inicial de un cumplimiento) puede ser necesario asignarlo directamente vía SQL en el entorno de prueba; construir esa pantalla no es parte de esta especificación.
- Commit tras cada tarea o grupo lógico.
- Detenerse en cada checkpoint para validar la historia de forma independiente.
