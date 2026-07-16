-- Feature 005-clientes-cobranza-expedientes, Fase Foundational (T005).
-- Infraestructura de auditoría de negocio y resolución de capacidades,
-- compartida por las tres historias de usuario (Cliente, Cobranza, Expediente).
-- Ver specs/005-clientes-cobranza-expedientes/research.md Decisión 5 y
-- contracts/db-functions-rls.md.

-- =============================================================================
-- 1. business_audit_log (tabla de auditoría genérica, append-only)
-- =============================================================================

create table public.business_audit_log (
  id bigint generated always as identity primary key,
  entidad text not null,
  entidad_id uuid not null,
  accion text not null,
  actor_id uuid references auth.users (id),
  detalle jsonb,
  creado_en timestamptz not null default now()
);

comment on table public.business_audit_log is
  'Auditoría de negocio (FR-018): altas/modificaciones de clientes, cambios en pagos, carga/eliminación de documentos, generación de recibos. Poblada exclusivamente por triggers via log_business_audit().';

alter table public.business_audit_log enable row level security;

create policy "business_audit_log_select_admin_only" on public.business_audit_log
  for select
  using (public.is_administrador());

-- Sin políticas de insert/update/delete para roles de aplicación: la tabla
-- solo se escribe desde log_business_audit() (security definer), nunca
-- directamente por un usuario autenticado.

grant select on public.business_audit_log to authenticated;

-- =============================================================================
-- 2. log_business_audit(): función reutilizable por los triggers de auditoría
--    de las fases siguientes (clientes, pagos, recibos, documentos).
-- =============================================================================

create or replace function public.log_business_audit(
  p_entidad text,
  p_entidad_id uuid,
  p_accion text,
  p_detalle jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.business_audit_log (entidad, entidad_id, accion, actor_id, detalle)
  values (p_entidad, p_entidad_id, p_accion, auth.uid(), p_detalle);
end;
$$;

comment on function public.log_business_audit(text, uuid, text, jsonb) is
  'Inserta una fila de auditoría de negocio (FR-018). Invocada exclusivamente desde triggers AFTER INSERT/UPDATE/DELETE de las tablas de esta feature.';

-- =============================================================================
-- 3. has_capability(): resuelve si el usuario autenticado actual tiene una
--    capacidad de negocio, aplicando la misma regla de plantilla-por-rol +
--    excepciones por usuario que packages/auth/src/session.ts#resolveCapabilities
--    (permission_overrides, FR-014 de 003-supabase-auth-roles). Usada por las
--    políticas RLS de clientes/contactos/cargos_cobranza/pagos/cargo_pagos/
--    recibos/documentos/categorias_documento/metodos_pago (FR-019).
-- =============================================================================

create or replace function public.has_capability(cap text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  user_role public.app_role;
  user_is_active boolean;
  override_granted boolean;
begin
  select role, is_active into user_role, user_is_active
  from public.profiles
  where id = auth.uid();

  if user_role is null or not user_is_active then
    return false;
  end if;

  select granted into override_granted
  from public.permission_overrides
  where profile_id = auth.uid() and capability = cap;

  if override_granted is not null then
    return override_granted;
  end if;

  return case
    when user_role = 'administrador' then true
    when user_role = 'contador' then
      cap in ('manage_clients', 'view_clients', 'manage_billing', 'view_billing', 'view_documents')
    when user_role = 'auxiliar' then
      cap in ('view_clients', 'view_billing', 'view_documents')
    else false
  end;
end;
$$;

comment on function public.has_capability(text) is
  'Espejo en SQL de la plantilla rol->capacidades de packages/auth/src/roles.ts (ROLE_DEFAULT_CAPABILITIES), con las excepciones de permission_overrides aplicadas encima. Cualquier cambio a esa plantilla debe reflejarse aquí.';

grant execute on function public.has_capability(text) to authenticated;
