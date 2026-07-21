# Contrato: esquema, RLS, triggers y funciones de Control de Cumplimiento Fiscal

## A. `cumplimientos_fiscales`

```sql
create type public.cumplimiento_fiscal_estado as enum ('pendiente', 'en_proceso', 'presentada', 'no_aplica');

create table public.cumplimientos_fiscales (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  obligacion_fiscal_cliente_id uuid references public.obligaciones_fiscales_cliente (id),
  obligacion_fiscal_id uuid references public.obligaciones_fiscales (id),
  descripcion text,
  periodo_inicio date not null,
  periodo_fin date not null,
  periodo_etiqueta text not null,
  fecha_limite date not null,
  estado public.cumplimiento_fiscal_estado not null default 'pendiente',
  responsable_id uuid references auth.users (id),
  es_extraordinario boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),

  constraint cumplimientos_fiscales_extraordinario_check check (
    (es_extraordinario = false and obligacion_fiscal_cliente_id is not null)
    or
    (es_extraordinario = true and obligacion_fiscal_cliente_id is null
     and (obligacion_fiscal_id is not null or descripcion is not null))
  )
);

comment on table public.cumplimientos_fiscales is
  '015-control-cumplimiento-fiscal: seguimiento de cumplimiento por obligación y periodo. "Vencida" nunca se almacena (Clarifications) — se deriva de estado en (pendiente,en_proceso) y fecha_limite < current_date. Nunca se elimina físicamente (FR-015).';

create unique index cumplimientos_fiscales_obligacion_periodo_unique
  on public.cumplimientos_fiscales (obligacion_fiscal_cliente_id, periodo_inicio)
  where obligacion_fiscal_cliente_id is not null;

alter table public.cumplimientos_fiscales enable row level security;

create policy "cumplimientos_fiscales_select_view_clients" on public.cumplimientos_fiscales
  for select
  using (public.has_capability('view_clients') or public.has_capability('manage_clients'));

create policy "cumplimientos_fiscales_insert_manage_clients" on public.cumplimientos_fiscales
  for insert
  with check (public.has_capability('manage_clients'));

create policy "cumplimientos_fiscales_update_manage_clients" on public.cumplimientos_fiscales
  for update
  using (public.has_capability('manage_clients'))
  with check (public.has_capability('manage_clients'));

grant select, insert, update on public.cumplimientos_fiscales to authenticated;
```

Sin política ni `grant` de `delete` — ningún cumplimiento se elimina físicamente (FR-015).

## B. `cumplimiento_fiscal_documentos`

```sql
create table public.cumplimiento_fiscal_documentos (
  id uuid primary key default gen_random_uuid(),
  cumplimiento_id uuid not null references public.cumplimientos_fiscales (id),
  documento_id uuid not null references public.documentos (id),
  es_acuse boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id),

  constraint cumplimiento_fiscal_documentos_unique unique (cumplimiento_id, documento_id)
);

create unique index cumplimiento_fiscal_documentos_acuse_unique
  on public.cumplimiento_fiscal_documentos (cumplimiento_id)
  where es_acuse = true;

alter table public.cumplimiento_fiscal_documentos enable row level security;

create policy "cumplimiento_fiscal_documentos_select_view_clients" on public.cumplimiento_fiscal_documentos
  for select
  using (public.has_capability('view_clients') or public.has_capability('manage_clients'));

create policy "cumplimiento_fiscal_documentos_insert_manage_clients" on public.cumplimiento_fiscal_documentos
  for insert
  with check (public.has_capability('manage_clients'));

create policy "cumplimiento_fiscal_documentos_delete_manage_clients" on public.cumplimiento_fiscal_documentos
  for delete
  using (public.has_capability('manage_clients'));

grant select, insert, delete on public.cumplimiento_fiscal_documentos to authenticated;
```

`delete` aquí solo desasocia la referencia (FR-014: "desasociación de documentos" es una acción válida y auditada) — nunca borra el `documento` en sí, que sigue viviendo en `documentos` (Expediente Fiscal).

### Trigger: validar mismo cliente (FR-009)

