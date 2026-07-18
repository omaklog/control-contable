# Tasks: Modelado de Datos — Clientes, Cobranza y Expedientes

**Input**: Design documents from `/specs/005-clientes-cobranza-expedientes/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/db-functions-rls.md](./contracts/db-functions-rls.md), [quickstart.md](./quickstart.md)

**Tests**: Incluidas — la constitución del proyecto exige "pruebas unitarias para reglas de negocio; pruebas de integración para procesos críticos" para toda funcionalidad importante.

**Organization**: Tareas agrupadas por historia de usuario (US1 Cliente, US2 Cobranza, US3 Expediente) para permitir implementación y prueba independientes, siguiendo la convención del proyecto de migraciones aditivas (nunca editar una migración ya aplicada — cada fase crea su propio archivo nuevo).

## Format: `[ID] [P?] [Story] Description`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar `packages/utils` para alojar las funciones puras y pruebas de esta feature (aún no tenía Vitest configurado).

- [x] T001 [P] Agregar Vitest a `packages/utils`: crear `packages/utils/vitest.config.ts` (extendiendo `@control-contable/config/vitest/base`, mismo patrón que `packages/auth/vitest.config.ts`), agregar script `"test": "vitest run"` y devDependencies `vitest`, `@supabase/supabase-js`, `@control-contable/supabase-client` en `packages/utils/package.json`
- [x] T002 Ejecutar `pnpm install` en la raíz del monorepo para resolver las dependencias nuevas de `packages/utils`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura de auditoría y capacidades de rol que las tres historias de usuario necesitan.

**⚠️ CRITICAL**: Ninguna historia de usuario puede empezar hasta completar esta fase.

- [x] T003 Extender `Capability` en `packages/auth/src/roles.ts` con las capacidades de negocio de esta feature: `manage_clients`, `view_clients`, `manage_billing`, `view_billing`, `manage_documents`, `view_documents`, `manage_catalogs`; actualizar `ALL_CAPABILITIES` y `roleDefaultCapabilities()` (Administrador obtiene todas; Contador obtiene `manage_clients`/`view_clients`/`manage_billing`/`view_billing`/`view_documents`; Auxiliar obtiene solo las de `view_*`) — cumple FR-019
- [x] T004 [P] Agregar casos de prueba para las capacidades nuevas por rol en `packages/auth/src/roles.test.ts`
- [x] T005 Crear migración `supabase/migrations/20260716090000_business_audit_log.sql`: tabla `business_audit_log` (columnas de data-model.md) + función `security definer` `public.log_business_audit(entidad text, entidad_id uuid, accion text, detalle jsonb)` reutilizable por los triggers de auditoría de las fases siguientes (Decisión 5, FR-018), con RLS de solo `SELECT` para Administrador y sin `INSERT`/`UPDATE`/`DELETE` directo desde ningún rol de aplicación
- [x] T006 Aplicar migraciones locales (`supabase db reset` o `supabase migration up`) y confirmar que `business_audit_log` y `log_business_audit()` existen

**Checkpoint**: Fundación lista — las historias de usuario pueden avanzar.

---

## Phase 3: User Story 1 - Registrar y consultar la ficha de un cliente (Priority: P1) 🎯 MVP

**Goal**: Alta, consulta, edición y baja (soft-delete) de Cliente —con régimen fiscal obligatorio (validado contra tipo de persona y vigencia) y uno o más Contactos— con RFC único entre clientes activos y trazabilidad/auditoría completas.

**Independent Test**: Escenario 1 de [quickstart.md](./quickstart.md) — alta con RFC y régimen fiscal válidos, rechazo de RFC duplicado, rechazo de régimen incompatible/no vigente, alta de contacto, baja sin eliminación física.

### Tests for User Story 1 ⚠️

> Escribir estas pruebas primero; deben fallar antes de aplicar la migración de esta fase.

- [x] T007 [P] [US1] Prueba de integración en `packages/utils/src/clientes.integration.test.ts` (patrón de `packages/auth/src/session.integration.test.ts`, se omite si Supabase local no es alcanzable): alta de Cliente con régimen fiscal válido queda `activo`; segunda alta con el mismo RFC activo falla (FR-002); baja cambia `estado` a `inactivo` sin eliminar la fila (FR-003); la baja genera una fila en `business_audit_log`
- [x] T008 [P] [US1] Prueba unitaria de `esRfcValido()` en `packages/utils/src/rfc.test.ts` (RFC de persona física de 13 caracteres, RFC de persona moral de 12, formatos inválidos)
- [x] T009 [P] [US1] Prueba de integración en `packages/utils/src/regimenFiscal.integration.test.ts`: asignar a un cliente `moral` un régimen exclusivo de persona física falla (FR-021); asignar un régimen cuya `fecha_fin_vigencia` ya pasó falla (FR-022); asignar un régimen compatible y vigente tiene éxito
- [x] T010 [P] [US1] Prueba de integración en `packages/utils/src/contactos.integration.test.ts`: crear uno o más Contactos (nombre y teléfono obligatorios, email opcional) asociados a un Cliente y consultarlos desde su ficha (FR-023)

### Implementation for User Story 1

- [x] T011 [US1] Crear migración `supabase/migrations/20260716091000_clientes_schema.sql`: enums `tipo_persona` (`fisica`,`moral`) y `cliente_estado` (`activo`,`inactivo`); tabla `regimenes_fiscales` (`codigo` PK, `descripcion`, `aplica_persona_fisica`, `aplica_persona_moral`, `fecha_inicio_vigencia`, `fecha_fin_vigencia`) con `INSERT`s sembrando los 24 registros de `specs/005-clientes-cobranza-expedientes/assets/regimenes.json` (FR-020)
- [x] T012 [US1] En la misma migración: tabla `clientes` con las columnas de data-model.md (incluida `regimen_fiscal_codigo` FK a `regimenes_fiscales`, not null) y columnas de trazabilidad (FR-017)
- [x] T013 [US1] En la misma migración: índice único parcial `create unique index on clientes (rfc) where estado = 'activo'` (Decisión 6, FR-002)
- [x] T014 [US1] En la misma migración: tabla `contactos` (`cliente_id` FK, `nombre` not null, `telefono` not null, `email` nullable, trazabilidad) (FR-023)
- [x] T015 [US1] En la misma migración: trigger `trg_clientes_validar_regimen_fiscal` (`BEFORE INSERT OR UPDATE OF regimen_fiscal_codigo ON clientes`) que rechaza regímenes incompatibles con `tipo_persona` o no vigentes (Decisión 7, FR-021, FR-022)
- [x] T016 [US1] En la misma migración: trigger `AFTER INSERT OR UPDATE OR DELETE ON clientes` que invoca `log_business_audit('cliente', ...)` (FR-018)
- [x] T017 [US1] En la misma migración: habilitar RLS y crear políticas — `clientes`: `SELECT` para `view_clients`/`manage_clients`, `INSERT`/`UPDATE` solo para `manage_clients`, sin `DELETE` de aplicación; `contactos`: mismo patrón que `clientes`; `regimenes_fiscales`: `SELECT` para todo el personal autenticado, sin política de escritura en esta feature (FR-019, contracts/db-functions-rls.md)
- [x] T018 [US1] Aplicar la migración localmente y regenerar tipos con `pnpm generate:types` (actualiza `packages/types/src/database.ts`)
- [x] T019 [P] [US1] Implementar `esRfcValido(rfc: string): boolean` en `packages/utils/src/rfc.ts`, exportarlo desde `packages/utils/src/index.ts`
- [x] T020 [US1] Ejecutar el Escenario 1 de `quickstart.md` contra Supabase local y confirmar los resultados esperados; correr T007–T010 y confirmar que pasan

**Checkpoint**: User Story 1 funcional y probable de forma independiente.

---

## Phase 4: User Story 2 - Dar seguimiento a la cobranza de un cliente (Priority: P2)

**Goal**: Registrar cargos de cobranza y pagos (con soporte de pagos parciales, pagos que cubren varios cargos, y método de pago seleccionado de un catálogo administrado), generación automática de recibos con un snapshot inmutable del concepto cubierto, y cálculo del estado de cobranza por cliente.

**Independent Test**: Escenario 2 de [quickstart.md](./quickstart.md) — cargo pendiente, pago parcial con método de pago del catálogo, pago que completa el saldo, recibo generado automáticamente por cada pago con su concepto, y verificación de que editar el concepto del cargo después no altera un recibo ya emitido.

### Tests for User Story 2 ⚠️

- [x] T021 [P] [US2] Prueba de integración en `packages/utils/src/cobranza.integration.test.ts`: cargo nuevo queda `pendiente`; un pago parcial (con `metodo_pago_id` del catálogo) no cambia el estado a `pagado` pero genera un recibo con el `concepto` del cargo (FR-008, FR-024, FR-025); un segundo pago que cubre el saldo restante cambia el cargo a `pagado` y genera un segundo recibo
- [x] T022 [P] [US2] Prueba de integración (mismo archivo o dedicado): registrar un cargo para un cliente `inactivo` falla (FR-009)
- [x] T023 [P] [US2] Prueba de integración en `packages/utils/src/recibos.integration.test.ts`: tras emitirse un recibo, editar `cargos_cobranza.concepto` del cargo cubierto NO modifica el `concepto` ya guardado en `recibos` (FR-025, Decisión 9)
- [x] T024 [P] [US2] Prueba unitaria de `calcularEstadoCargo()` en `packages/utils/src/cobranza.test.ts`: casos sin pagos, pago parcial, pago completo, vencido (fecha pasada sin cubrir), y que un cargo `cancelado` nunca cambia de estado

### Implementation for User Story 2

- [x] T025 [US2] Crear migración `supabase/migrations/20260716092000_cobranza_schema.sql`: enum `cargo_estado` (`pendiente`,`pagado`,`vencido`,`cancelado`); tabla `metodos_pago` (`id`, `nombre` único, `activo`, trazabilidad) con `INSERT`s sembrando `efectivo`, `cheque`, `saldo`, `deposito`, `transferencia`, `banco` (Decisión 8, FR-024)
- [x] T026 [US2] En la misma migración: tablas `cargos_cobranza`, `pagos` (con `metodo_pago_id` FK a `metodos_pago`), `cargo_pagos`, `recibos` (incluida la columna `concepto`) con las columnas, FKs y constraints de data-model.md, incluyendo el único `(cliente_id, periodo_mes, periodo_anio, concepto)` en `cargos_cobranza` y el único `pago_id` en `recibos`
- [x] T027 [US2] En la misma migración: trigger `trg_cargos_cobranza_bloquear_cliente_inactivo` (`BEFORE INSERT ON cargos_cobranza`, FR-009)
- [x] T028 [US2] En la misma migración: trigger `trg_cargo_pagos_generar_recibo` (`AFTER INSERT ON cargo_pagos` — no en `pagos`, porque al insertar el pago aún no se sabe qué Cargo(s) cubre) que crea la fila de `recibos` con folio único autogenerado y `concepto` igual al del Cargo cubierto en la primera fila de `cargo_pagos` de ese pago, y anexa el concepto (separado por `; `) si el mismo pago cubre Cargos adicionales (FR-008, FR-025, Decisión 3, Decisión 9)
- [x] T029 [US2] En la misma migración: trigger `trg_cargo_pagos_recalcular_estado` (`AFTER INSERT OR UPDATE OR DELETE ON cargo_pagos`) que recalcula `cargos_cobranza.estado` sumando `monto_aplicado` contra `monto` (Decisión 2, FR-005)
- [x] T030 [US2] En la misma migración: triggers `AFTER INSERT OR UPDATE OR DELETE` en `pagos` y `recibos` que invocan `log_business_audit()` (FR-018)
- [x] T031 [US2] En la misma migración: habilitar RLS y políticas — `cargos_cobranza`, `pagos`, `cargo_pagos`, `recibos`: `view_billing`/`manage_billing`, sin `DELETE` de aplicación; `metodos_pago`: `SELECT` para todo el personal, `INSERT`/`UPDATE` solo Administrador (`manage_catalogs`), sin `DELETE` (FR-019, FR-024, contracts/db-functions-rls.md)
- [x] T032 [US2] Aplicar la migración localmente y regenerar tipos con `pnpm generate:types`
- [x] T033 [P] [US2] Implementar `calcularEstadoCargo(input: { montoTotal: number; montoAplicado: number; fechaVencimiento: string; hoy: string; estadoActual: CargoEstado }): CargoEstado` en `packages/utils/src/cobranza.ts`, exportarlo desde `packages/utils/src/index.ts`
- [x] T034 [US2] Ejecutar el Escenario 2 de `quickstart.md` contra Supabase local (incluida la consulta de clientes al corriente/con adeudo de SC-002 y la verificación de inmutabilidad del concepto) y confirmar los resultados esperados; correr T021–T024 y confirmar que pasan

**Checkpoint**: User Story 1 y 2 funcionales de forma independiente.

---

## Phase 5: User Story 3 - Gestionar el expediente digital de un cliente (Priority: P3)

**Goal**: Catálogo de categorías de documento, carga de documentos exclusivamente PDF, versionado sin eliminación física.

**Independent Test**: Escenario 3 de [quickstart.md](./quickstart.md) — carga de PDF clasificado, rechazo de archivo no-PDF, reemplazo que conserva el historial, `DELETE` bloqueado.

### Tests for User Story 3 ⚠️

- [x] T035 [P] [US3] Prueba de integración en `packages/utils/src/expedientes.integration.test.ts`: carga de un documento PDF queda `activo` con `version = 1`; carga de un archivo con `formato` distinto de `application/pdf` falla (FR-011); una nueva versión conserva la anterior con `estado = 'reemplazado'` (FR-013); un `DELETE` directo sobre `documentos` falla (FR-015)
- [x] T036 [P] [US3] Prueba unitaria de `excedeTamanoMaximo()` en `packages/utils/src/expedientes.test.ts`

### Implementation for User Story 3

- [x] T037 [US3] Crear migración `supabase/migrations/20260716093000_expedientes_schema.sql`: enum `documento_estado` (`activo`,`reemplazado`); tablas `categorias_documento` y `documentos` con las columnas y constraints de data-model.md, incluyendo `check (formato = 'application/pdf')` y la auto-referencia `documento_anterior_id`
- [x] T038 [US3] En la misma migración: trigger `trg_documentos_bloquear_delete` (`BEFORE DELETE ON documentos`) que rechaza toda eliminación física sin marcador de autorización explícita (FR-015)
- [x] T039 [US3] En la misma migración: trigger `AFTER INSERT OR UPDATE OR DELETE ON documentos` que invoca `log_business_audit()` (carga y eliminación, FR-018)
- [x] T040 [US3] En la misma migración: habilitar RLS y políticas de `categorias_documento` (escritura solo Administrador, `manage_catalogs`) y `documentos` (`view_documents`/`manage_documents`, sin `DELETE` de aplicación) (FR-019, contracts/db-functions-rls.md)
- [x] T041 [US3] Aplicar la migración localmente y regenerar tipos con `pnpm generate:types`
- [x] T042 [P] [US3] Implementar `excedeTamanoMaximo(tamanoBytes: number, maximoBytes: number): boolean` y la constante `TAMANO_MAXIMO_DOCUMENTO_BYTES` en `packages/utils/src/expedientes.ts`, exportados desde `packages/utils/src/index.ts`
- [x] T043 [US3] Ejecutar el Escenario 3 de `quickstart.md` contra Supabase local y confirmar los resultados esperados; correr T035–T036 y confirmar que pasan

**Checkpoint**: Las tres historias de usuario funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificación transversal de auditoría y calidad, sin tocar código específico de una sola historia.

- [x] T044 [P] Ejecutar el Escenario 4 de `quickstart.md` (auditoría) y confirmar que las operaciones de las tres historias (alta de cliente, pago/recibo, carga de documento) produjeron su fila correspondiente en `business_audit_log` (FR-018, SC-005)
- [x] T045 [P] `pnpm lint` y `pnpm type-check` en `packages/utils`, `packages/auth` y `packages/types`
- [x] T046 [P] `pnpm test` en `packages/utils` y `packages/auth` — confirmar que todas las pruebas unitarias e integración pasan (o se omiten correctamente si Supabase local no es alcanzable)
- [x] T047 Actualizar este archivo (`tasks.md`) marcando cada tarea completada con notas de verificación (conteo de pruebas, resultado del quickstart)
- [x] T048 Limpiar cualquier dato de prueba creado durante la validación manual (`supabase db reset` en el entorno local, o `DELETE` dirigido por id de prueba)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede iniciar de inmediato.
- **Foundational (Phase 2)**: depende de Setup — bloquea las tres historias de usuario.
- **User Stories (Phase 3-5)**: todas dependen de Foundational; entre ellas son independientes (US2 y US3 no dependen de tablas de la otra, solo de que `clientes` exista — creada en US1 — y de `business_audit_log` — creada en Foundational).
- **Polish (Phase 6)**: depende de que las historias que se vayan a entregar estén completas.

### User Story Dependencies

- **US1 (P1)**: depende solo de Foundational. Bloquea a US2 y US3 únicamente porque ambas referencian `clientes(id)` — no hay dependencia de lógica de negocio, solo de la tabla existiendo. Introduce además `regimenes_fiscales` y `contactos`, ambas exclusivas de esta historia.
- **US2 (P2)**: depende de Foundational + tabla `clientes` de US1 (FK `cliente_id`). Introduce `metodos_pago` (catálogo propio de esta historia). No depende de US3.
- **US3 (P3)**: depende de Foundational + tabla `clientes` de US1 (FK `cliente_id`). No depende de US2.

### Within Each User Story

- Pruebas antes de la migración (deben fallar sin ella).
- Migración (esquema + triggers + RLS + semillas de catálogo) antes de regenerar tipos.
- Tipos regenerados antes de implementar las funciones puras que los usan.
- Validación de quickstart al final de cada fase.

### Parallel Opportunities

- T001 y T002 (Setup) en secuencia (T002 depende de que T001 exista en `package.json`).
- T004 puede correr en paralelo a T005/T006 dentro de Foundational (archivos distintos).
- Dentro de cada historia, las tareas de prueba marcadas [P] pueden escribirse en paralelo; las tareas de migración (mismo archivo SQL) son secuenciales; la implementación de la función pura marcada [P] puede hacerse en paralelo a la ejecución del quickstart siempre que la migración ya esté aplicada.
- Una vez completada Foundational, US2 y US3 pueden trabajarse en paralelo entre sí (ambas solo dependen de US1 por la FK a `clientes`, no por lógica compartida).

---

## Parallel Example: User Story 1

```bash
# Pruebas de User Story 1 en paralelo:
Task: "Prueba de integración de Cliente en packages/utils/src/clientes.integration.test.ts"
Task: "Prueba unitaria de esRfcValido en packages/utils/src/rfc.test.ts"
Task: "Prueba de integración de Régimen Fiscal en packages/utils/src/regimenFiscal.integration.test.ts"
Task: "Prueba de integración de Contactos en packages/utils/src/contactos.integration.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Setup + Foundational.
2. Completar Phase 3 (US1).
3. Validar con el Escenario 1 de quickstart.md — el modelo de Cliente (con régimen fiscal y contactos) ya es utilizable para features futuras de captura en UI.

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → validar de forma independiente → modelo de Cliente (+ Régimen Fiscal + Contacto) disponible.
3. US2 → validar de forma independiente → modelo de Cobranza (+ Método de Pago) disponible.
4. US3 → validar de forma independiente → modelo de Expediente disponible.
5. Polish → confirmar auditoría transversal y calidad de todo el paquete.

