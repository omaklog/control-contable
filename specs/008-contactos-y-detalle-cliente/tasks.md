# Tasks: Contactos y Página de Detalle de Cliente

**Input**: Design documents from `/specs/008-contactos-y-detalle-cliente/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/server-actions.md](./contracts/server-actions.md), [quickstart.md](./quickstart.md)

**Tests**: La lógica de validación de Contacto (Yup) y el mapeo de errores llevan pruebas unitarias nuevas; la invariante "a lo más un contacto principal por cliente" lleva una prueba de integración contra Supabase local, siguiendo el mismo patrón ya usado para Cliente/Contacto en `005`.

**Organization**: A diferencia de `006`/`007` (donde `ClienteForm` se construyó primero en una app y se promovió después), aquí `ContactoForm` y `ClienteDetalleClient` se construyen directamente como código compartido (research.md Decisión 1) — por eso varias tareas de una misma historia tocan `packages/ui`/`packages/utils` y ambas apps a la vez, en vez de una app primero y otra después.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

**Purpose**: Sin dependencias nuevas — reutiliza Formik/Yup/MUI/Next.js dynamic routes ya presentes en el stack.

- [x] T001 Confirmar que no se requieren dependencias nuevas en `apps/admin`, `apps/portal`, `packages/ui` ni `packages/utils` — confirmado (Formik/Yup ya presentes en los 4 paquetes).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Agregar a `contactos` las columnas `estado` y `es_principal` (con su índice único parcial) de las que dependen tanto la Historia 1 (mostrar estado/principal) como la Historia 2 (gestionarlos). Ninguna historia puede completarse sin este esquema.

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta completar esta fase.

- [x] T002 Crear la migración `supabase/migrations/20260717120000_contactos_estado_principal.sql`: `create type public.contacto_estado as enum ('activo', 'obsoleto')`; `alter table public.contactos add column estado public.contacto_estado not null default 'activo', add column es_principal boolean not null default false`; `create unique index contactos_principal_unico on public.contactos (cliente_id) where es_principal`; actualizar el comentario de la tabla (data-model.md, research.md Decisión 2 y 3)
- [x] T003 Aplicar la migración en Supabase local (`supabase migration up`) — aplicada sin errores; verificado con `\d public.contactos` (columnas `estado`/`es_principal` + índice único parcial presentes)
- [x] T004 Actualizar `packages/types/src/database.ts` (`pnpm generate:types`) — `contacto_estado` y `es_principal` presentes en Row/Insert/Update de `contactos`
- [x] T005 [P] Prueba de integración contra Supabase local en `packages/utils/src/contactosPrincipal.integration.test.ts` — 3/3 pruebas pasando: marcar principal cuando no había ninguno, redesignar principal (secuencia unset+set), y el índice único parcial rechaza un segundo `es_principal=true` simultáneo

**Checkpoint**: Esquema de `contactos` listo con `estado`/`es_principal`; ninguna app ha cambiado todavía.

---

## Phase 3: User Story 1 - Ver el detalle de un Cliente (Priority: P1) 🎯 MVP

**Goal**: Página de detalle de Cliente en `apps/admin` y `apps/portal`, accesible desde el listado, mostrando datos generales y la lista de Contactos (solo lectura por ahora).

**Independent Test**: Escenario 1 de [quickstart.md](./quickstart.md) (pasos 1-3, 5-6) y Escenario 3 completo — con Clientes y Contactos sembrados directamente en la base de datos, sin usar todavía ningún formulario de alta/edición de Contacto.

### Implementation for User Story 1

- [x] T006 [US1] Crear `packages/ui/src/ClienteDetalleClient.tsx`: recibe `cliente` (datos generales), `contactos` (lista) y `canManage`; renderiza una tarjeta con los datos generales del Cliente y una lista de Contactos (nombre, teléfono, correo, badge "Principal") que por defecto solo muestra `estado = 'activo'`, con un toggle "Mostrar obsoletos"; sin ninguna acción de gestión todavía (se agregan en la Historia 2)
- [x] T007 [P] [US1] Exportar `ClienteDetalleClient` desde `packages/ui/src/index.ts`
- [x] T008 [US1] Crear `apps/admin/src/app/(app)/clientes/[clienteId]/page.tsx`: Server Component, `requireCapability('view_clients')`, fetch del Cliente por `clienteId` (`notFound()` de Next.js si no existe o RLS lo oculta), fetch de sus Contactos, calcula `canManage = profile.capabilities.includes('manage_clients')`, renderiza `ClienteDetalleClient`
- [x] T009 [US1] Crear `apps/portal/src/app/(app)/clientes/[clienteId]/page.tsx`: mismo patrón que T008
- [x] T010 [P] [US1] Agregar un enlace "Ver detalle" por fila en `apps/admin/src/app/(app)/clientes/ClientesClient.tsx` hacia `/clientes/[id]`, junto a "Editar"/"Eliminar" (FR-012, research.md Decisión 5)
- [x] T011 [P] [US1] Agregar un enlace "Ver detalle" por fila en `apps/portal/src/app/(app)/clientes/ClientesPortalClient.tsx` hacia `/clientes/[id]` (FR-012)
- [x] T012 [US1] Ejecutar el Escenario 1 (pasos 1-3, 5-6) y el Escenario 3 completo de `quickstart.md` contra `apps/admin` + `apps/portal` corriendo con Supabase local — ver resultado consolidado de Playwright en T028

**Checkpoint**: La página de detalle es navegable y de solo lectura en ambas apps; Auxiliar puede verla sin acciones de gestión.

---

## Phase 4: User Story 2 - Gestionar los Contactos de un Cliente (Priority: P1)

**Goal**: Agregar, editar, marcar como obsoleto/reactivar y designar contacto principal, desde la página de detalle en ambas apps.

**Independent Test**: Escenario 2 de [quickstart.md](./quickstart.md).

### Implementation for User Story 2

- [x] T013 [P] [US2] Crear `packages/utils/src/contactoForm.ts`: `ContactoFormValues`, `contactoFormSchema` (Yup — nombre y teléfono obligatorios, correo opcional válido), `mapearErrorContactoAMensaje(error)` (data-model.md)
- [x] T014 [P] [US2] Crear `packages/utils/src/contactoForm.test.ts`: valida nombre/teléfono obligatorios, correo opcional (vacío pasa, inválido falla), y el mapeo de errores — 8/8 pruebas pasando
- [x] T015 [US2] Exportar `ContactoFormValues`, `contactoFormSchema`, `mapearErrorContactoAMensaje` desde `packages/utils/src/index.ts`
- [x] T016 [US2] Crear `packages/ui/src/ContactoForm.tsx`: Dialog + Formik, prop opcional `contacto` (alta cuando es `undefined`, edición cuando está definido — mismo patrón que `ClienteForm.tsx`)
- [x] T017 [P] [US2] Exportar `ContactoForm` desde `packages/ui/src/index.ts`
- [x] T018 [P] [US2] Crear `apps/admin/src/app/(app)/clientes/[clienteId]/actions.ts`: `createContacto`, `updateContacto`, `setContactoEstado`, `setContactoPrincipal` — todas `requireCapability('manage_clients')` (contracts/server-actions.md)
- [x] T019 [P] [US2] Crear `apps/portal/src/app/(app)/clientes/[clienteId]/actions.ts`: mismas 4 Server Actions que T018 (mismo criterio que `clientes/actions.ts`: no se comparte código `'use server'` entre apps)
- [x] T020 [US2] Actualizar `ClienteDetalleClient.tsx`: agregar botón "Agregar contacto" (visible solo si `canManage`) que abre `ContactoForm` en modo alta dentro de un Dialog; por fila, cuando `canManage`, agregar acciones "Editar" (abre `ContactoForm` en modo edición), "Marcar como obsoleto"/"Reactivar" (con diálogo de confirmación al marcar como obsoleto, sin confirmación al reactivar) y "Marcar como principal"; las Server Actions se reciben como props (inyectadas por cada `page.tsx`), no se importan directamente, para no acoplar el componente compartido a la ruta de una app concreta
- [x] T021 [P] [US2] Actualizar `apps/admin/src/app/(app)/clientes/[clienteId]/page.tsx` para pasar `createContacto`/`updateContacto`/`setContactoEstado`/`setContactoPrincipal` (de T018) como props a `ClienteDetalleClient` (vía `.bind(null, clienteId)`)
- [x] T022 [P] [US2] Actualizar `apps/portal/src/app/(app)/clientes/[clienteId]/page.tsx` para pasar las Server Actions de T019 como props a `ClienteDetalleClient` (vía `.bind(null, clienteId)`)
- [x] T023 [US2] Ejecutar el Escenario 2 completo de `quickstart.md` contra `apps/admin` + `apps/portal` corriendo con Supabase local — ver resultado consolidado de Playwright en T028

**Checkpoint**: Historias 1 y 2 funcionales — MVP de esta feature (ver y gestionar Contactos desde el detalle en ambas apps).

---

## Phase 5: User Story 3 - Reservar el espacio para pagos pendientes (Priority: P3)

**Goal**: Sección "Pagos pendientes" visible en la página de detalle, sin lógica de cobranza.

**Independent Test**: Escenario 1 (paso 4) de [quickstart.md](./quickstart.md).

### Implementation for User Story 3

- [x] T024 [US3] Agregar a `ClienteDetalleClient.tsx` una sección "Pagos pendientes" (Card/Alert "Próximamente"), visualmente diferenciada de la sección de Contactos, sin consultar `cargos_cobranza` ni ninguna tabla de cobranza (FR-011, research.md Decisión 6)
- [x] T025 [US3] Ejecutar el Escenario 1 (paso 4) de `quickstart.md`: confirmar que la sección "Pagos pendientes" existe y es visualmente distinguible de la de Contactos — ver resultado consolidado de Playwright en T028

**Checkpoint**: Las 3 historias de usuario funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificación transversal de calidad, sin tocar código específico de una sola historia.

- [x] T026 [P] `pnpm lint` y `pnpm type-check` en todo el monorepo — ambos verdes en los 8 paquetes.
- [x] T027 [P] `pnpm test` en todo el monorepo — 103 pruebas pasando (30 auth, 4 ui, 9 admin, 57 utils incl. T005/T014, 3 portal); ninguna prueba existente se rompió.
- [x] T028 Validación manual end-to-end con Playwright contra `apps/admin` + `apps/portal` + Supabase local: los 3 escenarios de `quickstart.md` en secuencia, incluida la sincronización cruzada entre apps (FR-009) — los 3 en PASS. Escenario 1: datos generales completos, estado vacío de Contactos, sección "Pagos pendientes" visible con placeholder, Auxiliar ve todo sin botones de gestión. Escenario 2: validación de nombre/teléfono vacíos bloquea el guardado, edición persiste, marcar principal traslada la marca (nunca dos principales — índice único parcial confirmado), marcar obsoleto pide confirmación y oculta por defecto, reactivar restaura, cambios hechos en portal visibles en admin tras recargar y viceversa (FR-009). Escenario 3: "Ver detalle" agregado en ambos listados sin quitar Editar/Eliminar de admin.
- [x] T029 Actualizar este archivo (`tasks.md`) marcando cada tarea completada con notas de verificación
- [x] T030 Limpiar cualquier dato de prueba creado durante la validación manual — confirmado 0 filas remanentes en `contactos`/`clientes` (marcadores PW Test*), `profiles` y `auth.users` (`pw-test-%`).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup — bloquea las 3 historias (las columnas `estado`/`es_principal` son necesarias incluso para la lectura de la Historia 1).
- **User Stories (Phase 3-5)**: US1 depende solo de Foundational. US2 depende de US1 (los botones de gestión viven dentro de `ClienteDetalleClient`, que US1 crea, y de `page.tsx`, que US1 crea en ambas apps). US3 depende de US1 (agrega una sección más a `ClienteDetalleClient`) pero no de US2.
- **Polish (Phase 6)**: depende de que las 3 historias estén completas.

### Within Each Phase

- Foundational: migración (T002) antes de aplicarla (T003); tipos (T004) y prueba de integración (T005) pueden ir en paralelo después de T003.
- US1: `ClienteDetalleClient.tsx` (T006) antes de exportarlo (T007) y antes de los `page.tsx` que lo consumen (T008-T009); los enlaces "Ver detalle" (T010-T011) son independientes entre sí y de T006-T009; validar al final (T012).
- US2: `contactoForm.ts`/test (T013-T014) antes de exportarlo (T015); `ContactoForm.tsx` (T016) antes de exportarlo (T017); las Server Actions de cada app (T018-T019) son independientes entre sí; T020 (wiring de `ClienteDetalleClient`) depende de T015-T019; T021-T022 (pasar las Server Actions como props) dependen de T018/T019 y de T020; validar al final (T023).
- US3: T024 antes de validar (T025).

### Parallel Opportunities

- T004 y T005 (Foundational) en paralelo tras T003.
- T007, T010, T011 (US1) en paralelo entre sí.
- T013/T014, T017, T018/T019 (US2) en paralelo entre sí (archivos distintos).
- T021 y T022 (US2) en paralelo entre sí.
- T026 y T027 (Polish) en paralelo.

---

## Implementation Strategy

### MVP First (Foundational + US1 + US2)

1. Completar Setup + Foundational (esquema de `contactos` listo).
2. Completar Phase 3 (US1) y Phase 4 (US2) — ya se puede ver y gestionar Contactos desde el detalle en ambas apps.
3. **STOP and VALIDATE**: correr los Escenarios 1 y 2 de quickstart.md.

### Incremental Delivery

1. Setup + Foundational → columnas `estado`/`es_principal` listas, con su invariante probada.
2. US1 → validar de forma independiente → detalle navegable y de solo lectura en ambas apps.
3. US2 → validar de forma independiente → gestión completa de Contactos disponible (MVP de esta feature).
4. US3 → validar de forma independiente → espacio de "Pagos pendientes" reservado.
5. Polish → lint/type-check/test + validación manual completa.

---

## Notes

- [P] = archivos distintos, sin dependencias entre sí.
- Esta feature modifica el esquema de `contactos` (agrega `estado`, `es_principal`) pero no toca `clientes` ni `regimenes_fiscales`.
- A diferencia de `006`→`007` (promoción posterior), `ContactoForm` y `ClienteDetalleClient` se construyen compartidos desde esta primera iteración porque ambos consumidores (`apps/admin`, `apps/portal`) son conocidos desde el inicio (research.md Decisión 1).
- No se agrega auditoría (`business_audit_log`) para Contactos en esta feature (spec.md, Assumptions).

## Bugfix (2026-07-18, detectado al refinar `005-clientes-cobranza-expedientes`)

**Motivo**: `spec.md` Edge Cases ya documentaba, desde la redacción original, que "si el único contacto principal de un Cliente se marca como obsoleto, el Cliente queda temporalmente sin contacto principal marcado" — pero `setContactoEstado` (T018/T019) nunca implementó esa parte: solo actualizaba `estado`, sin tocar `es_principal`. Un contacto podía quedar marcado como obsoleto y seguir apareciendo como "principal" indefinidamente.

- [x] T028 [P] Corregido `setContactoEstado` en `apps/admin/src/app/(app)/clientes/[clienteId]/actions.ts`: al marcar `estado: 'obsoleto'`, el `UPDATE` también establece `es_principal: false` en la misma llamada; reactivar (`estado: 'activo'`) no restaura `es_principal` automáticamente (el personal debe designar uno nuevo si lo requiere, consistente con el edge case original)
- [x] T029 [P] Misma corrección en `apps/portal/src/app/(app)/clientes/[clienteId]/actions.ts` (código duplicado entre apps, no compartido — ver Notes)
- [x] T030 Verificado `pnpm type-check`/`lint` limpios en `apps/admin` y `apps/portal` tras T028/T029
