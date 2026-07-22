-- Feature 016-expediente-fiscal.
-- Extiende el modelo documental de 005-clientes-cobranza-expedientes
-- (documentos, categorias_documento) y la asociación con Cumplimiento Fiscal
-- de 015-control-cumplimiento-fiscal (cumplimiento_fiscal_documentos), y
-- agrega Documentos Esperados por obligación fiscal con snapshot histórico
-- por cumplimiento. Ver specs/016-expediente-fiscal/{research.md,
-- data-model.md,contracts/db-functions-rls.md}.

-- =============================================================================
-- A. documentos: clasificación opcional, obligación informativa, eliminación
--    lógica (research.md Decisiones 2, 5, 7)
-- =============================================================================

alter table public.documentos
  alter column categoria_id drop not null,
  add column obligacion_fiscal_id uuid references public.obligaciones_fiscales (id),
  add column eliminado_en timestamptz,
  add column eliminado_por uuid references auth.users (id);

alter type public.documento_estado add value if not exists 'eliminado';

comment on column public.documentos.categoria_id is
  'Tipo de Documento (opcional desde 016) — null = "Sin clasificar" (Clarifications Q2).';
comment on column public.documentos.obligacion_fiscal_id is
  'Asociación directa e informativa con una Obligación Fiscal (016, Clarifications Q1): no afecta la organización visual del expediente (Generales/por Periodo), solo alimenta búsqueda y contexto.';

-- =============================================================================
-- B. Trigger: eliminación lógica — antigüedad de 3 meses + rol (FR-021 a
--    FR-023, research.md Decisión 7)
-- =============================================================================

create or replace function public.validar_eliminacion_logica_documento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
begin
  if OLD.estado = 'eliminado' or NEW.estado <> 'eliminado' then
    return NEW;
  end if;

  select role into v_role from public.profiles where id = auth.uid();

  if v_role = 'administrador' then
    NEW.eliminado_en := now();
    NEW.eliminado_por := auth.uid();
    return NEW;
  end if;

  if now() - OLD.fecha_carga > interval '3 months' then
    raise exception 'Solo un Administrador puede eliminar un documento con más de tres meses de antigüedad';
  end if;

  NEW.eliminado_en := now();
  NEW.eliminado_por := auth.uid();
  return NEW;
end;
$$;

create trigger trg_documentos_validar_eliminacion_logica
  before update on public.documentos
  for each row
  execute function public.validar_eliminacion_logica_documento();

-- =============================================================================
-- C. Auditoría de documentos: distinguir eliminación lógica y cambio de Tipo
--    de Documento (FR-024)
-- =============================================================================

create or replace function public.trg_documentos_audit_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_business_audit('documento', NEW.id, 'carga', to_jsonb(NEW));
    return NEW;
  elsif TG_OP = 'UPDATE' then
    if OLD.estado <> 'eliminado' and NEW.estado = 'eliminado' then
      perform public.log_business_audit(
        'documento', NEW.id, 'eliminacion_logica',
        jsonb_build_object('eliminado_por', NEW.eliminado_por, 'eliminado_en', NEW.eliminado_en)
      );
    elsif OLD.categoria_id is distinct from NEW.categoria_id then
      perform public.log_business_audit(
        'documento', NEW.id, 'cambio_tipo_documento',
        jsonb_build_object('anterior', OLD.categoria_id, 'nuevo', NEW.categoria_id)
      );
    else
      perform public.log_business_audit(
        'documento', NEW.id, 'modificacion',
        jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
      );
    end if;
    return NEW;
  elsif TG_OP = 'DELETE' then
    perform public.log_business_audit('documento', OLD.id, 'eliminacion', to_jsonb(OLD));
    return OLD;
  end if;
  return null;
end;
$$;

-- =============================================================================
-- D. cumplimiento_fiscal_documentos: máximo un cumplimiento por documento
--    (FR-007, research.md Decisión 4)
-- =============================================================================

-- Datos de prueba de entornos locales previos (015) pueden tener un mismo
-- documento asociado a más de un cumplimiento; el nuevo índice único de 016
-- exige "como máximo un cumplimiento por documento" (FR-007), así que se
-- conserva únicamente la asociación más antigua antes de crear el índice.
delete from public.cumplimiento_fiscal_documentos
where id in (
  select id from (
    select id, row_number() over (
      partition by documento_id order by created_at asc, id asc
    ) as rn
    from public.cumplimiento_fiscal_documentos
  ) ranked
  where rn > 1
);

create unique index cumplimiento_fiscal_documentos_documento_unique
  on public.cumplimiento_fiscal_documentos (documento_id);

-- =============================================================================
-- E. documentos_esperados_obligacion: configuración vigente (FR-010)
-- =============================================================================

create table public.documentos_esperados_obligacion (
  id uuid primary key default gen_random_uuid(),
  obligacion_fiscal_id uuid not null references public.obligaciones_fiscales (id),
  categoria_documento_id uuid not null references public.categorias_documento (id),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  unique (obligacion_fiscal_id, categoria_documento_id)
);

