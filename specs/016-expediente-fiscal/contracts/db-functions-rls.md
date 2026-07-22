# Contracts: Expediente Fiscal — esquema, funciones y RLS

## A. `documentos` — cambios sobre la tabla existente (005)

```sql
alter table public.documentos
  alter column categoria_id drop not null,
  add column obligacion_fiscal_id uuid references public.obligaciones_fiscales (id),
  add column eliminado_en timestamptz,
  add column eliminado_por uuid references auth.users (id);

alter type public.documento_estado add value if not exists 'eliminado';
```

RLS existente (`documentos_select_view_or_manage`, `documentos_insert_manage`, `documentos_update_manage`) se conserva sin cambios de condición — siguen gateando por `view_documents`/`manage_documents`. No se agrega política de DELETE (el trigger `bloquear_delete_documento` de 005 sigue siendo la única barrera contra el borrado físico).

## B. Trigger de eliminación lógica: antigüedad + rol

```sql
create or replace function public.validar_eliminacion_logica_documento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.app_role;
begin
  if OLD.estado = 'eliminado' or NEW.estado <> 'eliminado' then
    return NEW;
  end if;

  select role into v_role from public.profiles where id = auth.uid();

  if v_role = 'administrador' then
    NEW.eliminado_en := now();
    NEW.eliminado_por := auth.uid();
    return NEW;
  end if;

  if now() - OLD.fecha_carga > interval '3 months' then
    raise exception 'Solo un Administrador puede eliminar un documento con más de tres meses de antigüedad';
  end if;

  NEW.eliminado_en := now();
  NEW.eliminado_por := auth.uid();
  return NEW;
end;
$$;

create trigger trg_documentos_validar_eliminacion_logica
  before update on public.documentos
  for each row
  execute function public.validar_eliminacion_logica_documento();
```

La antigüedad se calcula siempre contra `OLD.fecha_carga` (fecha de alta original), nunca `updated_at` (FR-023).

## C. Auditoría — eventos nuevos sobre `documentos`

El trigger `trg_documentos_audit_fn` (005) ya registra `carga`/`modificacion`/`eliminacion` genéricos vía `log_business_audit`. Se amplía para distinguir cambios de Tipo de Documento y la transición a eliminación lógica:

```sql
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
    if OLD.estado <> 'eliminado' and NEW.estado = 'eliminado' then
      perform public.log_business_audit(
        'documento', NEW.id, 'eliminacion_logica',
        jsonb_build_object('eliminado_por', NEW.eliminado_por, 'eliminado_en', NEW.eliminado_en)
      );
    elsif OLD.categoria_id is distinct from NEW.categoria_id then
      perform public.log_business_audit(
        'documento', NEW.id, 'cambio_tipo_documento',
        jsonb_build_object('anterior', OLD.categoria_id, 'nuevo', NEW.categoria_id)
      );
    else
      perform public.log_business_audit(
        'documento', NEW.id, 'modificacion',
        jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
      );
    end if;
    return NEW;
  elsif TG_OP = 'DELETE' then
    perform public.log_business_audit('documento', OLD.id, 'eliminacion', to_jsonb(OLD));
    return OLD;
  end if;
  return null;
end;
$$;
```

`cumplimiento_fiscal_documentos` ya audita `asociacion_documento`/`desasociacion_documento` (015) — sin cambios.

## D. `cumplimiento_fiscal_documentos` — unicidad por documento

```sql
create unique index cumplimiento_fiscal_documentos_documento_unique
  on public.cumplimiento_fiscal_documentos (documento_id);
```

Un `insert` que intente asociar un documento ya asociado a otro cumplimiento falla con violación de esta unique — se traduce a mensaje de usuario en `packages/utils` (mismo patrón que `mapearErrorCumplimientoFiscalAMensaje`, 015).

## E. `documentos_esperados_obligacion` (configuración)

```sql
create table public.documentos_esperados_obligacion (
  id uuid primary key default gen_random_uuid(),
  obligacion_fiscal_id uuid not null references public.obligaciones_fiscales (id),
  categoria_documento_id uuid not null references public.categorias_documento (id),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id),
  unique (obligacion_fiscal_id, categoria_documento_id)
);

alter table public.documentos_esperados_obligacion enable row level security;

create policy "documentos_esperados_obligacion_select_all_staff"
  on public.documentos_esperados_obligacion for select
  using (auth.role() = 'authenticated');

create policy "documentos_esperados_obligacion_insert_admin_only"
  on public.documentos_esperados_obligacion for insert
  with check (public.has_capability('manage_catalogs'));

create policy "documentos_esperados_obligacion_update_admin_only"
  on public.documentos_esperados_obligacion for update
  using (public.has_capability('manage_catalogs'))
  with check (public.has_capability('manage_catalogs'));

create or replace function public.trg_documentos_esperados_obligacion_audit_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_business_audit('documento_esperado_obligacion', NEW.id, 'alta', to_jsonb(NEW));
    return NEW;
  elsif TG_OP = 'UPDATE' then
    perform public.log_business_audit(
      'documento_esperado_obligacion', NEW.id, 'modificacion',
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
    );
    return NEW;
  end if;
  return null;
end;
$$;

create trigger trg_documentos_esperados_obligacion_audit
  after insert or update on public.documentos_esperados_obligacion
  for each row
  execute function public.trg_documentos_esperados_obligacion_audit_fn();
```

