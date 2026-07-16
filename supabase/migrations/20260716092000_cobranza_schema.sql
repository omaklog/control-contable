-- Feature 005-clientes-cobranza-expedientes, Historia 2 (Cobranza, P2).
-- Método de Pago (catálogo), Cargo de cobranza, Pago, Recibo (con snapshot
-- inmutable de concepto).
-- Ver specs/005-clientes-cobranza-expedientes/data-model.md,
-- research.md Decisión 1, 2, 3, 8, 9, contracts/db-functions-rls.md.
--
-- Nota de implementación (corrige contracts/db-functions-rls.md): el Recibo
-- no puede generarse en un trigger AFTER INSERT ON pagos, porque en ese
-- momento aún no existen las filas de cargo_pagos que indican qué Cargo(s)
-- cubre el pago (se insertan en una sentencia aparte, ver quickstart.md
-- Escenario 2). El Recibo se genera/actualiza en un trigger AFTER INSERT ON
-- cargo_pagos: la primera fila crea el Recibo; filas adicionales del mismo
-- pago (pago que cubre varios Cargos) anexan su concepto al ya existente.

-- =============================================================================
-- 1. Enum y catálogo de Método de Pago (FR-024, Decisión 8)
-- =============================================================================

create type public.cargo_estado as enum ('pendiente', 'pagado', 'vencido', 'cancelado');

create table public.metodos_pago (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id)
);

comment on table public.metodos_pago is
  'Catálogo de métodos de pago (FR-024), editable exclusivamente por Administrador. Sembrado con los valores iniciales provistos por el despacho.';

insert into public.metodos_pago (nombre) values
  ('efectivo'), ('cheque'), ('saldo'), ('deposito'), ('transferencia'), ('banco');

alter table public.metodos_pago enable row level security;

create policy "metodos_pago_select_all_staff" on public.metodos_pago
  for select
  using (auth.role() = 'authenticated');

create policy "metodos_pago_insert_admin_only" on public.metodos_pago
  for insert
  with check (public.has_capability('manage_catalogs'));

create policy "metodos_pago_update_admin_only" on public.metodos_pago
  for update
  using (public.has_capability('manage_catalogs'))
  with check (public.has_capability('manage_catalogs'));

grant select, insert, update on public.metodos_pago to authenticated;

-- =============================================================================
-- 2. cargos_cobranza (FR-005, FR-009)
-- =============================================================================

create table public.cargos_cobranza (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  periodo_mes smallint not null check (periodo_mes between 1 and 12),
  periodo_anio smallint not null,
  concepto text not null,
  monto numeric(12, 2) not null check (monto > 0),
  fecha_vencimiento date not null,
  estado public.cargo_estado not null default 'pendiente',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  unique (cliente_id, periodo_mes, periodo_anio, concepto)
);

comment on table public.cargos_cobranza is
  'Cargo de cobranza mensual de un Cliente (FR-005). estado se recalcula por trigger a partir de cargo_pagos; nunca se elimina físicamente, se cancela.';

-- =============================================================================
-- 3. pagos (FR-006, FR-024)
-- =============================================================================

create table public.pagos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  monto numeric(12, 2) not null check (monto > 0),
  fecha_pago timestamptz not null default now(),
  metodo_pago_id uuid not null references public.metodos_pago (id),
  referencia text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id)
);

comment on table public.pagos is
  'Cobro recibido de un Cliente (FR-006). Se asocia a uno o más Cargos vía cargo_pagos.';

-- =============================================================================
-- 4. cargo_pagos (tabla puente N—N, Decisión 1)
-- =============================================================================

create table public.cargo_pagos (
  cargo_id uuid not null references public.cargos_cobranza (id),
  pago_id uuid not null references public.pagos (id),
  monto_aplicado numeric(12, 2) not null check (monto_aplicado > 0),
  primary key (cargo_id, pago_id)
);

comment on table public.cargo_pagos is
  'Relación N—N entre Pago y Cargo de cobranza: un pago puede cubrir varios cargos; un cargo puede recibir varios pagos parciales (Decisión 1).';

