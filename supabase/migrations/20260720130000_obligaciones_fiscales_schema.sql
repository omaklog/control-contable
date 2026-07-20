-- Feature 013-catalogo-obligaciones-fiscales.
-- Catálogo editable de Obligaciones Fiscales (nombre, descripción, periodicidad
-- tomada del catálogo protegido de Periodicidades de 012, prioridad como orden
-- sugerido, estado). A diferencia de Periodicidades, sí admite alta, edición,
-- activación e inactivación — reutiliza log_business_audit()/has_capability()
-- ya existentes (005, migración 20260716090000_business_audit_log.sql), mismo
-- patrón que servicios (011).
-- Ver specs/013-catalogo-obligaciones-fiscales/data-model.md y
-- contracts/db-functions-rls.md.

-- =============================================================================
-- 1. Enum
-- =============================================================================

create type public.obligacion_fiscal_estado as enum ('activo', 'inactivo');

-- =============================================================================
-- 2. obligaciones_fiscales (catálogo editable, FR-001/FR-002/FR-003)
-- =============================================================================

create table public.obligaciones_fiscales (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  periodicidad_id uuid not null references public.periodicidades (id),
  prioridad integer not null,
  estado public.obligacion_fiscal_estado not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id)
);

comment on table public.obligaciones_fiscales is
  'Catálogo reutilizable de obligaciones fiscales (013-catalogo-obligaciones-fiscales, FR-001/FR-002). No asociado directamente a clientes — base para futuras Plantillas de Obligaciones y Obligaciones Fiscales del Cliente. Baja es soft-delete vía estado, nunca eliminación física.';

create unique index obligaciones_fiscales_nombre_activo_unique
  on public.obligaciones_fiscales (nombre)
  where estado = 'activo';

alter table public.obligaciones_fiscales enable row level security;

create policy "obligaciones_fiscales_select_all_staff" on public.obligaciones_fiscales
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_active
    )
  );

create policy "obligaciones_fiscales_insert_manage_catalogs" on public.obligaciones_fiscales
  for insert
  with check (public.has_capability('manage_catalogs'));

create policy "obligaciones_fiscales_update_manage_catalogs" on public.obligaciones_fiscales
  for update
  using (public.has_capability('manage_catalogs'))
  with check (public.has_capability('manage_catalogs'));

grant select, insert, update on public.obligaciones_fiscales to authenticated;

-- =============================================================================
-- 3. Trigger: validar periodicidad activa (alta y edición, FR-004, research.md #3)
-- =============================================================================

create or replace function public.validar_periodicidad_activa_obligacion()
returns trigger
language plpgsql
as $$
declare
  p public.periodicidades%rowtype;
begin
  select * into p from public.periodicidades where id = NEW.periodicidad_id;

  if p.id is null then
    raise exception 'La periodicidad % no existe en el catálogo', NEW.periodicidad_id;
  end if;

  if p.estado <> 'activo' then
    raise exception 'La periodicidad % no está activa', NEW.periodicidad_id;
  end if;

  return NEW;
end;
$$;

comment on function public.validar_periodicidad_activa_obligacion() is
  'FR-004: valida que periodicidad_id referencie una periodicidad activa. A diferencia de validar_servicio_activo_contratado() (011), se dispara también en UPDATE OF periodicidad_id, ya que aquí sí se permite cambiar la periodicidad de una obligación existente (Historia 2).';

create trigger trg_obligaciones_fiscales_validar_periodicidad
  before insert or update of periodicidad_id on public.obligaciones_fiscales
  for each row
  execute function public.validar_periodicidad_activa_obligacion();

-- =============================================================================
-- 4. Trigger de auditoría (research.md #4, mismo patrón que trg_servicios_audit_fn)
-- =============================================================================

create or replace function public.trg_obligaciones_fiscales_audit_fn()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_business_audit('obligacion_fiscal', NEW.id, 'alta', to_jsonb(NEW));
  elsif TG_OP = 'UPDATE' then
    if NEW.estado <> OLD.estado then
      perform public.log_business_audit(
        'obligacion_fiscal', NEW.id,
        case when NEW.estado = 'activo' then 'activacion' else 'desactivacion' end,
        to_jsonb(NEW)
      );
    else
      perform public.log_business_audit('obligacion_fiscal', NEW.id, 'edicion', to_jsonb(NEW));
    end if;
  end if;
  return NEW;
end;
$$;

create trigger trg_obligaciones_fiscales_audit
  after insert or update on public.obligaciones_fiscales
  for each row
  execute function public.trg_obligaciones_fiscales_audit_fn();
