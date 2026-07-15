-- Feature 003-supabase-auth-roles, sesión de clarificación 2026-07-15: reemplaza el
-- restablecimiento de contraseña por correo (FR-008 original, ver research.md #9,
-- SUPERSEDED) por un flujo administrado por un Administrador con contraseña
-- temporal generada por el sistema (FR-008/FR-013, research.md #10).

-- =============================================================================
-- profiles.must_change_password
-- =============================================================================

alter table public.profiles
  add column must_change_password boolean not null default false;

comment on column public.profiles.must_change_password is
  'true cuando un Administrador asignó una contraseña temporal; obliga a establecer una nueva antes de acceder a cualquier otra función (FR-013). Solo un Administrador la pone en true (vía UPDATE, ya cubierto por profiles_update_admin_only); solo clear_must_change_password() la pone en false.';

-- =============================================================================
-- clear_must_change_password()
-- =============================================================================

create or replace function public.clear_must_change_password()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles
  set must_change_password = false
  where id = auth.uid();
$$;

comment on function public.clear_must_change_password() is
  'Única forma en que un usuario (no Administrador) modifica su propia fila de profiles: limpia must_change_password tras establecer una nueva contraseña (FR-013). Limitado a auth.uid(), sin parámetros, sin afectar otras columnas.';

grant execute on function public.clear_must_change_password() to authenticated;