-- =============================================================================
-- 5. recibos (FR-008, FR-025, Decisión 3, Decisión 9)
-- =============================================================================

create sequence public.recibos_folio_seq;

create table public.recibos (
  id uuid primary key default gen_random_uuid(),
  pago_id uuid not null unique references public.pagos (id),
  cliente_id uuid not null references public.clientes (id),
  folio text not null unique,
  concepto text not null,
  monto numeric(12, 2) not null,
  fecha_emision timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id)
);

comment on table public.recibos is
  'Comprobante emitido por un Pago (1 recibo por pago). concepto es un snapshot inmutable de los conceptos de los Cargos cubiertos al momento de emitirse (FR-025) — no se recalcula si el concepto del Cargo original cambia después.';

-- =============================================================================
-- 6. Trigger: bloquear Cargo de cobranza para Cliente inactivo (FR-009)
-- =============================================================================

create or replace function public.bloquear_cargo_cliente_inactivo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado public.cliente_estado;
begin
  select estado into v_estado from public.clientes where id = NEW.cliente_id;

  if v_estado is distinct from 'activo' then
    raise exception 'No se puede registrar un cargo de cobranza para un cliente inactivo (id=%)', NEW.cliente_id;
  end if;

  return NEW;
end;
$$;

create trigger trg_cargos_cobranza_bloquear_cliente_inactivo
  before insert on public.cargos_cobranza
  for each row
  execute function public.bloquear_cargo_cliente_inactivo();

-- =============================================================================
-- 7. Trigger: generar/actualizar Recibo al cubrir un Cargo (FR-008, FR-025)
-- =============================================================================

create or replace function public.generar_o_actualizar_recibo()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pago public.pagos%rowtype;
  v_concepto_cargo text;
  v_recibo_id uuid;
begin
  select * into v_pago from public.pagos where id = NEW.pago_id;
  select concepto into v_concepto_cargo from public.cargos_cobranza where id = NEW.cargo_id;

  select id into v_recibo_id from public.recibos where pago_id = NEW.pago_id;

  if v_recibo_id is null then
    insert into public.recibos (pago_id, cliente_id, folio, concepto, monto, created_by, updated_by)
    values (
      NEW.pago_id,
      v_pago.cliente_id,
      'REC-' || lpad(nextval('public.recibos_folio_seq')::text, 6, '0'),
      v_concepto_cargo,
      v_pago.monto,
      v_pago.created_by,
      v_pago.created_by
    );
  else
    update public.recibos
    set concepto = concepto || '; ' || v_concepto_cargo
    where id = v_recibo_id
      and position(v_concepto_cargo in concepto) = 0;
  end if;

  return NEW;
end;
$$;

comment on function public.generar_o_actualizar_recibo() is
  'FR-008/FR-025: genera el Recibo la primera vez que un Cargo cubierto por un Pago se registra en cargo_pagos; si el mismo Pago cubre más Cargos, anexa su concepto. El concepto ya guardado nunca se recalcula si el Cargo original cambia después (Decisión 9).';

create trigger trg_cargo_pagos_generar_recibo
  after insert on public.cargo_pagos
  for each row
  execute function public.generar_o_actualizar_recibo();

-- =============================================================================
-- 8. Trigger: recalcular estado del Cargo de cobranza (FR-005, Decisión 2)
-- =============================================================================

create or replace function public.recalcular_estado_cargo_cobranza()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cargo_id uuid;
  v_monto numeric(12, 2);
  v_vencimiento date;
  v_estado_actual public.cargo_estado;
  v_aplicado numeric(12, 2);
