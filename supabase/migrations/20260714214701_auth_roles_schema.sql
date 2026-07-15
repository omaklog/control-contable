-- Feature 003-supabase-auth-roles: roles, permisos, invitaciones y auditoría.
-- Ver specs/003-supabase-auth-roles/data-model.md y contracts/db-functions-rls.md.

-- =============================================================================
-- Tipo app_role
-- =============================================================================

create type public.app_role as enum ('administrador', 'contador', 'auxiliar', 'cliente');

-- =============================================================================
-- profiles
-- =============================================================================

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  account_type text not null check (account_type in ('staff', 'client')),
  role public.app_role not null,
  full_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  constraint profiles_account_type_role_check check (
    (account_type = 'staff' and role in ('administrador', 'contador', 'auxiliar'))
    or (account_type = 'client' and role = 'cliente')
  )
);

comment on table public.profiles is
  'Perfil de negocio de cada usuario de auth.users: tipo de cuenta, rol, estado activo.';

-- =============================================================================
-- profile_change_history
-- =============================================================================

create table public.profile_change_history (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  old_role public.app_role,
  new_role public.app_role not null,
  old_is_active boolean,
  new_is_active boolean not null,
  changed_by uuid references auth.users (id),
  changed_at timestamptz not null default now()
);

comment on table public.profile_change_history is
  'Historial append-only de cambios de rol/estado activo de un perfil (FR-009).';

-- =============================================================================
-- account_invitations
-- =============================================================================

create table public.account_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  account_type text not null check (account_type in ('staff', 'client')),
  role public.app_role not null,
  invited_by uuid references auth.users (id),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked')),
  created_at timestamptz not null default now(),
  constraint account_invitations_account_type_role_check check (
    (account_type = 'staff' and role in ('administrador', 'contador', 'auxiliar'))
    or (account_type = 'client' and role = 'cliente')
  )
);

comment on table public.account_invitations is
  'Invitaciones de alta de cuenta pendientes/aceptadas/vencidas/revocadas (FR-010).';

create index account_invitations_email_status_idx on public.account_invitations (email, status);

-- =============================================================================
-- Funciones
-- =============================================================================

create or replace function public.is_administrador()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role = 'administrador'
      and is_active = true
  );
$$;

comment on function public.is_administrador() is
  'Verdadero si auth.uid() es un Administrador activo. Usada por las políticas RLS.';

create or replace function public.current_account_type()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select account_type from public.profiles
  where id = auth.uid() and is_active = true;
$$;

comment on function public.current_account_type() is
  'account_type (staff/client) del perfil activo de auth.uid(), o NULL si no tiene perfil o está inactivo.';

create or replace function public.get_auth_audit_log(limit_rows int default 100)
returns setof jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.is_administrador() then
    raise exception 'insufficient_privilege' using errcode = '42501';
  end if;

  return query
    select to_jsonb(e.*) from auth.audit_log_entries e
    order by e.created_at desc
    limit limit_rows;
end;
$$;

comment on function public.get_auth_audit_log(int) is
  'Lectura restringida (solo Administrador) de auth.audit_log_entries (FR-009). Única vía de lectura de esa bitácora.';

-- =============================================================================
-- Trigger: al menos un Administrador activo (FR-011)
-- =============================================================================

create or replace function public.enforce_last_administrador()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if OLD.role = 'administrador' and OLD.is_active = true
     and (NEW.role <> 'administrador' or NEW.is_active = false) then
    if not exists (
      select 1 from public.profiles
      where role = 'administrador' and is_active = true and id <> OLD.id
    ) then
      raise exception 'No puede quedar el sistema sin ningún Administrador activo'
        using errcode = 'P0001';
    end if;
  end if;
  return NEW;
end;
$$;

create trigger trg_enforce_last_administrador
  before update on public.profiles
  for each row
  execute function public.enforce_last_administrador();

-- =============================================================================
-- Trigger: historial de cambios de rol/estado (FR-009)
-- =============================================================================

create or replace function public.log_profile_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.role is distinct from OLD.role or NEW.is_active is distinct from OLD.is_active then
    insert into public.profile_change_history (
      profile_id, old_role, new_role, old_is_active, new_is_active, changed_by
    ) values (
      OLD.id, OLD.role, NEW.role, OLD.is_active, NEW.is_active, auth.uid()
    );
  end if;
  return NEW;
end;
$$;

create trigger trg_log_profile_change
  after update on public.profiles
  for each row
  execute function public.log_profile_change();

-- =============================================================================
-- Row Level Security
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.profile_change_history enable row level security;
alter table public.account_invitations enable row level security;

-- profiles: el propio usuario ve su fila; un Administrador ve todas.
create policy "profiles_select_self_or_admin" on public.profiles
  for select
  using (id = auth.uid() or public.is_administrador());

-- profiles: solo un Administrador puede insertar/actualizar. Sin DELETE para nadie
-- (desactivar es is_active = false, nunca se borra la fila).
create policy "profiles_insert_admin_only" on public.profiles
  for insert
  with check (public.is_administrador());

create policy "profiles_update_admin_only" on public.profiles
  for update
  using (public.is_administrador())
  with check (public.is_administrador());

-- profile_change_history: solo lectura, solo Administrador. Las filas las crea
-- exclusivamente el trigger trg_log_profile_change (security definer).
create policy "profile_change_history_select_admin_only" on public.profile_change_history
  for select
  using (public.is_administrador());

-- account_invitations: solo Administrador (lectura y escritura).
create policy "account_invitations_all_admin_only" on public.account_invitations
  for all
  using (public.is_administrador())
  with check (public.is_administrador());

-- Permisos de PostgREST (RLS sigue siendo la autoridad real sobre qué filas se ven/afectan).
grant usage on schema public to authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.profile_change_history to authenticated;
grant select, insert, update on public.account_invitations to authenticated;
grant execute on function public.is_administrador() to authenticated;
grant execute on function public.current_account_type() to authenticated;
grant execute on function public.get_auth_audit_log(int) to authenticated;