---

## Notes

- Esta feature no agrega pantallas de UI (ver `plan.md`, Structure Decision) — el resultado son migraciones, tipos regenerados y funciones puras reutilizables; las pantallas de captura de Clientes/Cobranza/Expedientes se planearán en features posteriores por módulo.
- El mecanismo para que un Administrador agregue nuevos Regímenes Fiscales desde la interfaz queda fuera de alcance de esta feature (solo se siembra el catálogo inicial); `metodos_pago` y `categorias_documento` sí son editables por Administrador dentro de esta feature (a nivel de datos/RLS, sin pantalla propia).
- [P] = archivos distintos, sin dependencias entre sí.
- Cada migración SQL de una fase es un archivo nuevo — nunca se edita una migración ya aplicada en una fase anterior.

## Verificación (implementación completa, 2026-07-16)

- **T001-T048 completas.** 5 migraciones aplicadas a Supabase local: `20260716090000_business_audit_log.sql`, `20260716091000_clientes_schema.sql`, `20260716092000_cobranza_schema.sql`, `20260716092500_fix_recalcular_estado_cargo_cast.sql` (corrección de un bug real detectado en implementación: el `CASE` de `recalcular_estado_cargo_cobranza()` devolvía `text` sin castear a `cargo_estado`), `20260716093000_expedientes_schema.sql`.
- **Corrección de diseño durante implementación**: el trigger de generación de Recibo se movió de `AFTER INSERT ON pagos` (como decían research.md/contracts originalmente) a `AFTER INSERT ON cargo_pagos` — al insertar el pago aún no se sabe qué Cargo(s) cubre (eso se registra en una sentencia aparte). research.md (Decisión 3, 9), contracts/db-functions-rls.md y tasks.md (T028) se actualizaron para reflejar el diseño correcto.
- **Pruebas**: 70/70 pasando en todo el monorepo (`pnpm test`) — 31 en `packages/utils` (9 archivos: `rfc`, `cobranza`, `expedientes` unitarias + `clientes`, `regimenFiscal`, `contactos`, `cobranza`, `recibos`, `expedientes` integración), 30 en `packages/auth` (incluye las capacidades nuevas de esta feature), 5 en `apps/admin`, 4 en `apps/portal`.
- **Lint y type-check**: `pnpm lint` y `pnpm type-check` pasan en los 8 paquetes del monorepo (se corrigió `apps/admin/src/app/usuarios/UsuariosClient.tsx`, cuyo mapa de etiquetas de capacidades debía ampliarse tras extender `Capability` en `packages/auth`).
- **Quickstart**: los 4 escenarios de `quickstart.md` se validaron manualmente contra Supabase local además de las pruebas automatizadas (Escenario 1: RFC único + régimen fiscal incompatible/vencido; Escenario 2: recibo automático + estado `pagado` + concepto inmutable; Escenario 3: PDF-only + versionado + `DELETE` bloqueado; Escenario 4: `business_audit_log` con filas para las 4 entidades y sus acciones).
- **Datos de prueba**: limpiados por completo al finalizar (tablas de negocio vacías, usuarios `integration-*` eliminados de `auth.users`).
- **Alcance no incluido** (según `plan.md`, Structure Decision): pantallas de captura de Clientes/Cobranza/Expedientes en `apps/admin`/`apps/portal` — quedan para features posteriores por módulo.

