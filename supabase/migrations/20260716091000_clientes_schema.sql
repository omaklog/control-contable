-- Feature 005-clientes-cobranza-expedientes, Historia 1 (Cliente, P1).
-- Régimen Fiscal (catálogo sembrado desde assets/regimenes.json), Cliente y
-- Contacto, con validación de régimen fiscal (compatibilidad tipo de persona
-- + vigencia) y RFC único entre clientes activos.
-- Ver specs/005-clientes-cobranza-expedientes/data-model.md,
-- research.md Decisión 6 y Decisión 7, contracts/db-functions-rls.md.

-- =============================================================================
-- 1. Enums
-- =============================================================================

create type public.tipo_persona as enum ('fisica', 'moral');
create type public.cliente_estado as enum ('activo', 'inactivo');

-- =============================================================================
-- 2. regimenes_fiscales (catálogo SAT, sembrado — FR-020)
-- =============================================================================

create table public.regimenes_fiscales (
  codigo text primary key,
  descripcion text not null,
  aplica_persona_fisica boolean not null,
  aplica_persona_moral boolean not null,
  fecha_inicio_vigencia date not null,
  fecha_fin_vigencia date
);

comment on table public.regimenes_fiscales is
  'Catálogo de Regímenes Fiscales del SAT (FR-020). Sembrado con los 23 registros de specs/005-clientes-cobranza-expedientes/assets/regimenes.json. El mecanismo para agregar nuevos regímenes desde la interfaz se define en una fase posterior.';

insert into public.regimenes_fiscales
  (codigo, descripcion, aplica_persona_fisica, aplica_persona_moral, fecha_inicio_vigencia, fecha_fin_vigencia)
values
  ('601', 'General de Ley Personas Morales', false, true, '2016-11-12', null),
  ('603', 'Personas Morales con Fines no Lucrativos', false, true, '2016-11-12', null),
  ('605', 'Sueldos y Salarios e Ingresos Asimilados a Salarios', true, false, '2016-11-12', null),
  ('606', 'Arrendamiento', true, false, '2016-11-12', null),
  ('607', 'Régimen de Enajenación o Adquisición de Bienes', true, false, '2016-11-12', null),
  ('608', 'Demás ingresos', true, false, '2016-11-12', null),
  ('609', 'Consolidación', false, true, '2016-11-12', '2019-12-31'),
  ('610', 'Residentes en el Extranjero sin Establecimiento Permanente en México', true, true, '2016-11-12', null),
  ('611', 'Ingresos por Dividendos (socios y accionistas)', true, false, '2016-11-12', null),
  ('612', 'Personas Físicas con Actividades Empresariales y Profesionales', true, false, '2016-11-12', null),
  ('614', 'Ingresos por intereses', true, false, '2016-11-12', null),
  ('615', 'Régimen de los ingresos por obtención de premios', true, false, '2016-11-12', null),
  ('616', 'Sin obligaciones fiscales', true, false, '2016-11-12', null),
  ('620', 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos', false, true, '2016-11-12', null),
  ('621', 'Incorporación Fiscal', true, false, '2016-11-12', null),
  ('622', 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras', false, true, '2016-11-12', null),
  ('623', 'Opcional para Grupos de Sociedades', false, true, '2016-11-12', null),
  ('624', 'Coordinados', false, true, '2016-11-12', null),
  ('625', 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas', true, false, '2020-06-01', null),
  ('626', 'Régimen Simplificado de Confianza', true, true, '2022-01-01', null),
  ('628', 'Hidrocarburos', false, true, '2024-01-01', null),
  ('629', 'De los Regímenes Fiscales Preferentes y de las Empresas Multinacionales', true, false, '2024-01-01', null),
  ('630', 'Enajenación de acciones en bolsa de valores', true, false, '2024-01-01', null);

alter table public.regimenes_fiscales enable row level security;

create policy "regimenes_fiscales_select_all_staff" on public.regimenes_fiscales
  for select
  using (auth.role() = 'authenticated');

grant select on public.regimenes_fiscales to authenticated;

-- =============================================================================
-- 3. clientes (FR-001 a FR-004, FR-017, FR-020)
-- =============================================================================

create table public.clientes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  tipo_persona public.tipo_persona not null,
  rfc text not null,
  regimen_fiscal_codigo text not null references public.regimenes_fiscales (codigo),
  correo text not null,
  telefono text,
  direccion_fiscal text,
  estado public.cliente_estado not null default 'activo',
  responsable_id uuid references auth.users (id),
  fecha_alta timestamptz not null default now(),
  fecha_baja timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id)
);

comment on table public.clientes is
  'Cliente del despacho (persona física o moral). Baja es soft-delete vía estado (FR-003); RFC único solo entre clientes activos (FR-002); régimen fiscal validado por trg_clientes_validar_regimen_fiscal.';

create unique index clientes_rfc_activo_unique on public.clientes (rfc) where estado = 'activo';

-- =============================================================================
-- 4. contactos (FR-023)
-- =============================================================================

create table public.contactos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  nombre text not null,
  telefono text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id)
);

