-- Feature 017-cobranza.
-- Reemplaza el modelo plano de 005-clientes-cobranza-expedientes
-- (cargos_cobranza un-concepto-por-fila, pagos a nivel cliente, cargo_pagos
-- N—N) por un modelo de cabecera + líneas: cobranzas (única por cliente y
-- periodo), conceptos_cobranza (congelados, con origen en servicio
-- recurrente o cargo extraordinario), cargos_extraordinarios, y pagos
-- aplicados directamente a la cobranza. Ver specs/017-cobranza/{research.md,
-- data-model.md,contracts/db-functions-rls.md}.

-- =============================================================================
-- A. Eliminar el modelo plano de 005 (sin UI ni datos de producción)
-- =============================================================================

drop trigger if exists trg_cargo_pagos_generar_recibo on public.cargo_pagos;
drop trigger if exists trg_cargo_pagos_recalcular_estado on public.cargo_pagos;
drop trigger if exists trg_cargos_cobranza_bloquear_cliente_inactivo on public.cargos_cobranza;

drop function if exists public.generar_o_actualizar_recibo();
drop function if exists public.recalcular_estado_cargo_cobranza();
drop function if exists public.bloquear_cargo_cliente_inactivo();

drop table if exists public.cargo_pagos;
drop table if exists public.cargos_cobranza;
drop type if exists public.cargo_estado;

-- =============================================================================
-- B. cobranzas (cabecera, única por cliente + periodo)
-- =============================================================================

create type public.cobranza_estado as enum ('vigente', 'cancelada', 'eliminada');

create table public.cobranzas (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  periodo_mes smallint not null check (periodo_mes between 1 and 12),
  periodo_anio smallint not null,
  fecha_limite date not null,
  estado public.cobranza_estado not null default 'vigente',
  generada_por uuid references auth.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  unique (cliente_id, periodo_mes, periodo_anio)
);

comment on table public.cobranzas is
  'Cabecera única por cliente+periodo (016-cobranza, FR-001). Concentra los conceptos_cobranza de ese periodo; los pagos se aplican directamente aquí, no por concepto.';

alter table public.cobranzas enable row level security;

create policy "cobranzas_select_view_or_manage" on public.cobranzas
  for select
  using (public.has_capability('view_billing') or public.has_capability('manage_billing'));

create policy "cobranzas_insert_manage" on public.cobranzas
  for insert
  with check (public.has_capability('manage_billing'));

create policy "cobranzas_update_manage" on public.cobranzas
  for update
  using (public.has_capability('manage_billing'))
  with check (public.has_capability('manage_billing'));

grant select, insert, update on public.cobranzas to authenticated;

create or replace function public.trg_cobranzas_audit_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_business_audit('cobranza', NEW.id, 'generacion', to_jsonb(NEW));
    return NEW;
  elsif TG_OP = 'UPDATE' then
    if OLD.estado <> 'eliminada' and NEW.estado = 'eliminada' then
      perform public.log_business_audit(
        'cobranza', NEW.id, 'eliminacion_logica', jsonb_build_object('before', to_jsonb(OLD))
      );
    elsif OLD.estado <> 'cancelada' and NEW.estado = 'cancelada' then
      perform public.log_business_audit(
        'cobranza', NEW.id, 'cancelacion', jsonb_build_object('before', to_jsonb(OLD))
      );
    else
      perform public.log_business_audit(
        'cobranza', NEW.id, 'modificacion',
        jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
      );
    end if;
    return NEW;
  end if;
  return null;
end;
$$;

create trigger trg_cobranzas_audit
  after insert or update on public.cobranzas
  for each row
  execute function public.trg_cobranzas_audit_fn();