Sin política de DELETE — desactivar (`activo = false`) es el mecanismo de "eliminar" un esperado de la configuración (FR-010: "conservar el historial correspondiente").

## F. `cumplimiento_documentos_esperados` (snapshot) + trigger de generación

```sql
create table public.cumplimiento_documentos_esperados (
  id uuid primary key default gen_random_uuid(),
  cumplimiento_id uuid not null references public.cumplimientos_fiscales (id),
  categoria_documento_id uuid not null references public.categorias_documento (id),
  created_at timestamptz not null default now(),
  unique (cumplimiento_id, categoria_documento_id)
);

alter table public.cumplimiento_documentos_esperados enable row level security;

create policy "cumplimiento_documentos_esperados_select"
  on public.cumplimiento_documentos_esperados for select
  using (public.has_capability('view_clients') or public.has_capability('manage_clients'));

-- Sin política de insert/update/delete de aplicación: solo el trigger (security definer) escribe aquí.

create or replace function public.trg_cumplimientos_fiscales_snapshot_esperados_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_obligacion_fiscal_id uuid;
begin
  select ofc.obligacion_fiscal_id into v_obligacion_fiscal_id
  from public.obligaciones_fiscales_cliente ofc
  where ofc.id = NEW.obligacion_fiscal_cliente_id;

  if v_obligacion_fiscal_id is null then
    v_obligacion_fiscal_id := NEW.obligacion_fiscal_id;
  end if;

  if v_obligacion_fiscal_id is null then
    return NEW;
  end if;

  insert into public.cumplimiento_documentos_esperados (cumplimiento_id, categoria_documento_id)
  select NEW.id, deo.categoria_documento_id
  from public.documentos_esperados_obligacion deo
  where deo.obligacion_fiscal_id = v_obligacion_fiscal_id
    and deo.activo = true
  on conflict (cumplimiento_id, categoria_documento_id) do nothing;

  return NEW;
end;
$$;

create trigger trg_cumplimientos_fiscales_snapshot_esperados
  after insert on public.cumplimientos_fiscales
  for each row
  execute function public.trg_cumplimientos_fiscales_snapshot_esperados_fn();
```

Este trigger cubre tanto la generación mensual (`generar_cumplimientos_fiscales`, 015) como los cumplimientos extraordinarios (015 US4) sin modificar ninguna de las dos rutas de inserción existentes.

## G. Capacidades — `manage_documents` para Contador y Auxiliar

`packages/auth/src/roles.ts`:

```ts
contador: new Set<Capability>([
  'manage_clients',
  'view_clients',
  'manage_billing',
  'view_billing',
  'view_documents',
  'manage_documents', // nuevo — 016-expediente-fiscal
]),
auxiliar: new Set<Capability>([
  'view_clients',
  'view_billing',
  'view_documents',
  'manage_documents', // nuevo — 016-expediente-fiscal
]),
```

`specs/003-supabase-auth-roles/contracts/role-permissions.md` se actualiza para reflejar `manage_documents` como ✅ en las tres columnas, y su nota "sin módulo todavía" se retira (016 es ese módulo).

**Espejo obligatorio en SQL**: `public.has_capability(cap text)` (definida en `20260716090000_business_audit_log.sql`) tiene su propia copia de esta plantilla en PL/pgSQL — es la que realmente evalúan las políticas RLS, no el archivo TypeScript. La migración de 016 la reemplaza con `create or replace function` agregando `'manage_documents'` a las ramas `contador`/`auxiliar` del `case`; sin este cambio, RLS seguiría bloqueando a Contador/Auxiliar aunque `packages/auth` ya les muestre la capacidad en la UI.

## H. Storage — bucket y acceso temporal

- Bucket privado `expedientes` (Supabase Storage), sin acceso público.
- Ruta: `{cliente_id}/{documento_id}.pdf`.
- Subida: Server Action con la sesión del usuario (no `service_role`), inserta primero la fila en `documentos` (para obtener `id`), luego `storage.from('expedientes').upload(ruta, archivo)`.
- Visualización/descarga: `storage.from('expedientes').createSignedUrl(ruta, 300)` (5 minutos) — nunca una URL pública ni permanente.
- Políticas de Storage (bucket privado): `select`/`insert` condicionadas a `has_capability('view_documents')`/`has_capability('manage_documents')` respectivamente, igual que la tabla `documentos`.

## I. UI — resumen de contrato

| Pantalla                                | Ruta                                                                 | Datos                                                                                                            |
| --------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Expediente del cliente                  | `apps/portal/clientes/[clienteId]` (sección nueva)                   | Documentos Generales / por Periodo, carga, clasificación, asociar/desasociar cumplimiento u obligación, eliminar |
| Documentos Esperados de un cumplimiento | `apps/portal/obligaciones-fiscales/[cumplimientoId]` (sección nueva) | Lista esperados (disponible/faltante) + documentos adicionales del cumplimiento                                  |
| Vista global de Expedientes             | `apps/portal/documentos-fiscales` (nueva)                            | Búsqueda/filtro transversal, enlace al expediente del cliente                                                    |
| Catálogo Tipos de Documento             | `apps/admin/catalogos/tipos-documento` (nueva)                       | CRUD sobre `categorias_documento` (crear/editar/activar/desactivar)                                              |
| Documentos Esperados de una obligación  | `apps/admin/catalogos/obligaciones-fiscales` (sección nueva)         | CRUD sobre `documentos_esperados_obligacion`                                                                     |
