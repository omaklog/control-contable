-- Feature 005-clientes-cobranza-expedientes, corrección post-implementación (US2).
-- Bug: el CASE de recalcular_estado_cargo_cobranza() devolvía texto sin
-- castear a public.cargo_estado, causando el error 42804 ("column estado is
-- of type cargo_estado but expression is of type text") al insertar en
-- cargo_pagos. Se agrega el cast explícito.

create or replace function public.recalcular_estado_cargo_cobranza()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cargo_id uuid;
  v_monto numeric(12, 2);
  v_vencimiento date;
  v_estado_actual public.cargo_estado;
  v_aplicado numeric(12, 2);
begin
  v_cargo_id := coalesce(NEW.cargo_id, OLD.cargo_id);

  select monto, fecha_vencimiento, estado into v_monto, v_vencimiento, v_estado_actual
  from public.cargos_cobranza
  where id = v_cargo_id;

  if v_estado_actual = 'cancelado' then
    return coalesce(NEW, OLD);
  end if;

  select coalesce(sum(monto_aplicado), 0) into v_aplicado
  from public.cargo_pagos
  where cargo_id = v_cargo_id;

  update public.cargos_cobranza
  set estado = (case
    when v_aplicado >= v_monto then 'pagado'
    when v_vencimiento < current_date then 'vencido'
    else 'pendiente'
  end)::public.cargo_estado
  where id = v_cargo_id;

  return coalesce(NEW, OLD);
end;
$$;
