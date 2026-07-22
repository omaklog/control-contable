# Implementation Plan: Cobranza

**Branch**: `017-cobranza` | **Date**: 2026-07-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-cobranza/spec.md`

## Summary

Reemplazar el modelo plano de cobranza de 005-clientes-cobranza-expedientes (`cargos_cobranza` un-concepto-por-fila, `pagos` a nivel cliente, `cargo_pagos` N—N) por el modelo de cabecera + líneas que exige 017: una `cobranza` única por cliente y periodo que concentra `conceptos_cobranza` (congelados al incorporarse, con origen en servicio recurrente o cargo extraordinario) y recibe `pagos` directamente sobre la cabecera. Generación mensual automática (día configurable, por defecto 1) e idempotente, más generación manual con las mismas reglas; estado de pago y de vencimiento calculados de forma independiente; eliminación lógica solo sin pagos, cancelación/anulación con pagos; tarjeta de Dashboard de clientes sin servicios activos.

## Technical Context

**Language/Version**: TypeScript 5 (strict, `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`), Next.js App Router (React 19)

**Primary Dependencies**: MUI, Formik + Yup, Supabase JS client (`@control-contable/supabase-client`), `@control-contable/auth` (`requireCapability`), PostgreSQL `pg_cron` (ya usado por 015 para generación programada)

**Storage**: PostgreSQL (Supabase local) — reemplaza `cargos_cobranza`/`cargo_pagos` (005) por `cobranzas`/`conceptos_cobranza`; agrega `cargos_extraordinarios` y `configuracion_cobranza` (nuevas); adapta `pagos` (pasa de `cliente_id` a `cobranza_id`) y `recibos` (se genera directo desde `pagos`, ya no vía `cargo_pagos`)

**Testing**: Vitest (unit en `packages/utils`, integración contra Supabase local real en `packages/utils/src/*.integration.test.ts`)

**Target Platform**: `apps/portal` únicamente — Administrador, Contador y Auxiliar operan cobranza desde ahí (Contador/Auxiliar no tienen acceso a `apps/admin`); las acciones exclusivas de Administrador (generación manual, configuración de días) viven en la misma pantalla, condicionadas por rol, no en una app separada

**Project Type**: Web monorepo (Next.js App Router, `apps/portal` + `packages/*`)

**Performance Goals**: Sin metas de throughput específicas; prioridad en paginación y en resolver estado de pago/vencimiento con una sola consulta agregada por lista (no N+1 por cobranza), dado el volumen esperado (cientos de clientes, una cobranza por cliente y mes)

**Constraints**: Un único registro de cobranza por cliente+periodo (constraint de base de datos); ningún pago puede exceder el saldo de su cobranza; los montos de concepto y las fechas límite quedan congelados al generarse, inmunes a cambios posteriores en servicios/configuración

**Scale/Scope**: Alcance de un despacho contable único; cientos de clientes, una cobranza mensual por cliente activo con servicios activos, cada una con pocos conceptos y pagos

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio de la Constitución                                                                                                                                    | Cumplimiento                                                                                                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Cobranza constituye una funcionalidad principal... conocer clientes al corriente, con adeudos, historial de pagos, mensualidades pendientes, recibos emitidos" | ✅ Todo esto ya existe en 005 (`pagos`, `recibos`) y se conserva — `recibos` se adapta para generarse directo desde `pagos` (ya no vía `cargo_pagos`), ver research.md Decisión 6. La constitución exige "recibos emitidos" aunque el documento fuente de 017 no los mencione explícitamente — se preservan por mandato constitucional.                                                                                             |
| Base de Datos — trazabilidad, timestamps, soft delete                                                                                                           | ✅ `cobranzas` usa un `estado` de ciclo de vida (`vigente`/`cancelada`/`eliminada`) en vez de DELETE físico (FR-019/FR-020); todas las tablas nuevas llevan `created_at/updated_at/created_by/updated_by`.                                                                                                                                                                                                                          |
| Seguridad — "nunca confiar únicamente en validaciones del frontend"                                                                                             | ✅ Unicidad cliente+periodo, tope de pagos sobre el saldo, y las reglas de eliminación/cancelación se aplican con constraints y triggers en base de datos, no solo en la UI.                                                                                                                                                                                                                                                        |
| Multi-Usuario — roles Administrador/Contador/Auxiliar                                                                                                           | ✅ con matiz: `manage_billing`/`view_billing` (ya asignadas: admin+contador con manage_billing, los tres con view_billing) se reutilizan sin cambios (spec Assumptions); la única acción reservada exclusivamente a Administrador dentro de `manage_billing` (configurar día de generación/día límite) se gatea con una verificación de rol adicional en el Server Action, no con una capacidad nueva — ver research.md Decisión 7. |
| Rendimiento — paginación, consultas eficientes                                                                                                                  | ✅ Los estados de pago/vencimiento se resuelven con una vista SQL agregada (`cobranzas_resumen`) en vez de recalcular en JS por fila, evitando N+1 al listar/filtrar (research.md Decisión 4).                                                                                                                                                                                                                                      |
| Testing — pruebas unitarias y de integración                                                                                                                    | ✅ Mismo patrón `packages/utils/src/*.test.ts` + `*.integration.test.ts` ya usado en 011/013/014/015/016.                                                                                                                                                                                                                                                                                                                           |

**Complejidad a justificar**: esta feature **reemplaza** tablas ya construidas en 005 (`cargos_cobranza`, `cargo_pagos`) en vez de solo extenderlas, algo que no ocurrió en 013-016 (esas solo añadieron columnas/tablas). Se documenta y justifica en Complexity Tracking abajo — no es una violación de principios, pero sí un apartamiento del patrón "solo aditivo" seguido hasta ahora.

## Project Structure

### Documentation (this feature)

```text
specs/017-cobranza/
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
└── 20260723100000_cobranza_v2_schema.sql
    # DROP cargo_pagos, cargos_cobranza, recibos (viejo), sus triggers/funciones
    # y la secuencia de folio; CREATE cobranzas, conceptos_cobranza,
    # cargos_extraordinarios, configuracion_cobranza; ALTER pagos
    # (cliente_id → cobranza_id, referencia → comentario); recibos nuevo
    # (generado directo desde pagos); generar_cobranzas(); pg_cron diario
    # con verificación interna de día configurado (research.md Decisión 5).

packages/utils/src/
├── cobranzaForm.ts / .test.ts
│   # Yup schema de pago (montoPago, metodoPagoId, fechaPago, comentario) +
│   # mapeo de errores Postgres → mensaje
├── cargoExtraordinarioForm.ts / .test.ts
│   # Yup schema de cargo extraordinario (descripcion, monto, periodo objetivo)
├── configuracionCobranzaForm.ts / .test.ts
│   # Yup schema de configuración (diaGeneracion, diaLimitePago)
└── cobranza.integration.test.ts
    # Reemplaza cobranza.integration.test.ts existente: unicidad
    # cliente+periodo, idempotencia de generación, congelamiento de montos,
    # topes de pago, eliminación vs. cancelación, snapshot de recibo

apps/portal/src/app/(app)/cobranza/
├── page.tsx                        # Bandeja de cobranzas (filtros + paginación,
│                                    # mismo patrón que obligaciones-fiscales, 015)
├── CobranzaClient.tsx
├── actions.ts                       # generarCobranzas, registrarCargoExtraordinario,
│                                    # actualizarConfiguracionCobranza (rol-gated)
└── [cobranzaId]/
    ├── page.tsx                     # Detalle: conceptos, pagos, saldo, historial
    ├── CobranzaDetalleClient.tsx
    └── actions.ts                   # registrarPago, agregarConcepto, incorporarCargo,
                                      # eliminarCobranza, cancelarCobranza

apps/portal/src/components/layout/navigation.ts
    # [MODIFICAR] activa el placeholder "Cobranza" (implemented: true)

apps/portal/src/app/(app)/page.tsx (Dashboard)
    # [MODIFICAR] agrega la tarjeta "Clientes sin servicios activos"
```

**Structure Decision**: Todo vive en `apps/portal` (no en `apps/admin`) porque Contador y Auxiliar —que necesitan generar cargos extraordinarios, registrar pagos y consultar cobranzas— no tienen acceso a `apps/admin`; las acciones exclusivas de Administrador (generación manual, configuración de días) se muestran condicionalmente en la misma pantalla, mismo patrón que 015 (`canManage`). Activa el placeholder de navegación "Cobranza" ya reservado desde 004 (`capability: 'view_billing'`), tercer caso de "slot pre-reservado reutilizado" tras 015 y 016. La tarjeta de Dashboard "Clientes sin servicios activos" se agrega a la página de inicio ya existente del portal.

## Complexity Tracking

| Violation                                                               | Why Needed                                                                                                                                                                                                                                                                                                                                                      | Simpler Alternative Rejected Because                                                                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reemplazo (no solo extensión) de `cargos_cobranza`/`cargo_pagos` de 005 | El spec 017 exige una cabecera única por cliente+periodo con conceptos congelados y pagos aplicados directamente a esa cabecera; el modelo de 005 es intencionalmente plano (un cargo = un concepto, sin cabecera) con pagos repartidos N—N vía `cargo_pagos` — estructuralmente incompatible con "una cobranza, múltiples conceptos, pagos sobre la cobranza". | Mantener ambos modelos en paralelo (cargos_cobranza viejo + cobranzas nuevo) duplicaría la lógica de estado/auditoría sin ningún beneficio: no existe UI ni dato de producción sobre el modelo viejo (confirmado por investigación previa), por lo que no hay nada que migrar ni preservar en paralelo. |
