# Data Model: Migración al Sistema de Diseño Compartido (Theme MUI)

Esta feature no introduce entidades de negocio ni tablas nuevas en Supabase/Postgres — es una migración de presentación (FR-014). Las "entidades" relevantes viven en código (paquete compartido) o en el navegador del usuario, nunca en base de datos.

## Theme

Definición centralizada, sin persistencia, de los valores visuales del sistema (spec.md, Key Entities).

| Campo        | Tipo                | Descripción                                                                                                                                                                                   | Origen                        |
| ------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| `colors`     | objeto de tokens    | Paleta clara y oscura: `primary`, `secondary`, `background.default`, `background.paper`, `divider`, hover/selección, semánticos (`error` para negativo, azul para positivo, gris para neutro) | `design-system.md` §1.1, §1.2 |
| `typography` | objeto de tokens    | Familia de fuente general (Inter) y monoespaciada (JetBrains Mono), jerarquía por peso                                                                                                        | §1.3                          |
| `spacing`    | función/escala      | Unidad base 4px y sus incrementos                                                                                                                                                             | §1.4                          |
| `radius`     | objeto de tokens    | Escala única: 8px estándar, 12px contenedores grandes, pill para chips/badges — idéntica en ambos modos                                                                                       | §1.5                          |
| `shadows`    | objeto de tokens    | Bordes 1px como mecanismo principal + escala ligera reservada a Nivel 2 (modales/popovers)                                                                                                    | §1.5                          |
| `mode`       | `'light' \| 'dark'` | Variante activa; determina qué mapa de `colors` se usa, nunca afecta `radius`/`typography`/`spacing` (FR-007)                                                                                 | §8                            |

**Reglas de validación** (equivalentes a "reglas de negocio" para esta entidad, verificables por prueba unitaria — ver research.md #3):

- Todo par texto/fondo e icono/fondo definido en `colors` DEBE alcanzar contraste WCAG 2.1 AA (4.5:1 / 3:1) en ambos modos (FR-002, SC-007).
- Ningún token de color semántico "positivo" puede ser verde (regla explícita heredada de `design-system.md` §1.1).
- `radius`, `typography` y `spacing` DEBEN ser idénticos entre `light` y `dark` — solo `colors`/`shadows` pueden diferir por modo (FR-007).

**Ciclo de vida**: no aplica (no hay altas/bajas; es un módulo de código versionado con el resto del repositorio).

## Preferencia de modo (claro/oscuro)

Elección del usuario sobre qué variante del Theme prefiere ver (spec.md, Key Entities; FR-009/FR-010).

| Campo        | Tipo                   | Descripción                                                                                                                 |
| ------------ | ---------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `mode`       | `'light' \| 'dark'`    | Valor efectivo actualmente aplicado                                                                                         |
| `source`     | `'system' \| 'manual'` | Si el valor proviene de la detección de SO/navegador o de un override explícito del usuario                                 |
| `storageKey` | `string` (constante)   | Clave única de `localStorage` (o equivalente por navegador/dispositivo) donde se persiste `mode` cuando `source = 'manual'` |

**Reglas de estado/transición**:

1. Estado inicial (`source: 'system'`): `mode` = resultado de `prefers-color-scheme`; si no se puede detectar, `mode = 'light'` (Edge Case).
2. Transición a manual: al alternar el toggle, `source` pasa a `'manual'` y `mode` se persiste en `storageKey`.
3. Estado manual persistente: en cargas futuras (misma app u otra, mismo navegador/dispositivo), si `storageKey` tiene un valor, `source = 'manual'` y ese `mode` prevalece sobre cualquier cambio posterior de la preferencia del sistema operativo, hasta que el usuario vuelva a alternar.
4. **No hay transición de vuelta a `'system'`** dentro del alcance de esta feature — no se especifica un control para "olvidar" el override manual; si se necesita en el futuro, es una decisión de UX fuera de este spec.

**Persistencia**: exclusivamente client-side (navegador/dispositivo). No hay tabla, columna ni fila en Supabase/Postgres asociada a esta entidad — explícitamente fuera de alcance (spec.md, Key Entities y Assumptions).

## Relación con entidades de negocio ya existentes (sin cambios)

Esta migración **lee** el estado (`estado`) ya existente de `Cliente` y `Contacto` (definido en specs 005-008) para decidir qué color semántico de `StatusChip` mostrar, pero no modifica su modelo de datos, sus transiciones ni sus reglas de negocio (FR-014). No se agregan columnas ni tablas nuevas para soportar esta feature.
