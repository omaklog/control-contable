# Quickstart: Validación del modelo de datos — Clientes, Cobranza y Expedientes

**Feature**: [spec.md](./spec.md) | **Data Model**: [data-model.md](./data-model.md) | **Contracts**: [contracts/db-functions-rls.md](./contracts/db-functions-rls.md)

Esta guía valida, contra Supabase local, que el esquema implementado en la fase de tareas cumple las reglas de negocio de la especificación. No requiere pantallas de UI — se ejecuta con `psql`/`supabase db` o llamadas directas a la API REST/RPC de Supabase.

## Prerrequisitos

1. Stack local levantado: `supabase start` (o `pnpm --filter ...` según el flujo ya usado en `002-supabase-docker-stack`).
2. Migración de esta feature aplicada: `supabase migration up` (o `supabase db reset` en un entorno limpio).
3. Al menos un usuario de personal existente en `profiles` con rol `administrador` o `contador` (reutilizar el seed de `003-supabase-auth-roles`, p. ej. `supabase/seed-admin.sh`).

## Escenario 1 — Alta y baja de Cliente, régimen fiscal y contactos (US1)

```sql
insert into public.clientes (nombre, tipo_persona, rfc, regimen_fiscal_codigo, correo)
values ('Cliente de Prueba SA de CV', 'moral', 'CDP010101AAA', '601', 'contacto@ejemplo.com')
returning id, estado; -- esperado: estado = 'activo' (601 = "General de Ley Personas Morales", aplica a moral)

-- Alta duplicada del mismo RFC activo debe fallar (FR-002):
insert into public.clientes (nombre, tipo_persona, rfc, regimen_fiscal_codigo, correo)
values ('Otro Cliente', 'moral', 'CDP010101AAA', '601', 'otro@ejemplo.com'); -- esperado: error de unicidad

-- Régimen no aplicable al tipo de persona debe fallar (FR-021): 605 es exclusivo de persona física
insert into public.clientes (nombre, tipo_persona, rfc, regimen_fiscal_codigo, correo)
values ('Cliente Persona Moral con Régimen de Física', 'moral', 'CDP020202BBB', '605', 'otro2@ejemplo.com');
-- esperado: error — régimen no compatible con tipo_persona

-- Régimen no vigente debe fallar (FR-022): 609 "Consolidación" venció el 31-12-2019
insert into public.clientes (nombre, tipo_persona, rfc, regimen_fiscal_codigo, correo)
values ('Cliente con Régimen Vencido', 'moral', 'CDP030303CCC', '609', 'otro3@ejemplo.com');
-- esperado: error — régimen no vigente

insert into public.contactos (cliente_id, nombre, telefono, email)
values ('<id del cliente 601 creado arriba>', 'Juan Pérez', '5555555555', 'juan@ejemplo.com')
returning id; -- esperado: contacto asociado al cliente (FR-023)

update public.clientes set estado = 'inactivo', fecha_baja = now() where rfc = 'CDP010101AAA';
-- esperado: la fila sigue existiendo (soft-delete, FR-003); su historial (incluidos contactos) permanece consultable.
```

## Escenario 2 — Cobranza: cargo, pago parcial, recibo automático con concepto y método de pago (US2)

```sql
select id from public.metodos_pago where nombre = 'transferencia'; -- esperado: 1 fila (catálogo sembrado, FR-024)

insert into public.cargos_cobranza (cliente_id, periodo_mes, periodo_anio, concepto, monto, fecha_vencimiento)
values ('<cliente_id activo>', 7, 2026, 'Honorarios julio', 1500.00, '2026-08-05')
returning id, estado; -- esperado: estado = 'pendiente'

insert into public.pagos (cliente_id, monto, metodo_pago_id) values ('<cliente_id>', 500.00, '<id de transferencia>') returning id;
insert into public.cargo_pagos (cargo_id, pago_id, monto_aplicado) values ('<cargo_id>', '<pago_id>', 500.00);
-- esperado tras esto: cargos_cobranza.estado sigue 'pendiente' (saldo restante 1000.00);
--                     recibos tiene exactamente 1 fila con pago_id = '<pago_id>' y concepto = 'Honorarios julio' (FR-008, FR-025, generado automáticamente sin acción manual)

insert into public.pagos (cliente_id, monto, metodo_pago_id) values ('<cliente_id>', 1000.00, '<id de transferencia>') returning id;
insert into public.cargo_pagos (cargo_id, pago_id, monto_aplicado) values ('<cargo_id>', '<segundo_pago_id>', 1000.00);
-- esperado: cargos_cobranza.estado = 'pagado' (FR-005); recibos ahora tiene 2 filas (una por pago)

update public.cargos_cobranza set concepto = 'Honorarios julio (corregido)' where id = '<cargo_id>';
select concepto from public.recibos where pago_id = '<pago_id>';
-- esperado: sigue mostrando 'Honorarios julio' — el recibo ya emitido no cambia (FR-025, Decisión 9)
```

Verificar SC-002: una sola consulta (`select cliente_id, estado from cargos_cobranza where estado in ('pendiente','vencido')`) identifica clientes con adeudo sin cálculo adicional en el cliente.

## Escenario 3 — Expediente: carga, rechazo de no-PDF y versionado (US3)

```sql
insert into public.documentos (cliente_id, categoria_id, nombre_original, tamano_bytes, formato, ruta_almacenamiento, cargado_por)
values ('<cliente_id>', '<categoria_id>', 'constancia_situacion_fiscal.pdf', 204800, 'application/pdf', 'clientes/<cliente_id>/doc1.pdf', '<user_id>')
returning id, version, estado; -- esperado: version = 1, estado = 'activo'

-- Intento de carga no-PDF debe fallar (FR-011):
insert into public.documentos (cliente_id, categoria_id, nombre_original, tamano_bytes, formato, ruta_almacenamiento, cargado_por)
values ('<cliente_id>', '<categoria_id>', 'foto.png', 1024, 'image/png', 'clientes/<cliente_id>/doc2.png', '<user_id>');
-- esperado: error de constraint (formato != 'application/pdf')

-- Nueva versión del primer documento:
insert into public.documentos (cliente_id, categoria_id, nombre_original, tamano_bytes, formato, ruta_almacenamiento, cargado_por, version, documento_anterior_id)
values ('<cliente_id>', '<categoria_id>', 'constancia_situacion_fiscal_v2.pdf', 210000, 'application/pdf', 'clientes/<cliente_id>/doc1_v2.pdf', '<user_id>', 2, '<id del documento v1>')
returning id, version, estado; -- esperado: version = 2, estado = 'activo'

-- esperado: el documento v1 ahora tiene estado = 'reemplazado' (actualizado por la capa de servicio en la misma operación de reemplazo, FR-013)

delete from public.documentos where id = '<id del documento v1>';
-- esperado: error — eliminación física bloqueada sin autorización explícita (FR-015)
```

## Escenario 4 — Auditoría (FR-018)

```sql
select entidad, accion, entidad_id from public.business_audit_log order by creado_en desc limit 5;
-- esperado: una fila por cada alta de cliente, cambio de pago, carga de documento y generación de recibo ejecutados arriba
```

## Limpieza

```sql
delete from public.business_audit_log where entidad_id in ('<ids de prueba>');
-- Los datos de negocio (clientes, cargos, pagos, documentos, recibos) creados en este quickstart son de prueba;
-- para un entorno compartido, usar `supabase db reset` en vez de borrar manualmente.
```
