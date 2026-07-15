# Quickstart de validación: Autenticación y Roles con Supabase

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Valida las tres historias de usuario contra un Supabase local (CLI: `supabase start`, o el entorno autoalojado de `infra/supabase/`) con las migraciones de esta feature ya aplicadas. No sustituye `tasks.md`.

> **Revisión 2026-07-15**: ya no hay rol Cliente ni invitaciones. Historia 1 valida acceso por rol **y por aplicación** (`apps/admin` exclusiva de Administrador); Historia 2 pasa a validar el ajuste de permisos por usuario; Historia 3 valida alta manual (sin invitación) además de lo ya existente.

## Prerrequisitos

- `supabase start` (desarrollo local) o el stack de `infra/supabase/` corriendo y saludable (`./scripts/healthcheck.sh`).
- Migraciones de `supabase/migrations/` aplicadas, incluida la que elimina el rol Cliente/`account_type`/`account_invitations` y agrega `permission_overrides` (`supabase db reset` en local, o el mecanismo de migraciones equivalente contra el entorno autoalojado).
- Al menos un usuario `administrador` inicial creado (semilla manual vía `auth.admin.createUser` + `profiles`, ya que el sistema no tiene autoregistro ni invitación).
- `apps/admin` y `apps/portal` corriendo (`pnpm dev`) con `.env.local` apuntando al Supabase usado en esta validación.

## Historia 1 — Acceso del personal por rol y aplicación

1. Iniciar sesión en `apps/admin` (`http://localhost:3001/login`) con el usuario `administrador` semilla.
   - **Esperado**: acceso concedido, se ve la sección de gestión de usuarios (Acceptance Scenario 1).
2. Iniciar sesión con esa misma cuenta `administrador` en `apps/portal` (`http://localhost:3000/login`).
   - **Esperado**: acceso concedido (Acceptance Scenario 2 — Administrador también usa portal).
3. Como Administrador, crear manualmente una cuenta con rol `auxiliar` (Historia 3, usada aquí como setup) y anotar la contraseña temporal mostrada.
4. Iniciar sesión con la cuenta `auxiliar` (tras establecer su nueva contraseña) en `apps/admin`.
   - **Esperado**: acceso denegado — esa aplicación es exclusiva de Administrador (Acceptance Scenario 3).
5. Iniciar sesión con la misma cuenta `auxiliar` en `apps/portal`.
   - **Esperado**: acceso concedido, viendo únicamente lo que su rol permite (Acceptance Scenario 4).
6. Con la sesión `auxiliar` activa en portal, navegar directamente a una URL reservada a Administrador (p. ej. la de ajuste de permisos).
   - **Esperado**: acceso denegado con mensaje de "no autorizado" (Acceptance Scenario 5, SC-002).
7. Intentar iniciar sesión con una contraseña incorrecta para cualquiera de las cuentas.
   - **Esperado**: error genérico, sin indicar si el correo existe (Acceptance Scenario 6, FR-012).

**Objetivo de tiempo**: los pasos de login deben completarse en menos de 10 segundos desde el envío del formulario hasta ver la pantalla principal (SC-001).

## Historia 2 — Ajuste de permisos individuales por usuario

1. Crear (o reusar) dos cuentas con el mismo rol (p. ej. dos `auxiliar`: Auxiliar-1 y Auxiliar-2).
2. Como Administrador, desde `apps/admin`, ajustar (activar) una capacidad específica únicamente para Auxiliar-1 — cronometrar desde el clic hasta la confirmación (SC-007, < 1 minuto).
3. Iniciar sesión con Auxiliar-1 y confirmar que la capacidad ajustada ya está disponible en `apps/portal` (Acceptance Scenario 1).
4. Iniciar sesión con Auxiliar-2 (mismo rol, sin el ajuste) y confirmar que esa capacidad **no** está disponible — el ajuste no se filtró a otros usuarios del mismo rol.
5. Cambiar el rol de Auxiliar-1 (p. ej. a `contador`) y confirmar que el ajuste individual anterior ya no aplica — adopta la plantilla del nuevo rol sin heredar el ajuste (Acceptance Scenario 2).
6. Iniciar sesión con una cuenta que no sea Administrador e intentar ajustar permisos (los propios o los de otro usuario).
   - **Esperado**: acceso denegado (Acceptance Scenario 3).

## Historia 3 — Gestión de usuarios, roles y permisos

1. Como Administrador, crear manualmente una cuenta nueva de personal (correo + rol, **sin invitación**) — cronometrar desde el envío del formulario hasta ver la contraseña temporal generada (SC-003, < 3 minutos). Confirmar que **no se envía ningún correo** (sin actividad nueva en Mailpit/Inbucket).
   - Iniciar sesión con esa cuenta nueva usando la contraseña temporal.
   - **Esperado**: login exitoso, redirige de inmediato a `/cambiar-contrasena`; tras establecer una nueva contraseña, su acceso corresponde exactamente al rol asignado (Acceptance Scenario 1).
2. Como Administrador, cambiar el rol de un usuario existente (p. ej. `auxiliar` → `contador`).
   - Con la sesión de ese usuario ya abierta en otra ventana, refrescar/navegar y confirmar que el nuevo conjunto de permisos aplica de inmediato (Acceptance Scenario 2, SC-004 — cronometrar, < 1 minuto).
3. Desactivar la cuenta de un usuario con una sesión activa y confirmar que pierde el acceso en su siguiente solicitud (Acceptance Scenario 3).
4. Iniciar sesión con una cuenta que no sea Administrador e intentar acceder a la gestión de usuarios.
   - **Esperado**: acceso denegado (Acceptance Scenario 4).
5. Intentar, mediante el único usuario Administrador existente en el entorno de prueba, cambiar su propio rol o desactivar su propia cuenta.
   - **Esperado**: la operación es rechazada por el trigger de base de datos (FR-011) — verificar el mensaje de error propagado hasta la UI.
6. Como Administrador, en la fila de un usuario existente, asignar una contraseña temporal (restablecimiento) — cronometrar desde el clic hasta ver la contraseña generada en pantalla (SC-005, < 1 minuto). Confirmar que **no se envía ningún correo**.
   - Cerrar sesión e iniciar sesión con ese usuario usando la contraseña temporal.
   - **Esperado**: el login es exitoso pero el sistema redirige de inmediato a `/cambiar-contrasena`, sin permitir acceder a ninguna otra página (Acceptance Scenario 5, FR-013) — probar navegar directamente a `/` o `/usuarios` por URL y confirmar que también redirige a `/cambiar-contrasena`.
   - Establecer una nueva contraseña en esa pantalla y confirmar que el usuario ya puede navegar normalmente al resto de la aplicación según su rol.
   - Cerrar sesión y volver a iniciar sesión con la contraseña temporal anterior: debe fallar (ya no es válida).

## Verificación de auditoría (FR-009, SC-006)

Como Administrador, consultar la vista/pantalla de auditoría y confirmar que aparecen: los logins exitosos y el fallido de la Historia 1, el cambio de rol del paso 2 de la Historia 3, y la desactivación del paso 3.

## Referencias

- Matriz de roles y capacidades: [contracts/role-permissions.md](./contracts/role-permissions.md)
- Funciones, triggers y RLS: [contracts/db-functions-rls.md](./contracts/db-functions-rls.md)
- API de los paquetes compartidos: [contracts/package-api.md](./contracts/package-api.md)
- Entidades y esquema: [data-model.md](./data-model.md)
- Decisiones técnicas: [research.md](./research.md)