create or replace function public.validar_transicion_cobranza()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tiene_pagos boolean;
begin
  if OLD.estado = NEW.estado then
    return NEW;
  end if;

  if OLD.estado in ('cancelada', 'eliminada') then
    raise exception 'Una cobranza en estado % no puede cambiar de estado', OLD.estado;
  end if;

  if NEW.estado = 'eliminada' then
    select exists(select 1 from public.pagos where cobranza_id = NEW.id) into v_tiene_pagos;
    if v_tiene_pagos then
      raise exception 'No se puede eliminar una cobranza con pagos registrados; usa cancelación o anulación';
    end if;
  end if;

  return NEW;
end;
$$;

create trigger trg_cobranzas_validar_transicion
  before update on public.cobranzas
  for each row
  execute function public.validar_transicion_cobranza();

-- =============================================================================
-- C. conceptos_cobranza (líneas congeladas, inmutables)
-- =============================================================================

create type public.concepto_cobranza_tipo as enum ('servicio_recurrente', 'cargo_extraordinario');

create table public.conceptos_cobranza (
  id uuid primary key default gen_random_uuid(),
  cobranza_id uuid not null references public.cobranzas (id),
  descripcion text not null,
  monto numeric(12, 2) not null check (monto > 0),
  tipo public.concepto_cobranza_tipo not null,
  servicio_contratado_id uuid references public.servicios_contratados (id),
  cargo_extraordinario_id uuid, -- FK agregada más abajo, una vez existe cargos_extraordinarios (Sección D)
  fecha_incorporacion timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  constraint conceptos_cobranza_origen_check check (
    (tipo = 'servicio_recurrente' and servicio_contratado_id is not null and cargo_extraordinario_id is null)
    or
    (tipo = 'cargo_extraordinario' and cargo_extraordinario_id is not null and servicio_contratado_id is null)
  )
);

comment on table public.conceptos_cobranza is
  'Línea de una cobranza (017, FR-006/FR-011): el monto se congela al insertarse y nunca se recalcula desde su origen. Sin política de UPDATE — un concepto incorrecto se elimina y se agrega uno nuevo.';

alter table public.conceptos_cobranza enable row level security;

create policy "conceptos_cobranza_select_view_or_manage" on public.conceptos_cobranza
  for select
  using (public.has_capability('view_billing') or public.has_capability('manage_billing'));

create policy "conceptos_cobranza_insert_manage" on public.conceptos_cobranza
  for insert
  with check (public.has_capability('manage_billing'));

create policy "conceptos_cobranza_delete_manage" on public.conceptos_cobranza
  for delete
  using (public.has_capability('manage_billing'));

grant select, insert, delete on public.conceptos_cobranza to authenticated;

create or replace function public.trg_conceptos_cobranza_audit_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_business_audit('concepto_cobranza', NEW.id, 'incorporacion', to_jsonb(NEW));
    return NEW;
  elsif TG_OP = 'DELETE' then
    perform public.log_business_audit('concepto_cobranza', OLD.id, 'eliminacion', to_jsonb(OLD));
    return OLD;
  end if;
  return null;
end;
$$;

create trigger trg_conceptos_cobranza_audit
  after insert or delete on public.conceptos_cobranza
  for each row
  execute function public.trg_conceptos_cobranza_audit_fn();

-- Ahora que conceptos_cobranza existe, agregar la FK diferida desde cobranzas
-- no es necesaria (conceptos_cobranza ya referencia cobranzas directamente).

-- =============================================================================
-- D. cargos_extraordinarios
-- =============================================================================

create type public.cargo_extraordinario_estado as enum ('pendiente', 'incorporado');

create table public.cargos_extraordinarios (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  descripcion text not null,
  monto numeric(12, 2) not null check (monto > 0),
  fecha_registro timestamptz not null default now(),
  periodo_mes smallint not null check (periodo_mes between 1 and 12),
  periodo_anio smallint not null,
  estado public.cargo_extraordinario_estado not null default 'pendiente',
  concepto_cobranza_id uuid references public.conceptos_cobranza (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id)
);

