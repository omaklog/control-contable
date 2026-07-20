# Contrato: esquema, RLS y triggers de Obligaciones Fiscales

## Enum

```sql
create type public.obligacion_fiscal_estado as enum ('activo', 'inactivo');
```

## Tabla

```sql
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

create unique index obligaciones_fiscales_nombre_activo_unique
  on public.obligaciones_fiscales (nombre)
  where estado = 'activo';
```

## RLS

```sql
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
```

Sin política ni `grant` de `delete` para `authenticated` — ninguna obligación se elimina físicamente (FR-003), igual que el resto de catálogos del sistema.

## Trigger: validar periodicidad activa (alta y edición)

```sql
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

create trigger trg_obligaciones_fiscales_validar_periodicidad
  before insert or update of periodicidad_id on public.obligaciones_fiscales
  for each row
  execute function public.validar_periodicidad_activa_obligacion();
```

Se dispara tanto en `insert` como cuando se cambia `periodicidad_id` en un `update` (research.md #3) — a diferencia de `validar_servicio_activo_contratado()` (011), que solo valida en el alta porque ese caso de uso no permite cambiar el servicio de un servicio ya contratado.

## Trigger: auditoría de negocio

```sql
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
```

Mismo patrón exacto que `trg_servicios_audit_fn()` (011) — sin necesidad de distinguir un evento adicional como `cambio_precio` (`servicios_contratados`), ya que aquí todo cambio que no sea de `estado` se audita simplemente como `edicion`.

## Contrato de UI

- Listado: búsqueda por nombre, orden alfabético, paginación solo con más de diez registros — igual que Periodicidades (`012`).
- Formulario de alta/edición: selector de periodicidad implementado con `Autocomplete` de MUI, mostrando únicamente periodicidades activas (research.md #5).
- Acciones visibles solo con `manage_catalogs`: Editar, Activar/Desactivar (con confirmación al desactivar, mismo patrón que `ServiciosClient.tsx`).
