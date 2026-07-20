# Data Model: Catálogo de Obligaciones Fiscales

## Entidad: `Obligación Fiscal`

Catálogo editable (no protegido) que reutiliza el contrato común de catálogos administrables definido por `012-administracion-catalogos`.

| Campo          | Tipo                                | Restricciones                                                                     |
| -------------- | ----------------------------------- | --------------------------------------------------------------------------------- |
| `id`           | `uuid`                              | PK                                                                                |
| `nombre`       | `text`                              | requerido; único entre `estado = 'activo'`; ej. "Declaración Mensual ISR", "DIOT" |
| `descripcion`  | `text \| null`                      | opcional                                                                          |
| `periodicidad` | referencia a `Periodicidad` (`012`) | requerida; debe ser una periodicidad activa al asignarse o cambiarse              |
| `prioridad`    | `integer`                           | requerida; orden inicial sugerido para consumidores futuros; no única             |
| `estado`       | `activo \| inactivo`                | default `activo`                                                                  |
| `created_at`   | `timestamptz`                       | default `now()`                                                                   |
| `updated_at`   | `timestamptz`                       | default `now()`                                                                   |
| `created_by`   | `uuid \| null`                      | usuario que la creó                                                               |
| `updated_by`   | `uuid \| null`                      | usuario que la modificó por última vez                                            |

**Reglas específicas**:

- Nunca se elimina físicamente — solo se inactiva (FR-003).
- El nombre no incluye la periodicidad (a diferencia de un esquema donde la periodicidad formara parte del nombre) — la periodicidad es un atributo independiente (FR-002, Edge Cases).
- La periodicidad asignada debe estar activa en el momento de asignarse o cambiarse, pero una obligación conserva la periodicidad que tenía aunque esa periodicidad deje de estar activa después (integridad histórica, FR-004/FR-005) — la validación es "al momento del cambio", no una restricción permanente.
- La prioridad no tiene relación con el nombre ni con la periodicidad — es puramente informativa para el orden inicial sugerido en futuras plantillas (FR-008); modificarla no afecta ninguna plantilla ya construida (fuera de alcance de este módulo).
- Un registro `inactivo` no puede seleccionarse para información nueva, pero permanece consultable y visible en información histórica que ya lo referencia (FR-005).

## Relación con `Periodicidad` (`012-administracion-catalogos`)

```text
Obligación Fiscal  ──[periodicidad_id]──►  Periodicidad (catálogo protegido, 012)
```

- Relación de solo lectura desde el punto de vista de este módulo: Obligaciones Fiscales consume el catálogo de Periodicidades, nunca lo modifica (Periodicidades sigue siendo protegido).
- Una periodicidad puede ser referenciada por muchas obligaciones (relación 1:N).

## Diagrama de estados

```text
   (alta) ──► Activo ──(inactivar)──► Inactivo
                ▲                         │
                └────── (reactivar) ──────┘
```

Igual que el contrato común (`012`, data-model.md): la inactivación y reactivación ocurren sobre el MISMO registro — nunca se crea una fila nueva para "reactivar" una obligación.
