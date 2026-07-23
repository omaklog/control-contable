-- Feature 018-gestion-pagos.
-- Extiende pagos (017-cobranza) con un ciclo de vida de estado
-- (activo/revertido/eliminado), distinguiendo eliminación lógica de
-- reversión (con motivo obligatorio); agrega comprobantes_pago (archivos
-- adjuntos, 0..N por pago, bucket de Storage dedicado); ajusta
-- cobranzas_resumen y validar_pago_cobranza para excluir del saldo los
-- pagos que no estén activos. Ver specs/018-gestion-pagos/{research.md,
-- data-model.md,contracts/db-functions-rls.md}.

-- =============================================================================
-- A. pagos: nuevas columnas de estado + política de UPDATE
-- =============================================================================

create type public.pago_estado as enum ('activo', 'revertido', 'eliminado');

alter table public.pagos
  add column estado public.pago_estado not null default 'activo',
  add column motivo_reversion text,
  add constraint pagos_motivo_reversion_check check (
    (estado = 'revertido' and motivo_reversion is not null)
    or (estado <> 'revertido' and motivo_reversion is null)
  );

create policy "pagos_update_manage" on public.pagos
  for update
  using (public.has_capability('manage_billing'))
  with check (public.has_capability('manage_billing'));

-- =============================================================================
-- B. Estado terminal de pagos: revertido/eliminado no admiten más cambios
-- =============================================================================

create or replace function public.validar_transicion_pago()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if OLD.estado in ('revertido', 'eliminado') then
    raise exception 'Un pago % es un estado final y no admite ninguna modificación', OLD.estado;
  end if;

  return NEW;
end;
$$;

create trigger trg_pagos_validar_transicion
  before update on public.pagos
  for each row
  execute function public.validar_transicion_pago();

-- =============================================================================
-- C. Revalidación de saldo también en UPDATE (modificación de monto)
-- =============================================================================

create or replace function public.validar_pago_cobranza()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cobranza public.cobranzas%rowtype;
  v_total_conceptos numeric(12,2);
  v_total_pagado_otros numeric(12,2);
begin
  select * into v_cobranza from public.cobranzas where id = NEW.cobranza_id;

  if TG_OP = 'INSERT' and v_cobranza.estado <> 'vigente' then
    raise exception 'No se pueden registrar pagos sobre una cobranza que no está vigente (estado=%)', v_cobranza.estado;
  end if;

  select coalesce(sum(monto), 0) into v_total_conceptos
  from public.conceptos_cobranza where cobranza_id = NEW.cobranza_id;

  select coalesce(sum(monto), 0) into v_total_pagado_otros
  from public.pagos
  where cobranza_id = NEW.cobranza_id
    and estado = 'activo'
    and id <> NEW.id;

  if NEW.estado = 'activo'
     and v_total_pagado_otros + NEW.monto > v_total_conceptos then
    raise exception 'El pago excede el saldo pendiente de la cobranza';
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_pagos_validar_cobranza on public.pagos;
create trigger trg_pagos_validar_cobranza
  before insert or update on public.pagos
  for each row
  execute function public.validar_pago_cobranza();

-- =============================================================================
-- D. cobranzas_resumen: excluir pagos no activos del importe pagado
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
  where estado = 'activo'
  group by cobranza_id
) pg on pg.cobranza_id = cb.id;

comment on view public.cobranzas_resumen is
  'Estado de pago y de vencimiento SIEMPRE derivados (017, FR-015/FR-016/FR-017), considerando únicamente pagos en estado activo (018, FR-016) — nunca almacenados. Respeta la RLS de las tablas subyacentes (security_invoker).';

alter view public.cobranzas_resumen set (security_invoker = true);

grant select on public.cobranzas_resumen to authenticated;

-- =============================================================================
-- E. Auditoría de pagos: distinguir modificación / eliminación lógica / reversión
-- =============================================================================

