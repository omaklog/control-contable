---
description: 'Task list for 017-cobranza'
---

# Tasks: Cobranza

**Input**: Design documents from `/specs/017-cobranza/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/db-functions-rls.md, quickstart.md

**Tests**: Se incluyen tareas de prueba de integración (patrón ya usado en 011/013/014/015/016: `packages/utils/src/cobranza.integration.test.ts` contra Supabase local real) porque el spec depende fuertemente de reglas de negocio en base de datos (unicidad, congelamiento, topes de pago, ciclo de vida).

**Organization**: Tareas agrupadas por historia de usuario (US1–US6, spec.md) para permitir implementación y prueba independientes.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [x] T001 Crear el archivo de migración `supabase/migrations/20260723100000_cobranza_v2_schema.sql` con el encabezado de referencia a `specs/017-cobranza/` (plan.md, research.md, contracts/db-functions-rls.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: Ninguna historia de usuario puede implementarse hasta que esta fase esté completa.

- [x] T002 [P] En la migración: eliminar el modelo plano de 005 — `cargo_pagos`, `cargos_cobranza`, `cargo_estado` y sus triggers/funciones (`generar_o_actualizar_recibo`, `recalcular_estado_cargo_cobranza`, `bloquear_cargo_cliente_inactivo`) (contracts/db-functions-rls.md Sección A)
- [x] T003 [P] En la migración: enum `cobranza_estado` + tabla `cobranzas` (única por cliente+periodo) + RLS (`view_billing`/`manage_billing`) + trigger de auditoría (Sección B)
- [x] T004 En la migración: trigger `validar_transicion_cobranza` (bloquea eliminar con pagos; bloquea cambios de estado tras cancelada/eliminada) (Sección B) — depende de T003
- [x] T005 [P] En la migración: enum `concepto_cobranza_tipo` + tabla `conceptos_cobranza` (inmutable, sin política de UPDATE) + RLS + trigger de auditoría (Sección C)
- [x] T006 [P] En la migración: enum `cargo_extraordinario_estado` + tabla `cargos_extraordinarios` + RLS (incluye política de DELETE restringida a `estado = 'pendiente'`) + trigger de auditoría (Sección D)
- [x] T007 [P] En la migración: tabla singleton `configuracion_cobranza` (día de generación, día límite) + fila inicial + RLS (Sección E)
- [x] T008 En la migración: adaptar `pagos` (quitar `cliente_id`, agregar `cobranza_id`, renombrar `referencia` a `comentario`) + trigger `validar_pago_cobranza` (bloquea pagos sobre cobranza no vigente o que excedan el saldo) (Sección F) — depende de T003, T005
- [x] T009 En la migración: trigger `generar_recibo_pago` sobre `pagos` (reemplaza el trigger sobre `cargo_pagos`, reutiliza `recibos_folio_seq`) (Sección F) — depende de T008
- [x] T010 En la migración: función `generar_cobranzas(p_forzar boolean)` (idempotente, incorpora servicios activos y cargos extraordinarios pendientes del periodo, registra auditoría de la invocación manual) + `pg_cron` diario con verificación interna del día configurado (Sección G) — depende de T003, T005, T006, T007
- [x] T011 Aplicar la migración contra Supabase local (`supabase migration up`) — depende de T002-T010
- [x] T012 Regenerar `packages/types/src/database.ts` (`supabase gen types typescript --local`, copiar y `prettier --write`) — depende de T011
- [x] T013 [P] Reescribir `packages/utils/src/cobranza.ts` + `cobranza.test.ts`: quitar `calcularEstadoCargo` (modelo viejo), agregar `calcularEstadoPago({totalConceptos, totalPagado})` y `calcularEstadoVencimiento({fechaLimite, hoy, estadoPago})` como funciones puras que reflejan la lógica de la vista `cobranzas_resumen` (Sección G), reutilizables para pruebas unitarias y previsualización en UI sin duplicar la lógica SQL

**Checkpoint**: Esquema, RLS, triggers, generación y funciones puras listos — las historias de usuario pueden implementarse.

---

## Phase 3: User Story 1 - Generar cobranzas del periodo (Priority: P1) 🎯 MVP

**Goal**: Generar automática o manualmente una única cobranza por cliente activo con servicios activos, con conceptos congelados al precio vigente, sin duplicados.

**Independent Test**: Ejecutar la generación (manual) para un periodo con clientes activos con y sin servicios activos, y verificar que solo los primeros reciben una cobranza con un concepto por servicio; repetir la ejecución y verificar que no se duplica nada.

- [x] T014 [US1] En `apps/portal/src/app/(app)/cobranza/actions.ts`: `generarCobranzas()` (Server Action, `requireCapability('manage_billing')`, invoca `generar_cobranzas(true)`)
- [x] T015 [US1] Crear `apps/portal/src/app/(app)/cobranza/page.tsx` + `CobranzaClient.tsx`: bandeja base listando cobranzas generadas (vista `cobranzas_resumen`), botón "Generar cobranzas" visible solo con `manage_billing`
- [x] T016 [US1] Crear `packages/utils/src/cobranza.integration.test.ts` (parte 1, US1) contra Supabase local: unicidad cliente+periodo, idempotencia de la generación (ejecutar dos veces no duplica), cliente activo sin servicios activos no genera cobranza, congelamiento del precio acordado tras cambiarlo

**Checkpoint**: Las cobranzas se generan correctamente de punta a punta (MVP).

---

## Phase 4: User Story 2 - Registrar pagos y ver saldo/estado (Priority: P1)

**Goal**: Registrar pagos totales/parciales sobre una cobranza y ver siempre el saldo y estado de pago actualizados.

**Independent Test**: Generar una cobranza, registrar un pago parcial y verificar saldo/estado, luego completar el pago y verificar que cambia a "Pagada"; intentar un pago que exceda el saldo y verificar el rechazo.

- [x] T017 [P] [US2] Crear `packages/utils/src/pagoCobranzaForm.ts` + test: Yup schema (montoPago, metodoPagoId, fechaPago, comentario opcional) y `mapearErrorPagoCobranzaAMensaje` (pago excede saldo, cobranza no vigente)
- [x] T018 [US2] En `apps/portal/src/app/(app)/cobranza/[cobranzaId]/actions.ts`: `registrarPago(cobranzaId, values)` (Server Action, `requireCapability('manage_billing')`)
- [x] T019 [US2] Crear `apps/portal/src/app/(app)/cobranza/[cobranzaId]/page.tsx` + `CobranzaDetalleClient.tsx`: conceptos, pagos registrados, saldo/estado (vista `cobranzas_resumen`), formulario de pago con catálogo `metodos_pago`
- [x] T020 [US2] Ampliar `packages/utils/src/cobranza.integration.test.ts` (parte 2, US2): pago parcial actualiza saldo/estado, pago que completa el total marca "Pagada", rechazo de pago que excede el saldo, se genera un recibo con folio por cada pago

**Checkpoint**: US1 + US2 cubren el valor de negocio central del feature.

---

## Phase 5: User Story 3 - Registrar e incorporar cargos extraordinarios (Priority: P2)

**Goal**: Registrar un cargo extraordinario con periodo objetivo, e incorporarlo automáticamente como concepto adicional al generarse la cobranza de ese periodo.

**Independent Test**: Registrar un cargo extraordinario con periodo objetivo el mes actual, generar/regenerar la cobranza del periodo, y verificar que aparece como concepto adicional y su estado cambia a "Incorporado"; verificar que ya no puede eliminarse.

- [x] T021 [P] [US3] Crear `packages/utils/src/cargoExtraordinarioForm.ts` + test: Yup schema (descripcion, monto, periodoMes, periodoAnio) y mapeo de errores
- [x] T022 [US3] En `apps/portal/src/app/(app)/cobranza/actions.ts`: agregar `registrarCargoExtraordinario(values)` y `eliminarCargoExtraordinario(cargoId)` (Server Actions, `requireCapability('manage_billing')`)
- [x] T023 [US3] En `apps/portal/src/app/(app)/cobranza/CobranzaClient.tsx`: agregar sección de cargos extraordinarios pendientes (registrar, eliminar mientras pendiente)
- [x] T024 [US3] Ampliar `packages/utils/src/cobranza.integration.test.ts` (parte 3, US3): incorporación automática al generar la cobranza del periodo objetivo, rechazo de eliminación tras incorporado, congelamiento del monto en el concepto resultante

**Checkpoint**: US1 + US2 + US3 cubren generación, pago e ingresos puntuales.

---

## Phase 6: User Story 4 - Consultar cobranzas con filtros (Priority: P2)

**Goal**: Buscar cobranzas combinando RFC, nombre de cliente, mes, año, estado de pago y estado de vencimiento, con un filtro inicial de conveniencia por rol.

**Independent Test**: Generar cobranzas para varios clientes/periodos con distintos estados, y verificar que cada combinación de filtros devuelve exactamente el subconjunto esperado; verificar el filtro inicial por defecto para Contador/Auxiliar.

- [x] T025 [US4] En `apps/portal/src/app/(app)/cobranza/page.tsx`: filtros por `searchParams` (RFC, cliente, mes, año, estado de pago, estado de vencimiento) sobre la vista `cobranzas_resumen`, paginación en servidor (mismo patrón que `obligaciones-fiscales`, 015)
- [x] T026 [US4] En `apps/portal/src/app/(app)/cobranza/CobranzaClient.tsx`: barra de filtros combinables
- [x] T027 [US4] En `apps/portal/src/app/(app)/cobranza/page.tsx`: filtro inicial de conveniencia para Contador/Auxiliar (clientes asignados + cobranzas pendientes de pago), ampliable por el usuario (Clarifications, FR-022) — el Administrador consulta sin restricción
- [x] T028 [US4] Ampliar `packages/utils/src/cobranza.integration.test.ts` (parte 4, US4): combinación de filtros produce el subconjunto correcto, RLS `view_billing`/`manage_billing` sin restricción por cliente asignado

**Checkpoint**: Consulta operativa completa sobre lo generado y pagado.

---

## Phase 7: User Story 5 - Eliminar, cancelar o anular una cobranza (Priority: P3)

**Goal**: Eliminar lógicamente una cobranza sin pagos, o cancelarla/anularla cuando ya tiene pagos, preservando siempre la trazabilidad.

**Independent Test**: Eliminar una cobranza sin pagos (verificar que desaparece de la bandeja operativa) y cancelar una cobranza con pagos (verificar que cobranza, conceptos y pagos siguen disponibles como historial).

- [x] T029 [US5] En `apps/portal/src/app/(app)/cobranza/[cobranzaId]/actions.ts`: `eliminarCobranza(cobranzaId)` y `cancelarCobranza(cobranzaId)` (Server Actions, `requireCapability('manage_billing')`)
- [x] T030 [US5] En `apps/portal/src/app/(app)/cobranza/[cobranzaId]/CobranzaDetalleClient.tsx`: botones eliminar/cancelar con confirmación, mensaje claro cuando el trigger rechaza la eliminación por tener pagos
- [x] T031 [US5] Ampliar `packages/utils/src/cobranza.integration.test.ts` (parte 5, US5): eliminación bloqueada cuando hay pagos, cancelación preserva cobranza/conceptos/pagos/auditoría, una cobranza cancelada/eliminada no admite nuevos pagos

**Checkpoint**: Ciclo de vida completo de la cobranza (generar, pagar, consultar, cerrar).

---

## Phase 8: User Story 6 - Configurar generación/vencimiento y ver clientes sin servicios activos (Priority: P3)

**Goal**: Permitir al Administrador ajustar el día de generación y el día límite de pago, y mostrar en el Dashboard cuántos clientes activos no tienen servicios activos.

**Independent Test**: Cambiar el día límite configurado, generar cobranzas antes y después del cambio, y verificar que solo las posteriores usan el nuevo valor; verificar la tarjeta del Dashboard con al menos un cliente activo sin servicios activos.

- [x] T032 [P] [US6] Crear `packages/utils/src/configuracionCobranzaForm.ts` + test: Yup schema (diaGeneracion, diaLimitePago, ambos 1-28)
- [x] T033 [US6] En `apps/portal/src/app/(app)/cobranza/actions.ts`: `actualizarConfiguracionCobranza(values)` (Server Action, `requireCapability('manage_billing')` + verificación explícita de `role === 'administrador'`, research.md Decisión 7)
- [x] T034 [US6] En `apps/portal/src/app/(app)/cobranza/CobranzaClient.tsx`: panel de configuración visible solo para Administrador
- [x] T035 [US6] En la página de inicio del Dashboard de `apps/portal`: agregar la tarjeta "Clientes sin servicios activos" (conteo + enlace al listado)
- [x] T036 [US6] Ampliar `packages/utils/src/cobranza.integration.test.ts` (parte 6, US6): el cambio de configuración es prospectivo (no altera cobranzas ya generadas), solo Administrador puede modificarla, consulta de clientes sin servicios activos

**Checkpoint**: Las 6 historias de usuario funcionan de forma independiente y en conjunto.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T037 [P] Ejecutar `pnpm --filter portal --filter @control-contable/utils --filter @control-contable/ui type-check`, `lint` y `test` en todo el repo; corregir lo que falle
- [ ] T038 Ejecutar manualmente los 6 escenarios de `quickstart.md` en el navegador (**Bloqueada para mí** — sin Playwright/chromium disponible; requiere validación manual del usuario)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; bloquea todas las historias.
- **US1 (Phase 3)**: depende solo de Foundational — es el MVP.
- **US2 (Phase 4)**: depende de Foundational; usa cobranzas creadas por US1 para probarse, pero su código no depende de los archivos de US1 (salvo la ruta compartida `cobranza/[cobranzaId]`).
- **US3 (Phase 5)**: depende de Foundational (T010 ya incorpora cargos extraordinarios en la generación); esta fase solo agrega la UI/acciones de administración de cargos.
- **US4 (Phase 6)**: depende de Foundational; se apoya en datos de US1/US2 para probarse.
- **US5 (Phase 7)**: depende de Foundational (T004, T008); requiere cobranzas con y sin pagos (US1/US2) para probarse.
- **US6 (Phase 8)**: depende de Foundational (T007, T010); su lógica prospectiva ya es funcional desde Foundational, esta fase agrega la UI de configuración y el Dashboard.
- **Polish (Phase 9)**: depende de todas las historias que se vayan a entregar.

### Parallel Opportunities

- T002, T003, T005, T006, T007 (secciones independientes de la misma migración) pueden redactarse en paralelo antes de ensamblar el archivo final.
- T013 es independiente del resto de Foundational.
- Una vez completado Foundational, US1, US3 (UI) y la parte no dependiente de US6 pueden trabajarse en paralelo; US2, US4 y US5 conviene hacerlas después de tener cobranzas reales de US1 para probarlas con datos significativos.

## Implementation Strategy

### MVP First

1. Setup + Foundational (T001–T013).
2. US1 (T014–T016) — generación de cobranzas usable.
3. **Validar** de forma independiente antes de continuar.

### Incremental Delivery

1. Foundational → US1 (MVP) → US2 (valor central: pagos) → US3 (cargos extraordinarios) → US4 (consulta/filtros) → US5 (eliminar/cancelar) → US6 (configuración/Dashboard) → Polish.
