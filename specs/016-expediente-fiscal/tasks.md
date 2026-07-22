---
description: 'Task list for 016-expediente-fiscal'
---

# Tasks: Expediente Fiscal

**Input**: Design documents from `/specs/016-expediente-fiscal/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/db-functions-rls.md, quickstart.md

**Tests**: Se incluyen tareas de prueba de integración (patrón ya usado en 011/013/014/015: `packages/utils/src/*.integration.test.ts` contra Supabase local real) porque el spec depende fuertemente de reglas de negocio en base de datos (RLS, triggers, unicidad).

**Organization**: Tareas agrupadas por historia de usuario (US1–US5, spec.md) para permitir implementación y prueba independientes.

## Format: `[ID] [P?] [Story] Description`

---

## Phase 1: Setup

- [x] T001 Crear el archivo de migración `supabase/migrations/20260722100000_expediente_fiscal_schema.sql` con el encabezado de referencia a `specs/016-expediente-fiscal/` (plan.md, research.md, contracts/db-functions-rls.md)

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: Ninguna historia de usuario puede implementarse hasta que esta fase esté completa.

- [x] T002 [P] En `supabase/migrations/20260722100000_expediente_fiscal_schema.sql`: extender `documentos` — `categoria_id` opcional, agregar `obligacion_fiscal_id`, `eliminado_en`, `eliminado_por`, agregar valor `'eliminado'` al enum `documento_estado` (contracts/db-functions-rls.md Sección A)
- [x] T003 [P] En la misma migración: función y trigger `validar_eliminacion_logica_documento` (antigüedad de 3 meses + rol Administrador sin restricción) sobre `documentos` (Sección B)
- [x] T004 En la misma migración: actualizar `trg_documentos_audit_fn` para distinguir `eliminacion_logica` y `cambio_tipo_documento` (Sección C) — depende de T002
- [x] T005 [P] En la misma migración: `unique index cumplimiento_fiscal_documentos_documento_unique on cumplimiento_fiscal_documentos (documento_id)` (Sección D)
- [x] T006 [P] En la misma migración: tabla `documentos_esperados_obligacion` + RLS (`manage_catalogs` para insert/update, select para todo staff autenticado) + trigger de auditoría (Sección E)
- [x] T007 En la misma migración: tabla `cumplimiento_documentos_esperados` (snapshot, solo select) + función/trigger `trg_cumplimientos_fiscales_snapshot_esperados_fn` sobre `cumplimientos_fiscales` AFTER INSERT (Sección F) — depende de T006
- [x] T008 [P] En la misma migración: bucket privado `expedientes` en Supabase Storage + políticas de acceso (`view_documents`/`manage_documents`) (Sección H)
- [x] T009 Aplicar la migración contra Supabase local (`supabase migration up` o `supabase db reset` si aplica) — depende de T002-T008
- [x] T010 Regenerar `packages/types/src/database.ts` (`supabase gen types typescript --local`, copiar y `prettier --write`) — depende de T009
- [x] T011 [P] En `packages/auth/src/roles.ts`: agregar `'manage_documents'` a `ROLE_DEFAULT_CAPABILITIES.contador` y `.auxiliar` (Sección G)
- [x] T012 [P] Actualizar `specs/003-supabase-auth-roles/contracts/role-permissions.md`: `manage_documents` ahora ✅ en Administrador/Contador/Auxiliar, retirar nota "sin módulo todavía" para esa fila

**Checkpoint**: Esquema, RLS, triggers y capacidades listos — las historias de usuario pueden implementarse.

---

## Phase 3: User Story 1 - Consultar y cargar documentos en el expediente del cliente (Priority: P1) 🎯 MVP

**Goal**: Ver el expediente de un cliente organizado en Documentos Generales/por Periodo, subir un PDF, clasificarlo (o dejarlo "Sin clasificar"), y visualizar/descargar vía acceso temporal.

**Independent Test**: Subir un PDF al expediente de un cliente sin cumplimiento asociado y verificar que aparece en Documentos Generales con sus metadatos correctos; subir uno asociado a un cumplimiento y verificar que aparece agrupado por año/periodo.

- [x] T013 [P] [US1] Crear `packages/utils/src/documentoForm.ts` + `documentoForm.test.ts`: Yup schema de carga (archivo PDF requerido, tipo de documento opcional, cumplimiento opcional, obligación opcional) y `mapearErrorDocumentoAMensaje` (mapeo de errores Postgres: mismo-cliente, unicidad de cumplimiento)
- [x] T014 [US1] Crear `packages/ui/src/ExpedienteFiscalSection.tsx`: secciones "Documentos Generales" y "Documentos por Periodo" (agrupadas por año/etiqueta de periodo), tabla con metadatos, formulario de carga con `Autocomplete` de Tipo de Documento (opcional) y de cumplimiento (opcional)
- [x] T015 [US1] En `apps/portal/src/app/(app)/clientes/[clienteId]/actions.ts`: agregar `subirDocumento` (sube a Storage + inserta fila en `documentos`), `actualizarClasificacionDocumento`, `obtenerUrlFirmadaDocumento` (`createSignedUrl`, 5 minutos)
- [x] T016 [US1] En `apps/portal/src/app/(app)/clientes/[clienteId]/page.tsx`: cargar documentos del cliente (con `categorias_documento`, `cumplimiento_fiscal_documentos.cumplimientos_fiscales`) y catálogo de Tipos de Documento activos; pasar props a `ClienteDetalleClient`
- [x] T017 [US1] En `packages/ui/src/ClienteDetalleClient.tsx`: renderizar `<ExpedienteFiscalSection>` como nueva sección (mismo patrón que Servicios/Obligaciones Fiscales del Cliente)
- [x] T018 [US1] Crear `packages/utils/src/documentos.integration.test.ts` (parte 1, US1) contra Supabase local: carga de PDF válido, rechazo de archivo no-PDF, documento "Sin clasificar" (`categoria_id` null), aislamiento estricto por cliente (rechazo al asociar cliente distinto)

**Checkpoint**: El expediente del cliente es usable de punta a punta (MVP).

---

## Phase 4: User Story 2 - Ver Documentos Esperados de un cumplimiento y cargar documentos adicionales (Priority: P1)

**Goal**: Mostrar en el detalle de un cumplimiento el estado disponible/faltante de sus Documentos Esperados, sin bloquear ninguna acción sobre el cumplimiento, y permitir cargar documentos adicionales libremente.

**Independent Test**: Configurar Documentos Esperados en una obligación, generar un cumplimiento, subir un documento que cubra uno de los esperados, y verificar que el detalle del cumplimiento refleja disponible/faltante correctamente sin bloquear el cambio de estado.

- [x] T019 [US2] En `apps/portal/src/app/(app)/obligaciones-fiscales/[cumplimientoId]/actions.ts`: agregar `obtenerDocumentosEsperados(cumplimientoId)` (join `cumplimiento_documentos_esperados` + `categorias_documento` + existencia de documento asociado no eliminado)
- [x] T020 [US2] En `apps/portal/src/app/(app)/obligaciones-fiscales/[cumplimientoId]/page.tsx`: cargar esperados (disponible/faltante) y documentos adicionales (asociados sin categoría en la lista de esperados)
- [x] T021 [US2] En `apps/portal/src/app/(app)/obligaciones-fiscales/[cumplimientoId]/CumplimientoDetalleClient.tsx`: agregar sección "Documentos Esperados" (✓/✗ por tipo) y "Documentos Adicionales", reutilizando el flujo de asociar/desasociar ya construido en 015
- [x] T022 [US2] Ampliar `packages/utils/src/documentos.integration.test.ts` (parte 2, US2): esperado "disponible" tras asociar el tipo correcto, "faltante" si no se sube nada, cambio de estado del cumplimiento a "Presentada" sin bloqueo pese a esperados faltantes, documento adicional visible fuera de la lista de esperados

**Checkpoint**: US1 + US2 cubren el valor de negocio central del feature.

---

## Phase 5: User Story 3 - Buscar documentos desde la vista global de Expedientes (Priority: P2)

**Goal**: Sección "Documentos Fiscales" transversal a todos los clientes, con búsqueda/filtro y enlace al expediente del cliente correspondiente.

**Independent Test**: Cargar documentos para dos clientes distintos y verificar que la vista global permite localizar cada uno por distintos filtros, respetando permisos.

- [x] T023 [P] [US3] Crear `apps/portal/src/app/(app)/documentos-fiscales/page.tsx`: Server Component con filtros por `searchParams` (cliente, RFC, tipo, año/periodo, obligación, cumplimiento, fecha de alta, usuario) y paginación en servidor (mismo patrón que `obligaciones-fiscales/page.tsx`, 015)
- [x] T024 [US3] Crear `apps/portal/src/app/(app)/documentos-fiscales/DocumentosFiscalesClient.tsx`: barra de filtros, tabla de resultados, enlace a `/clientes/[clienteId]`
- [x] T025 [US3] En `apps/portal/src/components/layout/navigation.ts`: activar el placeholder "Documentos Fiscales" (`implemented: true`), actualizar el comentario de arquitectura de información
- [x] T026 [US3] Actualizar `apps/portal/src/components/layout/navigation.test.ts`: reemplazar la prueba del placeholder "sin módulo todavía" por una que confirme `implemented: true` / `capability: 'view_documents'` (mismo ajuste que 015 hizo para "Obligaciones Fiscales")
- [x] T027 [US3] Ampliar `packages/utils/src/documentos.integration.test.ts` (parte 3, US3): búsqueda cruzada por Tipo de Documento entre dos clientes, navegación desde un resultado al cliente correcto, documentos de un cliente sin autorización no aparecen

**Checkpoint**: El despacho tiene visibilidad documental transversal.

---

## Phase 6: User Story 4 - Eliminar un documento respetando permisos por antigüedad (Priority: P2)

**Goal**: Eliminación lógica de documentos con restricción de antigüedad para Contador/Auxiliar (≤ 3 meses) y sin restricción para Administrador.

**Independent Test**: Crear documentos con distinta antigüedad y verificar, por rol, cuáles pueden eliminarse y cuáles requieren un Administrador.

- [x] T028 [US4] En `apps/portal/src/app/(app)/clientes/[clienteId]/actions.ts`: agregar `eliminarDocumento` (`update estado='eliminado'`) con mapeo del error de permiso por antigüedad a un mensaje claro
- [x] T029 [US4] En `packages/ui/src/ExpedienteFiscalSection.tsx`: agregar acción "Eliminar" con confirmación y manejo del mensaje de error cuando el trigger la rechace
- [x] T030 [US4] Ampliar `packages/utils/src/documentos.integration.test.ts` (parte 4, US4): Auxiliar elimina documento reciente (éxito), Contador rechazado en documento de 4 meses, Administrador sin restricción, antigüedad basada en `fecha_carga` y no en `updated_at` tras modificar metadatos

**Checkpoint**: El expediente puede mantenerse ordenado sin exponer eliminaciones indebidas.

---

## Phase 7: User Story 5 - Definir Documentos Esperados para una obligación fiscal (Priority: P3)

**Goal**: Administración de Tipos de Documento y de Documentos Esperados por obligación, con snapshot histórico ya cubierto en Foundational (T007).

**Independent Test**: Configurar esperados en una obligación, generar un cumplimiento, modificar la configuración, y verificar que el cumplimiento ya generado conserva su lista original mientras uno nuevo usa la actualizada.

- [x] T031 [P] [US5] Crear `packages/utils/src/documentosEsperadosForm.ts` + test: Yup schema para agregar un Documento Esperado (selección de Tipo de Documento, evitar duplicados activos)
- [x] T032 [US5] Crear `apps/admin/src/app/(app)/catalogos/tipos-documento/page.tsx` + `TiposDocumentoClient.tsx`: CRUD sobre `categorias_documento` (crear, editar, activar/desactivar), mismo patrón que otros catálogos de `012`
- [x] T033 [US5] En `apps/admin/src/app/(app)/catalogos/page.tsx`: agregar entrada "Tipos de Documento"
- [x] T034 [US5] En `apps/admin/src/app/(app)/catalogos/obligaciones-fiscales/page.tsx` y `ObligacionesFiscalesClient.tsx`: agregar gestión de Documentos Esperados de la obligación seleccionada (agregar/desactivar, historial vía auditoría)
- [x] T035 [US5] Ampliar `packages/utils/src/documentos.integration.test.ts` (parte 5, US5): snapshot de un cumplimiento ya generado no cambia tras modificar la configuración, un cumplimiento nuevo usa la configuración vigente

**Checkpoint**: Las 5 historias de usuario funcionan de forma independiente y en conjunto.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [x] T036 [P] Ejecutar `pnpm --filter admin --filter portal --filter @control-contable/utils --filter @control-contable/ui type-check`, `lint` y `test` en todo el repo; corregir lo que falle
- [ ] T037 Ejecutar manualmente los 5 escenarios de `quickstart.md` en el navegador (**Bloqueada para mí** — sin Playwright/chromium disponible; requiere validación manual del usuario)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup; bloquea todas las historias.
- **US1 (Phase 3)**: depende solo de Foundational — es el MVP.
- **US2 (Phase 4)**: depende de Foundational (snapshot ya construido en T007) y de que existan documentos/cumplimientos (US1 ayuda a probarla end-to-end, pero su código no depende de los archivos de US1).
- **US3 (Phase 5)**: depende de Foundational; usa datos creados por US1 para probarse, pero no depende de sus archivos.
- **US4 (Phase 6)**: depende de Foundational (T003, T004) y de que existan documentos (US1) para probarse.
- **US5 (Phase 7)**: depende de Foundational (T006, T007); su snapshot ya es funcional desde Foundational, esta fase solo agrega la UI de administración.
- **Polish (Phase 8)**: depende de todas las historias que se vayan a entregar.

### Parallel Opportunities

- T002, T003, T005, T006, T008 (todas dentro de la misma migración, pero en secciones independientes) pueden redactarse en paralelo antes de ensamblar el archivo final.
- T011, T012 son independientes del resto de Foundational y entre sí.
- Una vez completado Foundational, US1, US3 y US5 pueden trabajarse en paralelo por distintas personas; US2 y US4 conviene hacerlas después de US1 para tener documentos de prueba reales.

## Implementation Strategy

### MVP First

1. Setup + Foundational (T001–T012).
2. US1 (T013–T018) — expediente del cliente usable.
3. **Validar** de forma independiente antes de continuar.

### Incremental Delivery

1. Foundational → US1 (MVP) → US2 (valor central) → US3 (vista global) → US4 (mantenimiento) → US5 (configuración) → Polish.
