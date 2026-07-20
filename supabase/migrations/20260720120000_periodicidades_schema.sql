-- Feature 012-administracion-catalogos.
-- Catálogo de Periodicidades: primera referencia concreta y protegida (solo
-- consulta) del contrato común de catálogos administrables. Sin tabla de
-- auditoría de negocio propia — no hay transiciones que auditar en un
-- catálogo que no expone ninguna operación de escritura (ver research.md #5).
-- Ver specs/012-administracion-catalogos/data-model.md y
-- contracts/db-functions-rls.md.

-- =============================================================================
-- 1. Enum
-- =============================================================================

create type public.periodicidad_estado as enum ('activo', 'inactivo');

-- =============================================================================
-- 2. periodicidades (catálogo protegido, FR-014/FR-015)
-- =============================================================================

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

comment on table public.periodicidades is
  'Catálogo protegido de periodicidades (012-administracion-catalogos, FR-014/FR-015). Solo consulta: ninguna política RLS de insert/update/delete se otorga a authenticated, ni siquiera para Administrador. Referencia concreta del contrato común de catálogos administrables (data-model.md).';

create unique index periodicidades_nombre_activo_unique
  on public.periodicidades (nombre)
  where estado = 'activo';

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

-- =============================================================================
-- 3. Seed inicial (research.md #6 — contenido no definido por el spec, resuelto
--    aquí como parte de la implementación)
-- =============================================================================

insert into public.periodicidades (nombre, descripcion) values
  ('Mensual', 'Obligación o proceso que se repite cada mes.'),
  ('Bimestral', 'Obligación o proceso que se repite cada dos meses.'),
  ('Trimestral', 'Obligación o proceso que se repite cada tres meses.'),
  ('Semestral', 'Obligación o proceso que se repite cada seis meses.'),
  ('Anual', 'Obligación o proceso que se repite una vez al año.');
