# apps/admin — Panel Administrativo

Aplicación **exclusiva del rol Administrador**, para administración del sistema (usuarios, roles, permisos, auditoría). El resto del personal (Contador, Auxiliar) usa `apps/portal` para su operación diaria — ver la especificación completa de autenticación/roles en [`specs/003-supabase-auth-roles/`](../../specs/003-supabase-auth-roles/).

## Primer arranque: sembrar el Administrador inicial

El sistema **no tiene autoregistro** (FR-010): toda cuenta se crea manualmente por un Administrador, sin invitación por correo. Como no existe autoregistro, la primerísima cuenta Administrador debe sembrarse manualmente contra la base de datos que se esté usando (Supabase CLI local o `infra/supabase/`):

```bash
SUPABASE_URL=http://127.0.0.1:54321 \
SUPABASE_SERVICE_ROLE_KEY=<service_role key de `supabase status`> \
DB_CONTAINER=supabase_db_control-contable \
./supabase/seed-admin.sh admin@despacho.com "ContraseñaSegura123!"
```

Ver `supabase/seed-admin.sh` para el detalle (crea el usuario en Auth vía la API de administración + inserta su perfil `administrador` en `public.profiles`).

## Gestión de usuarios (Historia 3)

Como Administrador, en **Gestión de usuarios** (`/usuarios`) puedes:

- **Crear una cuenta** de personal (Administrador, Contador o Auxiliar): se crea de inmediato, **sin invitación por correo**; el sistema genera una contraseña temporal que se muestra una sola vez en pantalla, la misma mecánica que "Asignar contraseña temporal" (ver más abajo).
- **Cambiar el rol** de una cuenta existente con el selector de la tabla.
- **Activar/desactivar** una cuenta, con confirmación. El botón se deshabilita para tu propia cuenta.
- **Asignar una contraseña temporal** a una cuenta existente (botón "Contraseña temporal" por fila) — ver sección siguiente.
- **Ajustar permisos individuales** de un usuario (botón "Permisos" por fila): activa o desactiva una capacidad concreta solo para ese usuario, por encima de la plantilla por defecto de su rol. El ajuste se descarta automáticamente si el rol de ese usuario cambia.

El sistema nunca permite que quede sin ningún Administrador activo (FR-011): tanto la Server Action como un trigger de base de datos rechazan esa operación, sin importar quién la intente. No existe un rol "Cliente": todas las cuentas del sistema son de personal del despacho.

## Auditoría (`/auditoria`)

Solo visible para Administradores. Muestra los eventos de autenticación (login, logout, fallos de autenticación) que Supabase Auth ya registra de forma nativa — no se duplica esa bitácora en una tabla propia. Los cambios de rol/estado de cuenta se auditan aparte, en `profile_change_history` (consultable directamente en la base de datos).

## Restablecimiento de contraseña (sin SMTP)

El restablecimiento de contraseña **no depende de un proveedor de correo electrónico**: un Administrador genera y asigna una contraseña temporal desde el botón "Contraseña temporal" en `/usuarios`, la contraseña se muestra una única vez en pantalla (no queda registrada en ningún otro lugar) y debe entregarse al usuario por un canal seguro fuera del sistema. Al iniciar sesión con ella, el usuario es redirigido de inmediato a `/cambiar-contrasena` y no puede acceder a ninguna otra página hasta establecer una nueva contraseña (FR-008/FR-013 — ver `specs/003-supabase-auth-roles/research.md` #10).

El alta de cuentas nuevas (arriba, "Crear cuenta") usa exactamente el mismo mecanismo — ya no depende de correo tampoco (research.md #11).

## Variables de entorno

Ver `.env.local.example`. Requiere `SUPABASE_SERVICE_ROLE_KEY` (server-only) porque el alta de cuentas y el ajuste de permisos usan la API de administración de Supabase Auth.