comment on table public.documentos_esperados_obligacion is
  'Configuración vigente de Documentos Esperados de una obligación fiscal (016, FR-010). Desactivar en vez de borrar conserva el historial (FR-010); el snapshot por cumplimiento vive en cumplimiento_documentos_esperados.';

alter table public.documentos_esperados_obligacion enable row level security;

create policy "documentos_esperados_obligacion_select_all_staff" on public.documentos_esperados_obligacion
  for select
  using (auth.role() = 'authenticated');

create policy "documentos_esperados_obligacion_insert_admin_only" on public.documentos_esperados_obligacion
  for insert
  with check (public.has_capability('manage_catalogs'));

create policy "documentos_esperados_obligacion_update_admin_only" on public.documentos_esperados_obligacion
  for update
  using (public.has_capability('manage_catalogs'))
  with check (public.has_capability('manage_catalogs'));

grant select, insert, update on public.documentos_esperados_obligacion to authenticated;

create or replace function public.trg_documentos_esperados_obligacion_audit_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_business_audit('documento_esperado_obligacion', NEW.id, 'alta', to_jsonb(NEW));
    return NEW;
  elsif TG_OP = 'UPDATE' then
    perform public.log_business_audit(
      'documento_esperado_obligacion', NEW.id, 'modificacion',
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
    );
    return NEW;
  end if;
  return null;
end;
$$;

create trigger trg_documentos_esperados_obligacion_audit
  after insert or update on public.documentos_esperados_obligacion
  for each row
  execute function public.trg_documentos_esperados_obligacion_audit_fn();

-- =============================================================================
-- F. cumplimiento_documentos_esperados: snapshot inmutable por cumplimiento
--    (FR-011, research.md Decisión 6)
-- =============================================================================

create table public.cumplimiento_documentos_esperados (
  id uuid primary key default gen_random_uuid(),
  cumplimiento_id uuid not null references public.cumplimientos_fiscales (id),
  categoria_documento_id uuid not null references public.categorias_documento (id),
  created_at timestamptz not null default now(),
  unique (cumplimiento_id, categoria_documento_id)
);

comment on table public.cumplimiento_documentos_esperados is
  'Copia inmutable de los Documentos Esperados vigentes al generarse un Cumplimiento Fiscal (016, FR-011). Solo el trigger trg_cumplimientos_fiscales_snapshot_esperados_fn escribe aquí; un cambio posterior en documentos_esperados_obligacion nunca modifica estas filas.';

alter table public.cumplimiento_documentos_esperados enable row level security;

create policy "cumplimiento_documentos_esperados_select" on public.cumplimiento_documentos_esperados
  for select
  using (public.has_capability('view_clients') or public.has_capability('manage_clients'));

grant select on public.cumplimiento_documentos_esperados to authenticated;

create or replace function public.trg_cumplimientos_fiscales_snapshot_esperados_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_obligacion_fiscal_id uuid;
begin
  select ofc.obligacion_fiscal_id into v_obligacion_fiscal_id
  from public.obligaciones_fiscales_cliente ofc
  where ofc.id = NEW.obligacion_fiscal_cliente_id;

  if v_obligacion_fiscal_id is null then
    v_obligacion_fiscal_id := NEW.obligacion_fiscal_id;
  end if;

  if v_obligacion_fiscal_id is null then
    return NEW;
  end if;

  insert into public.cumplimiento_documentos_esperados (cumplimiento_id, categoria_documento_id)
  select NEW.id, deo.categoria_documento_id
  from public.documentos_esperados_obligacion deo
  where deo.obligacion_fiscal_id = v_obligacion_fiscal_id
    and deo.activo = true
  on conflict (cumplimiento_id, categoria_documento_id) do nothing;

  return NEW;
end;
$$;

create trigger trg_cumplimientos_fiscales_snapshot_esperados
  after insert on public.cumplimientos_fiscales
  for each row
  execute function public.trg_cumplimientos_fiscales_snapshot_esperados_fn();

-- =============================================================================
-- G. Storage: bucket privado para el Expediente Fiscal (FR-020, research.md
--    Decisión 9)
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('expedientes', 'expedientes', false, 20971520, array['application/pdf'])
on conflict (id) do nothing;

create policy "expedientes_storage_select_view_or_manage"
  on storage.objects for select
  using (
    bucket_id = 'expedientes'
    and (public.has_capability('view_documents') or public.has_capability('manage_documents'))
  );

create policy "expedientes_storage_insert_manage"
  on storage.objects for insert
  with check (
    bucket_id = 'expedientes'
    and public.has_capability('manage_documents')
  );

-- =============================================================================
-- H. has_capability(): reflejar manage_documents en Contador y Auxiliar
--    (research.md Decisión 8) — espejo en SQL de
--    packages/auth/src/roles.ts#ROLE_DEFAULT_CAPABILITIES, ver el comment
--    original de la función (20260716090000_business_audit_log.sql).
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
      cap in (
        'manage_clients', 'view_clients', 'manage_billing', 'view_billing',
        'view_documents', 'manage_documents'
      )
    when user_role = 'auxiliar' then
      cap in ('view_clients', 'view_billing', 'view_documents', 'manage_documents')
    else false
  end;
end;
$$;
