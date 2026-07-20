-- Feature 014-obligaciones-fiscales-cliente.
-- Plantillas de Obligaciones (catálogo editable + su detalle) y Obligaciones
-- Fiscales del Cliente (configuración real por cliente, con copia desde una
-- plantilla como mecanismo opcional de carga inicial). Reutiliza
-- log_business_audit()/has_capability() ya existentes (005, migración
-- 20260716090000_business_audit_log.sql).
-- Ver specs/014-obligaciones-fiscales-cliente/data-model.md y
-- contracts/db-functions-rls.md.

-- =============================================================================
-- 1. obligaciones_fiscales_cliente (configuración por cliente, FR-001 a FR-009)
-- =============================================================================

create type public.obligacion_fiscal_cliente_estado as enum ('activa', 'no_aplica');

create table public.obligaciones_fiscales_cliente (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  obligacion_fiscal_id uuid not null references public.obligaciones_fiscales (id),
  periodicidad_id uuid not null references public.periodicidades (id),
  orden integer not null,
  estado public.obligacion_fiscal_cliente_estado not null default 'activa',
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),

  constraint obligaciones_fiscales_cliente_cliente_obligacion_unique unique (cliente_id, obligacion_fiscal_id),
  constraint obligaciones_fiscales_cliente_cliente_orden_unique unique (cliente_id, orden)
);

comment on table public.obligaciones_fiscales_cliente is
  'Configuración de obligaciones fiscales de un cliente (014-obligaciones-fiscales-cliente). Nunca hay dos filas para el mismo cliente+obligación (FR-003); el orden es único por cliente (FR-008). Única tabla del sistema con eliminación física real permitida, y solo cuando estado = activa (FR-005/FR-006, research.md #3).';

alter table public.obligaciones_fiscales_cliente enable row level security;

create policy "obligaciones_fiscales_cliente_select_view_clients" on public.obligaciones_fiscales_cliente
  for select
  using (public.has_capability('view_clients') or public.has_capability('manage_clients'));

create policy "obligaciones_fiscales_cliente_insert_manage_clients" on public.obligaciones_fiscales_cliente
  for insert
  with check (public.has_capability('manage_clients'));

create policy "obligaciones_fiscales_cliente_update_manage_clients" on public.obligaciones_fiscales_cliente
  for update
  using (public.has_capability('manage_clients'))
  with check (public.has_capability('manage_clients'));

create policy "obligaciones_fiscales_cliente_delete_manage_clients_activa" on public.obligaciones_fiscales_cliente
  for delete
  using (public.has_capability('manage_clients') and estado = 'activa');

grant select, insert, update, delete on public.obligaciones_fiscales_cliente to authenticated;

-- Validación: la obligación fiscal debe estar activa en el catálogo al asignarse (FR-002)
create or replace function public.validar_obligacion_activa_cliente()
returns trigger
language plpgsql
as $$
declare
  o public.obligaciones_fiscales%rowtype;
begin
  select * into o from public.obligaciones_fiscales where id = NEW.obligacion_fiscal_id;
  if o.id is null then
    raise exception 'La obligación fiscal % no existe en el catálogo', NEW.obligacion_fiscal_id;
  end if;
  if o.estado <> 'activo' then
    raise exception 'La obligación fiscal % no está activa en el catálogo', NEW.obligacion_fiscal_id;
  end if;
  return NEW;
end;
$$;

create trigger trg_obligaciones_fiscales_cliente_validar_obligacion
  before insert on public.obligaciones_fiscales_cliente
  for each row
  execute function public.validar_obligacion_activa_cliente();

-- Validación: la periodicidad debe estar activa al asignarse o cambiarse (FR-007)
create or replace function public.validar_periodicidad_activa_obligacion_cliente()
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

create trigger trg_obligaciones_fiscales_cliente_validar_periodicidad
  before insert or update of periodicidad_id on public.obligaciones_fiscales_cliente
  for each row
  execute function public.validar_periodicidad_activa_obligacion_cliente();

