-- Feature 003-supabase-auth-roles, segunda sesión de clarificación (2026-07-15) +
-- /speckit-plan regenerado: se elimina el rol Cliente, la columna profiles.account_type
-- y la tabla account_invitations (alta manual, sin invitación por correo); se agrega
-- permission_overrides (permisos por usuario, plantilla por rol + excepciones).
-- Ver specs/003-supabase-auth-roles/research.md #11-#13 y data-model.md.

-- =============================================================================
-- 0. Datos de prueba: eliminar cuentas con role = 'cliente' (entorno local, no
--    producción) antes de recrear el ENUM sin ese valor.
-- =============================================================================

delete from auth.users
where id in (select id from public.profiles where role = 'cliente');

-- =============================================================================
-- 1. Eliminar account_invitations (alta ahora es manual, sin invitación)
-- =============================================================================

drop table if exists public.account_invitations;

-- =============================================================================
-- 2. Eliminar profiles.account_type (ya no hay más de un tipo de cuenta)
-- =============================================================================

alter table public.profiles
  drop constraint if exists profiles_account_type_role_check;

alter table public.profiles
  drop column if exists account_type;

-- =============================================================================
-- 3. Recrear app_role sin 'cliente' (Postgres no permite ALTER TYPE ... DROP VALUE)
-- =============================================================================

alter type public.app_role rename to app_role_old;

create type public.app_role as enum ('administrador', 'contador', 'auxiliar');

alter table public.profiles
  alter column role type public.app_role using role::text::public.app_role;

alter table public.profile_change_history
  alter column old_role type public.app_role using old_role::text::public.app_role;

alter table public.profile_change_history
  alter column new_role type public.app_role using new_role::text::public.app_role;

drop type public.app_role_old;

-- =============================================================================
-- 4. Eliminar current_account_type() (ya no existe account_type; el acceso a
--    apps/admin y apps/portal se resuelve por rol en packages/auth)
-- =============================================================================

drop function if exists public.current_account_type();

-- =============================================================================
-- 5. permission_overrides (permisos por usuario: plantilla por rol + excepciones)
-- =============================================================================

create table public.permission_overrides (
  profile_id uuid not null references public.profiles (id) on delete cascade,
  capability text not null,
  granted boolean not null,
  set_by uuid references auth.users (id),
  set_at timestamptz not null default now(),
  primary key (profile_id, capability)
);

comment on table public.permission_overrides is
  'Excepciones puntuales de capacidades por usuario, por encima de la plantilla por defecto de su rol (FR-014). Solo un Administrador puede escribir.';

alter table public.permission_overrides enable row level security;

create policy "permission_overrides_select_self_or_admin" on public.permission_overrides
  for select
  using (profile_id = auth.uid() or public.is_administrador());

create policy "permission_overrides_write_admin_only" on public.permission_overrides
  for insert
  with check (public.is_administrador());

create policy "permission_overrides_update_admin_only" on public.permission_overrides
  for update
  using (public.is_administrador())
  with check (public.is_administrador());

create policy "permission_overrides_delete_admin_only" on public.permission_overrides
  for delete
  using (public.is_administrador());

grant select, insert, update, delete on public.permission_overrides to authenticated;

-- =============================================================================
-- 6. Trigger: limpiar permission_overrides cuando cambia profiles.role
-- =============================================================================

create or replace function public.clear_permission_overrides_on_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.role is distinct from OLD.role then
    delete from public.permission_overrides where profile_id = NEW.id;
  end if;
  return NEW;
end;
$$;

create trigger trg_clear_permission_overrides_on_role_change
  after update on public.profiles
  for each row
  execute function public.clear_permission_overrides_on_role_change();
