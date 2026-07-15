# Data Model: Autenticación y Roles con Supabase

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

Todas las tablas nuevas viven en el esquema `public` y se crean mediante `supabase/migrations/<timestamp>_auth_roles.sql`. Las credenciales en sí (correo, contraseña hasheada, tokens) siguen viviendo exclusivamente en `auth.users` (GoTrue) — nunca se duplican aquí.

> **Revisión 2026-07-15 (segunda sesión de clarificación)**: se elimina el valor `cliente` del ENUM `app_role`, la columna `profiles.account_type` y la tabla `account_invitations`; se agrega `permission_overrides`. Ver `research.md` #11-#13 y `spec.md` Clarifications.

## Tipo `app_role` (ENUM)

```
administrador | contador | auxiliar
```

Ver `research.md` #4 para la justificación de un ENUM fijo (más excepciones por usuario, no un RBAC dinámico) en vez de una tabla dinámica de roles. El valor `cliente`, presente en la migración original, se retira — Postgres no permite `ALTER TYPE ... DROP VALUE`, por lo que la migración que lo retira debe recrear el tipo (ver `plan.md`, Project Structure, y research.md #12).

## `profiles`

Corresponde a la entidad **Usuario** de `spec.md`, extendiendo `auth.users` con los datos propios del negocio.

| Columna                | Tipo          | Notas                                                                                                                                                                                                                         |
| ---------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                   | uuid (PK, FK) | = `auth.users.id`. Un perfil por usuario de Auth.                                                                                                                                                                             |
| `role`                 | `app_role`    | Rol efectivo del usuario (FR-003).                                                                                                                                                                                            |
| `full_name`            | text          | Nombre para mostrar en la interfaz.                                                                                                                                                                                           |
| `is_active`            | boolean       | `false` = cuenta desactivada (soft-delete, nunca se borra la fila — constitución).                                                                                                                                            |
| `created_at`           | timestamptz   | Trazabilidad (constitución, "Base de Datos").                                                                                                                                                                                 |
| `updated_at`           | timestamptz   | Ídem.                                                                                                                                                                                                                         |
| `created_by`           | uuid (FK)     | Administrador que dio de alta esta cuenta.                                                                                                                                                                                    |
| `updated_by`           | uuid (FK)     | Usuario que realizó la última modificación (cambio de rol/estado).                                                                                                                                                            |
| `must_change_password` | boolean       | `true` tras recibir una contraseña temporal (por alta manual o por restablecimiento, FR-008/FR-010/FR-013); bloquea el acceso a cualquier función distinta de `/cambiar-contrasena` hasta que se limpia. Ver research.md #10. |

**Ya no existe** la columna `account_type`: con un único tipo de cuenta ("personal"), no discrimina nada — el acceso por app se resuelve directamente por `role` (ver research.md #12).

**Reglas de validación / invariantes**:

- No puede existir una actualización que deje el sistema con cero filas `role = 'administrador' AND is_active = true` (FR-011; trigger, ver research.md #6).
- `must_change_password` solo lo pone en `true` un Administrador (junto con la asignación/generación de una contraseña temporal, vía Server Action con `service_role`); solo se limpia (`false`) mediante la función `clear_must_change_password()`, invocada por el propio usuario tras establecer su nueva contraseña — nunca mediante un `UPDATE` directo de su propia sesión (ver `contracts/db-functions-rls.md`).

## `profile_change_history`

Corresponde a **Asignación Usuario-Rol** (historial) y a la parte de **Registro de auditoría** referida a cambios de rol/estado (FR-009).

| Columna         | Tipo        | Notas                                |
| --------------- | ----------- | ------------------------------------ |
| `id`            | bigint (PK) | Identidad autogenerada.              |
| `profile_id`    | uuid (FK)   | Perfil afectado.                     |
| `old_role`      | `app_role`  | Nulo si es el alta inicial.          |
| `new_role`      | `app_role`  |                                      |
| `old_is_active` | boolean     |                                      |
| `new_is_active` | boolean     |                                      |
| `changed_by`    | uuid (FK)   | Administrador que realizó el cambio. |
| `changed_at`    | timestamptz | Momento del cambio.                  |

Append-only: nunca se actualiza ni se borra una fila existente (poblada por un trigger sobre `profiles`, ver `contracts/`).

## `permission_overrides` (nueva)

Corresponde a la entidad **Ajuste de permisos por usuario** de `spec.md` (FR-014). Ver research.md #13.

| Columna      | Tipo        | Notas                                                                                                                                                                                     |
| ------------ | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profile_id` | uuid (FK)   | Usuario al que aplica el ajuste.                                                                                                                                                          |
| `capability` | text        | Uno de los valores del tipo `Capability` de `packages/auth` (no se modela como ENUM de BD para no acoplar el esquema a cada capacidad nueva que agreguen los módulos de negocio futuros). |
| `granted`    | boolean     | `true` = otorga esta capacidad aunque la plantilla del rol no la incluya; `false` = retira una capacidad que la plantilla del rol sí incluiría por defecto.                               |
| `set_by`     | uuid (FK)   | Administrador que hizo el ajuste.                                                                                                                                                         |
| `set_at`     | timestamptz | Momento del ajuste.                                                                                                                                                                       |

**Clave primaria compuesta**: `(profile_id, capability)` — a lo sumo un ajuste vigente por usuario y capacidad.

**Reglas de validación / invariantes**:

- Solo un Administrador puede insertar/actualizar/eliminar filas (RLS, ver `contracts/db-functions-rls.md`).
- Un trigger `AFTER UPDATE` sobre `profiles` elimina todas las filas de `permission_overrides` de un `profile_id` cuando su `role` cambia (evita heredar ajustes pensados para el rol anterior).
- No relacionado con `account_type` ni con el acceso a `apps/admin`/`apps/portal` (esa regla es fija por rol, no ajustable por usuario — ver research.md #12).

## Eventos de autenticación (login/logout/fallos)

No se modela una tabla nueva: se leen de la tabla nativa `auth.audit_log_entries` (GoTrue), expuesta a través de una función `SECURITY DEFINER` restringida a Administradores (ver research.md #7 y `contracts/`).

## Relaciones

- `auth.users (1) — (1) profiles`: cada usuario de Auth tiene exactamente un perfil de negocio.
- `profiles (1) — (N) profile_change_history`: un perfil acumula su historial de cambios de rol/estado a lo largo del tiempo.
- `profiles (1) — (N) permission_overrides`: un perfil acumula cero o más ajustes de capacidades individuales vigentes.

## Transiciones de estado relevantes

- **Perfil**: `is_active: true ⇄ false` (activar/desactivar, FR-006/FR-007) y `role: administrador ⇄ contador ⇄ auxiliar` (sin restricción de `account_type`, ya que no existe).
- **`must_change_password`**: `false → true` (un Administrador crea la cuenta o asigna una contraseña temporal) → `true → false` (el propio usuario establece una nueva contraseña mientras la sesión está en el estado forzado). No hay otras transiciones válidas.
- **`permission_overrides`**: una fila se crea/actualiza cuando un Administrador ajusta una capacidad para un usuario; se elimina automáticamente (todas las filas de ese `profile_id`) cuando el `role` de ese usuario cambia.
