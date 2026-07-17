# Tasks: Editar y Eliminar Clientes (Panel Administrativo)

**Input**: Design documents from `/specs/006-crud-clientes-admin/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/server-actions.md](./contracts/server-actions.md), [quickstart.md](./quickstart.md)

**Tests**: Incluidas para la lógica pura (esquema de validación, filtrado de régimenes, mapeo de errores, cálculo de paginación) — la constitución exige "pruebas unitarias para reglas de negocio". No se agregan pruebas de integración nuevas contra Supabase (esta feature no cambia el esquema, ya cubierto por `005-clientes-cobranza-expedientes`). No incluye una Server Action de creación — la alta de clientes se construirá en una feature futura de `apps/portal`.

**Organization**: Tareas agrupadas por historia de usuario (US1 Lista, US2 Editar, US3 Baja) para permitir implementación y prueba independientes.

## Format: `[ID] [P?] [Story] Description`

## Verificación (implementación completa, 2026-07-16)

- **T001-T025 completas.** Módulo `apps/admin/src/app/clientes/` implementado: `page.tsx`, `actions.ts` (`updateCliente`, `setClienteEstado` — sin `createCliente`), `ClientesClient.tsx`, `ClienteForm.tsx` (edición únicamente), `clienteFormSchema.ts`, `paginacion.ts`.
- **Pruebas**: 20/20 nuevas pasando en `apps/admin` (`pnpm --filter @control-contable/admin test`) — 3 de `paginacion.test.ts`, 12 de `clienteFormSchema.test.ts` (esquema Yup, `filtrarRegimenesPorTipoPersona`, `mapearErrorClienteAMensaje`), más las 5 ya existentes de `lastAdminGuard.test.ts`.
- **Lint y type-check**: `pnpm --filter @control-contable/admin lint` y `type-check` pasan sin errores.
- **Validación manual con Playwright** contra `apps/admin` + Supabase local (usuario Administrador de prueba, creado y eliminado en la misma validación): los 3 escenarios de `quickstart.md` confirmados — listado con nombre/RFC/correo/estado y columna de acciones; filtro "Mostrar inactivos" oculta/revela clientes dados de baja; edición guarda cambios y prellena el formulario; RFC duplicado y régimen fiscal incompatible muestran error claro sin cerrar el diálogo; el selector de régimen fiscal filtra opciones por tipo de persona (605 no aparece para persona moral); baja con diálogo de confirmación — cancelar no aplica cambios, confirmar aplica soft-delete y el cliente sigue consultable con el filtro de inactivos. Paginación validada aparte con 22 clientes activos (20 en la página 1, 2 en la página 2, controles de MUI Pagination localizados en español).
- **Datos de prueba**: limpiados por completo al finalizar (tabla `clientes` vacía, usuario de prueba eliminado de `auth.users`).
- **Alcance no incluido** (según spec.md): alta (creación) de clientes — se construirá en una feature futura dentro de `apps/portal`.

## T026-T027 (implementadas directamente, 2026-07-16, tercera sesión de clarificación)

- [x] T026 FR-016: agregado el botón "Clientes" en `apps/admin/src/app/page.tsx`, visible si `view_clients` o `manage_clients`, enlaza a `/clientes` (mismo patrón que "Gestión de usuarios"/"Auditoría").
- [x] T027 FR-017: agregado el campo opcional `pendingLabel` a `MenuItem` (`apps/portal/src/components/layout/navigation.ts`) y usado en la entrada "Clientes" del menú del portal; `MainLayoutClient.tsx` lo muestra en vez del genérico "Próximamente" cuando está definido.
- **Verificación**: `pnpm --filter @control-contable/admin` y `@control-contable/portal` lint/type-check limpios; 4/4 pruebas de `navigation.test.ts` siguen pasando (sin cambios de comportamiento en `visibleMenuItems`). Validación manual con Playwright contra ambas apps corriendo con Supabase local: el botón "Clientes" aparece en la home del admin y navega a `/clientes`; el menú del portal muestra el texto aclaratorio ("Alta próximamente — editar y dar de baja ya están disponibles en el Panel Administrativo"). Usuario de prueba limpiado al finalizar.

## Phase 1: Setup

**Purpose**: Confirmar dependencias y crear el esqueleto de la ruta.

- [x] T001 Crear el directorio `apps/admin/src/app/clientes/`; confirmar que `apps/admin/package.json` ya incluye `formik`, `yup` y `@mui/material`/`@mui/icons-material` (no se requieren dependencias nuevas)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esqueleto de la ruta y del componente de tabla que las 3 historias van a completar incrementalmente.

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta completar esta fase.

- [x] T002 Crear `apps/admin/src/app/clientes/page.tsx` (Server Component): `requireCapability('view_clients')`, lee `page` y `mostrarInactivos` de `searchParams`, y renderiza `<ClientesClient />` (el fetch real se completa en US1)
- [x] T003 [P] Crear `apps/admin/src/app/clientes/actions.ts` con el encabezado `'use server'` y el import de `requireCapability` (las funciones concretas — `updateCliente`, `setClienteEstado` — se agregan en US2/US3; sin `createCliente`, ver plan.md)
- [x] T004 Crear `apps/admin/src/app/clientes/ClientesClient.tsx` (Client Component) con la firma de props (`clientes`, `totalPaginas`, `paginaActual`, `mostrarInactivos`, `canManage`) y una tabla base sin columna de acciones todavía (se agrega en US2/US3)

**Checkpoint**: Fundación lista — las historias de usuario pueden avanzar.

---

## Phase 3: User Story 1 - Consultar la lista paginada de clientes (Priority: P1) 🎯 MVP

**Goal**: Listado paginado de Clientes con filtro de inactivos y estado vacío.

**Independent Test**: Escenario 1 de [quickstart.md](./quickstart.md) — sembrando clientes directamente en la base de datos, sin usar ninguna pantalla de esta feature.

### Tests for User Story 1

- [x] T005 [P] [US1] Prueba unitaria de `calcularTotalPaginas()` en `apps/admin/src/app/clientes/paginacion.test.ts` (casos: total exacto múltiplo del tamaño de página, total con residuo, total en cero)

### Implementation for User Story 1

- [x] T006 [P] [US1] Implementar `calcularTotalPaginas(total: number, porPagina: number): number` en `apps/admin/src/app/clientes/paginacion.ts`
- [x] T007 [US1] En `page.tsx`: completar la consulta paginada (`.range()` + `count: 'exact'` vía `createServerSupabaseClient()`, con join a `regimenes_fiscales` para la descripción), filtrando por `estado = 'activo'` salvo que `mostrarInactivos=true` (FR-001, FR-011, FR-014)
- [x] T008 [US1] En `ClientesClient.tsx`: renderizar las columnas Nombre/RFC/Correo/Estado (FR-002), controles de paginación que navegan actualizando la URL, el control para activar "Mostrar inactivos" (FR-014), y un estado vacío cuando no hay clientes que mostrar (US1 AS3)
- [x] T009 [US1] Ejecutar el Escenario 1 de `quickstart.md` contra `apps/admin` corriendo con Supabase local y confirmar los resultados esperados; correr T005 y confirmar que pasa

**Checkpoint**: User Story 1 funcional y probable de forma independiente.

---

## Phase 4: User Story 2 - Editar los datos de un cliente existente (Priority: P1)

**Goal**: Acción "Editar" en la columna de acciones que abre un formulario prellenado y guarda los cambios sin alterar el estado activo/inactivo del cliente; errores de negocio se muestran con claridad sin perder los datos capturados.

**Independent Test**: Escenario 2 de [quickstart.md](./quickstart.md) — editando un cliente ya existente (sembrado directamente).

### Tests for User Story 2

- [x] T010 [P] [US2] Prueba unitaria del esquema Yup de `ClienteFormValues` en `apps/admin/src/app/clientes/clienteFormSchema.test.ts` (casos válidos; RFC con formato inválido vía `esRfcValido`; correo inválido; campos requeridos vacíos)
- [x] T011 [P] [US2] Prueba unitaria de `filtrarRegimenesPorTipoPersona()` en el mismo archivo (filtra por `fisica`/`moral`; excluye regímenes cuya vigencia ya terminó)
- [x] T012 [P] [US2] Prueba unitaria de `mapearErrorClienteAMensaje()` (mapea violación de unicidad de RFC y los mensajes ya explícitos de los triggers de régimen fiscal a texto claro; cae a un mensaje genérico si el error no se reconoce)

### Implementation for User Story 2

- [x] T013 [US2] Crear `apps/admin/src/app/clientes/clienteFormSchema.ts`: esquema Yup de `ClienteFormValues` (usa `esRfcValido` de `@control-contable/utils`), tipo `ClienteFormValues`, `filtrarRegimenesPorTipoPersona()`, `mapearErrorClienteAMensaje()` (Decisiones 3 y 4 de research.md)
- [x] T014 [US2] Crear `apps/admin/src/app/clientes/ClienteForm.tsx`: componente de **edición únicamente** (Formik + Yup, Decisión 2 de research.md) que recibe el `cliente` a editar (obligatorio), el catálogo de `regimenesFiscales`, `onSubmit` y `onClose`; usa `filtrarRegimenesPorTipoPersona()` para las opciones del selector de régimen fiscal según el `tipoPersona` capturado (FR-005)
- [x] T015 [US2] En `actions.ts`: implementar `updateCliente(clienteId: string, values: ClienteFormValues)` con `requireCapability('manage_clients')`; actualiza los campos propios del Cliente sin tocar `estado` (FR-009); traduce errores con `mapearErrorClienteAMensaje()` (FR-006, contracts/server-actions.md)
- [x] T016 [US2] En `ClientesClient.tsx`: agregar la columna de acciones con la opción "Editar" (visible solo si `canManage`) que abre `ClienteForm` dentro de un `Dialog` de MUI, prellenado con los datos de la fila seleccionada (FR-003, FR-004); al guardar con éxito, refresca el listado y cierra el diálogo; si falla, el diálogo permanece abierto con los datos capturados y el mensaje de error (FR-006)
- [x] T017 [US2] Ejecutar el Escenario 2 de `quickstart.md` y confirmar los resultados esperados, incluido el caso de editar un cliente inactivo sin que se reactive (FR-009); correr T010–T012 y confirmar que pasan

**Checkpoint**: User Story 1 y 2 funcionales — MVP completo (ver y editar clientes).

---

## Phase 5: User Story 3 - Dar de baja un cliente con confirmación (Priority: P2)

**Goal**: Acción "Eliminar" en la columna de acciones que muestra un diálogo de confirmación explícito antes de aplicar el soft-delete.

**Independent Test**: Escenario 3 de [quickstart.md](./quickstart.md).

### Implementation for User Story 3

- [x] T018 [US3] En `actions.ts`: implementar `setClienteEstado(clienteId: string, estado: 'activo' | 'inactivo')` con `requireCapability('manage_clients')`; cambia únicamente `estado`, nunca ejecuta `DELETE` físico (FR-008, contracts/server-actions.md)
- [x] T019 [US3] En `ClientesClient.tsx`: agregar la acción "Eliminar" en la columna de acciones (visible solo si `canManage`) que abre un diálogo de confirmación (mismo patrón que `apps/admin/src/app/usuarios/UsuariosClient.tsx`, Decisión 5 de research.md) antes de invocar `setClienteEstado(id, 'inactivo')` al confirmar (FR-007)
- [x] T020 [US3] Ejecutar el Escenario 3 de `quickstart.md`, incluido el camino de cancelar el diálogo (nada cambia) y el de confirmar (el cliente pasa a inactivo, su historial sigue consultable con el filtro de inactivos)

**Checkpoint**: Las 3 historias de usuario funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificación transversal de calidad, sin tocar código específico de una sola historia.

- [x] T021 [P] `pnpm --filter @control-contable/admin lint` y `pnpm --filter @control-contable/admin type-check`
- [x] T022 [P] `pnpm --filter @control-contable/admin test` — confirmar que T005 y T010–T012 pasan
- [x] T023 Validación manual end-to-end contra `apps/admin` + Supabase local: correr los 3 escenarios de `quickstart.md` en secuencia sobre la misma sesión (lista → edición → baja con confirmación)
- [x] T024 Actualizar este archivo (`tasks.md`) marcando cada tarea completada con notas de verificación (conteo de pruebas, resultado del quickstart)
- [x] T025 Limpiar cualquier dato de prueba creado durante la validación manual

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias.
- **Foundational (Phase 2)**: depende de Setup — bloquea las 3 historias de usuario.
- **User Stories (Phase 3-5)**: todas dependen de Foundational. US2 y US3 comparten `ClientesClient.tsx`/`actions.ts` (esqueletos creados en Foundational, completados incrementalmente); no comparten componentes de formulario con US1.
- **Polish (Phase 6)**: depende de que las historias que se vayan a entregar estén completas.

### User Story Dependencies

- **US1 (P1)**: depende solo de Foundational.
- **US2 (P1)**: depende de Foundational. Crea `ClienteForm.tsx`/`clienteFormSchema.ts`, exclusivos de esta historia (sin modo alta, ver research.md Decisión 2).
- **US3 (P2)**: depende de Foundational. No depende de US1/US2 (no usa el formulario), solo de que exista al menos un cliente sobre el que operar.

### Within Each User Story

- Pruebas de lógica pura antes de implementarla.
- Server Action antes de conectarla desde `ClientesClient.tsx`.
- Validación de quickstart al final de cada fase.

### Parallel Opportunities

- T003 (Foundational) puede hacerse en paralelo a T002/T004 (archivos distintos).
- Dentro de cada historia, las pruebas marcadas [P] pueden escribirse en paralelo entre sí.
- US3 puede implementarse en paralelo a US2 una vez completada Foundational (no comparte archivos de formulario, solo `actions.ts`/`ClientesClient.tsx`, que si se tocan en paralelo requieren coordinar el orden de los `diff` en esos dos archivos compartidos).

---

## Parallel Example: User Story 2

```bash
# Pruebas de User Story 2 en paralelo:
Task: "Prueba unitaria del esquema Yup en clienteFormSchema.test.ts"
Task: "Prueba unitaria de filtrarRegimenesPorTipoPersona en clienteFormSchema.test.ts"
Task: "Prueba unitaria de mapearErrorClienteAMensaje en clienteFormSchema.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 + 2)

1. Completar Setup + Foundational.
2. Completar Phase 3 (US1) y Phase 4 (US2) — el listado y la edición cubren el MVP mínimo de este módulo (se puede ver y corregir datos de clientes).
3. **STOP and VALIDATE**: correr los Escenarios 1 y 2 de quickstart.md.

### Incremental Delivery

1. Setup + Foundational → esqueleto de la ruta listo.
2. US1 → validar de forma independiente → listado disponible.
3. US2 → validar de forma independiente → edición disponible (MVP del módulo).
4. US3 → validar de forma independiente → baja con confirmación disponible.
5. Polish → lint/type-check/test + validación manual completa.

---

## Notes

- [P] = archivos distintos, sin dependencias entre sí.
- Esta feature no cambia el esquema de base de datos — reutiliza `clientes` y `regimenes_fiscales` de `005-clientes-cobranza-expedientes` sin modificarlos.
- No incluye alta (creación) de clientes — se construirá en una feature futura dentro de `apps/portal` (spec.md, Clarifications).
