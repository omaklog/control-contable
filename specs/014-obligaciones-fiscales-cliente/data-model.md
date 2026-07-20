# Data Model: Obligaciones Fiscales del Cliente

## Entidad: `Plantilla de Obligaciones`

Catálogo editable (no protegido), mismo contrato que `013-catalogo-obligaciones-fiscales`.

| Campo         | Tipo                 | Restricciones                              |
| ------------- | -------------------- | ------------------------------------------ |
| `id`          | `uuid`               | PK                                         |
| `nombre`      | `text`               | requerido; único entre `estado = 'activo'` |
| `descripcion` | `text \| null`       | opcional                                   |
| `estado`      | `activo \| inactivo` | default `activo`                           |
| `created_at`  | `timestamptz`        | default `now()`                            |
| `updated_at`  | `timestamptz`        | default `now()`                            |
| `created_by`  | `uuid \| null`       | usuario que la creó                        |
| `updated_by`  | `uuid \| null`       | usuario que la modificó por última vez     |

Una plantilla Inactiva no puede aplicarse a nuevos clientes (FR-012), pero no se elimina físicamente ni afecta lo ya copiado a clientes que la usaron.

## Entidad: `Ítem de Plantilla` (detalle)

| Campo               | Tipo                                                    | Restricciones                                          |
| ------------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| `id`                | `uuid`                                                  | PK                                                     |
| `plantilla`         | referencia a `Plantilla de Obligaciones`                | requerida                                              |
| `obligación fiscal` | referencia al catálogo de Obligaciones Fiscales (`013`) | requerida; activa al asignarse                         |
| `periodicidad`      | referencia a `Periodicidad` (`012`)                     | requerida; activa al asignarse                         |
| `orden`             | `integer`                                               | sugerido; no necesita ser único dentro de la plantilla |

Una misma obligación fiscal no puede repetirse dentro de la misma plantilla (FR-013).

## Entidad: `Obligación Fiscal del Cliente`

| Campo               | Tipo                                                    | Restricciones                                                                                                            |
| ------------------- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `id`                | `uuid`                                                  | PK                                                                                                                       |
| `cliente`           | referencia a `Cliente`                                  | requerida                                                                                                                |
| `obligación fiscal` | referencia al catálogo de Obligaciones Fiscales (`013`) | requerida; activa al asignarse                                                                                           |
| `periodicidad`      | referencia a `Periodicidad` (`012`)                     | requerida; copiada de la plantilla o del catálogo al asignarse, editable después de forma independiente para ese cliente |
| `orden`             | `integer`                                               | requerido; único dentro de las obligaciones de ese mismo cliente                                                         |
| `estado`            | `activa \| no_aplica`                                   | default `activa`                                                                                                         |
| `observaciones`     | `text \| null`                                          | opcional                                                                                                                 |
| `created_at`        | `timestamptz`                                           | default `now()`                                                                                                          |
| `updated_at`        | `timestamptz`                                           | default `now()`                                                                                                          |
| `created_by`        | `uuid \| null`                                          | usuario que la creó                                                                                                      |
| `updated_by`        | `uuid \| null`                                          | usuario que la modificó por última vez                                                                                   |

**Reglas específicas**:

- Nunca hay dos registros para el mismo cliente y la misma obligación fiscal del catálogo (FR-003).
- El orden es único dentro de las obligaciones de un mismo cliente — no existe orden global ni por usuario (FR-008).
- `no_aplica` NUNCA se elimina físicamente (FR-005) — es la única excepción de este módulo al soft-delete uniforme del resto del sistema: `activa` **sí** puede eliminarse por completo (FR-006, research.md #3), la primera eliminación física real del sistema.
- La periodicidad se copia al momento de la asignación (desde la plantilla o desde el catálogo) y puede modificarse después de forma independiente, sin afectar el catálogo ni a otros clientes (FR-007).

## Diagrama de estados: Obligación Fiscal del Cliente

```text
   (alta / copia de plantilla) ──► Activa ──(marcar No aplica)──► No aplica
                                      │                                │
                                      └──(eliminar)──► [fila borrada]  └──(no hay reactivación definida en este spec)
```

A diferencia del contrato común de `012` (donde toda transición es reversible), aquí "No aplica" es una transición sin retorno definido en esta especificación — el spec no describe una acción de "reactivar" una obligación "No aplica" a Activa; solo Activa puede eliminarse o pasar a No aplica.

## Relaciones

```text
Cliente (1) ──── (N) Obligación Fiscal del Cliente ──── (1) Obligación Fiscal (catálogo, 013)
                                                    └──── (1) Periodicidad (012)

Plantilla de Obligaciones (1) ──── (N) Ítem de Plantilla ──── (1) Obligación Fiscal (catálogo, 013)
                                                          └──── (1) Periodicidad (012)
```

Después de aplicar una plantilla, **no queda ninguna relación** entre la Plantilla/Ítem de Plantilla usados y las filas de Obligación Fiscal del Cliente resultantes (FR-014) — son solo el origen de una copia de valores, no una referencia persistente.