```sql
create or replace function public.validar_documento_mismo_cliente_cumplimiento()
returns trigger
language plpgsql
as $$
declare
  v_cliente_cumplimiento uuid;
  v_cliente_documento uuid;
begin
  select cliente_id into v_cliente_cumplimiento
  from public.cumplimientos_fiscales where id = NEW.cumplimiento_id;

  select cliente_id into v_cliente_documento
  from public.documentos where id = NEW.documento_id;

  if v_cliente_cumplimiento is null or v_cliente_documento is null then
    raise exception 'Cumplimiento o documento no encontrado';
  end if;

  if v_cliente_cumplimiento <> v_cliente_documento then
    raise exception 'El documento % pertenece a un cliente distinto del cumplimiento', NEW.documento_id;
  end if;

  return NEW;
end;
$$;

create trigger trg_cumplimiento_fiscal_documentos_validar_cliente
  before insert on public.cumplimiento_fiscal_documentos
  for each row
  execute function public.validar_documento_mismo_cliente_cumplimiento();
```

## C. Auditoría (reutiliza `business_audit_log`, research.md #6)

```sql
create or replace function public.trg_cumplimientos_fiscales_audit_fn()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_business_audit('cumplimiento_fiscal', NEW.id, 'alta', to_jsonb(NEW));
    return NEW;
  elsif TG_OP = 'UPDATE' then
    if NEW.estado <> OLD.estado then
      perform public.log_business_audit(
        'cumplimiento_fiscal', NEW.id, 'cambio_estado',
        jsonb_build_object('anterior', OLD.estado, 'nuevo', NEW.estado)
      );
    end if;
    if NEW.fecha_limite <> OLD.fecha_limite then
      perform public.log_business_audit(
        'cumplimiento_fiscal', NEW.id, 'cambio_fecha_limite',
        jsonb_build_object('anterior', OLD.fecha_limite, 'nuevo', NEW.fecha_limite)
      );
    end if;
    if NEW.responsable_id is distinct from OLD.responsable_id then
      perform public.log_business_audit(
        'cumplimiento_fiscal', NEW.id, 'cambio_responsable',
        jsonb_build_object('anterior', OLD.responsable_id, 'nuevo', NEW.responsable_id)
      );
    end if;
    return NEW;
  end if;
  return NEW;
end;
$$;

create trigger trg_cumplimientos_fiscales_audit
  after insert or update on public.cumplimientos_fiscales
  for each row
  execute function public.trg_cumplimientos_fiscales_audit_fn();

create or replace function public.trg_cumplimiento_fiscal_documentos_audit_fn()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_business_audit(
      'cumplimiento_fiscal', NEW.cumplimiento_id, 'asociacion_documento',
      jsonb_build_object('documento_id', NEW.documento_id, 'es_acuse', NEW.es_acuse)
    );
    return NEW;
  elsif TG_OP = 'DELETE' then
    perform public.log_business_audit(
      'cumplimiento_fiscal', OLD.cumplimiento_id, 'desasociacion_documento',
      jsonb_build_object('documento_id', OLD.documento_id)
    );
    return OLD;
  end if;
  return NEW;
end;
$$;

create trigger trg_cumplimiento_fiscal_documentos_audit
  after insert or delete on public.cumplimiento_fiscal_documentos
  for each row
  execute function public.trg_cumplimiento_fiscal_documentos_audit_fn();
```

## D. Cálculo de periodo por periodicidad (research.md #4)

```sql
create or replace function public.calcular_periodo_fiscal(p_periodicidad_nombre text, p_fecha date)
returns table (periodo_inicio date, periodo_fin date)
language plpgsql
immutable
as $$
declare
  v_mes integer := extract(month from p_fecha)::integer;
  v_anio integer := extract(year from p_fecha)::integer;
  v_bloque integer;
begin
  if p_periodicidad_nombre = 'Mensual' then
    periodo_inicio := date_trunc('month', p_fecha)::date;
    periodo_fin := (date_trunc('month', p_fecha) + interval '1 month - 1 day')::date;
  elsif p_periodicidad_nombre = 'Bimestral' then
    v_bloque := ((v_mes - 1) / 2) * 2 + 1;
    periodo_inicio := make_date(v_anio, v_bloque, 1);
    periodo_fin := (periodo_inicio + interval '2 months - 1 day')::date;
  elsif p_periodicidad_nombre = 'Trimestral' then
    periodo_inicio := date_trunc('quarter', p_fecha)::date;
    periodo_fin := (date_trunc('quarter', p_fecha) + interval '3 months - 1 day')::date;
  elsif p_periodicidad_nombre = 'Semestral' then
    v_bloque := ((v_mes - 1) / 6) * 6 + 1;
    periodo_inicio := make_date(v_anio, v_bloque, 1);
    periodo_fin := (periodo_inicio + interval '6 months - 1 day')::date;
  elsif p_periodicidad_nombre = 'Anual' then
    periodo_inicio := date_trunc('year', p_fecha)::date;
    periodo_fin := (date_trunc('year', p_fecha) + interval '1 year - 1 day')::date;
  else
    raise exception 'Periodicidad % no reconocida para el cálculo de periodos', p_periodicidad_nombre;
  end if;
  return next;
end;
$$;
```

