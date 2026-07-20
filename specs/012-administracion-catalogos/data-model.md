# Data Model: Módulo de Administración de Catálogos

## Contrato común: "Catálogo administrable"

No es una tabla — es el conjunto de reglas que toda tabla de catálogo (presente o futura) debe cumplir. Documentado aquí para que las especificaciones futuras (Tipos de Documento, Régimen Fiscal, Obligaciones Fiscales) lo hereden sin redefinirlo.

| Regla                   | Detalle                                                                                                                                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tabla propia            | Cada catálogo es su propia tabla PostgreSQL con su propia entidad TypeScript — nunca un modelo genérico/polimórfico (FR-010).                                                                                                                       |
| Estado                  | Columna `estado` con exactamente dos valores: `activo` / `inactivo`. Los registros nuevos se crean `activo` (FR-002).                                                                                                                               |
| Eliminación             | Nunca física. Un elemento en desuso se marca `inactivo` (FR-003).                                                                                                                                                                                   |
| Nombre                  | Columna `nombre` obligatoria, acepta acentos y caracteres especiales, única **solo entre registros `activo`** — vía índice único parcial (FR-004).                                                                                                  |
| Descripción             | Columna `descripcion` opcional (FR-005).                                                                                                                                                                                                            |
| Auditoría               | `created_at`, `updated_at` obligatorias; `created_by`/`updated_by` recomendadas, alimentadas por el mecanismo general de auditoría del sistema cuando el catálogo es editable (FR-006).                                                             |
| Consulta                | Debe soportar búsqueda, orden alfabético por `nombre`, y selección mediante `Autocomplete` (FR-007).                                                                                                                                                |
| Paginación              | Solo se activa cuando hay más de diez registros (FR-008).                                                                                                                                                                                           |
| Integridad de selección | Un registro `inactivo` no aparece como opción en nuevas selecciones, pero sí se muestra en consultas/históricos que ya lo referencian (FR-009).                                                                                                     |
| Protegido (opcional)    | Un catálogo puede declararse protegido: expone únicamente consulta, sin alta/edición/activación/inactivación para ningún usuario (FR-014). Se implementa **omitiendo por completo** las políticas RLS de escritura — no ocultando botones en la UI. |
| Administración          | Solo Administrador puede gestionar catálogos no protegidos (FR-001) — vía `has_capability('manage_catalogs')`.                                                                                                                                      |

## Entidad concreta: `Periodicidad`

Único catálogo construido en esta feature; sirve como referencia protegida de este contrato (FR-015).

| Campo         | Tipo                 | Restricciones                                                                   |
| ------------- | -------------------- | ------------------------------------------------------------------------------- |
| `id`          | `uuid`               | PK                                                                              |
| `nombre`      | `text`               | requerido; único entre `estado = 'activo'`; ej. "Mensual", "Bimestral", "Anual" |
| `descripcion` | `text \| null`       | opcional                                                                        |
| `estado`      | `activo \| inactivo` | default `activo`                                                                |
| `created_at`  | `timestamptz`        | default `now()`                                                                 |
| `updated_at`  | `timestamptz`        | default `now()`                                                                 |
| `created_by`  | `uuid \| null`       | FK `auth.users`; nulo para los registros sembrados por migración                |
| `updated_by`  | `uuid \| null`       | FK `auth.users`; nulo — nadie edita este catálogo en v1                         |

**Reglas específicas**:

- No hay transiciones de estado expuestas por la aplicación (protegido, FR-014) — `estado` existe en el esquema por consistencia con el contrato común, previendo que en una versión futura el catálogo deje de ser protegido, pero en v1 permanece fijo en `activo` para todos los registros sembrados.
- No participa (todavía) de ninguna relación con otra tabla — el consumo real (p. ej. desde el futuro módulo de Gestión Fiscal) queda fuera de alcance de esta feature (Assumptions del spec).
- Sin tabla de historial/auditoría de negocio propia — ver research.md #5.

## Diagrama de estados (contrato común, para catálogos editables futuros)

```text
   (alta) ──► Activo ──(inactivar)──► Inactivo
                ▲                         │
                └────── (reactivar) ──────┘
```

Para un catálogo **protegido** como Periodicidades, ninguna de estas transiciones está expuesta por la aplicación — el diagrama documenta el contrato que heredarán los catálogos editables futuros, no el comportamiento actual de Periodicidades.