comment on table public.cargos_extraordinarios is
  'Cargo puntual con periodo objetivo de cobranza (017, FR-008). Pasa a "incorporado" cuando se convierte en un concepto_cobranza; solo puede eliminarse mientras está "pendiente" (FR-010).';

alter table public.cargos_extraordinarios enable row level security;

create policy "cargos_extraordinarios_select_view_or_manage" on public.cargos_extraordinarios
  for select
  using (public.has_capability('view_billing') or public.has_capability('manage_billing'));

create policy "cargos_extraordinarios_insert_manage" on public.cargos_extraordinarios
  for insert
  with check (public.has_capability('manage_billing'));

create policy "cargos_extraordinarios_update_manage" on public.cargos_extraordinarios
  for update
  using (public.has_capability('manage_billing'))
  with check (public.has_capability('manage_billing'));

create policy "cargos_extraordinarios_delete_pendiente" on public.cargos_extraordinarios
  for delete
  using (public.has_capability('manage_billing') and estado = 'pendiente');

grant select, insert, update, delete on public.cargos_extraordinarios to authenticated;

-- Ahora que cargos_extraordinarios existe, agregar la FK que conceptos_cobranza
-- necesitaba hacia adelante:
alter table public.conceptos_cobranza
  add constraint conceptos_cobranza_cargo_extraordinario_id_fkey
  foreign key (cargo_extraordinario_id) references public.cargos_extraordinarios (id);

create or replace function public.trg_cargos_extraordinarios_audit_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_business_audit('cargo_extraordinario', NEW.id, 'creacion', to_jsonb(NEW));
  elsif TG_OP = 'UPDATE' then
    if OLD.estado <> 'incorporado' and NEW.estado = 'incorporado' then
      perform public.log_business_audit(
        'cargo_extraordinario', NEW.id, 'incorporacion',
        jsonb_build_object('concepto_cobranza_id', NEW.concepto_cobranza_id)
      );
    else
      perform public.log_business_audit(
        'cargo_extraordinario', NEW.id, 'modificacion',
        jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
      );
    end if;
  elsif TG_OP = 'DELETE' then
    perform public.log_business_audit('cargo_extraordinario', OLD.id, 'eliminacion', to_jsonb(OLD));
  end if;
  return coalesce(NEW, OLD);
end;
$$;

create trigger trg_cargos_extraordinarios_audit
  after insert or update or delete on public.cargos_extraordinarios
  for each row
  execute function public.trg_cargos_extraordinarios_audit_fn();

-- =============================================================================
-- E. configuracion_cobranza (singleton)
-- =============================================================================

create table public.configuracion_cobranza (
  id boolean primary key default true,
  dia_generacion smallint not null default 1 check (dia_generacion between 1 and 28),
  dia_limite_pago smallint not null default 20 check (dia_limite_pago between 1 and 28),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id),
  constraint configuracion_cobranza_singleton check (id)
);

comment on table public.configuracion_cobranza is
  'Configuración global de Cobranza (017, FR-018): día de generación automática y día límite de pago. Fila única — los cambios son prospectivos porque cada cobranza congela su propia fecha_limite al generarse.';

insert into public.configuracion_cobranza (id) values (true);

alter table public.configuracion_cobranza enable row level security;

create policy "configuracion_cobranza_select_all_staff" on public.configuracion_cobranza
  for select
  using (auth.role() = 'authenticated');

create policy "configuracion_cobranza_update_manage" on public.configuracion_cobranza
  for update
  using (public.has_capability('manage_billing'))
  with check (public.has_capability('manage_billing'));

grant select, update on public.configuracion_cobranza to authenticated;

-- =============================================================================
-- F. pagos (adaptada: cliente_id → cobranza_id) y recibos
-- =============================================================================

alter table public.pagos
  drop constraint pagos_cliente_id_fkey,
  drop column cliente_id,
  add column cobranza_id uuid references public.cobranzas (id);