-- Auditoría, incluyendo DELETE (research.md #4) — primer trigger del sistema
-- que debe manejar TG_OP = 'DELETE' con OLD.
create or replace function public.trg_obligaciones_fiscales_cliente_audit_fn()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_business_audit('obligacion_fiscal_cliente', NEW.id, 'alta', to_jsonb(NEW));
    return NEW;
  elsif TG_OP = 'UPDATE' then
    if NEW.estado <> OLD.estado then
      perform public.log_business_audit(
        'obligacion_fiscal_cliente', NEW.id,
        case when NEW.estado = 'no_aplica' then 'no_aplica' else 'reactivacion' end,
        to_jsonb(NEW)
      );
    else
      perform public.log_business_audit('obligacion_fiscal_cliente', NEW.id, 'edicion', to_jsonb(NEW));
    end if;
    return NEW;
  elsif TG_OP = 'DELETE' then
    perform public.log_business_audit('obligacion_fiscal_cliente', OLD.id, 'eliminacion', to_jsonb(OLD));
    return OLD;
  end if;
  return NEW;
end;
$$;

create trigger trg_obligaciones_fiscales_cliente_audit
  after insert or update or delete on public.obligaciones_fiscales_cliente
  for each row
  execute function public.trg_obligaciones_fiscales_cliente_audit_fn();

-- =============================================================================
-- 2. plantillas_obligaciones (catálogo editable, mismo contrato que 013)
-- =============================================================================

create type public.plantilla_obligaciones_estado as enum ('activo', 'inactivo');

create table public.plantillas_obligaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  estado public.plantilla_obligaciones_estado not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id)
);

comment on table public.plantillas_obligaciones is
  'Catálogo de plantillas de obligaciones fiscales (014-obligaciones-fiscales-cliente, FR-011). Mecanismo opcional de carga inicial para un cliente — copiar sus ítems no conserva ninguna relación con el cliente (FR-014).';

create unique index plantillas_obligaciones_nombre_activo_unique
  on public.plantillas_obligaciones (nombre)
  where estado = 'activo';

alter table public.plantillas_obligaciones enable row level security;

create policy "plantillas_obligaciones_select_all_staff" on public.plantillas_obligaciones
  for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_active));

create policy "plantillas_obligaciones_insert_manage_catalogs" on public.plantillas_obligaciones
  for insert
  with check (public.has_capability('manage_catalogs'));

create policy "plantillas_obligaciones_update_manage_catalogs" on public.plantillas_obligaciones
  for update
  using (public.has_capability('manage_catalogs'))
  with check (public.has_capability('manage_catalogs'));

grant select, insert, update on public.plantillas_obligaciones to authenticated;

create or replace function public.trg_plantillas_obligaciones_audit_fn()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_business_audit('plantilla_obligaciones', NEW.id, 'alta', to_jsonb(NEW));
  elsif TG_OP = 'UPDATE' then
    if NEW.estado <> OLD.estado then
      perform public.log_business_audit(
        'plantilla_obligaciones', NEW.id,
        case when NEW.estado = 'activo' then 'activacion' else 'desactivacion' end,
        to_jsonb(NEW)
      );
    else
      perform public.log_business_audit('plantilla_obligaciones', NEW.id, 'edicion', to_jsonb(NEW));
    end if;
  end if;
  return NEW;
end;
$$;

create trigger trg_plantillas_obligaciones_audit
  after insert or update on public.plantillas_obligaciones
  for each row
  execute function public.trg_plantillas_obligaciones_audit_fn();

-- =============================================================================
-- 3. plantilla_obligaciones_items (detalle de una plantilla, FR-013)
-- =============================================================================

