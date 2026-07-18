-- Feature 011-gestion-servicios.
-- Catálogo de Servicios y Servicios Contratados por cliente. Reutiliza
-- log_business_audit()/has_capability() ya existentes (005, migración
-- 20260716090000_business_audit_log.sql) — sin tablas de auditoría propias.
-- Ver specs/011-gestion-servicios/data-model.md y
-- contracts/db-functions-rls.md.

-- =============================================================================
-- 1. Enums
-- =============================================================================

create type public.servicio_estado as enum ('activo', 'inactivo');
create type public.servicio_contratado_estado as enum ('activo', 'suspendido', 'finalizado');

-- =============================================================================
-- 2. servicios (catálogo, FR-001/FR-002/FR-003)
-- =============================================================================

create table public.servicios (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  categoria text not null,
  estado public.servicio_estado not null default 'activo',
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id)
);

comment on table public.servicios is
  'Catálogo de servicios que el despacho ofrece (011-gestion-servicios, FR-001). No almacena precio — el precio pertenece a servicios_contratados (FR-003). Baja es soft-delete vía estado, nunca eliminación física.';

alter table public.servicios enable row level security;

create policy "servicios_select_all_staff" on public.servicios
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_active
    )
  );

create policy "servicios_insert_manage_catalogs" on public.servicios
  for insert
  with check (public.has_capability('manage_catalogs'));

create policy "servicios_update_manage_catalogs" on public.servicios
  for update
  using (public.has_capability('manage_catalogs'))
  with check (public.has_capability('manage_catalogs'));

-- Sin política de delete: nunca se elimina físicamente (Constitución).

grant select, insert, update on public.servicios to authenticated;

-- =============================================================================
-- 3. servicios_contratados (FR-004/FR-005/FR-008)
-- =============================================================================

create table public.servicios_contratados (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  servicio_id uuid not null references public.servicios (id),
  precio_acordado numeric(12, 2) not null,
  fecha_inicio date not null default current_date,
  fecha_fin date,
  estado public.servicio_contratado_estado not null default 'activo',
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  constraint servicios_contratados_cliente_servicio_unique unique (cliente_id, servicio_id)
);

comment on table public.servicios_contratados is
  'Relación entre un Cliente y un Servicio del catálogo (011-gestion-servicios). Como máximo un registro por combinación cliente+servicio (FR-005) — suspender/reactivar/finalizar son siempre UPDATE sobre el mismo registro (Clarifications Q1), nunca un INSERT nuevo. estado es principalmente informativo/de control para el futuro módulo de Cobranza (FR-008).';

alter table public.servicios_contratados enable row level security;

create policy "servicios_contratados_select_view_clients" on public.servicios_contratados
  for select
  using (public.has_capability('view_clients'));

create policy "servicios_contratados_insert_manage_clients" on public.servicios_contratados
  for insert
  with check (public.has_capability('manage_clients'));

create policy "servicios_contratados_update_manage_clients" on public.servicios_contratados
  for update
  using (public.has_capability('manage_clients'))
  with check (public.has_capability('manage_clients'));

-- Sin política de delete: nunca se elimina físicamente (Constitución).

grant select, insert, update on public.servicios_contratados to authenticated;

-- =============================================================================
-- 4. Trigger: validar que el servicio del catálogo esté activo al asignarlo
--    (FR-004, mismo patrón que validar_regimen_fiscal_cliente() de 005)
-- =============================================================================

create or replace function public.validar_servicio_activo_contratado()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  s public.servicios%rowtype;
begin
  select * into s from public.servicios where id = NEW.servicio_id;

  if s.id is null then
    raise exception 'El servicio % no existe en el catálogo', NEW.servicio_id;
  end if;

  if s.estado <> 'activo' then
    raise exception 'El servicio % no está activo en el catálogo', NEW.servicio_id;
  end if;

  return NEW;
end;
$$;

comment on function public.validar_servicio_activo_contratado() is
  'FR-004: valida que el servicio del catálogo esté activo al momento de asignarlo a un cliente. Solo se dispara al insertar — un servicio desactivado después no afecta los servicios contratados que ya lo referencian (FR-012).';

create trigger trg_servicios_contratados_validar_activo
  before insert on public.servicios_contratados
  for each row
  execute function public.validar_servicio_activo_contratado();

-- =============================================================================
-- 5. Trigger: auditoría de negocio en servicios (catálogo)
-- =============================================================================

create or replace function public.trg_servicios_audit_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_business_audit('servicio', NEW.id, 'alta', to_jsonb(NEW));
    return NEW;
  elsif TG_OP = 'UPDATE' then
    if OLD.estado <> NEW.estado then
      perform public.log_business_audit(
        'servicio', NEW.id,
        case when NEW.estado = 'activo' then 'activacion' else 'desactivacion' end,
        jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
      );
    else
      perform public.log_business_audit(
        'servicio', NEW.id, 'edicion',
        jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
      );
    end if;
    return NEW;
  end if;
  return null;
end;
$$;

create trigger trg_servicios_audit
  after insert or update on public.servicios
  for each row
  execute function public.trg_servicios_audit_fn();

-- =============================================================================
-- 6. Trigger: auditoría de negocio en servicios_contratados, diferenciada por
--    tipo de cambio (research.md #6, contracts/db-functions-rls.md)
-- =============================================================================

create or replace function public.trg_servicios_contratados_audit_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  logged boolean := false;
begin
  if TG_OP = 'INSERT' then
    perform public.log_business_audit('servicio_contratado', NEW.id, 'alta', to_jsonb(NEW));
    return NEW;
  elsif TG_OP = 'UPDATE' then
    if OLD.precio_acordado <> NEW.precio_acordado then
      perform public.log_business_audit(
        'servicio_contratado', NEW.id, 'cambio_precio',
        jsonb_build_object('precio_anterior', OLD.precio_acordado, 'precio_nuevo', NEW.precio_acordado)
      );
      logged := true;
    end if;

    if OLD.estado <> NEW.estado then
      perform public.log_business_audit(
        'servicio_contratado', NEW.id,
        case NEW.estado
          when 'suspendido' then 'suspension'
          when 'finalizado' then 'finalizacion'
          when 'activo' then 'reactivacion'
        end,
        jsonb_build_object('estado_anterior', OLD.estado, 'estado_nuevo', NEW.estado, 'fecha_fin', NEW.fecha_fin)
      );
      logged := true;
    end if;

    if not logged then
      perform public.log_business_audit(
        'servicio_contratado', NEW.id, 'edicion',
        jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
      );
    end if;

    return NEW;
  end if;
  return null;
end;
$$;

comment on function public.trg_servicios_contratados_audit_fn() is
  'Registra un evento de auditoría distinto por cada tipo de cambio (research.md #6): cambio_precio y suspension/reactivacion/finalizacion se registran como eventos separados si ambos ocurren en el mismo UPDATE, para que el historial (Historia 5) no oculte ninguno.';

create trigger trg_servicios_contratados_audit
  after insert or update on public.servicios_contratados
  for each row
  execute function public.trg_servicios_contratados_audit_fn();
