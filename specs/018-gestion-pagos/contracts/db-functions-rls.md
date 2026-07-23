# Contracts: Gestión de Pagos — esquema, funciones y RLS

## A. `pagos` — nuevas columnas y política de `UPDATE`

```sql
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
```

No existía política de `UPDATE` sobre `pagos` (017 solo tenía INSERT/SELECT) — se agrega aquí porque modificar, revertir y eliminar lógicamente un pago son, todas, operaciones `UPDATE` sobre la misma fila (cambian columnas de negocio o `estado`, nunca la fila desaparece).

## B. Estado terminal — trigger `BEFORE UPDATE`

```sql
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
```

Mismo patrón que `validar_transicion_cobranza` (017): `revertido`/`eliminado` son estados finales — ni transicionan entre sí, ni vuelven a `activo`, ni admiten ninguna otra modificación de campo una vez alcanzados (FR-009).

## C. Revalidación de saldo en `UPDATE` de monto

```sql
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
  v_monto_propio_anterior numeric(12,2) := 0;
begin
  select * into v_cobranza from public.cobranzas where id = NEW.cobranza_id;

  if TG_OP = 'INSERT' and v_cobranza.estado <> 'vigente' then
    raise exception 'No se pueden registrar pagos sobre una cobranza que no está vigente (estado=%)', v_cobranza.estado;
  end if;

  if TG_OP = 'UPDATE' and OLD.estado = 'activo' then
    v_monto_propio_anterior := OLD.monto;
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
```

`TG_OP = 'UPDATE' and id <> NEW.id` excluye siempre la fila propia de la suma de "otros pagos activos"; sumarle `NEW.monto` solo cuando `NEW.estado = 'activo'` reproduce exactamente la regla de FR-002/FR-004 tanto para pagos nuevos como para modificaciones de monto. Revertir o eliminar un pago (`NEW.estado <> 'activo'`) nunca puede exceder el saldo — se salta la validación.

## D. `cobranzas_resumen` — filtrar por `estado = 'activo'` (ajuste obligatorio, FR-016)

```sql
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
```

Único cambio respecto a 017: `where estado = 'activo'` en la subconsulta `pg`. `security_invoker = true` ya está fijado desde 017 y no requiere volver a declararse.

## E. Auditoría de `pagos` — distinguir modificación / eliminación lógica / reversión

```sql
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
```

El trigger `trg_pagos_audit` (005) ya apunta a esta función — `create or replace function` es suficiente, no requiere recrear el trigger.

## F. `comprobantes_pago` (nueva)

```sql
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
```

Sin política de `UPDATE` — metadata inmutable (Decisión 6, research.md).

## G. Storage: bucket `comprobantes-pago`

```sql
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
```

20 MB y los tres MIME types son un default razonable (comprobantes bancarios: PDF o captura de pantalla) — el spec no fija un límite; ver Assumptions en plan.md. A diferencia del bucket `expedientes` (016), este admite `delete` porque FR-012 exige remoción física.

## H. Server Action de eliminación de comprobante — orden de operaciones

```text
1. supabase.storage.from('comprobantes-pago').remove([ruta_almacenamiento])
2. Si (1) tiene éxito: delete from comprobantes_pago where id = :id
   (dispara trg_comprobantes_pago_audit → evento 'eliminacion')
3. Si (1) falla: no se ejecuta (2); se informa el error sin tocar la fila
```

Mismo orden que usaría cualquier operación de "borrar archivo + su metadata" — el archivo se borra primero para no dejar una fila apuntando a un objeto ya inexistente si el borrado del Storage fallara después del `DELETE`.

## I. Resumen de capacidades y acceso

| Acción                                                                                         | Capacidad                         | Rol adicional |
| ---------------------------------------------------------------------------------------------- | --------------------------------- | ------------- |
| Consultar pagos (vista global, historial en cobranza), consultar comprobantes                  | `view_billing` o `manage_billing` | —             |
| Registrar, modificar, eliminar lógicamente, revertir un pago; adjuntar/eliminar un comprobante | `manage_billing`                  | —             |

Sin capacidades nuevas — reutiliza `manage_billing`/`view_billing` (research.md Decisión 12).

## J. UI — resumen de contrato

| Pantalla                        | Ruta                                                  | Datos                                                                                                                     |
| ------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Vista global de pagos           | `apps/portal/pagos` (nueva)                           | Filtros combinables (cliente, RFC, fecha de pago inicial/final, método, estado, cobranza, usuario), paginación            |
| Detalle de Cobranza (extendido) | `apps/portal/cobranza/[cobranzaId]` (017, modificada) | Historial de pagos con estado/motivo de reversión, acciones modificar/revertir/eliminar, gestión de comprobantes por pago |