create table public.plantilla_obligaciones_items (
  id uuid primary key default gen_random_uuid(),
  plantilla_id uuid not null references public.plantillas_obligaciones (id),
  obligacion_fiscal_id uuid not null references public.obligaciones_fiscales (id),
  periodicidad_id uuid not null references public.periodicidades (id),
  orden integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint plantilla_obligaciones_items_unique unique (plantilla_id, obligacion_fiscal_id)
);

comment on table public.plantilla_obligaciones_items is
  'Detalle ordenado de una plantilla de obligaciones (014). A diferencia de las tablas de catálogo, sí admite DELETE real: quitar un ítem en edición no tiene implicación de integridad histórica propia (esa vive en obligaciones_fiscales_cliente, ya copiado e independiente).';

alter table public.plantilla_obligaciones_items enable row level security;

create policy "plantilla_obligaciones_items_select_all_staff" on public.plantilla_obligaciones_items
  for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_active));

create policy "plantilla_obligaciones_items_insert_manage_catalogs" on public.plantilla_obligaciones_items
  for insert
  with check (public.has_capability('manage_catalogs'));

create policy "plantilla_obligaciones_items_update_manage_catalogs" on public.plantilla_obligaciones_items
  for update
  using (public.has_capability('manage_catalogs'))
  with check (public.has_capability('manage_catalogs'));

create policy "plantilla_obligaciones_items_delete_manage_catalogs" on public.plantilla_obligaciones_items
  for delete
  using (public.has_capability('manage_catalogs'));

grant select, insert, update, delete on public.plantilla_obligaciones_items to authenticated;

-- Validación: obligación fiscal y periodicidad activas al agregarse a una plantilla
create or replace function public.validar_obligacion_activa_item_plantilla()
returns trigger
language plpgsql
as $$
declare
  o public.obligaciones_fiscales%rowtype;
begin
  select * into o from public.obligaciones_fiscales where id = NEW.obligacion_fiscal_id;
  if o.id is null then
    raise exception 'La obligación fiscal % no existe en el catálogo', NEW.obligacion_fiscal_id;
  end if;
  if o.estado <> 'activo' then
    raise exception 'La obligación fiscal % no está activa en el catálogo', NEW.obligacion_fiscal_id;
  end if;
  return NEW;
end;
$$;

create trigger trg_plantilla_obligaciones_items_validar_obligacion
  before insert on public.plantilla_obligaciones_items
  for each row
  execute function public.validar_obligacion_activa_item_plantilla();

create or replace function public.validar_periodicidad_activa_item_plantilla()
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

create trigger trg_plantilla_obligaciones_items_validar_periodicidad
  before insert or update of periodicidad_id on public.plantilla_obligaciones_items
  for each row
  execute function public.validar_periodicidad_activa_item_plantilla();

-- =============================================================================
-- 4. Función: aplicar una plantilla a un cliente (FR-014/FR-015/FR-016)
-- =============================================================================

create or replace function public.aplicar_plantilla_obligaciones(
  p_cliente_id uuid,
  p_plantilla_id uuid
)
returns void
language plpgsql
security invoker
as $$
begin
  insert into public.obligaciones_fiscales_cliente
    (cliente_id, obligacion_fiscal_id, periodicidad_id, orden, estado)
  select
    p_cliente_id,
    item.obligacion_fiscal_id,
    item.periodicidad_id,
    item.orden,
    'activa'
  from public.plantilla_obligaciones_items item
  where item.plantilla_id = p_plantilla_id
  on conflict (cliente_id, obligacion_fiscal_id) do nothing;
end;
$$;

comment on function public.aplicar_plantilla_obligaciones(uuid, uuid) is
  'FR-014/FR-015: copia los ítems de una plantilla como nuevas Obligaciones Fiscales del Cliente, omitiendo las que el cliente ya tenga (on conflict do nothing), sin conservar ninguna relación con la plantilla después. security invoker: la política RLS de insert (manage_clients) se aplica normalmente al usuario que llama la función.';
