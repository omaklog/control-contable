# Data Model: Expediente Fiscal

## Entidades existentes extendidas

### `categorias_documento` (Tipo de Documento — sin cambios de estructura)

Ya existe desde 005: `id, nombre, descripcion, activa, created_at/by, updated_at/by`. 016 no le agrega columnas — solo le construye una pantalla de administración en `apps/admin/catalogos` (US5 lo consume como fuente de "Documentos Esperados").

### `documentos` (extendida)

| Columna                | Tipo               | Cambio                                              | Notas                                                                                    |
| ---------------------- | ------------------ | --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `categoria_id`         | `uuid`             | `not null` → **nullable**                           | "Sin clasificar" = `null` (research.md Decisión 2)                                       |
| `obligacion_fiscal_id` | `uuid`             | **nueva**, nullable, FK `obligaciones_fiscales(id)` | Asociación informativa directa (Decisión 5); no afecta la agrupación general/por periodo |
| `estado`               | `documento_estado` | enum gana valor **`eliminado`**                     | Coexiste con `activo`/`reemplazado` ya existentes (Decisión 1 y 7)                       |
| `eliminado_en`         | `timestamptz`      | **nueva**, nullable                                 | Se llena junto con la transición a `estado='eliminado'`                                  |
| `eliminado_por`        | `uuid`             | **nueva**, nullable, FK `auth.users(id)`            | Idem                                                                                     |

Columnas ya existentes sin cambio: `id, cliente_id, nombre_original, tamano_bytes, formato, version, documento_anterior_id, ruta_almacenamiento, cargado_por, fecha_carga, created_at/by, updated_at/by`.

El **año/periodo** de un documento NO es una columna — se deriva en la capa de aplicación de su fila en `cumplimiento_fiscal_documentos` → `cumplimientos_fiscales.periodo_inicio`/`periodo_etiqueta` (Decisión 3). Sin fila de asociación ⇒ "Documento General".

### `cumplimiento_fiscal_documentos` (de 015, extendida)

Sin cambios de columnas. Se agrega `unique index cumplimiento_fiscal_documentos_documento_unique on (documento_id)` — impone "un documento, como máximo un cumplimiento" (Decisión 4).

## Entidades nuevas

### `documentos_esperados_obligacion` (configuración vigente)

| Columna                          | Tipo      | Notas                                                                     |
| -------------------------------- | --------- | ------------------------------------------------------------------------- |
| `id`                             | `uuid`    | PK                                                                        |
| `obligacion_fiscal_id`           | `uuid`    | FK `obligaciones_fiscales(id)`, not null                                  |
| `categoria_documento_id`         | `uuid`    | FK `categorias_documento(id)`, not null — el "Tipo de Documento" esperado |
| `activo`                         | `boolean` | default `true` — desactivar en vez de borrar físicamente                  |
| `created_at/by`, `updated_at/by` | —         | Auditoría estándar                                                        |

Único `(obligacion_fiscal_id, categoria_documento_id)`. Administrable solo por Administrador (`manage_catalogs`).

### `cumplimiento_documentos_esperados` (snapshot inmutable por cumplimiento)

| Columna                  | Tipo          | Notas                                                           |
| ------------------------ | ------------- | --------------------------------------------------------------- |
| `id`                     | `uuid`        | PK                                                              |
| `cumplimiento_id`        | `uuid`        | FK `cumplimientos_fiscales(id)`, not null                       |
| `categoria_documento_id` | `uuid`        | FK `categorias_documento(id)`, not null                         |
| `created_at`             | `timestamptz` | Momento del snapshot (= momento de generación del cumplimiento) |

Único `(cumplimiento_id, categoria_documento_id)`. Se llena exclusivamente por trigger (nunca por Server Action) — ver contracts/db-functions-rls.md Sección D. Nunca se actualiza ni se borra tras su creación (inmutable por diseño, satisface FR-011).

## Estado calculado (no almacenado)

- **Documento "Sin clasificar"**: `categoria_id is null`.
- **Documento General vs. por Periodo**: General si no tiene fila en `cumplimiento_fiscal_documentos`; por Periodo (año = `extract(year from periodo_inicio)`, etiqueta = `cumplimientos_fiscales.periodo_etiqueta`) si sí la tiene.
- **Documento Esperado disponible/faltante**: para cada fila de `cumplimiento_documentos_esperados` de un cumplimiento, "disponible" si existe un `documentos` con ese `categoria_documento_id`, `estado <> 'eliminado'`, asociado a ese cumplimiento vía `cumplimiento_fiscal_documentos`; si no, "faltante".
- **Documento Adicional** (dentro de un cumplimiento): cualquier documento asociado a ese cumplimiento cuyo `categoria_id` no aparece en la lista de esperados de ese cumplimiento (o que no tiene `categoria_id`).
- **Antigüedad para permisos de eliminación**: `now() - fecha_carga` (nunca `updated_at`), evaluada por el trigger de la Decisión 7.

## Diagrama de relaciones

```text
clientes ──< documentos >── categorias_documento (Tipo de Documento, opcional)
   │             │  └─< obligacion_fiscal_id (informativo, opcional) >── obligaciones_fiscales
   │             └─< cumplimiento_fiscal_documentos >── cumplimientos_fiscales (≤ 1 por documento)
   │                                                          │
   │                                                          └─< cumplimiento_documentos_esperados >── categorias_documento
   │                                                                        ▲ (snapshot, trigger AFTER INSERT)
   │
   └─(vía obligaciones_fiscales_cliente)── obligaciones_fiscales ──< documentos_esperados_obligacion >── categorias_documento
                                                                        (configuración vigente, editable por Administrador)
```

## Diagrama de estados de `documentos.estado`

```text
   INSERT
     │
     ▼
 [activo] ──(manual, opcional)──► [reemplazado]
     │                                  │
     └────────────(eliminación lógica, trigger de antigüedad/rol)────────────┐
                                        │                                    │
                                        ▼                                    ▼
                                  [eliminado] ◄─────────────────────────────┘
```

`reemplazado` y `eliminado` no son excluyentes en el tiempo de vida del feature (un documento `reemplazado` también puede eliminarse lógicamente después), pero ambos son transiciones manuales/con permiso — nunca automáticas.
