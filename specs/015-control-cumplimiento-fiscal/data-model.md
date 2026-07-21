# Data Model: Control de Cumplimiento Fiscal

## Entidad: `Cumplimiento Fiscal`

| Campo                                      | Tipo                                                    | Restricciones                                                                                            |
| ------------------------------------------ | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `id`                                       | `uuid`                                                  | PK                                                                                                       |
| `cliente`                                  | referencia a `Cliente`                                  | requerida                                                                                                |
| `obligación fiscal del cliente`            | referencia a `Obligación Fiscal del Cliente` (`014`)    | requerida si es ordinario; nula si es extraordinario                                                     |
| `obligación fiscal` (catálogo)             | referencia al catálogo de Obligaciones Fiscales (`013`) | opcional; solo aplica a extraordinarios que sí seleccionaron una obligación del catálogo                 |
| `descripción`                              | `text`                                                  | requerida si es extraordinario sin obligación del catálogo; opcional en cualquier otro caso              |
| `periodo` (inicio/fin)                     | rango de fechas                                         | requerido; calculado según la periodicidad efectiva de la obligación al momento de generarse             |
| `fecha límite`                             | `date`                                                  | requerida; editable de forma independiente por registro, sin afectar otros periodos ni clientes          |
| `estado`                                   | `pendiente \| en_proceso \| presentada \| no_aplica`    | default `pendiente`; "Vencida" es una condición derivada (`data-model` §Diagrama), nunca almacenada      |
| `responsable`                              | referencia a `Usuario`                                  | opcional; fijado al generarse desde el responsable vigente del cliente, no se actualiza retroactivamente |
| `es extraordinario`                        | `boolean`                                               | default `false`                                                                                          |
| `documentos asociados`                     | referencia a `Documento` (`005`), N:N                   | cero o varios; deben pertenecer al mismo cliente; uno puede marcarse como el acuse de presentación       |
| `fecha de creación`/`última actualización` | `timestamptz`                                           | auditoría estándar                                                                                       |
| `usuario creador`/`modificador`            | referencia a `Usuario`                                  | auditoría estándar                                                                                       |

**Reglas específicas**:

- Nunca hay dos cumplimientos ordinarios para la misma obligación fiscal del cliente y el mismo periodo (FR-017) — no aplica a extraordinarios, que se registran uno a la vez a discreción del usuario.
- Ningún cumplimiento se elimina físicamente (FR-015) — el estado es el único mecanismo de cambio.
- "Presentada" nunca vuelve automáticamente a "Vencida" (FR-006) — de hecho, "Vencida" ni siquiera se evalúa para registros en Presentada o No aplica (solo aplica a Pendiente/En proceso vencidos).

## Entidad: `Documento Asociado a un Cumplimiento`

| Campo          | Tipo                                                | Restricciones                                                               |
| -------------- | --------------------------------------------------- | --------------------------------------------------------------------------- |
| `cumplimiento` | referencia a `Cumplimiento Fiscal`                  | requerida                                                                   |
| `documento`    | referencia a `Documento` (Expediente Fiscal, `005`) | requerida; debe pertenecer al mismo cliente del cumplimiento                |
| `es acuse`     | `boolean`                                           | default `false`; a lo sumo un documento por cumplimiento puede ser el acuse |

Nunca duplica físicamente el archivo — solo mantiene una referencia (FR-009).

## Entidad: `Evento de Historial` (no es una tabla propia — ver research.md #6)

Se representa reutilizando `business_audit_log` (`005`): `entidad = 'cumplimiento_fiscal'`, `entidad_id` = id del cumplimiento, `accion` ∈ {`alta`, `cambio_estado`, `cambio_fecha_limite`, `cambio_responsable`, `asociacion_documento`, `desasociacion_documento`}, `detalle` (jsonb) con el valor anterior y nuevo cuando aplique, `actor_id`, `creado_en`.

## Diagrama de estados

```text
   (generado / alta manual) ──► Pendiente ──► En proceso ──► Presentada (terminal)
                                    │              │
                                    └──────────────┴──► No aplica (terminal para ese periodo)

Condición derivada (no un estado real, FR-004/FR-005):
   Pendiente o En proceso + fecha límite superada  ⇒  se muestra/filtra como "Vencida"
```

Presentada y No aplica son terminales para ese registro — el spec no define una acción para "reabrir" un cumplimiento ya Presentada o No aplica de vuelta a Pendiente/En proceso.

## Relaciones

```text
Cliente (1) ──── (N) Cumplimiento Fiscal ──── (1) Obligación Fiscal del Cliente (014, si es ordinario)
                                        └────── (1) Obligación Fiscal — catálogo (013, opcional si es extraordinario)
                                        └────── (1) Usuario (responsable, opcional)
                                        └────── (N) Documento (005, Expediente Fiscal, vía tabla puente)
```
