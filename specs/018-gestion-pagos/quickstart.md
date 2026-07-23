# Quickstart: Gestión de Pagos

Prerrequisitos: Supabase local corriendo (`supabase start`), migraciones aplicadas, al menos una cobranza vigente con saldo pendiente y al menos un pago activo registrado sobre ella (ver quickstart de 017-cobranza, Escenario 2).

## Escenario 1 (US1) — Modificar un pago registrado

1. Abre el detalle de una cobranza de $7,000 con un pago activo de $2,000 (saldo $5,000).
2. Modifica el monto del pago a $3,000.
3. **Esperado**: el saldo pendiente de la cobranza se recalcula a $4,000; el historial de auditoría muestra `monto: {antes: 2000, despues: 3000}`.
4. Modifica la fecha de pago del mismo pago a una fecha anterior.
5. **Esperado**: el nuevo valor y el anterior quedan en auditoría junto con usuario y fecha/hora del cambio.
6. Intenta modificar el monto a un valor que dejaría la suma de pagos activos por encima del total de la cobranza.
7. **Esperado**: el sistema rechaza el cambio, indicando el saldo máximo disponible.

## Escenario 2 (US2) — Revertir un pago con motivo

1. Sobre una cobranza completamente pagada, localiza uno de sus pagos activos.
2. Intenta revertirlo sin capturar un motivo.
3. **Esperado**: el sistema rechaza la operación y exige el motivo.
4. Revierte el pago indicando el motivo "Transferencia rechazada".
5. **Esperado**: el pago cambia a estado "Revertido", el saldo pendiente de la cobranza vuelve a incluir su monto, el estado de pago se recalcula a "Pendiente" o "Pago Parcial", y el pago sigue visible en el historial con su motivo.
6. Intenta revertir el mismo pago una segunda vez, o eliminarlo lógicamente.
7. **Esperado**: el sistema lo rechaza — un pago revertido es un estado final.

## Escenario 3 (US3) — Eliminar lógicamente un pago

1. Registra un pago por error sobre una cobranza vigente.
2. Elimínalo lógicamente.
3. **Esperado**: el pago deja de contarse en el importe pagado, el saldo pendiente se recalcula, y el pago no aparece en la vista global de pagos con sus filtros por defecto (estado "Activo").
4. Amplía el filtro de estado de la vista global para incluir "Eliminado".
5. **Esperado**: el pago eliminado aparece, marcado como tal.

## Escenario 4 (US4) — Adjuntar y eliminar comprobantes

1. Sobre un pago activo, adjunta dos archivos de comprobante distintos.
2. **Esperado**: ambos quedan asociados con su nombre original, tipo, tamaño, fecha de carga y usuario.
3. Elimina uno de los dos comprobantes.
4. **Esperado**: el archivo se retira del Storage, queda un evento de auditoría, y el pago y el otro comprobante permanecen sin cambios.
5. Adjunta el mismo archivo ya usado a un pago distinto.
6. **Esperado**: el sistema lo permite sin advertir duplicidad.

## Escenario 5 (US5) — Consultar pagos desde la vista global

1. Con pagos de distintos clientes, métodos y fechas ya registrados, abre la vista global de pagos (`apps/portal/pagos`).
2. Filtra por método de pago y un rango de fecha de pago.
3. **Esperado**: solo aparecen los pagos de ese método dentro del rango.
4. Filtra adicionalmente por el usuario que registró el pago.
5. **Esperado**: el resultado se acota a los pagos de ese usuario, combinando ambos filtros.

## Escenario 6 (US6) — Historial de pagos en tiempo real dentro de la cobranza

1. Abre el detalle de una cobranza con al menos dos pagos activos.
2. Elimina lógicamente uno de ellos.
3. **Esperado**: el total pagado y el saldo pendiente mostrados se actualizan de inmediato, sin recargar manualmente otra pantalla.
4. Revierte el otro pago con un motivo.
5. **Esperado**: aparece marcado como "Revertido" con su motivo visible en el historial, y el saldo/estado de la cobranza reflejan el cambio.

**Nota de validación manual**: igual que en 015/016/017, la ejecución real de estos 6 escenarios en el navegador queda pendiente para el usuario (sin Playwright/chromium disponible en este entorno).