## Bugfix (2026-07-18, detectado al refinar `007-alta-cliente-portal`)

**Motivo**: la política RLS original de `business_audit_log` (`business_audit_log_select_admin_only`) restringía el `SELECT` exclusivamente a `is_administrador()`. Pero `docs/ux/design-system.md` §9.2 (Cliente 360, escrito después de esta feature) describe que la pestaña "Auditoría" de un cliente es visible para cualquier usuario que pueda ver ese cliente — incluido Auxiliar, en solo lectura — no solo Administrador. Sin este ajuste, Cliente 360 no podría implementarse tal como quedó documentado.

- [x] T049 [P] Creada la migración `supabase/migrations/20260718100000_business_audit_log_select_staff.sql`: reemplaza `business_audit_log_select_admin_only` por `business_audit_log_select_staff`, usando `has_capability('view_clients') or has_capability('manage_clients')` (mismo gate ya usado por `clientes`/`contactos`) — aplicada contra Supabase local sin errores
- [x] T050 [P] Prueba de integración nueva en `packages/utils/src/businessAuditLog.integration.test.ts`: un Auxiliar (solo `view_clients`) autenticado consulta `business_audit_log` filtrado por el cliente que acaba de crearse (vía `service_role`) y confirma que puede verlo — 1/1 pasando
- [x] T051 Actualizados `contracts/db-functions-rls.md` y `data-model.md` para reflejar la política corregida — depende de T049
- [x] T052 Verificado `pnpm type-check`/`lint` limpios en `packages/utils` tras T050 — depende de T050