create or replace function public.trg_pagos_audit_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_campos jsonb := '{}'::jsonb;
begin
  if TG_OP = 'INSERT' then
    perform public.log_business_audit('pago', NEW.id, 'alta', to_jsonb(NEW));
    return NEW;
  elsif TG_OP = 'UPDATE' then
    if OLD.estado = 'activo' and NEW.estado = 'eliminado' then
      perform public.log_business_audit('pago', NEW.id, 'eliminacion_logica', to_jsonb(OLD));
    elsif OLD.estado = 'activo' and NEW.estado = 'revertido' then
      perform public.log_business_audit(
        'pago', NEW.id, 'reversion',
        jsonb_build_object('before', to_jsonb(OLD), 'motivo_reversion', NEW.motivo_reversion)
      );
    else
      if OLD.monto is distinct from NEW.monto then
        v_campos := v_campos || jsonb_build_object('monto', jsonb_build_object('antes', OLD.monto, 'despues', NEW.monto));
      end if;
      if OLD.fecha_pago is distinct from NEW.fecha_pago then
        v_campos := v_campos || jsonb_build_object('fecha_pago', jsonb_build_object('antes', OLD.fecha_pago, 'despues', NEW.fecha_pago));
      end if;
      if OLD.metodo_pago_id is distinct from NEW.metodo_pago_id then
        v_campos := v_campos || jsonb_build_object('metodo_pago_id', jsonb_build_object('antes', OLD.metodo_pago_id, 'despues', NEW.metodo_pago_id));
      end if;
      if OLD.comentario is distinct from NEW.comentario then
        v_campos := v_campos || jsonb_build_object('comentario', jsonb_build_object('antes', OLD.comentario, 'despues', NEW.comentario));
      end if;

      perform public.log_business_audit('pago', NEW.id, 'modificacion', jsonb_build_object('campos', v_campos));
    end if;
    return NEW;
  elsif TG_OP = 'DELETE' then
    perform public.log_business_audit('pago', OLD.id, 'eliminacion', to_jsonb(OLD));
    return OLD;
  end if;
  return null;
end;
$$;

-- =============================================================================
-- F. comprobantes_pago (nueva)
-- =============================================================================

create table public.comprobantes_pago (
  id uuid primary key default gen_random_uuid(),
  pago_id uuid not null references public.pagos (id),
  nombre_original text not null,
  tipo_archivo text not null,
  tamano_bytes bigint not null check (tamano_bytes > 0),
  ruta_almacenamiento text not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id)
);

alter table public.comprobantes_pago enable row level security;

create policy "comprobantes_pago_select_view_or_manage" on public.comprobantes_pago
  for select
  using (public.has_capability('view_billing') or public.has_capability('manage_billing'));

create policy "comprobantes_pago_insert_manage" on public.comprobantes_pago
  for insert
  with check (public.has_capability('manage_billing'));

create policy "comprobantes_pago_delete_manage" on public.comprobantes_pago
  for delete
  using (public.has_capability('manage_billing'));

create or replace function public.trg_comprobantes_pago_audit_fn()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform public.log_business_audit('comprobante_pago', NEW.id, 'carga', to_jsonb(NEW));
    return NEW;
  elsif TG_OP = 'DELETE' then
    perform public.log_business_audit('comprobante_pago', OLD.id, 'eliminacion', to_jsonb(OLD));
    return OLD;
  end if;
  return null;
end;
$$;

create trigger trg_comprobantes_pago_audit
  after insert or delete on public.comprobantes_pago
  for each row
  execute function public.trg_comprobantes_pago_audit_fn();

-- =============================================================================
-- G. Storage: bucket privado para comprobantes de pago
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comprobantes-pago', 'comprobantes-pago', false, 20971520,
  array['application/pdf', 'image/png', 'image/jpeg']
)
on conflict (id) do nothing;

create policy "comprobantes_pago_storage_select_view_or_manage"
  on storage.objects for select
  using (
    bucket_id = 'comprobantes-pago'
    and (public.has_capability('view_billing') or public.has_capability('manage_billing'))
  );

create policy "comprobantes_pago_storage_insert_manage"
  on storage.objects for insert
  with check (
    bucket_id = 'comprobantes-pago'
    and public.has_capability('manage_billing')
  );

create policy "comprobantes_pago_storage_delete_manage"
  on storage.objects for delete
  using (
    bucket_id = 'comprobantes-pago'
    and public.has_capability('manage_billing')
  );
