# Data Model: Cobranza

## Entidades reemplazadas (de 005-clientes-cobranza-expedientes)

`cargos_cobranza` y `cargo_pagos` se eliminan (research.md Decisión 1) — sin UI ni datos de producción que migrar. `pagos` y `recibos` se conservan y se adaptan.

## Entidades nuevas

### `cobranzas` (cabecera)

| Columna                                       | Tipo              | Notas                                                                              |
| --------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------- |
| `id`                                          | `uuid`            | PK                                                                                 |
| `cliente_id`                                  | `uuid`            | FK `clientes(id)`, not null                                                        |
| `periodo_mes`                                 | `smallint`        | 1–12, not null                                                                     |
| `periodo_anio`                                | `smallint`        | not null                                                                           |
| `fecha_limite`                                | `date`            | Congelada al generarse desde `configuracion_cobranza.dia_limite_pago` (Decisión 6) |
| `estado`                                      | `cobranza_estado` | `vigente` \| `cancelada` \| `eliminada` (Decisión 3), default `vigente`            |
| `generada_por`                                | `uuid`            | FK `auth.users(id)`, nullable — null si la generó el proceso automático            |
| `created_at/updated_at/created_by/updated_by` | —                 | Auditoría estándar                                                                 |

Único `(cliente_id, periodo_mes, periodo_anio)` (FR-001).

### `conceptos_cobranza` (líneas, congeladas)

| Columna                                       | Tipo                     | Notas                                                                             |
| --------------------------------------------- | ------------------------ | --------------------------------------------------------------------------------- |
| `id`                                          | `uuid`                   | PK                                                                                |
| `cobranza_id`                                 | `uuid`                   | FK `cobranzas(id)`, not null                                                      |
| `descripcion`                                 | `text`                   | not null                                                                          |
| `monto`                                       | `numeric(12,2)`          | not null, `> 0`, congelado (Decisión 6)                                           |
| `tipo`                                        | `concepto_cobranza_tipo` | `servicio_recurrente` \| `cargo_extraordinario`                                   |
| `servicio_contratado_id`                      | `uuid`                   | FK `servicios_contratados(id)`, nullable — solo si `tipo = servicio_recurrente`   |
| `cargo_extraordinario_id`                     | `uuid`                   | FK `cargos_extraordinarios(id)`, nullable — solo si `tipo = cargo_extraordinario` |
| `fecha_incorporacion`                         | `timestamptz`            | default `now()`                                                                   |
| `created_at/updated_at/created_by/updated_by` | —                        | Auditoría estándar                                                                |

Check: exactamente una de `servicio_contratado_id`/`cargo_extraordinario_id` es not null, según `tipo` (mismo patrón que el check de `cumplimientos_fiscales_extraordinario_check`, 015).

### `cargos_extraordinarios`

| Columna                                       | Tipo                          | Notas                                                            |
| --------------------------------------------- | ----------------------------- | ---------------------------------------------------------------- |
| `id`                                          | `uuid`                        | PK                                                               |
| `cliente_id`                                  | `uuid`                        | FK `clientes(id)`, not null                                      |
| `descripcion`                                 | `text`                        | not null                                                         |
| `monto`                                       | `numeric(12,2)`               | not null, `> 0`                                                  |
| `fecha_registro`                              | `timestamptz`                 | default `now()`                                                  |
| `periodo_mes` / `periodo_anio`                | `smallint`                    | Periodo objetivo de cobranza                                     |
| `estado`                                      | `cargo_extraordinario_estado` | `pendiente` \| `incorporado`, default `pendiente`                |
| `concepto_cobranza_id`                        | `uuid`                        | FK `conceptos_cobranza(id)`, nullable — se llena al incorporarse |
| `created_at/updated_at/created_by/updated_by` | —                             | Auditoría estándar                                               |

### `configuracion_cobranza` (singleton)

