# Implementation Plan: Autenticación y Roles con Supabase

**Branch**: `003-supabase-auth-roles` | **Date**: 2026-07-14 (revisado 2026-07-15) | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-supabase-auth-roles/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

> **Revisión 2026-07-15 (segunda sesión de clarificación)**: este plan fue regenerado tras cambios de alcance significativos — ver `## Clarifications` en `spec.md`. Se retira el rol Cliente, `account_type` y el alta por invitación; `apps/portal` se repropone como segunda aplicación de personal; se agrega un sistema de permisos por usuario (plantilla por rol + excepciones). La versión anterior de este documento describía un modelo con 4 roles (incluido Cliente) y alta por invitación — ver historial de git para esa versión.

## Summary

Construir la base de autenticación y autorización del sistema sobre Supabase Auth (GoTrue) + PostgreSQL/RLS para el personal del despacho (Administrador, Contador, Auxiliar): `apps/admin` (Panel Administrativo) es exclusiva del rol Administrador; `apps/portal` (operación diaria) es accesible para los 3 roles. No existe autoregistro público ni alta por invitación: toda cuenta la crea manualmente un Administrador, con una contraseña temporal generada por el sistema que el usuario debe cambiar en su primer inicio de sesión (mismo mecanismo que el restablecimiento de contraseña, FR-008/FR-010/FR-013) — sin depender en ningún caso de un proveedor SMTP. Un Administrador puede además ajustar capacidades individuales por usuario, por encima de la plantilla por defecto de su rol (FR-014). El acceso se revoca de inmediato ante cambio de rol o desactivación, y se audita. El enfoque técnico añade dos paquetes compartidos (`packages/supabase-client` y `packages/auth`) consumidos por ambas apps, y un esquema de base de datos (`profiles`, historial de cambios, ajustes de permisos por usuario, funciones/RLS) — sin introducir un sistema de roles dinámico: los 3 roles y su plantilla de capacidades por defecto quedan fijos en código, tal como los describe la constitución del proyecto; solo las excepciones puntuales por usuario son configurables en runtime.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict, sin `any`), Next.js 15 (App Router), React 19 — mismas versiones ya usadas por `apps/admin` y `apps/portal`.

**Primary Dependencies**: `@supabase/supabase-js` (ya presente) + `@supabase/ssr` (cliente de sesión con cookies para Server Components/Route Handlers/Middleware de Next.js App Router; sucesor recomendado de `@supabase/auth-helpers-nextjs`, ya deprecado). Material UI (ya presente) para las pantallas de login/gestión de usuarios/permisos. Yup (constitución) para validación de formularios.

