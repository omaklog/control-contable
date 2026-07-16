# Data Model: Modelado de Datos — Clientes, Cobranza y Expedientes

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

Convenciones: nombres de tabla/columna en `snake_case` (español, consistente con `profiles`/`app_role` de `003-supabase-auth-roles`); toda tabla incluye `created_at`, `updated_at`, `created_by`, `updated_by` (FR-017); ninguna tabla permite `DELETE` físico de `clientes` ni `documentos` (soft-delete vía `estado`).

## Enums

| Enum               | Valores                                       | Usado en                 |
| ------------------ | --------------------------------------------- | ------------------------ |
| `tipo_persona`     | `fisica`, `moral`                             | `clientes.tipo_persona`  |
| `cliente_estado`   | `activo`, `inactivo`                          | `clientes.estado`        |
| `cargo_estado`     | `pendiente`, `pagado`, `vencido`, `cancelado` | `cargos_cobranza.estado` |
| `documento_estado` | `activo`, `reemplazado`                       | `documentos.estado`      |

`metodo_pago` **ya no es un enum** — ver tabla catálogo `metodos_pago` (Decisión 8).

## Entidades

### `regimenes_fiscales`

| Columna                 | Tipo      | Reglas                                                 |
| ----------------------- | --------- | ------------------------------------------------------ |
| `codigo`                | `text` PK | p. ej. `'601'` — coincide con el catálogo SAT (FR-020) |
| `descripcion`           | `text`    | not null                                               |
| `aplica_persona_fisica` | `boolean` | not null                                               |
| `aplica_persona_moral`  | `boolean` | not null                                               |
| `fecha_inicio_vigencia` | `date`    | not null                                               |
| `fecha_fin_vigencia`    | `date`    | nullable — vacío mientras siga vigente                 |

Sembrada en la migración a partir de `specs/005-clientes-cobranza-expedientes/assets/regimenes.json` (24 registros). Sin RLS de escritura para roles de aplicación en esta feature (alta de nuevos regímenes es un mecanismo a definir en una fase posterior, ver Assumptions); solo `SELECT` para todo el personal autenticado.

### `clientes`

| Columna                                                | Tipo             | Reglas                                                                                                                                  |
| ------------------------------------------------------ | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                                   | `uuid` PK        | `default gen_random_uuid()`                                                                                                             |
| `nombre`                                               | `text`           | not null — nombre o razón social (FR-001)                                                                                               |
| `tipo_persona`                                         | `tipo_persona`   | not null                                                                                                                                |
| `rfc`                                                  | `text`           | not null; único **entre clientes con `estado = 'activo'`** (Decisión 6, FR-002)                                                         |
| `regimen_fiscal_codigo`                                | `text`           | not null, FK → `regimenes_fiscales(codigo)`; validado por trigger contra `tipo_persona` y vigencia (Decisión 7, FR-020, FR-021, FR-022) |
| `correo`                                               | `text`           | not null                                                                                                                                |
| `telefono`                                             | `text`           | nullable                                                                                                                                |
| `direccion_fiscal`                                     | `text`           | nullable                                                                                                                                |
| `estado`                                               | `cliente_estado` | not null, default `activo` (FR-003)                                                                                                     |
| `responsable_id`                                       | `uuid`           | nullable, FK → `auth.users(id)`; solo informativo, no restringe acceso (FR-004)                                                         |
| `fecha_alta`                                           | `timestamptz`    | not null, default `now()`                                                                                                               |
| `fecha_baja`                                           | `timestamptz`    | nullable; se establece al pasar a `inactivo`                                                                                            |
| `created_at`, `updated_at`, `created_by`, `updated_by` | —                | trazabilidad estándar (FR-017)                                                                                                          |

Relaciones: 1—N con `cargos_cobranza`, `pagos`, `documentos`, `contactos`; N—1 con `regimenes_fiscales`.

### `contactos`

| Columna                                                | Tipo      | Reglas                        |
| ------------------------------------------------------ | --------- | ----------------------------- |
| `id`                                                   | `uuid` PK | `default gen_random_uuid()`   |
| `cliente_id`                                           | `uuid`    | not null, FK → `clientes(id)` |
| `nombre`                                               | `text`    | not null (FR-023)             |
| `telefono`                                             | `text`    | not null (FR-023)             |
| `email`                                                | `text`    | nullable (FR-023)             |
| `created_at`, `updated_at`, `created_by`, `updated_by` | —         | trazabilidad estándar         |

### `categorias_documento`

| Columna                                                | Tipo      | Reglas                      |
| ------------------------------------------------------ | --------- | --------------------------- |
| `id`                                                   | `uuid` PK | `default gen_random_uuid()` |
| `nombre`                                               | `text`    | not null, único             |
| `descripcion`                                          | `text`    | nullable                    |
| `activa`                                               | `boolean` | not null, default `true`    |
| `created_at`, `updated_at`, `created_by`, `updated_by` | —         | trazabilidad estándar       |