comment on table public.contactos is
  'Persona de contacto de un Cliente (FR-023): nombre y teléfono obligatorios, correo opcional.';

-- =============================================================================
-- 5. Trigger: validar régimen fiscal (compatibilidad tipo_persona + vigencia)
-- =============================================================================

create or replace function public.validar_regimen_fiscal_cliente()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.regimenes_fiscales%rowtype;
begin
  select * into r from public.regimenes_fiscales where codigo = NEW.regimen_fiscal_codigo;

  if r.codigo is null then
    raise exception 'El régimen fiscal % no existe en el catálogo', NEW.regimen_fiscal_codigo;
  end if;

  if NEW.tipo_persona = 'fisica' and not r.aplica_persona_fisica then
    raise exception 'El régimen fiscal % no aplica a personas físicas', NEW.regimen_fiscal_codigo;
  end if;

  if NEW.tipo_persona = 'moral' and not r.aplica_persona_moral then
    raise exception 'El régimen fiscal % no aplica a personas morales', NEW.regimen_fiscal_codigo;
  end if;

  if r.fecha_fin_vigencia is not null and r.fecha_fin_vigencia < current_date then
    raise exception 'El régimen fiscal % ya no está vigente', NEW.regimen_fiscal_codigo;
  end if;

  return NEW;
end;
$$;

comment on function public.validar_regimen_fiscal_cliente() is
  'FR-021/FR-022: valida régimen fiscal contra tipo_persona y vigencia. Solo se dispara al insertar o cambiar regimen_fiscal_codigo — un régimen que vence después no invalida retroactivamente a los clientes que ya lo tenían.';

create trigger trg_clientes_validar_regimen_fiscal
  before insert or update of regimen_fiscal_codigo on public.clientes
  for each row
  execute function public.validar_regimen_fiscal_cliente();

-- =============================================================================
-- 6. Trigger: auditoría de negocio en clientes (FR-018)
-- =============================================================================

create or replace function public.trg_clientes_audit_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_business_audit('cliente', NEW.id, 'alta', to_jsonb(NEW));
    return NEW;
  elsif TG_OP = 'UPDATE' then
    perform public.log_business_audit(
      'cliente', NEW.id, 'modificacion',
      jsonb_build_object('before', to_jsonb(OLD), 'after', to_jsonb(NEW))
    );
    return NEW;
  elsif TG_OP = 'DELETE' then
    perform public.log_business_audit('cliente', OLD.id, 'eliminacion', to_jsonb(OLD));
    return OLD;
  end if;
  return null;
end;
$$;

create trigger trg_clientes_audit
  after insert or update or delete on public.clientes
  for each row
  execute function public.trg_clientes_audit_fn();

-- =============================================================================
-- 7. RLS: clientes y contactos (FR-019)
-- =============================================================================

alter table public.clientes enable row level security;

create policy "clientes_select_view_or_manage" on public.clientes
  for select
  using (public.has_capability('view_clients') or public.has_capability('manage_clients'));

create policy "clientes_insert_manage" on public.clientes
  for insert
  with check (public.has_capability('manage_clients'));

create policy "clientes_update_manage" on public.clientes
  for update
  using (public.has_capability('manage_clients'))
  with check (public.has_capability('manage_clients'));

grant select, insert, update on public.clientes to authenticated;

alter table public.contactos enable row level security;

create policy "contactos_select_view_or_manage" on public.contactos
  for select
  using (public.has_capability('view_clients') or public.has_capability('manage_clients'));

create policy "contactos_insert_manage" on public.contactos
  for insert
  with check (public.has_capability('manage_clients'));

create policy "contactos_update_manage" on public.contactos
  for update
  using (public.has_capability('manage_clients'))
  with check (public.has_capability('manage_clients'));

grant select, insert, update on public.contactos to authenticated;
