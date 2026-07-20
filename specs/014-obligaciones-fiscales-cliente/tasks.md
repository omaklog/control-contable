---
description: 'Task list template for feature implementation'
---

# Tasks: Obligaciones Fiscales del Cliente

**Input**: Design documents from `/specs/014-obligaciones-fiscales-cliente/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/db-functions-rls.md, quickstart.md

**Tests**: Se incluyen pruebas unitarias (validación de formulario, mapeo de errores) y de integración (RLS, unicidad, validaciones de periodicidad/obligación activa, función de aplicar plantilla) — mismo patrón ya usado en `011`/`012`/`013`.

**Organization**: Tareas agrupadas por historia de usuario (spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos o casos independientes, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1..US4)

## Path Conventions

Monorepo existente: migración nueva en `supabase/migrations/`, sección nueva en `packages/ui/src/ClienteDetalleClient.tsx` (compartida por `apps/admin` y `apps/portal`), Server Actions en `apps/{admin,portal}/src/app/(app)/clientes/[clienteId]/actions.ts`, pantalla de plantillas en `apps/admin/src/app/(app)/catalogos/plantillas-obligaciones/`, validaciones/pruebas en `packages/utils/src/`.

---

## Phase 1: Setup

**Purpose**: Scaffold del archivo de migración.

- [x] T001 Crear `supabase/migrations/<timestamp>_obligaciones_fiscales_cliente_schema.sql` con el encabezado de referencia a este spec (`014-obligaciones-fiscales-cliente`), siguiendo el mismo formato de comentario que `20260720130000_obligaciones_fiscales_schema.sql`

**Checkpoint**: Archivo de migración listo para completarse.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquema de base de datos completo (3 tablas, RLS, triggers, función de aplicar plantilla) — bloquea las 4 historias.

**⚠️ CRITICAL**: Ninguna historia puede implementarse hasta completar esta fase.

- [x] T002 Definir el enum `obligacion_fiscal_cliente_estado` (`activa`, `no_aplica`) y crear la tabla `obligaciones_fiscales_cliente` (`cliente_id`, `obligacion_fiscal_id`, `periodicidad_id`, `orden`, `estado`, `observaciones`, auditoría) con `unique (cliente_id, obligacion_fiscal_id)` y `unique (cliente_id, orden)` (data-model.md, contracts/db-functions-rls.md sección C)
- [x] T003 Definir el enum `plantilla_obligaciones_estado` y crear la tabla `plantillas_obligaciones` (`nombre`, `descripcion`, `estado`, auditoría) con índice único parcial `plantillas_obligaciones_nombre_activo_unique` (contracts/db-functions-rls.md sección A) (depende de T001)
- [x] T004 Crear la tabla `plantilla_obligaciones_items` (`plantilla_id`, `obligacion_fiscal_id`, `periodicidad_id`, `orden`) con `unique (plantilla_id, obligacion_fiscal_id)` (contracts/db-functions-rls.md sección B) (depende de T003)
- [x] T005 Crear las políticas RLS de `obligaciones_fiscales_cliente`: `_select_view_clients` (`view_clients` o `manage_clients`), `_insert_manage_clients`/`_update_manage_clients`, y `_delete_manage_clients_activa` — la única política de `delete` del sistema, condicionada a `estado = 'activa'` (contracts/db-functions-rls.md sección C, research.md #3, FR-005/FR-006) (depende de T002)
- [x] T006 Crear las políticas RLS de `plantillas_obligaciones`: `_select_all_staff`, `_insert_manage_catalogs`/`_update_manage_catalogs`, sin política de `delete` (contracts/db-functions-rls.md sección A) (depende de T003)
- [x] T007 Crear las políticas RLS de `plantilla_obligaciones_items`: `_select_all_staff`, `_insert`/`_update`/`_delete_manage_catalogs` (contracts/db-functions-rls.md sección B) (depende de T004)
- [x] T008 Crear el trigger `validar_obligacion_activa_cliente()` (`BEFORE INSERT` en `obligaciones_fiscales_cliente`) que rechaza obligaciones fiscales inactivas del catálogo (contracts/db-functions-rls.md sección C, FR-002) (depende de T002)
- [x] T009 Crear el trigger de validación de periodicidad activa sobre `obligaciones_fiscales_cliente` (`BEFORE INSERT OR UPDATE OF periodicidad_id`, mismo patrón que `013`) (contracts/db-functions-rls.md sección C, FR-007) (depende de T002)
- [x] T010 Crear los triggers `validar_obligacion_activa_item_plantilla()` y de periodicidad activa sobre `plantilla_obligaciones_items` (`BEFORE INSERT`) (contracts/db-functions-rls.md sección B) (depende de T004)
- [x] T011 Crear el trigger de auditoría `trg_obligaciones_fiscales_cliente_audit_fn()` (`AFTER INSERT OR UPDATE OR DELETE`), manejando `TG_OP = 'DELETE'` con `OLD` (contracts/db-functions-rls.md sección C, research.md #4) (depende de T002)
- [x] T012 Crear el trigger de auditoría `trg_plantillas_obligaciones_audit_fn()` (`AFTER INSERT/UPDATE`), mismo patrón que `013` (contracts/db-functions-rls.md sección A) (depende de T003)
- [x] T013 Crear la función `aplicar_plantilla_obligaciones(p_cliente_id, p_plantilla_id)` (`security invoker`, `on conflict (cliente_id, obligacion_fiscal_id) do nothing`) (contracts/db-functions-rls.md sección D, research.md #2, FR-014/FR-015) (depende de T002, T004)
- [x] T014 Aplicar la migración localmente (`supabase migration up`) y verificar el esquema con `psql`/`docker exec`: 3 tablas, índices únicos, políticas RLS, triggers y la función presentes (depende de T002-T013)
- [x] T015 Regenerar `packages/types/src/database.ts` (`supabase gen types typescript --local`, copiar sobre el archivo real, `npx prettier --write`) (depende de T014)

**Checkpoint**: Esquema completo y verificado — las historias de usuario pueden implementarse.

---

## Phase 3: User Story 1 - Configurar manualmente las obligaciones fiscales de un cliente (Priority: P1) 🎯 MVP

**Goal**: Nueva sección "Obligaciones Fiscales" en el detalle de cliente (ambas apps) — agregar, editar, reordenar, marcar "No aplica" y eliminar.

**Independent Test**: Entrar al detalle de un cliente, agregar una obligación del catálogo con periodicidad y orden, editarla, marcarla "No aplica", y eliminar otra, sin que exista ninguna plantilla ni ningún otro cliente involucrado.

### Implementation for User Story 1

- [x] T016 [P] [US1] Crear `packages/utils/src/obligacionFiscalClienteForm.ts` — esquema Yup (`obligacionFiscalId`, `periodicidadId`, `orden`, `observaciones`) y `mapearErrorObligacionFiscalClienteAMensaje()` (detecta duplicado por cliente+obligación y orden duplicado), mismo patrón que `servicioContratadoForm.ts` (011)
- [x] T017 [P] [US1] Prueba unitaria `packages/utils/src/obligacionFiscalClienteForm.test.ts` (depende de T016)
- [x] T018 [US1] Agregar en `apps/admin/src/app/(app)/clientes/[clienteId]/actions.ts`: `agregarObligacionFiscalCliente`, `editarObligacionFiscalCliente`, `marcarNoAplicaObligacionFiscalCliente`, `eliminarObligacionFiscalCliente` (`requireCapability('manage_clients')`), mismo patrón `ActionResult` que las acciones de Servicios Contratados (depende de T005, T008, T009, T011, T016)
- [x] T019 [US1] Replicar T018 en `apps/portal/src/app/(app)/clientes/[clienteId]/actions.ts` — mismas funciones, idénticas a `apps/admin` (mismo patrón que `011`) (depende de T018)
- [x] T020 [US1] Extender `apps/{admin,portal}/src/app/(app)/clientes/[clienteId]/page.tsx` — cargar `obligaciones_fiscales_cliente` (join a nombre de obligación y periodicidad) y las obligaciones/periodicidades activas del catálogo para los selectores, mapeados a camelCase, pasados como nuevas props (depende de T015)
- [x] T021 [US1] Extender `packages/ui/src/ClienteDetalleClient.tsx` — nueva sección "Obligaciones Fiscales" (`Paper`, entre "Servicios" e "Historial"): tabla con `StatusChip` (`variant`/`label` explícitos para `activa`/`no_aplica`, research.md #5), `Dialog` de alta/edición con `Autocomplete` de obligación fiscal y de periodicidad (solo activas), acciones de marcar "No aplica" y eliminar (con confirmación) (depende de T018, T020)
- [x] T022 [P] [US1] Crear `packages/utils/src/obligacionesFiscalesCliente.integration.test.ts` — casos: `view_clients` permite `select`, `manage_clients` requerido para `insert`/`update`/`delete`; una misma obligación no puede repetirse para un cliente; el orden es único por cliente; una obligación/periodicidad inactiva es rechazada al agregar (depende de T014)

**Checkpoint**: La configuración manual de obligaciones fiscales del cliente es completamente funcional — MVP de esta feature completo.

---

## Phase 4: User Story 2 - Administrar plantillas de obligaciones (Priority: P2)

**Goal**: Pantalla de administración de Plantillas de Obligaciones dentro del hub de catálogos — crear, editar, activar, desactivar una plantilla y su lista ordenada de obligaciones.

**Independent Test**: Crear una plantilla, agregarle obligaciones del catálogo con periodicidad y orden sugeridos, editarla, activarla e inactivarla, sin que exista todavía ningún cliente que la use.

### Implementation for User Story 2

- [x] T023 [P] [US2] Crear `packages/utils/src/plantillaObligacionesForm.ts` — esquema Yup de la plantilla (`nombre`, `descripcion`) y de un ítem (`obligacionFiscalId`, `periodicidadId`, `orden`), más `mapearErrorPlantillaObligacionesAMensaje()`
- [x] T024 [P] [US2] Prueba unitaria `packages/utils/src/plantillaObligacionesForm.test.ts` (depende de T023)
- [x] T025 [US2] Crear `apps/admin/src/app/(app)/catalogos/plantillas-obligaciones/actions.ts` — `createPlantillaObligaciones`, `updatePlantillaObligaciones`, `setPlantillaObligacionesEstado`, `agregarItemPlantilla`, `quitarItemPlantilla` (`requireCapability('manage_catalogs')`) (depende de T006, T007, T010, T012, T023)
- [x] T026 [US2] Crear `apps/admin/src/app/(app)/catalogos/plantillas-obligaciones/page.tsx` — Server Component: listado paginado + filtros, más obligaciones/periodicidades activas para el formulario de ítems (depende de T006)
- [x] T027 [US2] Crear `apps/admin/src/app/(app)/catalogos/plantillas-obligaciones/PlantillasObligacionesClient.tsx` — tabla + `Dialog` de alta/edición de la plantilla, con una sub-tabla editable de ítems (`Autocomplete` de obligación y periodicidad, orden) (depende de T023, T025, T026)
- [x] T028 [US2] Agregar la entrada "Plantillas de Obligaciones" en `apps/admin/src/app/(app)/catalogos/page.tsx` (hub), junto a Periodicidades y Obligaciones Fiscales (depende de T026)
- [x] T029 [P] [US2] Crear `packages/utils/src/plantillasObligaciones.integration.test.ts` — casos: `select` abierto a cualquier staff, `manage_catalogs` requerido para `insert`/`update`; nombre único entre plantillas activas; una obligación no puede repetirse dentro de la misma plantilla; obligación/periodicidad inactiva rechazada en un ítem (depende de T014)

**Checkpoint**: Las plantillas de obligaciones son completamente administrables de forma aislada.

---

## Phase 5: User Story 3 - Aplicar una plantilla para agilizar la carga inicial (Priority: P2)

**Goal**: Selector de plantilla + botón "Aplicar" dentro de la sección de Obligaciones Fiscales del cliente (ambas apps).

**Independent Test**: Seleccionar una plantilla y aplicarla a un cliente sin obligaciones previas, confirmar que las obligaciones quedan copiadas, y que aplicar la misma plantilla a otro cliente o modificar lo ya copiado no afecta la plantilla original ni a otros clientes.

### Implementation for User Story 3

- [x] T030 [US3] Agregar en `apps/{admin,portal}/src/app/(app)/clientes/[clienteId]/actions.ts`: `aplicarPlantillaObligaciones(clienteId, plantillaId)` — llama al RPC `aplicar_plantilla_obligaciones` (`requireCapability('manage_clients')`) (depende de T013, T019)
- [x] T031 [US3] Extender `apps/{admin,portal}/src/app/(app)/clientes/[clienteId]/page.tsx` — cargar las plantillas activas disponibles para el selector (depende de T020)
- [x] T032 [US3] Extender `packages/ui/src/ClienteDetalleClient.tsx` — selector de plantilla (`Autocomplete`) + botón "Aplicar" en la sección de Obligaciones Fiscales (depende de T021, T030, T031)
- [x] T033 [P] [US3] En `packages/utils/src/obligacionesFiscalesCliente.integration.test.ts` — casos: aplicar una plantilla copia sus obligaciones al cliente; aplicar la misma plantilla a dos clientes produce copias independientes; aplicar una plantilla que incluye una obligación ya configurada la omite sin fallar el resto (depende de T013)

**Checkpoint**: Aplicar una plantilla agiliza la carga inicial sin crear ninguna relación permanente con el cliente.

---

## Phase 6: User Story 4 - Conservar el historial de obligaciones marcadas "No aplica" (Priority: P3)

**Goal**: Verificar, a nivel de esquema y RLS, que una obligación "No aplica" permanece consultable y nunca puede eliminarse.

**Independent Test**: Marcar una obligación de un cliente como "No aplica" y confirmar que sigue visible en la configuración de ese cliente, distinguida de las Activas, sin ninguna acción de eliminar disponible.

### Implementation for User Story 4

- [x] T034 [P] [US4] En `packages/utils/src/obligacionesFiscalesCliente.integration.test.ts` — casos: una obligación marcada "No aplica" sigue siendo consultable vía `select`; un intento de `delete` sobre una obligación "No aplica" es rechazado por RLS incluso con `manage_clients` (depende de T005, T014)

**Checkpoint**: Todas las historias de usuario quedan implementadas y verificadas de forma independiente.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Validación final y limpieza.

- [x] T035 [P] Ejecutar `pnpm --filter admin lint`, `pnpm --filter admin type-check`, `pnpm --filter portal lint`, `pnpm --filter portal type-check` — confirmar cero errores
- [x] T036 [P] Ejecutar `pnpm --filter @control-contable/utils test` — confirmar que las pruebas nuevas pasan
- [ ] T037 Ejecutar los 4 escenarios de `quickstart.md` manualmente en el navegador (**Bloqueada para mí** — sin Playwright/chromium disponible; requiere validación manual del usuario)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias.
- **Foundational (Phase 2)**: Depende de Setup — bloquea las 4 historias.
- **Historias de usuario (Phase 3-6)**: Todas dependen de Foundational.
  - US1 (configuración manual) es el MVP — no depende de plantillas.
  - US2 (administrar plantillas) es independiente de US1 en términos de datos, pero comparte el hub de catálogos ya existente (`012`).
  - US3 (aplicar plantilla) depende de que existan plantillas administradas (US2) y de la sección de obligaciones del cliente (US1) — se implementa después de ambas.
  - US4 (integridad histórica) es solo verificación de esquema/RLS — no depende de US2/US3.
- **Polish (Phase 7)**: Depende de que todas las historias deseadas estén completas.

### Parallel Opportunities

- T016/T017 (US1) en paralelo con la preparación de T023/T024 (US2) — archivos distintos.
- T022 (US1), T029 (US2), T033 (US3), T034 (US4) agregan casos al mismo o a archivos de prueba relacionados — desarrollarlos secuencialmente si comparten archivo, en paralelo si no.
- T035 y T036 (Polish) en paralelo.

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO)
3. Completar Phase 3: User Story 1
4. **DETENER Y VALIDAR**: confirmar que la configuración manual de obligaciones del cliente funciona de punta a punta
5. Continuar con US2/US3 para agilizar la carga inicial con plantillas

### Incremental Delivery

1. Setup + Foundational → esquema completo (3 tablas, función de aplicar plantilla)
2. US1 → configuración manual del cliente (MVP)
3. US2 → plantillas administrables
4. US3 → aplicar una plantilla a un cliente
5. US4 → integridad histórica verificada
6. Polish → lint/type-check/tests/validación manual

---

## Notes

- [P] tareas = archivos distintos o casos independientes dentro del mismo archivo de prueba, sin dependencias pendientes.
- [Story] etiqueta cada tarea con su historia de usuario para trazabilidad.
- `obligaciones_fiscales_cliente` es la primera tabla del sistema con una política RLS de `DELETE` real — verificarla con especial atención en T022/T034.
- Commit tras cada tarea o grupo lógico.
- Detenerse en cada checkpoint para validar la historia de forma independiente.
