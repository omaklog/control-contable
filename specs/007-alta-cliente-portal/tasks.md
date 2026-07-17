# Tasks: Alta de Cliente desde el Portal (con listado y filtros)

**Input**: Design documents from `/specs/007-alta-cliente-portal/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/server-actions.md](./contracts/server-actions.md), [quickstart.md](./quickstart.md)

**Tests**: La lógica de validación del formulario ya tiene pruebas (primera iteración, sin cambios). Esta iteración agrega una prueba unitaria nueva al mover `calcularTotalPaginas()` a `packages/utils`. Sin pruebas de integración nuevas contra Supabase (no hay cambios de esquema).

**Organization**: Esta es la **segunda iteración** de esta feature — la primera (formulario de alta sin listado, T001-T019 del `tasks.md` anterior) ya está implementada. Aquí: Foundational promueve `calcularTotalPaginas()`; US1 agrega el listado+filtros; US2 reescribe el alta como modal sobre esa tabla; US3 ajusta el gate de acceso.

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup

**Purpose**: Sin dependencias nuevas — reutiliza Formik/Yup/MUI ya presentes.

- [x] T001 Confirmar que no se requieren dependencias nuevas en `apps/portal` ni en `packages/utils` — confirmado (Formik/Yup/MUI ya presentes).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Promover `calcularTotalPaginas()` de `apps/admin` a `packages/utils`, ahora que `apps/portal` también pagina una tabla de Clientes (research.md, plan.md Project Structure).

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta completar esta fase.

- [x] T002 Mover `calcularTotalPaginas()` de `apps/admin/src/app/(app)/clientes/paginacion.ts` a `packages/utils/src/paginacion.ts`; actualizar `packages/utils/src/index.ts` para exportarla
- [x] T003 [P] Mover `apps/admin/src/app/(app)/clientes/paginacion.test.ts` a `packages/utils/src/paginacion.test.ts` (mismo contenido, solo ajustar el import)
- [x] T004 Actualizar `apps/admin/src/app/(app)/clientes/page.tsx` para importar `calcularTotalPaginas` desde `@control-contable/utils`; eliminar los archivos ahora duplicados (`paginacion.ts`, `paginacion.test.ts` locales de `apps/admin`)
- [x] T005 Verificar que no hay regresión en `apps/admin`: `pnpm --filter @control-contable/admin type-check`/`lint`/`test` — pasan; suite de `admin` bajó de 12 a 9 pruebas (las 3 de paginación se movieron a `packages/utils`, que subió a 46).

**Checkpoint**: `calcularTotalPaginas()` compartida; `apps/admin` sigue funcionando sin cambios de comportamiento.

---

## Phase 3: User Story 1 - Consultar y filtrar el listado de clientes en el portal (Priority: P1) 🎯 MVP

**Goal**: Tabla paginada de Clientes en `apps/portal`, con filtro por nombre/RFC y filtro de inactivos — sin acciones por fila.

**Independent Test**: Escenario 1 de [quickstart.md](./quickstart.md) — sembrando clientes directamente en la base de datos, sin usar el modal de alta.

### Implementation for User Story 1

- [x] T006 [US1] Reescribir `apps/portal/src/app/(app)/clientes/page.tsx` (Server Component): lee `page`, `mostrarInactivos`, `q` de `searchParams`; consulta paginada (`.range()` + `count: 'exact'`) filtrando por `estado = 'activo'` salvo `mostrarInactivos=true`, y por `.or('nombre.ilike.%q%,rfc.ilike.%q%')` cuando `q` esté presente (FR-001, FR-002, FR-003, research.md Decisión 6); usa `calcularTotalPaginas()` de `@control-contable/utils`; sigue obteniendo el catálogo de `regimenes_fiscales`
- [x] T007 [US1] Reescribir `apps/portal/src/app/(app)/clientes/ClientesPortalClient.tsx`: tabla con columnas Nombre/RFC/Correo/Estado (sin columna de acciones, FR-004), controles de paginación, campo de filtro de texto (nombre/RFC) que actualiza `q` en la URL y reinicia `page` a `1`, y el control "Mostrar inactivos"; estado vacío cuando no hay resultados
- [x] T008 [US1] Ejecutar el Escenario 1 de `quickstart.md` contra `apps/portal` corriendo con Supabase local y confirmar los resultados esperados — PASS vía Playwright: sólo activos por defecto (paginado 20/26 sembrados), "Mostrar inactivos" revela inactivos, filtro por nombre/RFC reduce resultados y reinicia a página 1, estado vacío se muestra sin coincidencias.

**Checkpoint**: User Story 1 funcional y probable de forma independiente (con clientes sembrados directamente).

---

## Phase 4: User Story 2 - Dar de alta un nuevo cliente desde el portal (Priority: P1)

**Goal**: Botón "Agregar cliente" en el encabezado de la tabla que abre un modal con `ClienteForm` en modo alta; al guardar, el modal se cierra y la tabla se refresca mostrando el cliente nuevo.

**Independent Test**: Escenario 2 de [quickstart.md](./quickstart.md).

### Implementation for User Story 2

- [x] T009 [US2] En `ClientesPortalClient.tsx`: agregar el botón "Agregar cliente" en el encabezado (junto a los filtros) que abre `ClienteForm` de `@control-contable/ui` en modo alta (sin `cliente`) dentro de un `Dialog`
- [x] T010 [US2] En `ClientesPortalClient.tsx`: al guardar con éxito, cerrar el modal, mostrar una confirmación visual breve (`Alert`/`Snackbar`), y llamar `router.refresh()` para reflejar el cliente nuevo en la tabla (FR-011, research.md Decisión 3); en error, el modal permanece abierto con los datos capturados y el mensaje claro (FR-007)
- [x] T011 [US2] Confirmar que `apps/portal/src/app/(app)/clientes/actions.ts` (`createCliente`) no requiere cambios — ya implementado en la primera iteración
- [x] T012 [US2] Ejecutar el Escenario 2 de `quickstart.md` contra `apps/portal` y `apps/admin` corriendo con Supabase local (incluida la verificación cruzada en `apps/admin`) — PASS vía Playwright: alta exitosa cierra el modal + alerta de éxito + fila nueva visible; RFC duplicado se rechaza sin cerrar el modal y conservando los datos capturados; régimen incompatible con el tipo de persona queda filtrado del selector; el cliente creado en el portal aparece también en el listado de `apps/admin`.

**Checkpoint**: User Story 1 y 2 funcionales — MVP de esta iteración (ver, filtrar y dar de alta clientes desde el portal).

---

## Phase 5: User Story 3 - El acceso respeta las capacidades del usuario (Priority: P2)

**Goal**: Auxiliar consulta la tabla y sus filtros, pero no ve el botón "Agregar cliente"; Contador y Administrador sí.

**Independent Test**: Escenario 3 de [quickstart.md](./quickstart.md).

### Implementation for User Story 3

- [x] T013 [US3] En `page.tsx`: cambiar el gate de `requireCapability('manage_clients')` a `requireCapability('view_clients')` (research.md Decisión 4 revisada); calcular `canManage = profile.capabilities.includes('manage_clients')` y pasarlo a `ClientesPortalClient`
- [x] T014 [US3] En `ClientesPortalClient.tsx`: ocultar el botón "Agregar cliente" cuando `canManage` sea `false`
- [x] T015 [US3] Ejecutar el Escenario 3 de `quickstart.md`: confirmar que Auxiliar ve la tabla y los filtros pero no el botón de alta; confirmar que Contador/Administrador sí lo ven — PASS vía Playwright con las 3 cuentas de prueba.

**Checkpoint**: Las 3 historias de usuario funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificación transversal de calidad, sin tocar código específico de una sola historia.

- [x] T016 [P] `pnpm lint` y `pnpm type-check` en todo el monorepo — ambos verdes en los 8 paquetes.
- [x] T017 [P] `pnpm test` en todo el monorepo — 92 pruebas pasando (30 auth, 3 ui, 9 admin, 46 utils, 3 portal, más `packages/config`/`types`/`supabase-client` sin pruebas propias); confirma que la promoción de `calcularTotalPaginas()` no rompió nada.
- [x] T018 Validación manual end-to-end con Playwright contra `apps/portal` + `apps/admin` + Supabase local: los 3 escenarios de `quickstart.md` en secuencia — los 3 en PASS (ver notas en T008/T012/T015).
- [x] T019 Actualizar este archivo (`tasks.md`) marcando cada tarea completada con notas de verificación
- [x] T020 Limpiar cualquier dato de prueba creado durante la validación manual — 26 clientes `PWTEST*` y 3 cuentas `pw-test-*@example.com` (profiles + auth.users) eliminados; 0 filas remanentes confirmadas.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup — bloquea las 3 historias.
- **User Stories (Phase 3-5)**: US1 depende solo de Foundational. US2 depende de US1 (el botón de alta vive en el encabezado de la tabla que US1 construye). US3 depende de US1 y US2 (ajusta el gate de la página y la visibilidad del botón que ambas ya crearon).
- **Polish (Phase 6)**: depende de que las 3 historias estén completas.

### Within Each Phase

- Foundational: mover la función pura (T002-T003) antes de actualizar el consumidor existente (T004); verificar regresión al final (T005).
- US1: `page.tsx` (fetch) antes que `ClientesPortalClient.tsx` (consume esos datos); validar quickstart al final.
- US2: agregar el botón/modal (T009) antes de la lógica de éxito/error (T010); confirmar que la Server Action no cambia (T011); validar al final.
- US3: cambiar el gate del Server Component (T013) antes de ocultar el botón en el Client Component (T014); validar al final.

### Parallel Opportunities

- T003 (mover prueba) puede hacerse en paralelo a T004 (archivos distintos), ambas después de T002.
- T016 y T017 (Polish) pueden correr en paralelo.

---

## Implementation Strategy

### MVP First (Foundational + US1 + US2)

1. Completar Setup + Foundational.
2. Completar Phase 3 (US1) y Phase 4 (US2) — ya se puede ver, filtrar y dar de alta clientes desde el portal.
3. **STOP and VALIDATE**: correr los Escenarios 1 y 2 de quickstart.md.

### Incremental Delivery

1. Setup + Foundational → `calcularTotalPaginas()` compartida, sin regresión en `apps/admin`.
2. US1 → validar de forma independiente → listado y filtros disponibles.
3. US2 → validar de forma independiente → alta vía modal disponible (MVP de esta iteración).
4. US3 → validar de forma independiente → acceso correctamente restringido.
5. Polish → lint/type-check/test + validación manual completa.

---

## Notes

- [P] = archivos distintos, sin dependencias entre sí.
- Esta feature no cambia el esquema de base de datos — reutiliza `clientes` y `regimenes_fiscales` de `005-clientes-cobranza-expedientes` sin modificarlos.
- La primera iteración de esta feature (formulario sin listado) ya está implementada; esta segunda iteración reescribe `page.tsx` y `ClientesPortalClient.tsx` de `apps/portal`, sin tocar `actions.ts` ni el `ClienteForm`/lógica de validación ya compartidos.
