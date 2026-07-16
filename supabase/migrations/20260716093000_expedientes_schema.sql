-- Feature 005-clientes-cobranza-expedientes, Historia 3 (Expediente, P3).
-- Categoría de documento (catálogo) y Documento de expediente, con
-- versionado sin eliminación física.
-- Ver specs/005-clientes-cobranza-expedientes/data-model.md,
-- research.md Decisión 4, contracts/db-functions-rls.md.

-- =============================================================================
-- 1. Enum y categorias_documento (FR-010, constitución "Catálogos")
-- =============================================================================

create type public.documento_estado as enum ('activo', 'reemplazado');

create table public.categorias_documento (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  descripcion text,
  activa boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id)
);

comment on table public.categorias_documento is
  'Catálogo de categorías de documento del expediente (FR-010), configurable exclusivamente por Administrador.';

alter table public.categorias_documento enable row level security;

create policy "categorias_documento_select_all_staff" on public.categorias_documento
  for select
  using (auth.role() = 'authenticated');

create policy "categorias_documento_insert_admin_only" on public.categorias_documento
  for insert
  with check (public.has_capability('manage_catalogs'));

create policy "categorias_documento_update_admin_only" on public.categorias_documento
  for update
  using (public.has_capability('manage_catalogs'))
  with check (public.has_capability('manage_catalogs'));

grant select, insert, update on public.categorias_documento to authenticated;

-- =============================================================================
-- 2. documentos (FR-011 a FR-016)
-- =============================================================================

create table public.documentos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  categoria_id uuid not null references public.categorias_documento (id),
  nombre_original text not null,
  tamano_bytes bigint not null check (tamano_bytes > 0 and tamano_bytes <= 20971520), -- 20 MB, ver packages/utils/src/expedientes.ts#TAMANO_MAXIMO_DOCUMENTO_BYTES
  formato text not null check (formato = 'application/pdf'),
  version integer not null default 1,
  documento_anterior_id uuid references public.documentos (id),
  estado public.documento_estado not null default 'activo',
  ruta_almacenamiento text not null,
  cargado_por uuid not null references auth.users (id),
  fecha_carga timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id)
);

comment on table public.documentos is
  'Documento del expediente digital de un Cliente (solo PDF). El historial de versiones se modela como filas encadenadas por documento_anterior_id (Decisión 4); nunca se elimina físicamente sin autorización explícita (FR-015).';

-- =============================================================================
-- 3. Trigger: bloquear eliminación física salvo autorización explícita (FR-015)
-- =============================================================================

create or replace function public.bloquear_delete_documento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- El mecanismo de "autorización explícita" para una eliminación física
  -- queda fuera de alcance de esta feature (ver spec.md, Assumptions) — por
  -- ahora se bloquea incondicionalmente, incluso para procesos administrativos
  -- vía service_role. Reemplazar/versionar un documento nunca requiere DELETE
  -- (ver Decisión 4): se modela como INSERT de la nueva versión + UPDATE de
  -- estado a 'reemplazado' en la fila anterior.
  raise exception 'No se puede eliminar físicamente un documento del expediente: esta operación no está permitida (FR-015)';
  return OLD;
end;
$$;

create trigger trg_documentos_bloquear_delete
  before delete on public.documentos
  for each row
  execute function public.bloquear_delete_documento();

-- =============================================================================
-- 4. Trigger: auditoría de negocio en documentos (FR-018)
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
    perform public.log_business_audit(
      'documento', NEW.id, 'modificacion',
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
    );
    return NEW;
  elsif TG_OP = 'DELETE' then
    perform public.log_business_audit('documento', OLD.id, 'eliminacion', to_jsonb(OLD));
    return OLD;
  end if;
  return null;
end;
$$;

create trigger trg_documentos_audit
  after insert or update or delete on public.documentos
  for each row
  execute function public.trg_documentos_audit_fn();

-- =============================================================================
-- 5. RLS: documentos (FR-019)
-- =============================================================================

alter table public.documentos enable row level security;

create policy "documentos_select_view_or_manage" on public.documentos
  for select
  using (public.has_capability('view_documents') or public.has_capability('manage_documents'));

create policy "documentos_insert_manage" on public.documentos
  for insert
  with check (public.has_capability('manage_documents'));

create policy "documentos_update_manage" on public.documentos
  for update
  using (public.has_capability('manage_documents'))
  with check (public.has_capability('manage_documents'));

-- Sin política de DELETE para ningún rol de aplicación: el trigger
-- trg_documentos_bloquear_delete es la barrera real (ver arriba), no RLS.

grant select, insert, update on public.documentos to authenticated;
