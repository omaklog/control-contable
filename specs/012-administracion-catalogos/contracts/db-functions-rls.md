# Contrato: esquema y RLS de catálogos administrables

Este documento describe (a) el esquema y RLS concretos de `periodicidades` (esta feature) y (b) el patrón que toda especificación futura de un catálogo **editable** (Tipos de Documento, Régimen Fiscal, Obligaciones Fiscales) debe seguir para cumplir el contrato común descrito en `data-model.md`.

## A. `periodicidades` (catálogo protegido — esta feature)

### Enum

```sql
create type public.periodicidad_estado as enum ('activo', 'inactivo');
```

### Tabla

```sql
create table public.periodicidades (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  estado public.periodicidad_estado not null default 'activo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id)
);

create unique index periodicidades_nombre_activo_unique
  on public.periodicidades (nombre)
  where estado = 'activo';
```

### RLS

```sql
alter table public.periodicidades enable row level security;

create policy "periodicidades_select_all_staff" on public.periodicidades
  for select
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_active
    )
  );

grant select on public.periodicidades to authenticated;
```

**Sin políticas de `insert`/`update`/`delete` para `authenticated`** — es la garantía a nivel de base de datos de que un catálogo protegido no admite escritura de nadie, ni siquiera Administrador (FR-014). No se otorga `grant insert/update/delete` a `authenticated`.

### Seed (dentro de la misma migración)

```sql
insert into public.periodicidades (nombre, descripcion) values
  ('Mensual', 'Obligación o proceso que se repite cada mes.'),
  ('Bimestral', 'Obligación o proceso que se repite cada dos meses.'),
  ('Trimestral', 'Obligación o proceso que se repite cada tres meses.'),
  ('Semestral', 'Obligación o proceso que se repite cada seis meses.'),
  ('Anual', 'Obligación o proceso que se repite una vez al año.');
```

## B. Patrón para catálogos editables futuros (referencia, no implementado en esta feature)

Un catálogo que **no** se declare protegido debe seguir el mismo esquema base (`id`, `nombre`, `descripcion`, `estado`, columnas de auditoría) más:

```sql
create policy "<catalogo>_insert_manage_catalogs" on public.<catalogo>
  for insert
  with check (public.has_capability('manage_catalogs'));

create policy "<catalogo>_update_manage_catalogs" on public.<catalogo>
  for update
  using (public.has_capability('manage_catalogs'))
  with check (public.has_capability('manage_catalogs'));
```

Y un trigger de auditoría de negocio análogo a `trg_servicios_audit_fn()` (011), registrando `alta`/`edicion`/`activacion`/`desactivacion` vía `log_business_audit('<catalogo>', NEW.id, <accion>, to_jsonb(NEW))`.

La unicidad de `nombre` se implementa siempre como índice único parcial `where estado = 'activo'` (nunca `unique(nombre)` simple), para permitir reutilizar un nombre después de inactivar un registro.

## C. Contrato de UI (referencia para toda pantalla de catálogo, protegido o editable)

- Barra de búsqueda implementada con `Autocomplete` de MUI sobre `nombre` (búsqueda por escritura anticipada).
- Orden alfabético por `nombre` por defecto.
- Paginación (`rowsPerPage`, ej. 10) activa únicamente cuando `count(*) > 10`; si hay 10 o menos, se muestran todos sin controles de paginación.
- Registros `inactivo` se excluyen de los resultados del `Autocomplete` de selección (nuevos procesos), pero permanecen visibles en la tabla de administración del catálogo (vista histórica) — distinción relevante solo para catálogos editables, ya que Periodicidades no expone ningún proceso externo de selección en esta feature.
- Catálogo protegido: la pantalla no renderiza ningún botón de alta/edición/activación/inactivación — es una tabla de solo lectura.