update public.pagos set cobranza_id = cobranza_id where false; -- no-op, tabla vacía en este entorno

alter table public.pagos
  alter column cobranza_id set not null;

alter table public.pagos rename column referencia to comentario;

comment on column public.pagos.cobranza_id is
  'Un pago aplica a una única cobranza completa (017) — ya no se reparte entre conceptos como en el modelo de 005 (cargo_pagos, eliminado).';

create or replace function public.validar_pago_cobranza()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_estado public.cobranza_estado;
  v_total_conceptos numeric(12, 2);
  v_total_pagado numeric(12, 2);
begin
  select estado into v_estado from public.cobranzas where id = NEW.cobranza_id;

  if v_estado <> 'vigente' then
    raise exception 'No se pueden registrar pagos sobre una cobranza que no está vigente (estado=%)', v_estado;
  end if;

  select coalesce(sum(monto), 0) into v_total_conceptos
  from public.conceptos_cobranza where cobranza_id = NEW.cobranza_id;

  select coalesce(sum(monto), 0) into v_total_pagado
  from public.pagos where cobranza_id = NEW.cobranza_id;

  if v_total_pagado + NEW.monto > v_total_conceptos then
    raise exception 'El pago excede el saldo pendiente de la cobranza';
  end if;

  return NEW;
end;
$$;

create trigger trg_pagos_validar_cobranza
  before insert on public.pagos
  for each row
  execute function public.validar_pago_cobranza();

create or replace function public.generar_recibo_pago()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cliente_id uuid;
  v_etiqueta text;
begin
  select cliente_id, ('Cobranza ' || periodo_mes || '/' || periodo_anio)
    into v_cliente_id, v_etiqueta
  from public.cobranzas where id = NEW.cobranza_id;

  insert into public.recibos (pago_id, cliente_id, folio, concepto, monto, created_by, updated_by)
  values (
    NEW.id,
    v_cliente_id,
    'REC-' || lpad(nextval('public.recibos_folio_seq')::text, 6, '0'),
    v_etiqueta,
    NEW.monto,
    NEW.created_by,
    NEW.created_by
  );

  return NEW;
end;
$$;

create trigger trg_pagos_generar_recibo
  after insert on public.pagos
  for each row
  execute function public.generar_recibo_pago();

-- =============================================================================
-- G. generar_cobranzas(): generación automática/manual idempotente
-- =============================================================================

create or replace function public.generar_cobranzas(p_forzar boolean default false)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_config public.configuracion_cobranza%rowtype;
  v_hoy date := current_date;
  v_mes smallint := extract(month from v_hoy);
  v_anio smallint := extract(year from v_hoy);
  v_generadas integer := 0;
  r_cliente record;
  r_servicio record;
  r_cargo record;
  v_cobranza_id uuid;
  v_concepto_id uuid;