Catálogo configurable exclusivamente por Administrador (FR-010, constitución "Catálogos").

### `cargos_cobranza`

| Columna                                                | Tipo            | Reglas                                                              |
| ------------------------------------------------------ | --------------- | ------------------------------------------------------------------- |
| `id`                                                   | `uuid` PK       | `default gen_random_uuid()`                                         |
| `cliente_id`                                           | `uuid`          | not null, FK → `clientes(id)`                                       |
| `periodo_mes`                                          | `smallint`      | not null, `1..12`                                                   |
| `periodo_anio`                                         | `smallint`      | not null                                                            |
| `concepto`                                             | `text`          | not null                                                            |
| `monto`                                                | `numeric(12,2)` | not null, `> 0`                                                     |
| `fecha_vencimiento`                                    | `date`          | not null                                                            |
| `estado`                                               | `cargo_estado`  | not null, default `pendiente`; recalculado por trigger (Decisión 2) |
| `created_at`, `updated_at`, `created_by`, `updated_by` | —               | trazabilidad estándar                                               |

Constraint: único `(cliente_id, periodo_mes, periodo_anio, concepto)` para evitar cargos duplicados del mismo periodo/concepto. Trigger `BEFORE INSERT`: rechaza si `clientes.estado <> 'activo'` (FR-009).

### `metodos_pago`

| Columna                                                | Tipo      | Reglas                      |
| ------------------------------------------------------ | --------- | --------------------------- |
| `id`                                                   | `uuid` PK | `default gen_random_uuid()` |
| `nombre`                                               | `text`    | not null, único             |
| `activo`                                               | `boolean` | not null, default `true`    |
| `created_at`, `updated_at`, `created_by`, `updated_by` | —         | trazabilidad estándar       |

Catálogo configurable exclusivamente por Administrador (mismo patrón que `categorias_documento`, FR-024). Sembrado con: `efectivo`, `cheque`, `saldo`, `deposito`, `transferencia`, `banco`.

### `pagos`

| Columna                                                | Tipo            | Reglas                                                 |
| ------------------------------------------------------ | --------------- | ------------------------------------------------------ |
| `id`                                                   | `uuid` PK       | `default gen_random_uuid()`                            |
| `cliente_id`                                           | `uuid`          | not null, FK → `clientes(id)`                          |
| `monto`                                                | `numeric(12,2)` | not null, `> 0`                                        |
| `fecha_pago`                                           | `timestamptz`   | not null, default `now()`                              |
| `metodo_pago_id`                                       | `uuid`          | not null, FK → `metodos_pago(id)` (Decisión 8, FR-024) |
| `referencia`                                           | `text`          | nullable                                               |
| `created_at`, `updated_at`, `created_by`, `updated_by` | —               | trazabilidad estándar                                  |

Relación N—N con `cargos_cobranza` vía `cargo_pagos` (Decisión 1). Trigger `AFTER INSERT`: genera automáticamente el `Recibo` correspondiente, incluido el snapshot de `concepto` (Decisión 3, Decisión 9, FR-008, FR-025) y recalcula el `estado` de cada `cargo_cobranza` afectado (Decisión 2).

### `cargo_pagos` (tabla puente)

| Columna          | Tipo            | Reglas                               |
| ---------------- | --------------- | ------------------------------------ |
| `cargo_id`       | `uuid`          | not null, FK → `cargos_cobranza(id)` |
| `pago_id`        | `uuid`          | not null, FK → `pagos(id)`           |
| `monto_aplicado` | `numeric(12,2)` | not null, `> 0`                      |

PK compuesta `(cargo_id, pago_id)`.

### `recibos`

| Columna                                                | Tipo            | Reglas                                                                                                                                                                                                              |
| ------------------------------------------------------ | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                                   | `uuid` PK       | `default gen_random_uuid()`                                                                                                                                                                                         |
| `pago_id`                                              | `uuid`          | not null, FK → `pagos(id)`, único (1 recibo por pago)                                                                                                                                                               |
| `cliente_id`                                           | `uuid`          | not null, FK → `clientes(id)` (derivado del pago, desnormalizado para consulta rápida)                                                                                                                              |
| `folio`                                                | `text`          | not null, único — autogenerado (p. ej. `REC-000123`)                                                                                                                                                                |
| `concepto`                                             | `text`          | not null — snapshot inmutable del/los concepto(s) de los `cargos_cobranza` cubiertos por el pago, generado por el trigger al emitirse; no se recalcula si el concepto del cargo cambia después (Decisión 9, FR-025) |
| `monto`                                                | `numeric(12,2)` | not null                                                                                                                                                                                                            |
| `fecha_emision`                                        | `timestamptz`   | not null, default `now()`                                                                                                                                                                                           |
| `created_at`, `updated_at`, `created_by`, `updated_by` | —               | trazabilidad estándar                                                                                                                                                                                               |

