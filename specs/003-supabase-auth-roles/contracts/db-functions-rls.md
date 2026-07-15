# Contrato: funciones SQL, triggers y políticas RLS

**Feature**: [../spec.md](../spec.md) | **Data model**: [../data-model.md](../data-model.md)

Definidos en `supabase/migrations/20260714214701_auth_roles_schema.sql`, `20260715120000_must_change_password.sql`, y la nueva `<timestamp>_remove_client_role.sql` (ver `plan.md`).

> **Revisión 2026-07-15**: `current_account_type()` se retira (ya no existe `account_type`); las políticas de `account_invitations` se retiran (tabla eliminada); se agregan las políticas y el trigger de `permission_overrides`. Ver research.md #11-#13.

## Funciones

### `public.is_administrador() returns boolean`

`SECURITY DEFINER`. Verdadero si `auth.uid()` corresponde a un `profiles.role = 'administrador' AND is_active = true`. Usada por las políticas RLS de `profiles`, `profile_change_history`, `permission_overrides` y por la función de auditoría.

### ~~`public.current_account_type()`~~ — eliminada

Ya no existe `profiles.account_type`: el acceso a `apps/admin`/`apps/portal` se resuelve directamente por `role` en `packages/auth` (`requireApp()`), sin necesitar una función de base de datos — ver research.md #12.

### `public.get_auth_audit_log(limit_rows int default 100) returns setof jsonb`

`SECURITY DEFINER`. Lanza una excepción (`insufficient_privilege`) si `is_administrador()` es falso. Devuelve las entradas más recientes de `auth.audit_log_entries` (login, logout, fallos de autenticación) — única vía de lectura de esa bitácora desde la aplicación (FR-009, research.md #7).

### `public.clear_must_change_password() returns void`

`SECURITY DEFINER`. Pone `profiles.must_change_password = false` únicamente para la fila con `id = auth.uid()`. Es la única forma en que un usuario (no Administrador) puede modificar su propia fila de `profiles` — se invoca desde la página `/cambiar-contrasena` inmediatamente después de que `supabase.auth.updateUser({ password })` responde sin error. No acepta parámetros ni afecta otras columnas (research.md #10).

## Trigger: al menos un Administrador activo (FR-011)

`BEFORE UPDATE ON public.profiles`: si la fila afectada tiene actualmente `role = 'administrador' AND is_active = true`, y la actualización cambiaría `role` a otro valor o `is_active` a `false`, y no existe **ninguna otra** fila con `role = 'administrador' AND is_active = true`, la actualización se rechaza (`RAISE EXCEPTION`).

## Trigger: historial de cambios (FR-009 / `profile_change_history`)

`AFTER UPDATE ON public.profiles`: si `role` o `is_active` cambiaron, inserta una fila en `profile_change_history` con los valores anteriores y nuevos y `changed_by = auth.uid()`.

## Trigger: limpieza de permisos por usuario al cambiar de rol (FR-014, nueva)

`AFTER UPDATE ON public.profiles`: si `role` cambió, elimina todas las filas de `permission_overrides` donde `profile_id = NEW.id` — evita que un ajuste de permisos pensado para el rol anterior se herede silenciosamente al nuevo rol (ver Edge Case de `spec.md`, research.md #13).

## Políticas RLS

| Tabla                          | `SELECT`                                                                                                                         | `INSERT` / `UPDATE` / `DELETE`                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`                     | El propio usuario ve su fila; `is_administrador()` ve todas.                                                                     | Solo `is_administrador()` puede insertar/actualizar vía `UPDATE`/`INSERT` directo. Sin `DELETE` para nadie (soft-delete vía `is_active`). La excepción es `must_change_password`, que el propio usuario limpia exclusivamente a través de `clear_must_change_password()` (no mediante un `UPDATE` directo de su sesión — la política de arriba sigue sin permitirlo). |
| `profile_change_history`       | Solo `is_administrador()`.                                                                                                       | Solo el trigger (vía `SECURITY DEFINER`); ningún rol inserta directamente.                                                                                                                                                                                                                                                                                            |
| `permission_overrides` (nueva) | El propio usuario ve sus propias filas (para que `getCurrentProfile()` resuelva sus capacidades); `is_administrador()` ve todas. | Solo `is_administrador()`.                                                                                                                                                                                                                                                                                                                                            |

## Garantías del contrato

- Ninguna política RLS confía en un claim del JWT para el rol: todas resuelven contra `profiles` en el momento de la consulta (research.md #2), garantizando SC-004.
- Ningún usuario de personal puede hacer `SELECT` sobre el perfil de otro usuario salvo que sea Administrador — no existe ya el caso "aislamiento entre clientes" (no hay cuentas de cliente); el aislamiento de datos de negocio (clientes/expedientes/cobranza como entidades) queda para los módulos futuros que los implementen.
- `get_auth_audit_log()` es la única forma de leer `auth.audit_log_entries` desde la aplicación — no se otorga `USAGE`/`SELECT` directo sobre el esquema `auth` a ningún rol de PostgREST (`anon`/`authenticated`).
- `clear_must_change_password()` es de propósito único: solo puede poner `must_change_password = false` en la propia fila del invocador (`auth.uid()`), nunca en la de otro usuario ni sobre cualquier otra columna — evita que ampliar el acceso de escritura de `profiles` para este caso abra una vía para que un usuario cambie su propio rol o estado activo. Se otorga `EXECUTE` a `authenticated` (no a `anon`).
- `permission_overrides` permite `SELECT` de la propia fila para que el propio usuario pueda resolver sus capacidades efectivas en `getCurrentProfile()`, pero nunca puede escribir sus propios ajustes — solo un Administrador puede crear/modificar/eliminar excepciones, para cualquier usuario (incluido él mismo).