begin
  v_cargo_id := coalesce(NEW.cargo_id, OLD.cargo_id);

  select monto, fecha_vencimiento, estado into v_monto, v_vencimiento, v_estado_actual
  from public.cargos_cobranza
  where id = v_cargo_id;

  if v_estado_actual = 'cancelado' then
    return coalesce(NEW, OLD);
  end if;

  select coalesce(sum(monto_aplicado), 0) into v_aplicado
  from public.cargo_pagos
  where cargo_id = v_cargo_id;

  update public.cargos_cobranza
  set estado = case
    when v_aplicado >= v_monto then 'pagado'
    when v_vencimiento < current_date then 'vencido'
    else 'pendiente'
  end
  where id = v_cargo_id;

  return coalesce(NEW, OLD);
end;
$$;

create trigger trg_cargo_pagos_recalcular_estado
  after insert or update or delete on public.cargo_pagos
  for each row
  execute function public.recalcular_estado_cargo_cobranza();

-- =============================================================================
-- 9. Triggers: auditoría de negocio en pagos y recibos (FR-018)
-- =============================================================================

create or replace function public.trg_pagos_audit_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_business_audit('pago', NEW.id, 'alta', to_jsonb(NEW));
    return NEW;
  elsif TG_OP = 'UPDATE' then
    perform public.log_business_audit(
      'pago', NEW.id, 'modificacion',
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
    );
    return NEW;
  elsif TG_OP = 'DELETE' then
    perform public.log_business_audit('pago', OLD.id, 'eliminacion', to_jsonb(OLD));
    return OLD;
  end if;
  return null;
end;
$$;

create trigger trg_pagos_audit
  after insert or update or delete on public.pagos
  for each row
  execute function public.trg_pagos_audit_fn();

create or replace function public.trg_recibos_audit_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_business_audit('recibo', NEW.id, 'generacion', to_jsonb(NEW));
    return NEW;
  elsif TG_OP = 'UPDATE' then
    perform public.log_business_audit(
      'recibo', NEW.id, 'modificacion',
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
    );
    return NEW;
  elsif TG_OP = 'DELETE' then
    perform public.log_business_audit('recibo', OLD.id, 'eliminacion', to_jsonb(OLD));
    return OLD;
  end if;
  return null;
end;
$$;

create trigger trg_recibos_audit
  after insert or update or delete on public.recibos
  for each row
  execute function public.trg_recibos_audit_fn();

-- =============================================================================
-- 10. RLS: cargos_cobranza, pagos, cargo_pagos, recibos (FR-019)
-- =============================================================================

alter table public.cargos_cobranza enable row level security;

create policy "cargos_cobranza_select_view_or_manage" on public.cargos_cobranza
  for select
  using (public.has_capability('view_billing') or public.has_capability('manage_billing'));

create policy "cargos_cobranza_insert_manage" on public.cargos_cobranza
  for insert
  with check (public.has_capability('manage_billing'));

create policy "cargos_cobranza_update_manage" on public.cargos_cobranza
  for update
  using (public.has_capability('manage_billing'))
  with check (public.has_capability('manage_billing'));

grant select, insert, update on public.cargos_cobranza to authenticated;

alter table public.pagos enable row level security;

create policy "pagos_select_view_or_manage" on public.pagos
  for select
  using (public.has_capability('view_billing') or public.has_capability('manage_billing'));

create policy "pagos_insert_manage" on public.pagos
  for insert
  with check (public.has_capability('manage_billing'));

grant select, insert on public.pagos to authenticated;

alter table public.cargo_pagos enable row level security;

create policy "cargo_pagos_select_view_or_manage" on public.cargo_pagos
  for select
  using (public.has_capability('view_billing') or public.has_capability('manage_billing'));

create policy "cargo_pagos_insert_manage" on public.cargo_pagos
  for insert
  with check (public.has_capability('manage_billing'));

grant select, insert on public.cargo_pagos to authenticated;

alter table public.recibos enable row level security;

create policy "recibos_select_view_or_manage" on public.recibos
  for select
  using (public.has_capability('view_billing') or public.has_capability('manage_billing'));

-- Sin política de insert/update para roles de aplicación: los recibos se
-- crean/actualizan exclusivamente vía trigger (security definer).

grant select on public.recibos to authenticated;
