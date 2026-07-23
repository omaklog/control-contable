---
description: 'Task list for 018-gestion-pagos'
---

# Tasks: Gestión de Pagos

**Input**: Design documents from `/specs/018-gestion-pagos/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/db-functions-rls.md, quickstart.md

**Tests**: Se incluyen tareas de prueba de integración (mismo patrón ya usado en 011/013/014/015/016/017: `packages/utils/src/pagos.integration.test.ts` contra Supabase local real) porque el spec depende fuertemente de reglas de negocio en base de datos (estados terminales, revalidación de saldo, exclusión de pagos no activos).

**Organization**: Tareas agrupadas por historia de usuario (US1–US6, spec.md) para permitir implementación y prueba independientes.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [x] T001 Crear el archivo de migración `supabase/migrations/20260724100000_gestion_pagos_schema.sql` con el encabezado de referencia a `specs/018-gestion-pagos/` (plan.md, research.md, contracts/db-functions-rls.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: Ninguna historia de usuario puede implementarse hasta que esta fase esté completa.

- [x] T002 [P] En la migración: enum `pago_estado` (`activo`/`revertido`/`eliminado`) + `alter table pagos` (agrega `estado` default `activo`, `motivo_reversion`, constraint que exige motivo solo cuando `estado = 'revertido'`) + política `pagos_update_manage` (Sección A)
- [x] T003 En la migración: función y trigger `validar_transicion_pago` (`revertido`/`eliminado` son estados finales, sin excepción) (Sección B) — depende de T002
- [x] T004 En la migración: extender `validar_pago_cobranza` para revalidar saldo también en `UPDATE`, excluyendo el monto anterior del propio pago de la suma de "otros pagos activos" (Sección C) — depende de T002
- [x] T005 En la migración: recrear la vista `cobranzas_resumen` filtrando `estado = 'activo'` en la subconsulta de pagos (Sección D) — depende de T002
- [x] T006 En la migración: redefinir `trg_pagos_audit_fn` para distinguir `modificacion` (jsonb por campo cambiado), `eliminacion_logica` y `reversion` (con `motivo_reversion`) (Sección E) — depende de T002
- [x] T007 [P] En la migración: tabla `comprobantes_pago` (sin política de UPDATE) + RLS (`view_billing`/`manage_billing` en SELECT, `manage_billing` en INSERT/DELETE) + trigger de auditoría (`carga`/`eliminacion`) (Sección F)
- [x] T008 [P] En la migración: bucket de Storage `comprobantes-pago` (privado, 20 MB, PDF/PNG/JPEG) + policies de `storage.objects` (select/insert/delete gateadas por `view_billing`/`manage_billing`) (Sección G)
- [x] T009 Aplicar la migración contra Supabase local (`supabase migration up`) — depende de T002-T008
- [x] T010 Regenerar `packages/types/src/database.ts` (`supabase gen types typescript --local`, copiar y `prettier --write`) — depende de T009

**Checkpoint**: Esquema, RLS, triggers y Storage listos — las historias de usuario pueden implementarse.

---

## Phase 3: User Story 1 - Modificar un pago registrado (Priority: P1) 🎯 MVP

**Goal**: Corregir fecha/método/monto/referencia/comentario de un pago existente, con revalidación de saldo y auditoría campo por campo.

**Independent Test**: Modificar el monto y la fecha de un pago sobre una cobranza con saldo pendiente, y verificar que el saldo se recalcula y que el historial de auditoría muestra el valor anterior y el nuevo de cada campo modificado; intentar una modificación que exceda el saldo y verificar el rechazo.

- [x] T011 [P] [US1] Crear `packages/utils/src/modificarPagoForm.ts` + test: Yup schema (mismo shape que `pagoCobranzaForm`: monto, metodoPagoId, fechaPago, comentario) y reutilización de `mapearErrorPagoCobranzaAMensaje` para el mensaje de saldo excedido
- [x] T012 [US1] En `apps/portal/src/app/(app)/cobranza/[cobranzaId]/actions.ts`: agregar `modificarPago(pagoId, values)` (Server Action, `requireCapability('manage_billing')`)
- [x] T013 [US1] En `apps/portal/src/app/(app)/cobranza/[cobranzaId]/CobranzaDetalleClient.tsx`: agregar acción "Modificar" por fila del historial de pagos, con formulario de edición prellenado
- [x] T014 [US1] Crear `packages/utils/src/pagos.integration.test.ts` (parte 1, US1) contra Supabase local: modificar monto recalcula saldo/estado de la cobranza, modificar fecha queda en auditoría con `antes`/`despues`, rechazo cuando la modificación excede el saldo

**Checkpoint**: La corrección de pagos ya registrados funciona de punta a punta (MVP).

---

## Phase 4: User Story 2 - Revertir un pago con motivo (Priority: P1)

**Goal**: Revertir un pago inválido conservando su registro histórico, excluyéndolo del saldo, exigiendo un motivo obligatorio.

**Independent Test**: Revertir un pago que deja una cobranza en "Pagada" sin capturar motivo (debe rechazarse), luego revertirlo con motivo y verificar que el saldo/estado de la cobranza se recalculan y que el pago sigue visible con su motivo.

- [x] T015 [P] [US2] Crear `packages/utils/src/revertirPagoForm.ts` + test: Yup schema (`motivoReversion` requerido)
- [x] T016 [US2] En `apps/portal/src/app/(app)/cobranza/[cobranzaId]/actions.ts`: agregar `revertirPago(pagoId, motivoReversion)` (Server Action, `requireCapability('manage_billing')`)
- [x] T017 [US2] En `CobranzaDetalleClient.tsx`: acción "Revertir" con diálogo que exige motivo; el historial muestra el badge "Revertido" y el motivo capturado
- [x] T018 [US2] Ampliar `packages/utils/src/pagos.integration.test.ts` (parte 2, US2): reversión sin motivo se rechaza, reversión con motivo recalcula saldo/estado y preserva el registro, un pago ya revertido no puede revertirse ni eliminarse de nuevo (estado final)

**Checkpoint**: US1 + US2 cubren la corrección y la invalidación controlada de pagos.

---

## Phase 5: User Story 3 - Eliminar lógicamente un pago (Priority: P1)

**Goal**: Retirar de la operación normal un pago registrado por error, sin borrar el registro físico ni afectar el historial.

**Independent Test**: Eliminar lógicamente un pago activo y verificar que deja de contarse en el importe pagado, que el saldo se recalcula, y que no aparece en la vista global de pagos con sus filtros por defecto.

- [x] T019 [US3] En `apps/portal/src/app/(app)/cobranza/[cobranzaId]/actions.ts`: agregar `eliminarPago(pagoId)` (Server Action, `requireCapability('manage_billing')`)
- [x] T020 [US3] En `CobranzaDetalleClient.tsx`: acción "Eliminar" por fila, con confirmación explícita
- [x] T021 [US3] Ampliar `packages/utils/src/pagos.integration.test.ts` (parte 3, US3): eliminación lógica excluye el pago del cálculo de saldo, genera evento de auditoría, y un pago eliminado no puede transicionar a ningún otro estado

**Checkpoint**: US1 + US2 + US3 cubren el ciclo de vida completo de un pago individual.

---

## Phase 6: User Story 4 - Adjuntar y eliminar comprobantes de pago (Priority: P2)

**Goal**: Adjuntar uno o varios archivos de comprobante a un pago, y eliminar un comprobante de forma independiente del pago al que pertenece.

**Independent Test**: Adjuntar dos comprobantes distintos a un mismo pago y verificar su metadata completa; eliminar uno de ellos y verificar que el archivo se retira del Storage sin afectar el pago ni el otro comprobante.

- [x] T022 [US4] En `apps/portal/src/app/(app)/cobranza/[cobranzaId]/actions.ts`: agregar `adjuntarComprobante(pagoId, archivo)` (sube a `comprobantes-pago`, inserta la fila de metadata) y `eliminarComprobante(comprobanteId)` (borra primero el objeto de Storage, luego la fila — contracts/db-functions-rls.md Sección H) (Server Actions, `requireCapability('manage_billing')`)
- [x] T023 [US4] En `apps/portal/src/app/(app)/cobranza/[cobranzaId]/page.tsx`: incluir los comprobantes de cada pago en la consulta del detalle
- [x] T024 [US4] En `CobranzaDetalleClient.tsx`: UI de comprobantes por pago (subir uno o varios archivos, listar, eliminar de forma independiente)
- [x] T025 [US4] Ampliar `packages/utils/src/pagos.integration.test.ts` (parte 4, US4): adjuntar múltiples comprobantes a un mismo pago, eliminar uno no afecta el pago ni los demás comprobantes, el mismo archivo puede adjuntarse repetidamente sin validación de duplicidad, RLS de `storage.objects` sobre el bucket `comprobantes-pago` (verificado a nivel de tabla `comprobantes_pago`, que comparte el mismo gate de capacidad que las policies de `storage.objects`)

**Checkpoint**: Los pagos pueden documentarse con evidencia adjunta, gestionable de forma independiente.

---

## Phase 7: User Story 5 - Consultar pagos desde una vista global (Priority: P2)

**Goal**: Buscar pagos de cualquier cliente/cobranza desde una pantalla independiente, combinando filtros de cliente, RFC, fecha de pago, método, estado, cobranza y usuario que registró.

**Independent Test**: Registrar pagos con distintos clientes, métodos, fechas y estados, y verificar que cada combinación de filtros en la vista global devuelve exactamente el subconjunto esperado.

- [x] T026 [US5] Crear `apps/portal/src/app/(app)/pagos/page.tsx`: Server Component (`requireCapability('view_billing')`) que une `pagos` con `cobranzas`/`clientes`/`metodos_pago`/`profiles` (usuario que registró), filtra por `searchParams` (cliente, RFC, fecha de pago inicial/final, método, estado, cobranza, usuario) con `estado = 'activo'` como filtro por defecto, y pagina (mismo patrón que `cobranza/page.tsx`, 017)
- [x] T027 [US5] Crear `apps/portal/src/app/(app)/pagos/PagosClient.tsx`: barra de filtros combinables + tabla de resultados
- [x] T028 [US5] En `apps/portal/src/components/layout/navigation.ts`: agregar la entrada de menú "Pagos" (`/pagos`, `view_billing`) — nueva, sin placeholder previo (research.md Decisión 9)
- [x] T029 [US5] Ampliar `packages/utils/src/pagos.integration.test.ts` (parte 5, US5): combinación de filtros produce el subconjunto correcto, el filtro de estado por defecto solo muestra pagos activos y puede ampliarse

**Checkpoint**: Visibilidad operativa transversal sobre todos los pagos del despacho.

---

## Phase 8: User Story 6 - Ver historial de pagos actualizado en el detalle de cobranza (Priority: P3)

**Goal**: Que el historial de pagos, el total pagado y el saldo pendiente mostrados en el detalle de una cobranza se reflejen de inmediato tras registrar, modificar, eliminar o revertir un pago.

**Independent Test**: Revertir un pago desde el detalle de una cobranza y verificar, sin recargar manualmente ninguna otra pantalla, que el saldo pendiente y el estado de pago mostrados se actualizan de inmediato.

- [x] T030 [US6] En `apps/portal/src/app/(app)/cobranza/[cobranzaId]/actions.ts`: confirmar que `modificarPago`/`revertirPago`/`eliminarPago`/`adjuntarComprobante`/`eliminarComprobante` invalidan la ruta del detalle (`revalidatePath`, mismo patrón que `registrarPago` en 017) para que el historial se refresque sin recarga manual
- [x] T031 [US6] En `CobranzaDetalleClient.tsx`: mostrar el estado (Activo/Revertido/Eliminado) y el motivo de reversión en cada fila del historial de pagos, junto al total pagado y saldo pendiente ya existentes
- [x] T032 [US6] Ampliar `packages/utils/src/pagos.integration.test.ts` (parte 6, US6): tras eliminar o revertir un pago, `cobranzas_resumen` refleja de inmediato el nuevo saldo/estado (verificado a nivel de consulta; el refresco visual en el navegador se valida manualmente en quickstart.md)

**Checkpoint**: Las 6 historias de usuario funcionan de forma independiente y en conjunto.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [x] T033 [P] Ejecutar `pnpm --filter portal --filter @control-contable/utils --filter @control-contable/ui type-check`, `lint` y `test` en todo el repo; corregir lo que falle
- [ ] T034 Ejecutar manualmente los 6 escenarios de `quickstart.md` en el navegador (**Bloqueada para mí** — sin Playwright/chromium disponible; requiere validación manual del usuario)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; bloquea todas las historias.
- **US1 (Phase 3)**: depende solo de Foundational — es el MVP.
- **US2 (Phase 4)**: depende de Foundational; comparte archivos (`actions.ts`, `CobranzaDetalleClient.tsx`) con US1 pero su lógica de negocio (reversión) es independiente.
- **US3 (Phase 5)**: depende de Foundational; comparte los mismos archivos que US1/US2, lógica de negocio (eliminación lógica) independiente.
- **US4 (Phase 6)**: depende de Foundational (T007, T008); requiere al menos un pago existente (de US1/US2/US3) para adjuntarle comprobantes, pero su código no depende de esas historias.
- **US5 (Phase 7)**: depende de Foundational; es una pantalla nueva e independiente, se apoya en datos de las demás historias para probarse con variedad de estados.
- **US6 (Phase 8)**: depende de Foundational y, en la práctica, de que existan las acciones de US1/US2/US3 (modificar/revertir/eliminar) para verificar el refresco automático de cada una.
- **Polish (Phase 9)**: depende de todas las historias que se vayan a entregar.

### Parallel Opportunities

- T002, T007, T008 (secciones independientes de la misma migración) pueden redactarse en paralelo antes de ensamblar el archivo final.
- T011 y T015 (esquemas Yup de US1/US2) son independientes entre sí y del resto de Foundational.
- Una vez completado Foundational, US1, US2 y US3 tocan los mismos archivos (`actions.ts`, `CobranzaDetalleClient.tsx`) por lo que conviene secuenciarlas entre sí aunque su lógica de negocio sea independiente; US4 y US5 pueden avanzar en paralelo a esas tres al tocar archivos distintos (comprobantes y la nueva vista global, respectivamente).

## Implementation Strategy

### MVP First

1. Setup + Foundational (T001–T010).
2. US1 (T011–T014) — modificación de pagos usable.
3. **Validar** de forma independiente antes de continuar.

### Incremental Delivery

1. Foundational → US1 (MVP: modificar) → US2 (revertir) → US3 (eliminar lógicamente) → US4 (comprobantes) → US5 (vista global) → US6 (historial en tiempo real) → Polish.
