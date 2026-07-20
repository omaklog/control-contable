# Contrato: esquema, RLS, triggers y función de Obligaciones Fiscales del Cliente

## A. `plantillas_obligaciones` (catálogo editable, mismo contrato que `obligaciones_fiscales` de 013)

```sql
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
```

Trigger de auditoría (`trg_plantillas_obligaciones_audit_fn`): mismo patrón exacto que `trg_obligaciones_fiscales_audit_fn` (013) — `alta`/`edicion`/`activacion`/`desactivacion`.

## B. `plantilla_obligaciones_items` (detalle de una plantilla)

```sql
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
```

A diferencia de las tablas de catálogo de nivel superior, los ítems de una plantilla sí admiten `delete` real — quitar una obligación de una plantilla en edición no tiene ninguna implicación de integridad histórica propia (la integridad histórica vive en `obligaciones_fiscales_cliente`, ya copiado e independiente).

Trigger `BEFORE INSERT` (reutilizando `validar_periodicidad_activa_obligacion` de `013` no es directamente aplicable porque valida contra `obligaciones_fiscales`, no contra esta tabla — se define un trigger análogo `validar_periodicidad_activa_item_plantilla()` con la misma lógica) y un segundo trigger `validar_obligacion_activa_item_plantilla()` (análogo a `validar_servicio_activo_contratado` de 011) que rechaza obligaciones fiscales inactivas del catálogo.

## C. `obligaciones_fiscales_cliente`

```sql
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
```

**Nota crítica (research.md #3)**: la política de `delete` exige `estado = 'activa'` — una fila `no_aplica` nunca puede eliminarse, ni siquiera con `manage_clients`. Es la primera tabla del sistema con una vía de eliminación física real, y por eso la única con política de `delete`.

### Trigger: validar obligación fiscal activa (alta)

```sql
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
```

### Trigger: validar periodicidad activa (alta y edición)

Mismo patrón que `validar_periodicidad_activa_obligacion()` (013), aplicado sobre `obligaciones_fiscales_cliente`, disparado en `BEFORE INSERT OR UPDATE OF periodicidad_id` (FR-007 permite cambiar la periodicidad después de la asignación).

### Trigger: auditoría (incluye DELETE, research.md #4)

```sql
create or replace function public.trg_obligaciones_fiscales_cliente_audit_fn()
returns trigger
language plpgsql
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_business_audit('obligacion_fiscal_cliente', NEW.id, 'alta', to_jsonb(NEW));
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
```

## D. Función: aplicar una plantilla a un cliente (research.md #2)

```sql
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
```

`security invoker` (el default, explícito aquí por claridad): la política RLS de `insert` de `obligaciones_fiscales_cliente` (`manage_clients`) se aplica normalmente al usuario que llama la función — no se necesita una verificación de capability duplicada dentro de la función. `on conflict ... do nothing` cumple FR-015 (omitir obligaciones que el cliente ya tiene, sin fallar el resto de la copia).

**Nota sobre `orden`**: si el `orden` sugerido de un ítem de plantilla ya está ocupado por otra obligación del cliente (violaría `obligaciones_fiscales_cliente_cliente_orden_unique`), esa fila específica de la plantilla también se omite por el mismo `on conflict do nothing` extendido a ambos índices únicos — el Server Action que invoca esta función debe re-normalizar el orden de las filas recién copiadas si se requiere una secuencia sin huecos (ver quickstart.md).

## E. Contrato de UI

- Sección "Obligaciones Fiscales" dentro de `ClienteDetalleClient.tsx`: selector de plantilla (`Autocomplete`, solo plantillas activas) + botón "Aplicar"; tabla de obligaciones del cliente (`StatusChip` con `variant`/`label` explícitos para `activa`/`no_aplica`, research.md #5); formulario de alta con `Autocomplete` de obligación fiscal (solo activas del catálogo) y de periodicidad (solo activas).
- Pantalla de administración de Plantillas (`apps/admin/.../catalogos/plantillas-obligaciones/`): mismo patrón que `ObligacionesFiscalesClient.tsx` (013) para la plantilla en sí, más una sub-tabla editable de ítems (obligación + periodicidad + orden sugeridos).