begin
  select * into v_config from public.configuracion_cobranza;

  if not p_forzar and extract(day from v_hoy) <> v_config.dia_generacion then
    return 0;
  end if;

  for r_cliente in
    select c.id from public.clientes c
    where c.estado = 'activo'
      and exists (
        select 1 from public.servicios_contratados sc
        where sc.cliente_id = c.id and sc.estado = 'activo'
      )
  loop
    insert into public.cobranzas (cliente_id, periodo_mes, periodo_anio, fecha_limite)
    values (r_cliente.id, v_mes, v_anio, make_date(v_anio, v_mes, v_config.dia_limite_pago))
    on conflict (cliente_id, periodo_mes, periodo_anio) do nothing
    returning id into v_cobranza_id;

    if v_cobranza_id is null then
      continue; -- ya existía una cobranza para este cliente y periodo
    end if;

    v_generadas := v_generadas + 1;

    for r_servicio in
      select sc.id, sc.precio_acordado, s.nombre
      from public.servicios_contratados sc
      join public.servicios s on s.id = sc.servicio_id
      where sc.cliente_id = r_cliente.id and sc.estado = 'activo'
    loop
      insert into public.conceptos_cobranza
        (cobranza_id, descripcion, monto, tipo, servicio_contratado_id)
      values
        (v_cobranza_id, r_servicio.nombre, r_servicio.precio_acordado, 'servicio_recurrente', r_servicio.id);
    end loop;

    for r_cargo in
      select id, descripcion, monto
      from public.cargos_extraordinarios
      where cliente_id = r_cliente.id
        and estado = 'pendiente'
        and periodo_mes = v_mes and periodo_anio = v_anio
    loop
      insert into public.conceptos_cobranza
        (cobranza_id, descripcion, monto, tipo, cargo_extraordinario_id)
      values
        (v_cobranza_id, r_cargo.descripcion, r_cargo.monto, 'cargo_extraordinario', r_cargo.id)
      returning id into v_concepto_id;

      update public.cargos_extraordinarios
      set estado = 'incorporado', concepto_cobranza_id = v_concepto_id
      where id = r_cargo.id;
    end loop;
  end loop;

  if p_forzar then
    perform public.log_business_audit(
      'cobranza', gen_random_uuid(), 'generacion_manual',
      jsonb_build_object('generadas', v_generadas, 'periodo_mes', v_mes, 'periodo_anio', v_anio)
    );
  end if;

  return v_generadas;
end;
$$;

comment on function public.generar_cobranzas(boolean) is
  'Generación idempotente de cobranzas (017, FR-002/FR-003/FR-004). p_forzar=false es la ruta automática (pg_cron diario, respeta configuracion_cobranza.dia_generacion); p_forzar=true es la generación manual (Administrador), que omite esa verificación de día y siempre registra un evento de auditoría de la invocación.';

grant execute on function public.generar_cobranzas(boolean) to authenticated;

create extension if not exists pg_cron;

select cron.schedule('generar-cobranzas-diario', '0 1 * * *', $$select public.generar_cobranzas(false)$$);

-- =============================================================================
-- H. Vista cobranzas_resumen: estado de pago y vencimiento (siempre derivados)
-- =============================================================================

create or replace view public.cobranzas_resumen as
select
  cb.id,
  cb.cliente_id,
  cb.periodo_mes,
  cb.periodo_anio,
  cb.fecha_limite,
  cb.estado,
  cb.generada_por,
  cb.created_at,
  coalesce(cc.total_conceptos, 0) as total_conceptos,
  coalesce(pg.total_pagado, 0) as total_pagado,
  coalesce(cc.total_conceptos, 0) - coalesce(pg.total_pagado, 0) as saldo,
  case
    when coalesce(pg.total_pagado, 0) <= 0 then 'pendiente'
    when coalesce(pg.total_pagado, 0) < coalesce(cc.total_conceptos, 0) then 'parcial'
    else 'pagada'
  end as estado_pago,
  case
    when coalesce(pg.total_pagado, 0) >= coalesce(cc.total_conceptos, 0) and coalesce(cc.total_conceptos, 0) > 0 then 'vigente'
    when current_date > cb.fecha_limite then 'vencida'
    else 'vigente'
  end as estado_vencimiento
from public.cobranzas cb
left join (
  select cobranza_id, sum(monto) as total_conceptos
  from public.conceptos_cobranza
  group by cobranza_id
) cc on cc.cobranza_id = cb.id
left join (
  select cobranza_id, sum(monto) as total_pagado
  from public.pagos
  group by cobranza_id
) pg on pg.cobranza_id = cb.id;

comment on view public.cobranzas_resumen is
  'Estado de pago y de vencimiento SIEMPRE derivados (017, FR-015/FR-016/FR-017) — nunca almacenados. Respeta la RLS de las tablas subyacentes (security_invoker).';

alter view public.cobranzas_resumen set (security_invoker = true);

grant select on public.cobranzas_resumen to authenticated;
