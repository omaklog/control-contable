-- Feature 005-clientes-cobranza-expedientes — corrección detectada al
-- refinar 007-alta-cliente-portal (2026-07-18).
--
-- La política original ("business_audit_log_select_admin_only",
-- 20260716090000_business_audit_log.sql) restringía el SELECT de
-- business_audit_log exclusivamente a is_administrador(). Pero
-- docs/ux/design-system.md §9.2 (Cliente 360) describe que la pestaña
-- "Auditoría" de un cliente es visible para cualquier usuario que pueda ver
-- ese cliente (incluido Auxiliar, en solo lectura) — no solo Administrador.
-- Se reemplaza la política para usar el mismo gate ya usado por
-- clientes/contactos: view_clients o manage_clients.

drop policy if exists "business_audit_log_select_admin_only" on public.business_audit_log;

create policy "business_audit_log_select_staff" on public.business_audit_log
  for select
  using (public.has_capability('view_clients') or public.has_capability('manage_clients'));

comment on table public.business_audit_log is
  'Auditoría de negocio (FR-018): altas/modificaciones de clientes, cambios en pagos, carga/eliminación de documentos, generación de recibos. Poblada exclusivamente por triggers via log_business_audit(). SELECT: cualquier miembro del personal con view_clients o manage_clients (005, corregido 2026-07-18 para alinearse con docs/ux/design-system.md §9.2 — Cliente 360 permite a Auxiliar consultar la pestaña Auditoría en solo lectura).';
