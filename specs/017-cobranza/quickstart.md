# Quickstart: Cobranza

Prerrequisitos: Supabase local corriendo (`supabase start`), migraciones aplicadas, al menos un cliente activo con dos servicios contratados activos, y `configuracion_cobranza` con sus valores por defecto (día de generación 1, día límite 20).

## Escenario 1 (US1) — Generar cobranzas del periodo

1. Como Administrador, en `apps/portal/cobranza`, presiona "Generar cobranzas" (generación manual, `p_forzar = true`).
2. **Esperado**: se crea una cobranza para el cliente activo con servicios activos, con un concepto por cada servicio y el precio acordado vigente; un cliente activo sin servicios activos no genera ninguna cobranza.
3. Presiona "Generar cobranzas" nuevamente para el mismo periodo.
4. **Esperado**: no se crean cobranzas ni conceptos duplicados.
5. Cambia el precio acordado de uno de los servicios del cliente.
6. **Esperado**: la cobranza ya generada conserva el monto anterior; solo una cobranza generada después usaría el nuevo precio.

## Escenario 2 (US2) — Registrar pagos y ver saldo/estado

1. Abre el detalle de la cobranza generada en el Escenario 1 (supongamos total $5,000).
2. Registra un pago de $2,000.
3. **Esperado**: saldo $3,000, estado de pago "Pago Parcial".
4. Intenta registrar un pago de $4,000 (excede el saldo).
5. **Esperado**: el sistema rechaza el pago.
6. Registra un pago de $3,000 (completa el saldo).
7. **Esperado**: saldo $0, estado de pago "Pagada", y se genera un recibo con folio para cada pago.

## Escenario 3 (US3) — Registrar e incorporar un cargo extraordinario

1. Registra un cargo extraordinario para el mismo cliente, con periodo objetivo el mes actual.
2. Genera (o vuelve a generar) las cobranzas del periodo.
3. **Esperado**: el cargo aparece como concepto adicional en la cobranza existente del cliente, y su estado cambia a "Incorporado".
4. Intenta eliminar el cargo extraordinario ya incorporado.
5. **Esperado**: el sistema lo rechaza.

## Escenario 4 (US4) — Consultar cobranzas con filtros

1. Genera cobranzas para al menos dos clientes en distintos meses.
2. Filtra por mes y estado de vencimiento "Vencida" (usando una cobranza con fecha límite en el pasado y saldo pendiente).
3. **Esperado**: solo aparecen las cobranzas de ese mes con saldo pendiente fuera de plazo.
4. Como Contador o Auxiliar, abre la bandeja sin aplicar filtros.
5. **Esperado**: ve por defecto sus clientes asignados con cobranzas pendientes de pago; puede quitar ese filtro y ver cualquier cobranza que su capacidad le permita consultar (Clarifications).

## Escenario 5 (US5) — Eliminar, cancelar o anular

1. Genera una cobranza sin registrar pagos y elimínala.
2. **Esperado**: deja de aparecer en la bandeja operativa; el registro se conserva para auditoría.
3. Genera otra cobranza, registra un pago parcial, e intenta eliminarla.
4. **Esperado**: el sistema lo rechaza, indicando que debe cancelarse o anularse.
5. Cancela/anula esa misma cobranza.
6. **Esperado**: la cobranza, sus conceptos y su pago permanecen consultables como historial; no admite nuevos pagos.

## Escenario 6 (US6) — Configuración y Dashboard

1. Como Administrador, cambia el día límite de pago de 20 a 15.
2. Genera una nueva cobranza.
3. **Esperado**: la nueva cobranza usa fecha límite del día 15; las cobranzas generadas antes del cambio conservan su fecha límite original.
4. Abre el Dashboard.
5. **Esperado**: la tarjeta "Clientes sin servicios activos" muestra la cantidad correcta y permite acceder al listado.

**Nota de validación manual**: igual que en 015/016, la ejecución real de estos 6 escenarios en el navegador queda pendiente para el usuario (sin Playwright/chromium disponible en este entorno).