| Columna                     | Tipo       | Notas                                                            |
| --------------------------- | ---------- | ---------------------------------------------------------------- |
| `id`                        | `boolean`  | PK fijo (`default true`, `check (id)`) — garantiza una sola fila |
| `dia_generacion`            | `smallint` | 1–28, default `1`                                                |
| `dia_limite_pago`           | `smallint` | 1–28, default `20`                                               |
| `updated_at` / `updated_by` | —          | Sin `created_*` — la fila se crea una sola vez por la migración  |

## Entidades adaptadas

### `pagos`

| Columna                                                                                | Cambio                        | Notas                                                                                       |
| -------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------- |
| `cliente_id`                                                                           | **eliminada**                 | Se deriva vía `cobranzas.cliente_id`                                                        |
| `cobranza_id`                                                                          | **nueva**, `uuid not null`    | FK `cobranzas(id)`                                                                          |
| `referencia`                                                                           | **renombrada** a `comentario` | Mismo tipo (`text`, nullable) — alinea el nombre con el vocabulario del spec ("Comentario") |
| `monto`, `fecha_pago`, `metodo_pago_id`, `created_at/updated_at/created_by/updated_by` | sin cambio                    | —                                                                                           |

### `recibos`

Sin cambio de columnas. Su trigger de generación se mueve de `cargo_pagos` a `pagos` (Decisión 2) — un recibo por pago, `concepto` como snapshot de la etiqueta de la cobranza pagada (cliente + periodo), inmutable.

## Estado calculado (vista `cobranzas_resumen`, no almacenado)

| Campo                | Cálculo                                                                                                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `total_conceptos`    | `sum(conceptos_cobranza.monto)` para esa cobranza                                                                                   |
| `total_pagado`       | `sum(pagos.monto)` para esa cobranza                                                                                                |
| `saldo`              | `total_conceptos - total_pagado`                                                                                                    |
| `estado_pago`        | `pendiente` si `total_pagado = 0`; `parcial` si `0 < total_pagado < total_conceptos`; `pagada` si `total_pagado >= total_conceptos` |
| `estado_vencimiento` | Solo relevante si `estado_pago <> 'pagada'`: `vencida` si `current_date > fecha_limite`, si no `vigente`                            |

- **Clientes sin servicios activos** (tarjeta de Dashboard): `clientes.estado = 'activo' AND NOT EXISTS (SELECT 1 FROM servicios_contratados WHERE cliente_id = clientes.id AND estado = 'activo')` — consulta directa, sin nueva columna ni vista dedicada.

## Diagrama de relaciones

```text
clientes ──< cobranzas (única por cliente+periodo) ──< conceptos_cobranza >── servicios_contratados (opcional, tipo=servicio_recurrente)
   │                        │                              │
   │                        │                              └── cargos_extraordinarios (opcional, tipo=cargo_extraordinario)
   │                        │
   │                        └──< pagos ──── metodos_pago
   │                                 │
   │                                 └── recibos (1:1 por pago)
   │
   └──< cargos_extraordinarios (cliente_id directo, antes de incorporarse)

configuracion_cobranza (singleton) ──> fecha_limite congelada en cada cobranza al generarse
```

## Diagrama de estados de `cobranzas.estado`

```text
   INSERT (generación automática o manual)
     │
     ▼
 [vigente] ──(sin pagos, Administrador elimina)──► [eliminada]
     │
     └──(con o sin pagos, Administrador cancela/anula)──► [cancelada]
```

`eliminada` y `cancelada` son estados terminales — ninguno vuelve a `vigente`. Ambos ocultan la cobranza de las consultas operativas normales (FR-019/FR-020) conservando conceptos, pagos e historial de auditoría.

## Diagrama de estados de `cargos_extraordinarios.estado`

```text
   INSERT
     │
     ▼
 [pendiente] ──(se genera/actualiza la cobranza de su periodo objetivo)──► [incorporado]
     │
     └──(eliminación manual, solo mientras pendiente)──► (fila eliminada físicamente)
```

Un cargo extraordinario "pendiente" es la única entidad de este feature que admite eliminación física real (nunca fue incorporado a nada); una vez "incorporado" queda protegido y solo se administra como parte de la cobranza (FR-010).
