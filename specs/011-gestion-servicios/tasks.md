---
description: 'Task list template for feature implementation'
---

# Tasks: Módulo de Servicios

**Input**: Design documents from `/specs/011-gestion-servicios/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/db-functions-rls.md, quickstart.md

**Tests**: Se incluyen pruebas unitarias (mapeo de errores) y de integración (RLS, restricción de unicidad, ciclo de estados) — mismo patrón ya usado en `005`/`008`/`009` para reglas de negocio y procesos críticos (Constitución, sección Testing).

**Organization**: Tareas agrupadas por historia de usuario (spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1..US5)

## Path Conventions

Monorepo existente: migración nueva en `supabase/migrations/`, pantalla nueva en `apps/admin/src/app/(app)/servicios/`, nuevos Server Actions en `apps/{admin,portal}/src/app/(app)/clientes/[clienteId]/actions.ts`, nueva sección y componentes en `packages/ui/src/`, validaciones/pruebas en `packages/utils/src/`.

---

## Phase 1: Setup

**Purpose**: Scaffold del archivo de migración.

- [x] T001 Crear `supabase/migrations/<timestamp>_servicios_schema.sql` con el encabezado de referencia a este spec (`011-gestion-servicios`), siguiendo el mismo formato de comentario que `20260716091000_clientes_schema.sql`

**Checkpoint**: Archivo de migración listo para completarse.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquema de base de datos completo (tablas, triggers, RLS) — bloquea las 5 historias, ya que todas dependen de `servicios` y/o `servicios_contratados`.

**⚠️ CRITICAL**: Ninguna historia puede implementarse hasta completar esta fase.

- [x] T002 Definir los enums `servicio_estado` (`activo`, `inactivo`) y `servicio_contratado_estado` (`activo`, `suspendido`, `finalizado`) en la migración (data-model.md)
- [x] T003 Crear la tabla `servicios` (nombre, descripción, categoría texto libre, estado, observaciones, `created_at`/`updated_at`/`created_by`/`updated_by`) en la migración (data-model.md) (depende de T002)
- [x] T004 Crear la tabla `servicios_contratados` (cliente_id, servicio_id, precio_acordado, fecha_inicio, fecha_fin, estado, observaciones, trazabilidad) con `UNIQUE (cliente_id, servicio_id)` y FKs sin `ON DELETE CASCADE`, en la migración (data-model.md, FR-005) (depende de T002)
- [x] T005 Crear las políticas RLS de `servicios`: `servicios_select_all_staff` (cualquier staff autenticado), `servicios_insert_manage_catalogs`/`servicios_update_manage_catalogs` (`has_capability('manage_catalogs')`) (contracts/db-functions-rls.md) (depende de T003)
- [x] T006 Crear las políticas RLS de `servicios_contratados`: `servicios_contratados_select_view_clients` (`has_capability('view_clients')`), `servicios_contratados_insert_manage_clients`/`_update_manage_clients` (`has_capability('manage_clients')`) (contracts/db-functions-rls.md) (depende de T004)
- [x] T007 Crear el trigger `BEFORE INSERT` `validar_servicio_activo_contratado()` sobre `servicios_contratados`, que valida que `servicio_id` esté en estado `activo` en el catálogo (FR-004, mismo patrón que `validar_regimen_fiscal_cliente()` de `005`) (depende de T004)
- [x] T008 Crear el trigger de auditoría `trg_servicios_audit_fn()` (`AFTER INSERT/UPDATE` sobre `servicios`) que llama a `log_business_audit('servicio', ...)` con `accion` = `'alta'`/`'edicion'`/`'activacion'`/`'desactivacion'` según corresponda (contracts/db-functions-rls.md) (depende de T003)
- [x] T009 Crear el trigger de auditoría `trg_servicios_contratados_audit_fn()` (`AFTER INSERT/UPDATE` sobre `servicios_contratados`) que llama a `log_business_audit('servicio_contratado', ...)` distinguiendo `'alta'`/`'cambio_precio'`/`'suspension'`/`'reactivacion'`/`'finalizacion'`/`'edicion'` según qué cambió, registrando dos eventos si `precio_acordado` y `estado` cambian en el mismo `UPDATE` (research.md #6, contracts/db-functions-rls.md) (depende de T004)
- [x] T010 Aplicar la migración localmente (`supabase migration up`) y verificar el esquema con `psql` (quickstart.md paso 1): tablas, constraint `UNIQUE (cliente_id, servicio_id)`, triggers presentes

**Checkpoint**: Esquema completo y verificado — las historias de usuario pueden implementarse.

---

## Phase 3: User Story 1 - Mantener el catálogo de servicios del despacho (Priority: P1) 🎯 MVP

**Goal**: Pantalla de Catálogo de Servicios en `apps/admin` — crear, editar, activar, desactivar, filtrar.

**Independent Test**: Crear, editar, activar y desactivar servicios del catálogo, y filtrar el listado por nombre/categoría/estado, sin que ningún cliente tenga todavía un servicio asignado.

### Implementation for User Story 1

- [x] T011 [P] [US1] Crear `packages/utils/src/servicioForm.ts` — esquema Yup (nombre, descripción, categoría, observaciones) y `mapearErrorServicioAMensaje()`, mismo patrón que `contactoForm.ts`
- [x] T012 [P] [US1] Prueba unitaria `packages/utils/src/servicioForm.test.ts` para la validación y el mapeo de errores (depende de T011)
- [x] T013 [US1] Crear `apps/admin/src/app/(app)/servicios/actions.ts` — Server Actions `createServicio`, `updateServicio`, `setServicioEstado` (requieren `manage_catalogs`), mismo patrón `ActionResult` que `clientes/actions.ts` (depende de T005, T008)
- [x] T014 [US1] Crear `apps/admin/src/app/(app)/servicios/page.tsx` — Server Component que carga el catálogo paginado con filtros de nombre/categoría/estado vía `searchParams`, mismo patrón que `clientes/page.tsx` (depende de T005)
- [x] T015 [US1] Crear `apps/admin/src/app/(app)/servicios/ServiciosClient.tsx` — tabla envuelta en `Paper` (patrón `009`), `StatusChip` para Estado, `IconButton`+`Tooltip` para Editar/Activar/Desactivar, barra de filtros, botón "Crear servicio" con `Dialog` + formulario (depende de T011, T013, T014)
- [x] T016 [US1] Agregar el ítem de navegación "Servicios" en `apps/admin/src/components/layout/navigation.ts`, gateado por `manage_catalogs` (research.md #3) (depende de T014)
- [x] T017 [P] [US1] Prueba de integración `packages/utils/src/servicios.integration.test.ts` — verificar que `manage_catalogs` es requerido para `INSERT`/`UPDATE`, y que cualquier staff autenticado puede hacer `SELECT` (depende de T005)

**Checkpoint**: El catálogo de servicios es completamente funcional de forma aislada — MVP de esta feature completo.

---

## Phase 4: User Story 2 - Asignar y dar seguimiento a los servicios contratados por un cliente (Priority: P1)

**Goal**: Agregar servicios del catálogo a un cliente y ver su listado dentro de Cliente 360.

**Independent Test**: Agregar un servicio del catálogo a un cliente con precio acordado y fecha de inicio, y confirmar que aparece en el listado de servicios de ese cliente — sin que Cobranza/Gestión Fiscal/Reportes existan todavía.

### Implementation for User Story 2

- [x] T018 [US2] Agregar la Server Action `agregarServicioContratado` en `apps/admin/src/app/(app)/clientes/[clienteId]/actions.ts` (requiere `manage_clients`; rechaza duplicados con mensaje que dirige a "Reactivar", FR-005) (depende de T006, T007, T009)
- [x] T019 [US2] Agregar la misma Server Action `agregarServicioContratado` en `apps/portal/src/app/(app)/clientes/[clienteId]/actions.ts`, mismo patrón que T018 (depende de T006, T007, T009)
- [x] T020 [US2] Actualizar `apps/admin/src/app/(app)/clientes/[clienteId]/page.tsx` — cargar los servicios contratados del cliente y los servicios del catálogo en estado activo (para el selector), pasar como nuevas props a `ClienteDetalleClient` (depende de T005, T006)
- [x] T021 [US2] Actualizar `apps/portal/src/app/(app)/clientes/[clienteId]/page.tsx`, mismo patrón que T020 (depende de T005, T006)
- [x] T022 [US2] Agregar la sección "Servicios" a `packages/ui/src/ClienteDetalleClient.tsx` — tabla (Servicio, Precio, `StatusChip` Estado, Inicio, Fin, Observaciones) envuelta en `Paper`, con botón "Agregar servicio" (depende de T020, T021)
- [x] T023 [P] [US2] Crear `packages/ui/src/ServicioContratadoForm.tsx` — modal Formik+Yup compartido para agregar un servicio (selector de servicio del catálogo activo, precio acordado, fecha de inicio, observaciones), reutilizado también por la Historia 3 en modo "cambiar precio" (depende de T011)
- [x] T024 [P] [US2] Extender `packages/utils/src/servicioForm.test.ts` (o crear `servicioContratadoForm.test.ts`) con la validación del formulario de asignación (precio requerido, fecha de inicio requerida) (depende de T023)
- [x] T025 [US2] Prueba de integración `packages/utils/src/serviciosContratados.integration.test.ts` — verificar que la restricción `UNIQUE (cliente_id, servicio_id)` rechaza un segundo `INSERT` para la misma combinación sin importar el estado del existente (depende de T004)

**Checkpoint**: Los servicios contratados se pueden agregar y consultar en Cliente 360, en ambas apps.

---

## Phase 5: User Story 3 - Cambiar el precio de un servicio contratado (Priority: P2)

**Goal**: Actualizar el precio acordado de un servicio ya contratado, con historial del cambio.

**Independent Test**: Cambiar el precio de un servicio contratado y confirmar, en su historial, el precio anterior, el nuevo y la fecha del cambio.

### Implementation for User Story 3

- [x] T026 [US3] Agregar la Server Action `cambiarPrecioServicioContratado` en ambos `[clienteId]/actions.ts` (admin y portal), requiere `manage_clients` (depende de T009, T018, T019)
- [x] T027 [US3] Agregar la acción "Cambiar precio" (`IconButton`+`Tooltip`) en la sección Servicios de `ClienteDetalleClient.tsx`, reutilizando `ServicioContratadoForm` en modo "cambiar precio" (depende de T022, T023, T026)
- [x] T028 [US3] Prueba de integración verificando que un cambio de precio no altera registros de auditoría ya generados antes del cambio (el evento `cambio_precio` conserva `precio_anterior` intacto) (depende de T009)

**Checkpoint**: El precio de un servicio contratado se puede actualizar sin perder su historial.

---

## Phase 6: User Story 4 - Suspender, reactivar y finalizar un servicio contratado (Priority: P2)

**Goal**: Ciclo completo de estados (Activo/Suspendido/Finalizado) sobre el mismo registro.

**Independent Test**: Suspender, finalizar y reactivar un servicio contratado, confirmando en cada paso que es el mismo registro (mismo id, historial acumulado) y que el catálogo y otros clientes no se ven afectados.

### Implementation for User Story 4

- [x] T029 [US4] Agregar las Server Actions `suspenderServicioContratado`, `reactivarServicioContratado` y `finalizarServicioContratado` en ambos `[clienteId]/actions.ts` (admin y portal), requieren `manage_clients` (depende de T009, T018, T019)
- [x] T030 [US4] Agregar las acciones "Suspender"/"Reactivar"/"Finalizar" (`IconButton`+`Tooltip`) en la sección Servicios de `ClienteDetalleClient.tsx`, con `Dialog` de confirmación para Finalizar (Constitución: confirmaciones para operaciones críticas) (depende de T022, T029)
- [x] T031 [US4] Prueba de integración: ciclo completo activo→suspendido→finalizado→activo sobre la misma fila (mismo `id`), confirmando que `fecha_fin` se limpia al reactivar y `fecha_inicio` nunca cambia (depende de T009)

**Checkpoint**: El ciclo de vida completo de un servicio contratado funciona sin crear registros duplicados ni afectar a otros clientes o al catálogo.

---

## Phase 7: User Story 5 - Consultar el historial y la auditoría de un servicio contratado (Priority: P3)

**Goal**: Línea de tiempo de cambios de un servicio contratado, y registro en auditoría del sistema.

**Independent Test**: Realizar varios cambios sobre un servicio contratado (precio, suspensión, reactivación) y confirmar que "Ver historial" los muestra en orden cronológico con su fecha.

### Implementation for User Story 5

- [x] T032 [US5] Crear `packages/ui/src/ServicioHistorialDialog.tsx` — modal que muestra los eventos de `business_audit_log` de un servicio contratado en orden cronológico, distinguiendo el tipo de evento (research.md #2)
- [x] T033 [US5] Agregar una consulta/Server Action en ambos `[clienteId]/actions.ts` (admin y portal) para obtener `business_audit_log` filtrado por `entidad = 'servicio_contratado'` y `entidad_id`, requiere `view_clients` (depende de T006)
- [x] T034 [US5] Conectar la acción "Ver historial" de la sección Servicios en `ClienteDetalleClient.tsx` para abrir `ServicioHistorialDialog` (depende de T022, T032, T033)
- [x] T035 [US5] Prueba de integración verificando que cada tipo de evento (alta, cambio de precio, suspensión, reactivación, finalización) aparece en `business_audit_log` con la `accion` y el `detalle` esperados (depende de T009)

**Checkpoint**: El historial y la auditoría de cada servicio contratado son consultables de punta a punta.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final sin regresiones.

- [x] T036 [P] Ejecutar lint y type-check de `apps/admin`, `apps/portal`, `packages/ui` y `packages/utils` (quickstart.md paso 3) — sin errores en ningún paquete (incluye `packages/types`, regenerado con `supabase gen types typescript --local` tras la migración)
- [x] T037 [P] Ejecutar todas las pruebas unitarias y de integración nuevas (`packages/utils`) y confirmar que las ya existentes (`005`-`009`) siguen pasando sin regresión (quickstart.md paso 2) — 79/79 en `packages/utils`, 43/43 en `packages/ui`
- [ ] T038 Ejecutar la validación visual manual de `quickstart.md` (paso 4): catálogo en `apps/admin`, ciclo completo de servicios contratados en ambas apps, verificación de Auxiliar sin acciones de gestión, y confirmación de eventos distinguibles en la pantalla de Auditoría — **Bloqueada para mí**: a cargo del usuario, sin Playwright/chromium disponible en este entorno

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias.
- **Foundational (Phase 2)**: Depende de Setup — bloquea las 5 historias.
- **Historia 1 (Phase 3)**: Depende de Foundational (`servicios`, T005/T008). Es el MVP.
- **Historia 2 (Phase 4)**: Depende de Foundational (`servicios_contratados`, T006/T007/T009) y de que exista al menos un servicio en el catálogo (Historia 1) para poder asignarlo.
- **Historia 3 (Phase 5)**: Depende de Historia 2 (ya debe existir un servicio contratado para poder cambiarle el precio).
- **Historia 4 (Phase 6)**: Depende de Historia 2 (mismo motivo); independiente de Historia 3.
- **Historia 5 (Phase 7)**: Depende de que existan eventos que mostrar — se beneficia de que Historias 2-4 ya estén implementadas, aunque técnicamente solo depende de Foundational (T009).
- **Polish (Phase 8)**: Depende de todas las historias que se vayan a entregar.

### Parallel Opportunities

- Dentro de Foundational, las tareas de la migración (T002-T009) son mayormente secuenciales (mismo archivo); T010 (aplicar y verificar) cierra la fase.
- T011/T012 (formulario y su prueba) y T017 (prueba de integración) pueden avanzar en paralelo con T013-T016 una vez completado Foundational.
- Una vez cerrada la Historia 2, las Historias 3 y 4 pueden trabajarse en paralelo por personas distintas — ambas tocan `ClienteDetalleClient.tsx` y los `actions.ts` de ambas apps, así que conviene coordinar si se hace en paralelo real.
- La Historia 5 (T032-T035) es independiente de las Historias 3 y 4 en cuanto a archivos (nuevo diálogo, nueva consulta) y puede avanzar en paralelo con ellas.

---

## Parallel Example: User Story 1

```bash
# Una vez cerrado Foundational, lanzar en paralelo:
Task: "Crear packages/utils/src/servicioForm.ts y su prueba unitaria"
Task: "Prueba de integración de RLS en packages/utils/src/servicios.integration.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (esquema completo de ambas tablas, aunque Historia 1 solo use `servicios`)
3. Completar Phase 3: Historia 1
4. **DETENER y VALIDAR**: el catálogo de servicios funciona de forma aislada en `apps/admin`.

### Incremental Delivery

1. Setup + Foundational + Historia 1 → Catálogo de Servicios funcional (MVP).
2. - Historia 2 → Servicios contratados visibles y asignables en Cliente 360 (ambas apps) — primer valor operativo real del módulo.
3. - Historia 3 → Cambios de precio con historial.
4. - Historia 4 → Ciclo completo de suspensión/finalización/reactivación.
5. - Historia 5 → Historial y auditoría consultables.
6. Polish → Verificación final sin regresiones.

---

## Notes

- Ninguna tarea de este plan implementa lógica de Cobranza, Pagos, Obligaciones Fiscales, Documentos ni Notificaciones (FR-016) — solo expone la información que esos módulos futuros puedan consultar.
- La restricción `UNIQUE (cliente_id, servicio_id)` (T004) es la pieza central que garantiza FR-005 y la decisión de Clarifications Q1 — sin ella, ninguna otra historia puede considerarse completa.
- La validación visual en navegador (quickstart.md) queda a cargo del usuario: este entorno no cuenta con Playwright/chromium para automatizarla.
