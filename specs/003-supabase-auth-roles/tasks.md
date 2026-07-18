---
description: 'Task list template for feature implementation'
---

# Tasks: Autenticación y Roles con Supabase

**Input**: Design documents from `/specs/003-supabase-auth-roles/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (todos presentes)

**Tests**: Incluidas. A diferencia de una feature puramente de infraestructura, `plan.md`/`research.md` §8 comprometen explícitamente una estrategia de pruebas (Vitest: unitarias para `packages/auth` + integración contra RLS) para cumplir el principio de la constitución "pruebas unitarias para reglas de negocio; integración para procesos críticos" — omitirlas dejaría la fila "Testing" de la Constitution Check sin cumplir.

**Organization**: Las tareas están agrupadas por historia de usuario para permitir implementación y validación independiente de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: Historia de usuario a la que pertenece (US1, US2, US3)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Monorepo existente (`apps/admin`, `apps/portal`, `packages/*`). Esta feature agrega los paquetes compartidos `packages/supabase-client` y `packages/auth`, una migración en `supabase/migrations/`, y el cableado mínimo específico de cada app, según la "Structure Decision" de `plan.md`.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Crear el esqueleto de los paquetes compartidos y la herramienta de pruebas.

- [x] T001 [P] Crear la estructura de `packages/supabase-client` (`package.json` nombrado `@control-contable/supabase-client`, `tsconfig.json` extendiendo `packages/config/typescript`, `src/index.ts` vacío) siguiendo el patrón de `packages/utils`
- [x] T002 [P] Crear la estructura de `packages/auth` (`package.json` nombrado `@control-contable/auth`, `tsconfig.json`, `src/index.ts` vacío)
- [x] T003 [P] Agregar `@supabase/ssr` como dependencia de `packages/supabase-client/package.json`, y `@control-contable/supabase-client` + `@control-contable/auth` como dependencias workspace de `apps/admin/package.json` y `apps/portal/package.json` — también se agregaron `formik`/`yup` (formularios de login, ya en la constitución) a ambas apps
- [x] T004 [P] Configurar Vitest: crear `packages/config/vitest/base.ts` (config compartida) y agregar el pipeline `test` a `turbo.json`; agregar script `"test": "vitest run"` a `packages/auth/package.json` con su propio `vitest.config.ts` — verificado: `pnpm -F @control-contable/auth test` ejecuta Vitest correctamente (falla solo por ausencia de archivos de prueba aún, esperado en esta fase)

**Checkpoint**: Esqueleto de paquetes y herramienta de pruebas listos.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Esquema de base de datos (roles, RLS, triggers) y los clientes/primitivas de autenticación compartidos que las tres historias necesitan. Ninguna historia es demostrable sin esto.

**⚠️ CRITICAL**: Ninguna historia de usuario puede validarse hasta que esta fase esté completa.

- [x] T005 En `supabase/migrations/20260714214701_auth_roles_schema.sql`, crear el tipo `app_role` (ENUM: `administrador`, `contador`, `auxiliar`, `cliente`) y la tabla `profiles` (con `account_type`, `role`, `is_active`, `created_at/updated_at/created_by/updated_by`, y el constraint de coherencia `account_type`/`role`), según `data-model.md`
- [x] T006 En la misma migración, agregar las tablas `profile_change_history` y `account_invitations` (depende de T005), según `data-model.md`
- [x] T007 En la misma migración, agregar las funciones `is_administrador()`, `current_account_type()` y `get_auth_audit_log(limit_rows int default 100)` (depende de T005), según `contracts/db-functions-rls.md`
- [x] T008 En la misma migración, agregar el trigger `BEFORE UPDATE` sobre `profiles` que impide dejar el sistema sin ningún Administrador activo (depende de T005, T007) — cumple FR-011, según `contracts/db-functions-rls.md` — **probado**: con un solo Administrador activo, intentar desactivarlo lanza `ERROR: No puede quedar el sistema sin ningún Administrador activo`; con dos, la desactivación de uno procede sin error
- [x] T009 En la misma migración, agregar el trigger `AFTER UPDATE` sobre `profiles` que puebla `profile_change_history` cuando cambian `role` o `is_active` (depende de T005, T006) — cumple FR-009 — **probado**: la desactivación exitosa del paso anterior generó la fila correspondiente en `profile_change_history`
- [x] T010 En la misma migración, agregar las políticas RLS de `profiles`, `profile_change_history` y `account_invitations` (depende de T005-T007), según la tabla de `contracts/db-functions-rls.md`
- [x] T011 Aplicar la migración (`supabase db reset` en local) y regenerar `packages/types/src/database.ts` (`pnpm generate:types`) (depende de T005-T010) — verificado que el tipo `Database` incluye `profiles`/`profile_change_history`/`account_invitations`/`app_role`
- [x] T012 [P] Establecer `enable_signup = false` en `[auth]` de `supabase/config.toml` — cumple FR-010 — **probado**: tras `supabase stop && supabase start`, `POST /auth/v1/signup` responde `422 signup_disabled` y `POST /auth/v1/token?grant_type=password` (login) sigue respondiendo `200`. **Corrección importante**: `[auth.email].enable_signup` se dejó en `true` — ese flag es en realidad el interruptor completo del proveedor de email de GoTrue; ponerlo en `false` bloqueaba también el login (descubierto al probar T024), no solo el autoregistro. Ver `research.md` #5.
- [x] T013 [P] Implementar `createBrowserSupabaseClient()` en `packages/supabase-client/src/browser.ts` (depende de T001, T003, T011 para los tipos `Database`), según `contracts/package-api.md`
- [x] T014 [P] Implementar `createServerSupabaseClient()` en `packages/supabase-client/src/server.ts` (depende de T001, T003, T011). **Hallazgo real**: `@supabase/ssr@0.5.2` (versión inicialmente planeada) genera tipos incompatibles con `@supabase/supabase-js@2.110.x` (`.from().select()` resuelve a `never`); se fijó `@supabase/ssr@^0.12.3` — ver `research.md` #1
- [x] T015 Implementar `refreshSupabaseSession()` en `packages/supabase-client/src/middleware.ts` (depende de T013, T014). Se expuso el paquete como tres subpaths (`/browser`, `/server`, `/middleware`) en vez de un `index.ts` único, para no mezclar código Node-only (`next/headers`) con el runtime Edge del middleware — ver `plan.md`
- [x] T016 [P] Implementar `packages/auth/src/roles.ts`: tipos `AppRole`/`AccountType`/`Capability` y `hasPermission()` según la matriz de `contracts/role-permissions.md` (depende de T002)
- [x] T017 Implementar `packages/auth/src/session.ts`: `getCurrentProfile()`, `requireAccountType()`, `requireCapability()` (depende de T014, T016), según `contracts/package-api.md`. `type-check` limpio en todo el monorepo tras estos cambios (`pnpm type-check`, 7/7 paquetes)
- [x] T018 Documentar y ejecutar el procedimiento de siembra del primer usuario Administrador: `supabase/seed-admin.sh <email> <password>` (crea el usuario vía Admin API + inserta el perfil `administrador` con `docker exec`/`psql`), indispensable porque el sistema no tiene autoregistro (depende de T011) — **probado end-to-end**: entorno local dejado con un único Administrador limpio (`admin-seed-script2@example.com`) para las pruebas de las Historias 1-3

**Checkpoint**: Esquema de base de datos con RLS activo; clientes de Supabase y primitivas de autorización (`hasPermission`, `requireAccountType`, `requireCapability`) listos; existe al menos un usuario Administrador para poder probar las historias.

---

> **Nota (2026-07-15, `/speckit-plan` regenerado)**: T005-T007, T010 crearon originalmente `account_type`, el valor `cliente` del enum y `account_invitations` — retirados por **Rework #2** más abajo (T050). Ver `research.md` #11-#13.

## Phase 3: User Story 1 - Acceso del personal del despacho por rol (Priority: P1) 🎯 MVP

**Goal**: El personal del despacho inicia sesión en `apps/admin` y ve únicamente lo que su rol permite.

**Independent Test**: Crear usuarios con distintos roles, iniciar sesión con cada uno y verificar que cada uno ve/usa solo las funciones permitidas para su rol (ver `quickstart.md` "Historia 1").

### Tests for User Story 1

- [x] T019 [P] [US1] Prueba unitaria de `hasPermission()` contra la matriz completa de `contracts/role-permissions.md` en `packages/auth/src/roles.test.ts` — 22 casos, todos pasan

### Implementation for User Story 1

- [x] T020 [US1] Implementar `apps/admin/src/middleware.ts` usando `refreshSupabaseSession()` (T015). **Ajuste de diseño**: el chequeo de `account_type`/rol NO vive en el middleware (Edge runtime, incompatible con `next/headers`) sino en las páginas protegidas vía `requireAccountType('staff')`/`requireCapability(...)` (Node runtime) — ver nota en el propio archivo y `contracts/package-api.md`, que ya especificaba estas funciones como server-only
- [x] T021 [P] [US1] Implementar `apps/admin/src/app/login/page.tsx`, usando un componente `LoginForm` nuevo y compartido en `packages/ui/src/LoginForm.tsx` (MUI + Formik + Yup, `signInWithPassword`, mensaje de error genérico sin revelar si el correo existe — FR-012). **Bug real descubierto y corregido**: `packages/supabase-client/src/env.ts` leía `process.env[name]` con acceso dinámico por corchetes; Next.js solo inlina `NEXT_PUBLIC_*` en el bundle del navegador cuando el acceso es literal (`process.env.NEXT_PUBLIC_X`) — con notación dinámica el valor llegaba `undefined` en el cliente. Corregido a acceso estático explícito por variable
- [x] T022 [US1] Implementar `apps/admin/src/app/usuarios/page.tsx` (placeholder protegido por `requireCapability('manage_users')`), `apps/admin/src/app/unauthorized/page.tsx`, y actualizar `apps/admin/src/app/page.tsx` como landing protegida (`requireAccountType('staff')`) con enlace condicional a "Gestión de usuarios" según `hasPermission`
- [x] T023 [US1] Prueba de integración añadida en `packages/auth/src/session.integration.test.ts` (usa `@supabase/supabase-js` directo contra el Supabase local, se auto-omite si no hay uno accesible): confirma que un Auxiliar solo ve su propia fila de `profiles` vía RLS, que un Administrador ve todas, y que un Auxiliar no puede actualizar ninguna fila — 3/3 pruebas pasan (25/25 en todo el paquete)
- [x] T024 [US1] Validado manualmente con Playwright (navegador real, no solo curl) contra `apps/admin` corriendo en local: Administrador inicia sesión (redirige a `/`, ve el enlace "Gestión de usuarios", accede a `/usuarios`); Auxiliar inicia sesión (no ve el enlace, `/usuarios` redirige a `/unauthorized`); contraseña incorrecta y correo inexistente muestran el mismo mensaje genérico "Correo o contraseña incorrectos." — Acceptance Scenarios 1-4 verificados (SC-001, SC-002). **Bug real descubierto y corregido**: `[auth.email].enable_signup = false` en `supabase/config.toml` bloqueaba también el login, no solo el autoregistro (ver nota en T012)

**Checkpoint**: La Historia 1 es completamente funcional y demostrable de forma independiente (MVP) — verificado con navegador real, no solo a nivel de API.

---

## Phase 4: ~~User Story 2 - Acceso del cliente a su propio portal (Priority: P2)~~ — SUPERADA (2026-07-15)

> **SUPERADA**: ya no existe el rol Cliente ni cuentas de cliente — ver `spec.md` Clarifications (segunda sesión) y `research.md` #12. La Historia 2 ahora es "Ajuste de permisos individuales por usuario" — ver **Rework #2** más abajo (T059-T063). Se conserva esta fase como registro histórico de lo que se implementó y se retira.

**Goal (histórico)**: Un cliente inicia sesión en `apps/portal` y solo ve su propia información.

**Independent Test (histórico)**: Crear dos cuentas de cliente, iniciar sesión con cada una y verificar que cada una ve solo su propia información.

### Implementation for User Story 2 (histórico — código a eliminar/reemplazar, ver Rework #2)

- [x] ~~T025~~ **SUPERADA** — Implementar `apps/portal/src/middleware.ts` usando `refreshSupabaseSession()` (T015); el chequeo de `account_type='client'` vive en `apps/portal/src/app/page.tsx` vía `requireAccountType('client')` (T017), misma decisión de diseño que T020. El middleware en sí no cambia; el chequeo de `page.tsx` se reemplaza por `requireApp('portal')` en T055.
- [x] T026 [P] [US2] Implementar `apps/portal/src/app/login/page.tsx` reusando el componente compartido `LoginForm` de `packages/ui` (mismo patrón que T021: MUI + Yup, mensaje genérico ante fallo — FR-012) — **sigue vigente**, sin cambios (no depende de `account_type`)
- [x] T027 [US2] Manejar el caso de cuenta inactiva/suspendida en el login del portal (mensaje explícito cuando `profiles.is_active = false`, con `signOut()` inmediato) en `apps/portal/src/app/login/page.tsx` — **sigue vigente**, sin cambios (aplica a cualquier cuenta de personal, no solo "cliente")
- [x] ~~T028~~ **SUPERADA** — Prueba de integración "Aislamiento entre clientes del portal" en `packages/auth/src/session.integration.test.ts`: ya no aplica (no hay cuentas de cliente) — eliminar este describe en T057
- [x] ~~T029~~ **SUPERADA** — Validación manual con cliente-a/cliente-b: ya no aplica; la validación de acceso a `apps/portal` por rol de personal se cubre en T058

**Checkpoint**: La Historia 1 (revisada) y la nueva Historia 2 (permisos por usuario) se validan en Rework #2.

---

## Phase 5: User Story 3 - Gestión de usuarios, roles y permisos (Priority: P3)

**Goal**: Un Administrador da de alta cuentas, cambia roles y activa/desactiva cuentas, con efecto inmediato.

**Independent Test**: Un Administrador realiza altas, cambios de rol y bajas de otras cuentas, verificando que los cambios se reflejan de inmediato en los permisos efectivos (ver `quickstart.md` "Historia 3").

### Tests for User Story 3

- [x] T030 [P] [US3] Prueba unitaria de la validación de "no dejar el sistema sin Administrador activo" — 5/5 casos pasan. **Ajuste de ubicación**: la lógica pura vive en `apps/admin/src/app/usuarios/lastAdminGuard.ts` (no en `actions.ts`) porque un archivo `'use server'` exige que TODAS sus exportaciones sean funciones async (Server Actions) — una función pura y síncrona lo rompía en tiempo de build ("Server Actions must be async functions", descubierto al probar con Playwright). Probada en `apps/admin/src/app/usuarios/lastAdminGuard.test.ts`

### Implementation for User Story 3

- [x] ~~T031~~ **SUPERADA (2026-07-15)** — Implementar la Server Action `inviteAccount()` en `apps/admin/src/app/usuarios/actions.ts` (usa `service_role` vía cliente propio + `auth.admin.inviteUserByEmail`, inserta en `account_invitations` y crea `profiles` de inmediato con el rol pretendido), protegida por `requireCapability('manage_users')` — **probado end-to-end** en su momento. **Se retira**: el usuario del proyecto decidió eliminar el alta por invitación — ver `research.md` #11 y T064 (Rework #2), que la reemplaza.
- [x] T032 [US3] Implementar la Server Action `changeUserRole()` en el mismo archivo (actualiza `profiles.role`, valida coherencia `account_type`/rol, protegida por `requireCapability('manage_users')`) — probado con navegador real
- [x] T033 [US3] Implementar la Server Action `setAccountActive()` en el mismo archivo (activar/desactivar cuenta) — probado con navegador real
- [x] T034 [US3] Reemplazar el placeholder de T022 con la pantalla completa `apps/admin/src/app/usuarios/page.tsx` + `UsuariosClient.tsx`: listado de usuarios e invitaciones pendientes, diálogo de invitación, `Select` de cambio de rol y botón activar/desactivar con diálogo de confirmación (MUI — constitución, "confirmaciones para operaciones críticas"); el botón de desactivar la propia cuenta queda deshabilitado en la UI como capa adicional de UX. **Requiere actualización en Rework #2** (T065): la sección "Invitaciones" y el diálogo "Invitar cuenta" se retiran/renombran — el resto (rol, activar/desactivar) sigue vigente sin cambios.
- [x] T035 [US3] Prueba de integración añadida en `packages/auth/src/session.integration.test.ts` (nuevo describe, usa `docker exec`+`psql` dentro de una transacción `BEGIN...ROLLBACK`): confirma que el trigger de BD rechaza desactivar al último Administrador activo invocado directamente por SQL (no vía Server Action), y que el `ROLLBACK` no deja ningún efecto persistente — 1/1 prueba pasa (28/28 en todo el paquete). Se omite si Docker/el contenedor de BD no está disponible
- [x] T036 [US3] Validado manualmente con Playwright contra la UI real: alta de una cuenta nueva por invitación con rol asignado correctamente (Acceptance Scenario 1, **superado — la re-validación de alta manual va en T067**); cambio de rol de un usuario existente reflejado de inmediato en la tabla (Acceptance Scenario 2, SC-004 — **sigue vigente**); desactivación de una cuenta (Acceptance Scenario 3 — **sigue vigente**); con 2 Administradores activos se pudo desactivar/cambiar de rol a uno de ellos, y al quedar solo 1 activo el botón de autodesactivación queda deshabilitado (Acceptance Scenario 4 / FR-011 — **sigue vigente**). El historial en `profile_change_history` (T009) capturó correctamente los 7 cambios realizados durante estas pruebas

**Checkpoint**: Las tres historias funcionan de forma independiente — verificado con navegador real en las tres.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Funcionalidad transversal a más de una historia y verificaciones finales.

- [x] ~~T037~~ **SUPERADA (2026-07-15)** — Implementar restablecimiento de contraseña (`resetPasswordForEmail` + `/auth/confirm` Route Handler + página de confirmación) en `apps/admin` y `apps/portal`, con componentes compartidos `RequestPasswordResetForm`/`SetNewPasswordForm` en `packages/ui` — cumplía FR-008, SC-005 en su versión original. **Hallazgo real en su momento** (descubierto probando el flujo completo con un correo real vía Mailpit, no solo revisando código): la plantilla de correo por defecto de GoTrue usa tokens en el fragmento `#` de la URL, invisible para el servidor/middleware SSR; se personalizó `supabase/config.toml` (`[auth.email.template.recovery]` + `supabase/templates/recovery.html`) para usar el patrón `token_hash` (query param) + `verifyOtp()` — ver `research.md` #9 (marcada como superada). **Se retira esta implementación**: el usuario del proyecto decidió, en sesión de clarificación posterior, eliminar la dependencia de SMTP para el restablecimiento de contraseña y reemplazarla por un flujo administrado por un Administrador (contraseña temporal + cambio obligatorio) — ver `research.md` #10 y las tareas T041-T049 más abajo, que reemplazan a esta.
- [x] T038 Implementar la pantalla de auditoría de autenticación para Administradores en `apps/admin/src/app/auditoria/page.tsx` (usa `get_auth_audit_log()` de T007, protegida por `requireCapability('view_auth_audit_log')`), con enlace desde `/` solo para roles con esa capacidad — cumple FR-009, SC-006. **Probado con navegador real**: la tabla mostró correctamente, en orden cronológico, los eventos reales generados durante toda la sesión de pruebas (`login`, `user_recovery_requested`, `user_updated_password`, etc.) para distintos usuarios, confirmando que `auth.audit_log_entries` se expone íntegro y sin necesidad de una bitácora propia duplicada (research.md #7)
- [x] T039 [P] Documentado en `apps/admin/README.md` (nuevo) el procedimiento de siembra del primer Administrador (T018), el flujo de invitación/gestión de usuarios, la auditoría y las notas de configuración del restablecimiento de contraseña; el `README.md` raíz enlaza a este documento y a `specs/003-supabase-auth-roles/`, y se agregaron `packages/auth`/`packages/supabase-client` al árbol de estructura del monorepo
- [x] T040 Ejecutado `pnpm lint`, `pnpm type-check`, `pnpm test` y `pnpm build` en todo el monorepo: 7/7 paquetes limpios en lint y type-check, 33/33 pruebas pasan, y ambas apps (`admin`/`portal`) compilan exitosamente en modo producción (incluye middleware, Route Handlers y páginas estáticas/dinámicas) — sin hallazgos pendientes

### Rework: contraseña temporal administrada por un Administrador, sin SMTP (sesión de clarificación 2026-07-15)

**Motivo**: el usuario del proyecto determinó, durante la implementación, que el restablecimiento de contraseña no debe depender de un proveedor SMTP. Reemplaza T037 — ver `spec.md` (sección Clarifications), `research.md` #10, `data-model.md` y `contracts/db-functions-rls.md`.

- [x] T041 [P] Migración adicional `supabase/migrations/20260715120000_must_change_password.sql`: agregada columna `must_change_password boolean not null default false` a `profiles` y la función `clear_must_change_password()` (`SECURITY DEFINER`, limita el `UPDATE` a `id = auth.uid()` y a esa sola columna; `GRANT EXECUTE` a `authenticated`, no a `anon`). Migración aplicada contra el Supabase local (`supabase migration up`) y tipos regenerados (`pnpm generate:types`) — verificado que `packages/types/src/database.ts` incluye la columna y la función
- [x] T042 [US3] Implementada la Server Action `assignTemporaryPassword(profileId)` en `apps/admin/src/app/usuarios/actions.ts`: genera una contraseña aleatoria segura de 16 caracteres con las 4 clases de carácter garantizadas (`apps/admin/src/app/usuarios/passwordGenerator.ts`, módulo separado por la misma razón que `lastAdminGuard.ts`), la aplica vía `service_role` (`auth.admin.updateUserById`), pone `must_change_password = true` en `profiles`, y devuelve la contraseña generada al llamador — protegida por `requireCapability('manage_users')`
- [x] T043 [US3] Actualizado `apps/admin/src/app/usuarios/UsuariosClient.tsx`: agregado el botón "Contraseña temporal" por fila, con diálogo de confirmación previo y un diálogo posterior de solo lectura (`TextField` readOnly) mostrando la contraseña generada una única vez
- [x] T044 Actualizado `packages/auth/src/session.ts`: agregado `mustChangePassword` a `CurrentProfile` (`getCurrentProfile`); `requireAccountType`/`requireCapability` redirigen a `/cambiar-contrasena` cuando es `true`, antes de evaluar accountType/capability — cumple FR-013
- [x] T045 [P] Implementadas `apps/admin/src/app/cambiar-contrasena/page.tsx` y `apps/portal/src/app/cambiar-contrasena/page.tsx` (cada una con su `CambiarContrasenaClient.tsx`): reusan `SetNewPasswordForm` de `packages/ui` sin cambios, llaman a `supabase.auth.updateUser({ password })` y, si es exitoso, a `supabase.rpc('clear_must_change_password')` antes de redirigir a `/`. La página server-component llama a `getCurrentProfile()` directamente (no a los guards) para evitar el bucle de redirección
- [x] T046 Eliminado el código obsoleto de T037 (superada): `apps/admin/src/app/reset-password/`, `apps/portal/src/app/reset-password/`, `apps/admin/src/app/auth/confirm/route.ts`, `apps/portal/src/app/auth/confirm/route.ts`, `supabase/templates/recovery.html`, la sección `[auth.email.template.recovery]` y las entradas `/auth/confirm` de `additional_redirect_urls` en `supabase/config.toml`, el componente `RequestPasswordResetForm` de `packages/ui` (y su export en `index.ts`), y el enlace "¿Olvidaste tu contraseña?" de ambos `login/page.tsx`. Verificado con `grep` que no queda ninguna referencia residual en `apps`/`packages`/`supabase`
- [x] T047 [P] Prueba de integración añadida en `packages/auth/src/session.integration.test.ts` (`describe` "clear_must_change_password()"): un Administrador (vía `service_role`) asigna `must_change_password = true`; se verifica que `clear_must_change_password()` invocado por otro usuario autenticado NO afecta la fila ajena, y que invocado por el propio usuario limpia el flag a `false` — 9/9 pruebas del archivo pasan (6 preexistentes + 3 nuevas) contra el Supabase local real
- [x] T048 [US3] Validado con Playwright contra la UI real (`apps/admin` en `pnpm dev`, Supabase local reiniciado tras editar `config.toml`): asignación de contraseña temporal en 262-360ms (SC-005 « 1 minuto), confirmado 0 correos nuevos en Mailpit (`GET /api/v1/messages` → `count: 0`), login con la contraseña temporal redirige de inmediato a `/cambiar-contrasena`, navegar directamente a `/` o `/usuarios` redirige de vuelta a `/cambiar-contrasena` (Acceptance Scenario 5, FR-013), tras establecer la nueva contraseña la navegación normal se restablece, y la contraseña temporal anterior queda rechazada (`Correo o contraseña incorrectos.`) mientras la nueva funciona. `apps/admin/README.md` actualizado con la nueva sección "Restablecimiento de contraseña (sin SMTP)"; `README.md` raíz no tenía referencias que actualizar
- [x] T049 Ejecutado `pnpm lint`, `pnpm type-check`, `pnpm test` y `pnpm build` en todo el monorepo tras el rework: 7/7 paquetes limpios en lint y type-check, 36/36 pruebas pasan (5 nuevas respecto a T040), y ambas apps compilan en modo producción con `/cambiar-contrasena` presente y `/reset-password`/`/auth/confirm` ausentes de las rutas generadas — sin hallazgos pendientes

---

## Rework #2: sin rol Cliente, sin invitaciones, `apps/portal` para personal, permisos por usuario (sesión de clarificación + `/speckit-plan` regenerado, 2026-07-15)

**Motivo**: el usuario del proyecto determinó que (a) el alta de cuentas debe ser manual, sin invitación por correo, y (b) no debe existir un rol "Cliente" — `apps/portal` se repropone como segunda aplicación para el personal del despacho, exclusiva de Contador/Auxiliar/Administrador, mientras `apps/admin` queda exclusiva de Administrador; además se agrega un sistema de permisos por usuario (plantilla por rol + excepciones). Reemplaza T025-T029 (Historia 2 original) y T031 — ver `spec.md` (Clarifications), `plan.md`, `research.md` #11-#13, `data-model.md` y `contracts/*`.

### Foundational (bloquea las tres historias de este rework)

- [x] T050 [P] Migración `supabase/migrations/20260715180000_remove_client_role.sql`: elimina las filas de prueba con `role='cliente'` (vía `delete from auth.users` en cascada), elimina `account_invitations`, elimina `profiles.account_type` y su constraint, recrea `app_role` sin `'cliente'` (rename→create→alter columna con `USING`→drop del tipo viejo), elimina `current_account_type()`, crea `permission_overrides` con RLS (self-or-admin en SELECT, admin-only en INSERT/UPDATE/DELETE) y el trigger `clear_permission_overrides_on_role_change`. Aplicada con `supabase migration up` y tipos regenerados — verificado en psql: enum de 3 valores, tabla `account_invitations` inexistente, `permission_overrides` con sus políticas
- [x] T051 Actualizado `packages/auth/src/roles.ts`: `AppRole` con 3 valores; quitados `AccountType`/`accountTypeForRole`; agregado `AppName`, `canAccessApp()` (Administrador→admin+portal; Contador/Auxiliar→portal), `roleDefaultCapabilities()`, `ALL_ROLES` y `ALL_CAPABILITIES`; agregada la capacidad `manage_user_permissions`
- [x] T052 Actualizado `packages/auth/src/session.ts`: `getCurrentProfile()` resuelve `CurrentProfile.capabilities` combinando `roleDefaultCapabilities()` con `permission_overrides` (función pura `resolveCapabilities()`, exportada para pruebas); `accountType` reemplazado por `requireApp(app)`; `requireCapability()` verifica contra `capabilities` ya resuelto
- [x] T053 [P] Actualizado `packages/auth/src/index.ts`: exporta `AppName`, `ALL_ROLES`, `ALL_CAPABILITIES`, `roleDefaultCapabilities`, `canAccessApp`, `requireApp`; sin `AccountType`/`accountTypeForRole`/`requireAccountType`

### Historia 1 (revisada) — Acceso del personal por rol y aplicación

- [x] T054 [US1] Actualizado `apps/admin/src/app/page.tsx` (`requireApp('admin')` + `profile.capabilities.includes(...)` en vez de `hasPermission`); `usuarios/page.tsx` y `auditoria/page.tsx` ya usaban solo `requireCapability`, sin cambios
- [x] T055 [US1] Actualizado `apps/portal/src/app/page.tsx`: `requireApp('portal')`; comentarios de `middleware.ts` de ambas apps y de `cambiar-contrasena/page.tsx` actualizados (mencionaban `requireAccountType`)
- [x] T056 [P] [US1] Reescrito `packages/auth/src/roles.test.ts`: matriz de `roleDefaultCapabilities()` y de `canAccessApp()` (13 tests)
- [x] T057 [US1] Eliminado el describe "Aislamiento entre clientes del portal" de `session.integration.test.ts` (insertaba `role='cliente'`, ya no existe en el enum); no se agregó una prueba de integración para `requireApp('admin')` denegado — es lógica pura sin respaldo RLS (ya cubierta por T056) y `getCurrentProfile`/`requireApp` usan `next/headers`, no invocables fuera del runtime de Next — la cobertura real de este camino es la validación manual (T058)
- [x] T058 [US1] Validado con Playwright contra `apps/admin`/`apps/portal` reales: Administrador entra a ambas apps; Contador y Auxiliar reciben `/unauthorized` en admin y acceden normalmente a portal; confirmado con dos cuentas reales de prueba (Contador y Auxiliar) tras confirmar sus correos vía Admin API

### Historia 2 (nueva) — Ajuste de permisos individuales por usuario

- [x] T059 [US2] Implementada la Server Action `setPermissionOverride({ profileId, capability, granted })` en `actions.ts` (`upsert` en `permission_overrides` vía `service_role`, `set_by` del Administrador actual) — protegida por `requireCapability('manage_user_permissions')`
- [x] T060 [US2] Implementado el diálogo "Permisos" en `UsuariosClient.tsx`: un `Switch` por capacidad (`ALL_CAPABILITIES`), etiqueta "(ajuste individual)" cuando hay un override vigente para esa capacidad. **Hallazgo real**: el diálogo inicialmente importaba `ALL_CAPABILITIES`/`ALL_ROLES` como valores desde `@control-contable/auth` — como ese barrel también re-exporta `session.ts` (que usa `next/headers`), importar un valor runtime (no solo tipos) desde un Client Component rompía la compilación de toda la app (`GET /usuarios 500`, y arrastraba a otras rutas). Corregido definiendo esas listas localmente en el componente, mismo patrón que ya usaba `STAFF_ROLES` antes de este rework
- [x] T061 [P] [US2] Exportada `resolveCapabilities()` desde `session.ts` (antes privada) y probada en `packages/auth/src/resolveCapabilities.test.ts` (4 casos: sin overrides, `granted=true` agrega, `granted=false` retira, varios overrides independientes)
- [x] T062 [US2] Prueba de integración añadida en `session.integration.test.ts` (`describe` "permission_overrides"): un override para el usuario A no aparece al consultar los overrides del usuario B (mismo rol); tras cambiar el rol del usuario A, sus `permission_overrides` quedan en 0 filas (trigger) — 2/2 pruebas pasan
- [x] T063 [US2] Validado con Playwright: activar "Consultar auditoría de autenticación" para una cuenta Contador en 1264ms (SC-007 « 1 min); al reabrir el diálogo se ve "(ajuste individual)"; revertido al finalizar. Nota de alcance (ya documentada en research.md #13): hoy el catálogo de `Capability` es exclusivo de `apps/admin` (solo Administrador la usa), por lo que el efecto observable de un ajuste sobre Contador/Auxiliar es a nivel de dato/API (T062), no aún de UI — se habilitará cuando existan capacidades de negocio en `apps/portal`

### Historia 3 (revisada) — Alta manual sin invitación

- [x] T064 [US3] Reemplazada `inviteAccount()` por `createAccount({ email, role })` en `actions.ts`: `auth.admin.createUser({ email, password: tempPassword, email_confirm: true })` (sin invitación), perfil creado con `is_active: true` y `must_change_password: true`, contraseña generada devuelta al llamador
- [x] T065 [US3] Reescrito `UsuariosClient.tsx`/`page.tsx`: eliminada la sección/tabla "Invitaciones" y toda referencia a `account_invitations`; diálogo renombrado a "Crear cuenta" (correo + rol, sin campos de tipo de cuenta); reutiliza el diálogo de solo lectura de la contraseña temporal
- [x] T066 [US3] Prueba de integración añadida (`describe` "createAccount"): simulada vía `service_role`, la cuenta queda `is_active=true` y `must_change_password=true` de inmediato — 1/1 prueba pasa
- [x] T067 [US3] Validado con Playwright de punta a punta: cuenta creada en ~350-405ms (SC-003 « 3 min), sin correo nuevo en Mailpit, login con la contraseña temporal redirige a `/cambiar-contrasena` en `apps/portal` (rol auxiliar), bloqueo de navegación a `/`, cambio de contraseña exitoso, acceso normal posterior, y contraseña temporal anterior ya rechazada

### Polish (Rework #2)

- [x] T068 [P] Actualizados `apps/admin/README.md` y `README.md` raíz: sin menciones a "invitación"/rol Cliente; documentado el alta manual ("Crear cuenta") y el ajuste de permisos por usuario
- [x] T069 Ejecutado `pnpm lint`, `pnpm type-check`, `pnpm test` y `pnpm build` en todo el monorepo tras el rework: 7/7 paquetes limpios en lint y type-check, 32/32 pruebas pasan (`packages/auth`: 13 + 4 + 10; `apps/admin`: 5 — `roles.test.ts` reescrito para la nueva matriz sin Cliente, `resolveCapabilities.test.ts` nuevo, `session.integration.test.ts` sin el describe de aislamiento entre clientes y con los nuevos de `permission_overrides`/`createAccount`), y ambas apps compilan en modo producción — sin hallazgos pendientes

---

## Rework #3: nombre obligatorio, mostrar/ocultar contraseña, espacio de logo (sesión de clarificación 2026-07-16)

**Motivo**: revisión de UX detectó que el alta de cuenta no capturaba el nombre completo (la tabla de usuarios mostraba el ID como respaldo), que ningún formulario de contraseña tenía control de mostrar/ocultar, y que no existía ningún espacio reservado para el logotipo del despacho — ver `spec.md` Clarifications (sesión 2026-07-16), FR-015/FR-016/FR-017, SC-008. Implementado directamente sin regenerar `plan.md`/un nuevo `tasks.md` completo (cambio pequeño y acotado, a petición explícita del usuario).

- [x] T070 [US3] Nombre completo obligatorio en el alta de cuenta (FR-015, SC-008): `CreateAccountInput` en `apps/admin/src/app/usuarios/actions.ts` ahora incluye `fullName` (validado con `.trim()`, rechazado si viene vacío, incluido en el `insert` de `profiles.full_name`); `UsuariosClient.tsx` agrega el campo "Nombre completo" al diálogo "Crear cuenta" y deshabilita el botón de envío mientras esté vacío
- [x] T071 [P] Mostrar/ocultar contraseña (FR-016): agregado un `IconButton` con `Visibility`/`VisibilityOff` (`@mui/icons-material`, nueva dependencia de `packages/ui`) como `endAdornment` del campo de contraseña en `LoginForm.tsx` y `SetNewPasswordForm.tsx` (`packages/ui`) — alterna el `type` del campo entre `password`/`text`
- [x] T072 [P] Espacio para el logotipo (FR-017): nuevo componente `Logo` (`packages/ui/src/Logo.tsx`, SVG simple renderizado en código, sin depender de un archivo de imagen externo) exportado desde el paquete; usado en `LoginForm.tsx` (centrado, sobre el título) y en el `AppBar` de `MainLayoutClient.tsx` (`apps/portal`, junto al título "Portal de Control Contable")
- [x] T073 Validado con Playwright contra `apps/admin`/`apps/portal` reales: logo visible en `/login` y en el `AppBar` del portal; el campo de contraseña alterna correctamente entre oculto/visible; el botón "Crear cuenta" permanece deshabilitado sin nombre y se habilita al capturarlo; la cuenta creada aparece en la tabla mostrando el nombre completo, no el ID — capturas en `/tmp/pw-test/login-with-logo-eye.png`
- [x] T074 Ejecutado `pnpm lint`, `pnpm type-check`, `pnpm test` y `pnpm build` en todo el monorepo tras este rework: 7/7 paquetes limpios, 36/36 pruebas pasan, ambas apps compilan en producción — sin hallazgos pendientes

---

## Rework #4: editar nombre de cuenta existente + columna de correo (sesión de clarificación 2026-07-16, mismo día)

**Motivo**: las 5 cuentas creadas antes de T070 (incluida la del propio Administrador de prueba) seguían mostrando el identificador interno en la tabla, ya que el nombre obligatorio solo aplicaba al alta — ver `spec.md` FR-018/FR-019, SC-009.

- [x] T075 [US3] Extraído `createServiceRoleClient()` de `actions.ts` a `apps/admin/src/lib/supabase/serviceRole.ts` (mismo cliente, ahora compartido); agregada la Server Action `updateUserFullName({ profileId, fullName })` en `actions.ts` (valida `.trim()` no vacío, `UPDATE profiles.full_name` vía el cliente de sesión — ya permitido por la RLS existente de `is_administrador()`, sin necesitar `service_role`)
- [x] T076 [US3] Agregado el botón "Editar nombre" por fila y su diálogo dedicado en `UsuariosClient.tsx` (mismo patrón que "Permisos"/"Contraseña temporal": abre con el nombre actual precargado, botón "Guardar" deshabilitado si el campo queda vacío)
- [x] T077 [US3] Agregada la columna "Correo electrónico" (FR-019): `page.tsx` ahora también usa `createServiceRoleClient()` para `auth.admin.listUsers({ perPage: 1000 })`, combina por `id` con `profiles`, y pasa `email` a cada fila de `UsuariosClient`
- [x] T078 Validado con Playwright contra `apps/admin` real: la columna de correo aparece con el valor correcto para cada cuenta; editar el nombre de la cuenta Administrador de prueba (existente, sin `full_name`) en 334ms (SC-009 « 1 min) hace que la tabla muestre el nombre en vez del ID de inmediato — captura en `/tmp/pw-test/usuarios-table-final.png`
- [x] T079 Ejecutado `pnpm lint`, `pnpm type-check`, `pnpm test` y `pnpm build` en todo el monorepo: 7/7 paquetes limpios, 36/36 pruebas pasan, ambas apps compilan en producción — sin hallazgos pendientes

---

## Rework #5: alineación de `UsuariosClient.tsx` con `docs/ux/design-system.md` (sesión de alineación con `001-business-domain-model`, 2026-07-17)

**Motivo**: al refinar `spec.md` para alinearlo con `001-business-domain-model` y `docs/ux/design-system.md`, se detectó que `UsuariosClient.tsx` — construida antes de que ese documento existiera — incumple dos de sus reglas generales (sin excepción por módulo): la columna "Estado" usa texto plano en vez de un Chip semántico (§4), y los botones de la columna "Acciones" son siempre visibles en vez de solo al hacer hover/foco sobre la fila (§5). Ver `spec.md` Assumptions, `plan.md` y `research.md` #14. Sin cambios de alcance funcional, datos, RLS ni capacidades — puramente presentacional.

- [x] T080 [US3] Columna "Estado" en `apps/admin/src/app/(app)/usuarios/UsuariosClient.tsx` (research.md #14): reemplazar `{profile.isActive ? 'Activa' : 'Desactivada'}` por un `Chip` de MUI (`size="small"`), color de acento (`secondary`/azul) con relleno al 10% de opacidad para "Activa", gris neutro para "Desactivada" — mismo mapeo semántico que `docs/ux/design-system.md` §1.1 (azul=positivo, gris=neutro)
- [x] T081 [US3] En el mismo archivo, columna "Acciones": agregar una clase (p. ej. `row-actions`) a la `Box` que envuelve los 4 botones y un `sx` en la `TableRow` (`'& .row-actions': { opacity: 0 }`, `'&:hover .row-actions, &:focus-within .row-actions': { opacity: 1 }`) para que los botones queden ocultos por defecto y visibles solo al pasar el cursor sobre la fila o al llegar a ellos con Tab (`:focus-within`, no solo `:hover` — necesario para no romper el acceso por teclado) — depende de T080 (mismo archivo)
- [x] T082 Validado manualmente por el usuario en `localhost:3001/usuarios` (2026-07-18): confirmó que el Chip de "Estado" se ve correctamente y que el Tooltip de cada ícono muestra el texto informativo tras reiniciar el dev server (ver T087, el `Tooltip` no funcionaba por un `.next` corrupto, no por el código) — depende de T080, T081, T084, T087
- [x] T083 Ejecutado `pnpm lint`, `pnpm type-check`, `pnpm test` y `pnpm build` en todo el monorepo: 7/7 paquetes limpios en lint y type-check, 5/5 tareas de test verdes (sin pruebas nuevas — cambio puramente de presentación, sin lógica pura que testear), ambas apps compilan y prerenderizan en modo producción sin errores
- [x] T084 [US3] Ajuste de UX reportado por el usuario tras probar T080/T081 en el navegador: el hover parecía "solo funcionar sobre la celda de Acciones" al no haber ninguna señal visual de que la fila completa era la zona de interacción. En `UsuariosClient.tsx` (research.md #14, actualizado): (a) se agrega el prop nativo `hover` a `TableRow` (fondo `action.hover` sobre toda la fila); (b) los 4 `Button` de texto de "Acciones" se reemplazan por `IconButton` + `Tooltip` (`EditIcon`, `ToggleOnIcon`/`ToggleOffIcon`, `LockResetIcon`, `TuneIcon`; título del Tooltip = mismo texto anterior, también usado como `aria-label`), cada uno envuelto en un `<span>` para que el Tooltip funcione con botones `disabled` — depende de T081
- [x] T085 Documentado el patrón final (fila con `hover` nativo + iconos/Tooltip revelados por `:hover`/`:focus-within`) en `research.md` #14 (actualizado) y en `docs/ux/design-system.md` §5 (regla general) y §10 (puntos 1, 5 y 6 — puntos 5/6 marcados como resueltos, punto 1 de Clientes actualizado para referenciar esta implementación como modelo) — depende de T084
- [x] T086 Re-ejecutado `pnpm lint`, `pnpm type-check` y `pnpm build` tras T084: limpios, `/usuarios` compila sin errores — depende de T084
- [x] T087 El usuario reportó, al probar T084 en el navegador, que el `Tooltip` no se mostraba — diagnosticado como daño colateral de T086 (`pnpm build` corrió mientras el dev server de `apps/admin` seguía vivo sobre el mismo `.next`, causando `ENOENT: prerender-manifest.json`, mismo síntoma ya visto en `004`). Reiniciado el dev server de `apps/admin` (`.next` borrado + `next dev` de nuevo); confirmado sin errores en el log
- [x] T088 [US3] Tras confirmar el Tooltip, el usuario reportó que los íconos seguían ocultos hasta hacer hover sobre la fila y prefería que quedaran siempre visibles (ya no aportaba nada ocultarlos, siendo iconos compactos). Se removió el mecanismo de ocultar/revelar en `UsuariosClient.tsx` (clase `row-actions` + `opacity` en `TableRow`/`Box`), dejando los 4 `IconButton` siempre visibles; se conservó el prop `hover` de `TableRow` para el fondo de hover de fila. Documentado en `research.md` #14 (iteración final) y `docs/ux/design-system.md` §5/§10 (regla revisada: iconos siempre visibles, no hide/reveal) — depende de T084, T087
- [x] T089 Re-ejecutado `pnpm lint` y `pnpm type-check` tras T088 (sin `pnpm build`, para no repetir el problema de T087 mientras el dev server sigue activo): limpios — depende de T088

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — puede iniciar de inmediato.
- **Foundational (Phase 2)**: Depende de Setup — BLOQUEA las tres historias de usuario.
- **User Stories (Phase 3-5)**: Todas dependen de que Foundational esté completo.
  - Pueden avanzar en orden de prioridad (US1 → US2 → US3) o en paralelo si hay más de una persona.
- **Polish (Phase 6)**: Depende de las historias que se quieran cubrir (T038 requiere T007; T037 —superada— era independiente de US1-US3 mecánicamente pero tenía más sentido una vez que el login ya existe).
- **Rework #1 (post-T040, sesión de clarificación 2026-07-15)**: Depende de que Phase 6 original ya esté completa (T037-T040), ya que reemplaza a T037 y reutiliza `SetNewPasswordForm`/`packages/auth` ya construidos. Orden interno: T041 bloquea a T042, T044 y T047; T042 bloquea a T043; T041+T044 bloquean a T045; T045 bloquea a T046; T042-T046 bloquean a T048; todo lo anterior bloquea a T049.
- **Rework #2 (post-T049, `/speckit-plan` regenerado 2026-07-15)**: Depende de que Rework #1 esté completo (reutiliza `passwordGenerator.ts` de T042 y el diálogo de solo lectura de T043). Foundational de este rework: T050 bloquea a T051; T051 bloquea a T052 y T053 (y a T056, T061); T052 bloquea a T053, T054, T055, T057, T059. Historia 1: T054+T055 bloquean a T058 (junto con T056, T057). Historia 2: T059 bloquea a T060, T062, T063. Historia 3: T064 bloquea a T065, T066, T067. T069 depende de T050-T068 completas.

### User Story Dependencies

- **US1 (P1)**: Puede iniciar tras Foundational. Sin dependencia de otras historias. Revisada en Rework #2: ahora también valida que solo Administrador entra a `apps/admin` (T054-T058).
- **US2 (P2)**: Puede iniciar tras Foundational. **Redefinida en Rework #2** — dejó de ser "aislamiento entre clientes" (retirado, T025-T029 superadas) y pasó a ser "ajuste de permisos individuales por usuario" (T059-T063), independientemente verificable con sus propios criterios de aceptación.
- **US3 (P3)**: Puede iniciar tras Foundational. Reemplaza el placeholder de T022 (US1) con la pantalla completa — trabajarla antes de US1 dejaría un placeholder más tiempo, pero no es un bloqueo real: US1 sigue siendo demostrable con el placeholder mientras US3 no esté lista. Revisada en Rework #2: el alta pasa de invitación a manual (T064-T067).

### Within Each User Story

- US1: T019 (prueba unitaria) puede ir en paralelo con T020-T022; T023 (integración) depende de T020-T022; T024 (validación manual) depende de todo lo anterior.
- US2 (original, superada): T025-T027 antes de T028 (integración); T029 (validación manual) al final.
- US3: T030 (prueba unitaria) en paralelo con T031-T034; T031 → T032 → T033 (mismo archivo, secuencial) → T034 (UI, depende de las tres Server Actions); T035 (integración) y T036 (validación manual) al final.
- Rework #2 / US1 (revisada): T056 (prueba unitaria) en paralelo con T054-T055; T057 (integración) y T058 (validación manual) dependen de T054-T056.
- Rework #2 / US2 (nueva): T059 → T060 (UI, mismo archivo que T034/T065, secuencial); T061 en paralelo con T059-T060; T062 (integración) depende de T059; T063 (validación manual) al final.
- Rework #2 / US3 (revisada): T064 → T065 (mismo archivo que T034, secuencial); T066 (integración) y T067 (validación manual) dependen de T064-T065.

### Parallel Opportunities

- T001, T002, T003, T004 (Setup) en paralelo entre sí.
- T012 (config.toml) en paralelo con T005-T011 (archivo distinto, sin dependencia real de contenido, aunque conceptualmente pertenece a la misma fase).
- T013 y T014 (browser.ts / server.ts) en paralelo entre sí; T016 (roles.ts, paquete distinto) en paralelo con T013/T014.
- T019 (US1, prueba unitaria) en paralelo con T020-T022.
- T021 (US1) y T026 (US2) en paralelo si se trabajan ambas historias a la vez (archivos de apps distintas).
- T030 (US3, prueba unitaria) en paralelo con T031-T034.
- T037 (superada) y T039 (Polish) eran paralelas entre sí.
- T041 (Rework #1) en paralelo con T047 una vez migrada (ambos [P], archivos distintos); T045 (páginas `/cambiar-contrasena` de ambas apps) en paralelo internamente entre `admin` y `portal`.
- T050 (Rework #2, migración) en paralelo con nada dentro de su propia fase (bloquea casi todo lo demás); T053 en paralelo con T056/T061 una vez T051/T052 completas (archivos distintos); T068 (Polish) en paralelo con cualquier tarea de las tres historias de este rework.

---

## Parallel Example: Foundational

```bash
# Independientes entre sí una vez que T011 (tipos regenerados) está listo:
Task: "Implementar createBrowserSupabaseClient() en packages/supabase-client/src/browser.ts"
Task: "Implementar createServerSupabaseClient() en packages/supabase-client/src/server.ts"
Task: "Implementar roles.ts (AppRole/Capability/hasPermission) en packages/auth/src/roles.ts"
```

## Parallel Example: User Story 1 y 2 en paralelo

```bash
# Con Foundational completo, dos personas pueden trabajar historias distintas sin pisarse:
Task: "Implementar apps/admin/src/app/login/page.tsx (US1)"
Task: "Implementar apps/portal/src/app/login/page.tsx (US2)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea las tres historias; incluye sembrar el primer Administrador)
3. Completar Phase 3: User Story 1
4. **DETENERSE Y VALIDAR**: confirmar la Historia 1 de forma independiente contra `quickstart.md`
5. Con esto el personal del despacho ya puede autenticarse con control de acceso por rol (MVP)

### Incremental Delivery

1. Setup + Foundational → esquema, RLS y primitivas de autorización listos
2. - US1 → personal autenticado con acceso por rol (MVP)
3. - US2 (original, superada) → ~~clientes autenticados con aislamiento de datos~~
4. - US3 → gestión completa de altas/roles/bajas (reemplaza el placeholder de US1)
5. - Polish → auditoría, documentación operativa
6. - Rework #1 → restablecimiento de contraseña sin SMTP (contraseña temporal + cambio obligatorio)
7. - Rework #2 → sin rol Cliente/invitaciones; `apps/admin` exclusiva de Administrador; `apps/portal` para todo el personal; alta manual con contraseña temporal; permisos individuales por usuario

---

## Notes

- Se incluyeron tareas de prueba (T019, T023, T028, T030, T035) porque `plan.md`/`research.md` §8 comprometen explícitamente una estrategia de pruebas para esta feature (a diferencia de una feature de infraestructura pura); omitirlas dejaría sin cumplir la fila "Testing" de la Constitution Check.
- El placeholder de gestión de usuarios de T022 (US1) se reemplaza por la implementación completa en T034 (US3) — es intencional: permite que US1 sea demostrable de forma independiente sin esperar a que toda la gestión de usuarios esté terminada.
- Ninguna Server Action que use la `service_role` key se expone a `packages/supabase-client` del lado del navegador — todas viven en archivos `actions.ts` server-only dentro de `apps/admin`.
- La regla "al menos un Administrador activo" (FR-011) se aplica dos veces por diseño: en la Server Action (T032/T033, para dar un mensaje de error amigable) y en el trigger de base de datos (T008, como autoridad final e innegociable) — ver `research.md` #6.
- **Rework #2**: T050 (migración) es la tarea más riesgosa de todo el rework — recrea un tipo ENUM en uso (`app_role`) y elimina una tabla (`account_invitations`); debe probarse contra una copia de los datos de prueba locales antes de aplicarse, dado que ya existen filas con `role='cliente'` en el entorno de desarrollo actual. T059-T063 (permisos por usuario) son, por ahora, un mecanismo genérico sin capacidades de negocio concretas que ajustar (los módulos de clientes/cobranza/expedientes aún no existen) — ver research.md #13, "Nota de alcance".
