# Implementation Plan: Gestión de Pagos

**Branch**: `018-gestion-pagos` | **Date**: 2026-07-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/018-gestion-pagos/spec.md`

## Summary

Extender la tabla `pagos` ya construida en 017-cobranza con un ciclo de vida de estado (`activo`/`revertido`/`eliminado`), distinguiendo explícitamente la eliminación lógica de la reversión (con motivo obligatorio) como dos operaciones independientes; permitir modificar los campos de un pago con auditoría campo por campo y revalidación de saldo; excluir del cálculo de saldo (`cobranzas_resumen`) los pagos que no estén activos; agregar comprobantes de pago (archivos adjuntos, 0..N por pago, eliminables de forma independiente vía un bucket de Storage dedicado); y agregar una vista global de pagos con filtros combinables, además de extender el historial de pagos ya existente en el detalle de cobranza. Se mantiene sin cambios la regla de 017 de que una cobranza con pagos nunca puede eliminarse (solo cancelarse/anularse) y la generación automática del registro de `recibos` por pago (Clarifications).

## Technical Context

**Language/Version**: TypeScript 5 (strict, `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`), Next.js App Router (React 19)

**Primary Dependencies**: MUI, Formik + Yup, Supabase JS client (`@control-contable/supabase-client`), `@control-contable/auth` (`requireCapability`), Supabase Storage (nuevo bucket `comprobantes-pago`, mismo mecanismo ya usado por `expedientes` en 016)

**Storage**: PostgreSQL (Supabase local) — extiende `pagos` (017) con `estado`/`motivo_reversion`; agrega `comprobantes_pago` (nueva); ajusta `cobranzas_resumen` y `validar_pago_cobranza` (017) para excluir pagos no activos del saldo. Supabase Storage — nuevo bucket privado `comprobantes-pago`.

**Testing**: Vitest (unit en `packages/utils`, integración contra Supabase local real en `packages/utils/src/*.integration.test.ts`)

**Target Platform**: `apps/portal` únicamente — mismo alcance que 017 (Contador/Auxiliar no tienen acceso a `apps/admin`); no hay ninguna acción de este spec reservada exclusivamente a Administrador

**Project Type**: Web monorepo (Next.js App Router, `apps/portal` + `packages/*`)

**Performance Goals**: Sin metas de throughput específicas; la vista global de pagos debe resolver sus filtros combinados con una sola consulta paginada, mismo patrón que `/cobranza` y `/obligaciones-fiscales` (sin N+1 por fila)

**Constraints**: Un pago en estado `revertido`/`eliminado` es terminal (sin excepción, a nivel de base de datos); ninguna modificación de monto puede dejar la suma de pagos activos de una cobranza por encima de su total; los comprobantes se almacenan y eliminan físicamente en Storage, nunca como soft delete

**Scale/Scope**: Mismo alcance que 017 — un despacho contable único, cientos de clientes, pocos pagos y comprobantes por cobranza

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio de la Constitución                                                              | Cumplimiento                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Cobranza... historial de pagos, recibos emitidos"                                        | ✅ El historial de pagos (017) se extiende con estado/motivo/comprobantes; los recibos ya emitidos por 017 continúan generándose sin cambios (Clarifications, research.md Decisión 10).                                                                                                                                                                                                      |
| Base de Datos — trazabilidad, timestamps, soft delete                                     | ✅ La eliminación de un pago es lógica (`estado = 'eliminado'`), nunca un DELETE físico; la única excepción explícita es el archivo de un comprobante en Storage, que FR-012 exige borrar físicamente — la metadata del comprobante también se elimina físicamente porque no tiene sentido de negocio conservar la fila de un archivo que ya no existe (justificado en Complexity Tracking). |
| Documentos Digitales — "nunca eliminar físicamente documentos sin autorización explícita" | ✅ La eliminación de un comprobante exige `manage_billing` (autorización explícita) y genera un evento de auditoría permanente en `business_audit_log` — el principio se cumple mediante el gate de capacidad + el rastro de auditoría, no mediante la conservación del archivo mismo (dominio distinto al Expediente Fiscal de 016, que sí exige conservar PDFs).                           |
| Seguridad — "nunca confiar únicamente en validaciones del frontend"                       | ✅ Estados terminales, tope de saldo en modificaciones, y motivo obligatorio de reversión se validan con constraints y triggers en base de datos, no solo en la UI.                                                                                                                                                                                                                          |
| Multi-Usuario — roles Administrador/Contador/Auxiliar                                     | ✅ Reutiliza `manage_billing`/`view_billing` sin cambios ni capacidades nuevas (spec Assumptions, research.md Decisión 12) — a diferencia de 017, ninguna operación de este spec está reservada a un rol específico.                                                                                                                                                                         |
| Rendimiento — paginación, consultas eficientes                                            | ✅ La vista global de pagos pagina y filtra con una sola consulta combinada, mismo patrón que `/cobranza` (017) y `/obligaciones-fiscales` (015).                                                                                                                                                                                                                                            |
| Testing — pruebas unitarias y de integración                                              | ✅ Mismo patrón `packages/utils/src/*.test.ts` + `*.integration.test.ts` ya usado en 011/013/014/015/016/017.                                                                                                                                                                                                                                                                                |

**Complejidad a justificar**: la eliminación de un `comprobante_pago` es un `DELETE` físico (fila + archivo), no un soft delete — la única excepción de este tipo en el proyecto hasta ahora (todo lo demás usa `estado`/columnas lógicas). Se documenta y justifica en Complexity Tracking abajo.

## Project Structure

### Documentation (this feature)

```text
specs/018-gestion-pagos/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── db-functions-rls.md  # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
supabase/migrations/
└── 20260724100000_gestion_pagos_schema.sql
    # ALTER pagos (agrega estado/motivo_reversion + constraint), política
    # UPDATE nueva; validar_transicion_pago() (estado terminal);
    # validar_pago_cobranza() extendida (revalida saldo en UPDATE, excluye
    # el propio pago); cobranzas_resumen recreada (filtra estado='activo');
    # trg_pagos_audit_fn() redefinida (modificacion/eliminacion_logica/
    # reversion); CREATE comprobantes_pago + RLS + auditoría; bucket
    # Storage `comprobantes-pago` + policies.

packages/utils/src/
├── pagoCobranzaForm.ts (017, sin cambios de esquema)
│   # Se reutiliza para registrar pagos nuevos; modificar un pago usa el
│   # mismo esquema base (monto, metodoPagoId, fechaPago, comentario)
├── modificarPagoForm.ts / .test.ts
│   # Yup schema de modificación (mismo shape que pagoCobranzaForm) +
│   # mapeo de error "excede el saldo" reutilizado
├── revertirPagoForm.ts / .test.ts
│   # Yup schema de reversión (motivoReversion requerido)
└── pagos.integration.test.ts
    # Nuevo: modificación con revalidación de saldo y auditoría por campo,
    # reversión con motivo obligatorio y recalculo de saldo, eliminación
    # lógica y exclusión del saldo, estados terminales (revertido/eliminado
    # no transicionan), comprobantes (adjuntar, eliminar, sin validar
    # duplicidad, RLS de Storage), filtros combinados de la vista global

apps/portal/src/app/(app)/pagos/
├── page.tsx                        # Vista global de pagos (nueva) — filtros
│                                    # combinables + paginación, mismo patrón
│                                    # que apps/portal/.../cobranza/page.tsx
└── PagosClient.tsx

apps/portal/src/app/(app)/cobranza/[cobranzaId]/
├── actions.ts                       # [MODIFICAR] agrega modificarPago,
│                                    # revertirPago, eliminarPago,
│                                    # adjuntarComprobante, eliminarComprobante
├── page.tsx                         # [MODIFICAR] incluye comprobantes por pago
└── CobranzaDetalleClient.tsx        # [MODIFICAR] estado/motivo de reversión
                                      # en el historial, acciones de
                                      # modificar/revertir/eliminar, gestión
                                      # de comprobantes por pago

apps/portal/src/components/layout/navigation.ts
    # [MODIFICAR] agrega la entrada "Pagos" (nueva, sin placeholder previo —
    # research.md Decisión 9)
```

**Structure Decision**: Todo vive en `apps/portal`, mismo alcance que 017 — ninguna operación de este spec está reservada a Administrador, así que no hay pantallas condicionadas por rol más allá del gate ya existente `manage_billing`/`view_billing`. Se agrega una entrada de navegación "Pagos" genuinamente nueva (primera vez en el proyecto sin un placeholder pre-reservado desde 004, ver research.md Decisión 9). El historial de pagos dentro del detalle de cobranza (017) se extiende en el lugar, no se reconstruye.

## Complexity Tracking

| Violation                                                        | Why Needed                                                                                                                                                                                                                                                     | Simpler Alternative Rejected Because                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `comprobantes_pago`: `DELETE` físico de la fila (no soft delete) | FR-012 exige remoción física del archivo de Storage; conservar una fila que apunta a un archivo que ya no existe no tiene ningún uso operativo ni de auditoría (el evento ya queda en `business_audit_log` con el `to_jsonb(OLD)` completo antes de borrarse). | Marcar `comprobantes_pago` con un estado lógico tipo `eliminado` — rechazado: obligaría a toda consulta de comprobantes a filtrar por estado indefinidamente por filas que ya no representan ningún archivo real, sin ganar trazabilidad adicional (la auditoría ya la cubre por completo). |