**Storage**: PostgreSQL vía Supabase (mismo proyecto/base de datos que ya usan `apps/admin`/`apps/portal`). Tablas en el esquema `public`: `profiles`, `profile_change_history`, `permission_overrides` (nueva — ver data-model.md). **Ya no existe** `account_invitations` (se elimina el concepto de invitación, ver research.md #11). Los eventos de login/logout/fallos de autenticación se leen de la tabla nativa `auth.audit_log_entries` que GoTrue ya mantiene — no se duplica esa bitácora.

**Testing**: Vitest (ya introducido en el repo por esta misma feature). Pruebas unitarias para la lógica de roles/permisos (`packages/auth`, incluida la resolución plantilla-por-rol + excepciones por usuario) y para la regla "no puede quedar el sistema sin ningún Administrador activo"; pruebas de integración contra un Supabase local (CLI o `infra/supabase/`) para verificar que las políticas RLS realmente bloquean acceso entre roles (SC-002) y que un ajuste de permisos por usuario no afecta a otros usuarios del mismo rol (SC-007).

**Target Platform**: Navegador (Next.js SSR/Server Components) + PostgreSQL/Supabase Auth como backend; mismo entorno de despliegue que el resto del monorepo (desarrollo local vía Supabase CLI, producción vía `infra/supabase/` de la feature `002-supabase-docker-stack`).

**Project Type**: Aplicación web (monorepo existente: `apps/admin`, `apps/portal`, `packages/*`).

**Performance Goals**: SC-001 (login a pantalla principal < 10s). No hay metas de throughput propias más allá de las ya asumidas por el resto del sistema.

**Constraints**: SC-004 exige que un cambio de rol/desactivación surta efecto en ≤1 minuto — esto descarta cachear el rol únicamente en el JWT (que vive hasta 1 hora, `jwt_expiry` en `supabase/config.toml`) como única fuente de verdad; el rol y los ajustes de permisos efectivos se validan contra `profiles`/`permission_overrides` en cada solicitud relevante (ver research.md #2). FR-010/FR-012 (sin autoregistro público, mensajes de error genéricos) ya están soportados por la configuración por defecto de GoTrue (`enable_signup`, mensajes de error de `auth/v1/token`).

**Scale/Scope**: Mismo alcance de un despacho contable individual ya asumido por el resto del proyecto; 3 roles fijos (Administrador, Contador, Auxiliar) con plantilla de capacidades por defecto en código, más un mecanismo de excepciones por usuario (no un RBAC dinámico completo — ver research.md #4/#13).

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio (constitución)                                                              | Aplica | Estado                                                                                                                                                                      |
| ------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Backend: Supabase, PostgreSQL                                                         | Sí     | PASS — se usa Supabase Auth (GoTrue) + RLS de PostgreSQL, sin componentes adicionales.                                                                                      |
| Seguridad: nunca contraseñas en texto plano / cifrado de credenciales                 | Sí     | PASS — las contraseñas nunca las maneja nuestro código; GoTrue las hashea y almacena.                                                                                       |
| Seguridad: autenticación obligatoria / control de permisos por usuario                | Sí     | PASS — es el objeto mismo de la feature (FR-001 a FR-007).                                                                                                                  |
| Seguridad: registro de auditoría (incluye "inicio de sesión")                         | Sí     | PASS — FR-009, vía `auth.audit_log_entries` (login/logout) + `profile_change_history` (roles/estado), ver research.md #7.                                                   |
| Seguridad: validación tanto frontend como backend                                     | Sí     | PASS — Yup en formularios + RLS/políticas en base de datos como autoridad final (el frontend nunca es la única barrera).                                                    |
| Base de Datos: trazabilidad (creación/modificación, usuario) en tablas críticas       | Sí     | PASS — `profiles` incluye `created_at/updated_at/created_by/updated_by`; `permission_overrides` incluye `set_by/set_at` (ver data-model.md).                                |
| Base de Datos: evitar eliminaciones físicas, preferir soft-delete                     | Sí     | PASS — desactivar un usuario es `profiles.is_active = false`, nunca se borra la fila.                                                                                       |
| Multi-Usuario: roles Administrador, Contador, Auxiliar                                | Sí     | PASS — FR-003 los implementa exactamente como los define la constitución (sección "Multi-Usuario"), sin un cuarto rol "Cliente" que la constitución nunca contempló.        |
| UI: Material UI, formularios consistentes, confirmaciones en operaciones críticas     | Sí     | PASS (a nivel de diseño) — login, alta manual, cambio de rol, desactivación y ajuste de permisos usan MUI y requieren confirmación explícita para las operaciones críticas. |
| Testing: pruebas unitarias para reglas de negocio, integración para procesos críticos | Sí     | PASS (Vitest ya introducido) — ver Technical Context "Testing" y research.md #8.                                                                                            |

No se identifican violaciones. No se requiere completar `Complexity Tracking`.

**Re-check post-diseño (Fase 1)**: `research.md`, `data-model.md`, `contracts/` y `quickstart.md` concretan cada fila anterior (esquema `profiles`/`profile_change_history`/`permission_overrides`, función `is_administrador()`, trigger de "último Administrador", RLS por tabla) sin introducir nada fuera de lo ya evaluado. La tabla se mantiene sin cambios: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/003-supabase-auth-roles/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
supabase/
└── migrations/
    ├── 20260714214701_auth_roles_schema.sql      # YA APLICADA — enum app_role (4 valores originales),
    │                                              # profiles (con account_type), profile_change_history,
    │                                              # account_invitations, funciones, trigger, RLS
    ├── 20260715120000_must_change_password.sql   # YA APLICADA — columna must_change_password + clear_must_change_password()
    └── <timestamp>_remove_client_role.sql        # NUEVA — ver research.md #11/#12:
                                                   #  - recrea app_role sin 'cliente' (Postgres no permite
                                                   #    eliminar valores de un ENUM existente)
                                                   #  - elimina profiles.account_type y su constraint asociado
                                                   #  - elimina la tabla account_invitations y sus políticas RLS
                                                   #  - crea la tabla permission_overrides (+ RLS + trigger de
                                                   #    limpieza al cambiar profiles.role)
                                                   #  - reasigna o elimina cualquier fila existente con role='cliente'
                                                   #    antes de recrear el tipo (dato de prueba local, no de producción)

packages/
├── supabase-client/      # Sin cambios de estructura
│   └── src/
│       ├── env.ts
│       ├── browser.ts
│       ├── server.ts
│       └── middleware.ts
├── auth/                 # @control-contable/auth — cambios de contenido, no de estructura de archivos
│   └── src/
│       ├── roles.ts          # AppRole (3 valores), Capability, plantilla rol->capacidades por defecto;
│       │                     # ya NO exporta AccountType/accountTypeForRole (ver research.md #12)
│       ├── session.ts        # getCurrentProfile() resuelve capacidades efectivas (plantilla + overrides);
│       │                     # requireApp('admin' | 'portal') reemplaza a requireAccountType();
│       │                     # requireCapability() sigue igual mecánicamente, ahora contra capacidades resueltas
│       └── index.ts
├── types/                # Regenerar Database (pnpm generate:types) tras la nueva migración
├── ui/                   # Se añaden componentes para el formulario de ajuste de permisos por usuario (Historia 2)
└── utils/                # Sin cambios

apps/admin/src/
├── middleware.ts                     # Sin cambios de forma
├── app/login/page.tsx                # Sin cambios
├── app/cambiar-contrasena/page.tsx   # Sin cambios (ya implementado)
└── app/usuarios/                     # Historia 3 (alta manual sin invitación, rol, desactivar, contraseña
                                       # temporal) + Historia 2 (ajuste de permisos por usuario) — ambas
                                       # exclusivas de Administrador, único rol con acceso a esta app

apps/portal/src/
├── middleware.ts                     # Sin cambios de forma
├── app/login/page.tsx                # Ya NO valida account_type='client' — accesible a los 3 roles de personal
└── app/cambiar-contrasena/page.tsx   # Sin cambios
```

**Structure Decision**: Se mantienen los dos paquetes compartidos ya construidos — `packages/supabase-client` y `packages/auth` — consumidos por ambas apps, siguiendo el mandato explícito de la constitución de que "toda lógica reutilizable deberá vivir fuera de la interfaz". El cambio de esta revisión es principalmente de **contenido** dentro de esos mismos archivos (menos estructura nueva): `packages/auth` pierde el concepto `AccountType`/`account_type` y gana la resolución de capacidades por usuario; `apps/portal` deja de ser una app de "otro tipo de cuenta" y pasa a compartir exactamente el mismo modelo de roles que `apps/admin`, solo que con una regla de acceso por app distinta (`requireApp`). El esquema de datos sigue viviendo en `supabase/migrations/`, agregando una migración nueva en vez de editar las ya aplicadas (convención ya establecida en este proyecto).

> **Historial de revisiones de este documento**:
>
> - **2026-07-15 (primera sesión de clarificación)**: FR-008/FR-013 reemplazaron el restablecimiento de contraseña por correo por un flujo administrado por un Administrador con contraseña temporal — ver `research.md` #10. Ya implementado (T041-T049 de `tasks.md`); sin cambios adicionales en esta revisión.
> - **2026-07-15 (segunda sesión de clarificación, este documento)**: se elimina el rol Cliente, `account_type` y el alta por invitación; `apps/portal` se repropone para personal; se agrega el sistema de permisos por usuario — ver `research.md` #11-#13 y `spec.md` Clarifications. **Pendiente de `/speckit-tasks`**: el desglose de tareas en `tasks.md` (T001-T049) describe la implementación **anterior** a este cambio y queda en buena parte obsoleto — no se ha modificado todavía; requiere una regeneración con `/speckit-tasks` que incluya explícitamente qué eliminar (rol Cliente del enum, `account_type`, `account_invitations`, la UI de invitación, las pruebas de "aislamiento entre clientes") y qué construir (migración nueva, `permission_overrides`, `requireApp()`, alta manual con contraseña temporal, UI de ajuste de permisos).

## Complexity Tracking

> No hay violaciones de la Constitution Check que requieran justificación. Esta sección no aplica.