## E. Generación (research.md #5)

```sql
create extension if not exists pg_cron;

create or replace function public.generar_cumplimientos_fiscales()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_generados integer := 0;
  r_obligacion record;
  r_periodo record;
  v_hoy date := current_date;
  v_fecha_cursor date;
  v_fecha_limite date;
begin
  for r_obligacion in
    select
      ofc.id as obligacion_fiscal_cliente_id,
      ofc.cliente_id,
      ofc.created_at::date as fecha_asignacion,
      p.nombre as periodicidad_nombre
    from public.obligaciones_fiscales_cliente ofc
    join public.clientes c on c.id = ofc.cliente_id and c.estado = 'activo'
    join public.periodicidades p on p.id = ofc.periodicidad_id
    where ofc.estado = 'activa'
  loop
    v_fecha_cursor := r_obligacion.fecha_asignacion;

    while v_fecha_cursor <= v_hoy loop
      select * into r_periodo
      from public.calcular_periodo_fiscal(r_obligacion.periodicidad_nombre, v_fecha_cursor);

      v_fecha_limite := (r_periodo.periodo_fin + interval '1 month')::date;
      v_fecha_limite := make_date(
        extract(year from v_fecha_limite)::integer,
        extract(month from v_fecha_limite)::integer,
        17
      );

      insert into public.cumplimientos_fiscales
        (cliente_id, obligacion_fiscal_cliente_id, periodo_inicio, periodo_fin, periodo_etiqueta, fecha_limite, responsable_id)
      select
        r_obligacion.cliente_id,
        r_obligacion.obligacion_fiscal_cliente_id,
        r_periodo.periodo_inicio,
        r_periodo.periodo_fin,
        to_char(r_periodo.periodo_inicio, 'TMMonth YYYY'),
        v_fecha_limite,
        c.responsable_id
      from public.clientes c where c.id = r_obligacion.cliente_id
      on conflict (obligacion_fiscal_cliente_id, periodo_inicio)
        where obligacion_fiscal_cliente_id is not null
        do nothing;

      if found then
        v_generados := v_generados + 1;
      end if;

      v_fecha_cursor := (r_periodo.periodo_fin + interval '1 day')::date;
    end loop;
  end loop;

  return v_generados;
end;
$$;

comment on function public.generar_cumplimientos_fiscales() is
  'FR-001/FR-002/FR-003: genera cumplimientos faltantes para obligaciones activas de clientes activos, respetando la periodicidad efectiva de cada obligación (calcular_periodo_fiscal). Idempotente vía ON CONFLICT DO NOTHING. security definer: escribe cumplimientos de todos los clientes en una sola ejecución (research.md #5); el Server Action que la invoca manualmente exige requireCapability(''manage_clients'') antes de llamarla.';

select cron.schedule(
  'generar-cumplimientos-fiscales-mensual',
  '0 0 1 * *',
  $$select public.generar_cumplimientos_fiscales()$$
);
```

## F. Contrato de UI

- Bandeja principal (`apps/portal/.../obligaciones-fiscales/page.tsx`): tabla con cliente, RFC, obligación, periodo, fecha límite, estado (con "Vencida" calculada en la consulta), responsable, indicador de documentos asociados; filtros por cliente/RFC/obligación/periodo/estado/responsable; orden por defecto: vencidas primero, luego próximas a vencer por fecha límite ascendente.
- Botón "Generar cumplimientos" (gateado por `manage_clients`) invoca el RPC `generar_cumplimientos_fiscales` manualmente.
- Detalle de un cumplimiento: cambiar estado (Pendiente/En proceso/Presentada/No aplica), cambiar fecha límite, cambiar responsable, asociar/desasociar documentos del Expediente Fiscal del mismo cliente (marcando cuál es el acuse), historial de cambios (leído de `business_audit_log`, mismo patrón que `ServicioHistorialDialog`).
- Alta de cumplimiento extraordinario: formulario con selector opcional de obligación del catálogo (`Autocomplete`, solo activas) + descripción libre (obligatoria si no se eligió obligación) + periodo/fecha límite/responsable manuales.