### `documentos`

| Columna                                                | Tipo               | Reglas                                                                                              |
| ------------------------------------------------------ | ------------------ | --------------------------------------------------------------------------------------------------- |
| `id`                                                   | `uuid` PK          | `default gen_random_uuid()`                                                                         |
| `cliente_id`                                           | `uuid`             | not null, FK → `clientes(id)`                                                                       |
| `categoria_id`                                         | `uuid`             | not null, FK → `categorias_documento(id)`                                                           |
| `nombre_original`                                      | `text`             | not null (FR-012)                                                                                   |
| `tamano_bytes`                                         | `bigint`           | not null; validado contra tamaño máximo configurable (FR-016)                                       |
| `formato`                                              | `text`             | not null, `check (formato = 'application/pdf')` (FR-011)                                            |
| `version`                                              | `integer`          | not null, default `1`                                                                               |
| `documento_anterior_id`                                | `uuid`             | nullable, FK → `documentos(id)` — encadena el historial de versiones (Decisión 4, FR-013)           |
| `estado`                                               | `documento_estado` | not null, default `activo`                                                                          |
| `ruta_almacenamiento`                                  | `text`             | not null — referencia al objeto en Supabase Storage (fuera del alcance de negocio, ver Assumptions) |
| `cargado_por`                                          | `uuid`             | not null, FK → `auth.users(id)` (FR-014)                                                            |
| `fecha_carga`                                          | `timestamptz`      | not null, default `now()`                                                                           |
| `created_at`, `updated_at`, `created_by`, `updated_by` | —                  | trazabilidad estándar                                                                               |

Nunca se ejecuta `DELETE` sobre esta tabla; el reemplazo marca la fila anterior como `reemplazado` (FR-015). Eliminación física solo mediante procedimiento con autorización explícita, fuera del flujo estándar (a definir en fase de implementación).

### `business_audit_log`

| Columna      | Tipo          | Reglas                                                                  |
| ------------ | ------------- | ----------------------------------------------------------------------- |
| `id`         | `bigint` PK   | `generated always as identity`                                          |
| `entidad`    | `text`        | not null (`cliente`, `pago`, `documento`, `recibo`)                     |
| `entidad_id` | `uuid`        | not null                                                                |
| `accion`     | `text`        | not null (`alta`, `modificacion`, `carga`, `eliminacion`, `generacion`) |
| `actor_id`   | `uuid`        | FK → `auth.users(id)`, nullable (acciones de sistema)                   |
| `detalle`    | `jsonb`       | nullable — snapshot de campos relevantes                                |
| `creado_en`  | `timestamptz` | not null, default `now()`                                               |

Poblada exclusivamente por triggers `AFTER INSERT/UPDATE/DELETE` (Decisión 5, FR-018). Tabla append-only: sin `UPDATE`/`DELETE` permitidos vía RLS.

## Relaciones (resumen)

```text
regimenes_fiscales 1───N clientes
clientes 1───N cargos_cobranza
clientes 1───N pagos
clientes 1───N documentos
clientes 1───N contactos
cargos_cobranza N───N pagos   (vía cargo_pagos)
metodos_pago 1───N pagos
pagos     1───1 recibos
categorias_documento 1───N documentos
documentos 1───1 documentos   (documento_anterior_id, auto-referencia para versionado)
```

## Reglas de validación transversales

- Toda escritura en `clientes`, `contactos`, `cargos_cobranza`, `pagos`, `documentos`, `categorias_documento`, `metodos_pago` requiere una capacidad del modelo de roles existente (`003-supabase-auth-roles`), aplicada vía RLS (FR-019).
- Ninguna tabla de esta feature permite `DELETE` desde RLS de aplicación (solo `service_role` para procedimientos administrativos explícitos), consistente con "Evitar eliminaciones físicas" de la constitución.
- `estado` de `cargos_cobranza` y `documentos` es la única fuente de verdad para "vigente/histórico" — el frontend nunca decide estas transiciones, solo las refleja.
- El régimen fiscal de un `cliente` se valida (compatibilidad con `tipo_persona` y vigencia) solo al asignarse o cambiarse; un régimen que vence después no invalida retroactivamente a los clientes que ya lo tenían (FR-021, FR-022).
- El `concepto` de un `recibo` es inmutable una vez generado; editar `cargos_cobranza.concepto` después nunca modifica recibos ya emitidos (FR-025).
