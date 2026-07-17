-- Feature 008-contactos-y-detalle-cliente, Fase Foundational.
-- Agrega a public.contactos las columnas `estado` (reemplaza la eliminación
-- física por un soft-delete "obsoleto") y `es_principal` (contacto principal
-- de un Cliente), con un índice único parcial que garantiza a lo más un
-- contacto principal por cliente incluso ante escrituras concurrentes.
-- Ver specs/008-contactos-y-detalle-cliente/data-model.md,
-- research.md Decisión 2 y Decisión 3.

-- =============================================================================
-- 1. Enum contacto_estado
-- =============================================================================

create type public.contacto_estado as enum ('activo', 'obsoleto');

-- =============================================================================
-- 2. Columnas nuevas en contactos
-- =============================================================================

alter table public.contactos
  add column estado public.contacto_estado not null default 'activo',
  add column es_principal boolean not null default false;

comment on table public.contactos is
  'Persona de contacto de un Cliente (FR-023): nombre y teléfono obligatorios, correo opcional. Nunca se elimina físicamente — estado=obsoleto reemplaza el borrado (008-contactos-y-detalle-cliente FR-006). A lo más un contacto puede ser es_principal=true por cliente (ver contactos_principal_unico).';

comment on column public.contactos.estado is
  '008-contactos-y-detalle-cliente FR-006: activo por defecto; obsoleto reemplaza la eliminación física, reversible.';

comment on column public.contactos.es_principal is
  '008-contactos-y-detalle-cliente FR-007: contacto principal del cliente; a lo más uno en true por cliente_id (contactos_principal_unico).';

-- =============================================================================
-- 3. Índice único parcial: a lo más un contacto principal por cliente
-- =============================================================================

create unique index contactos_principal_unico
  on public.contactos (cliente_id)
  where es_principal;
