# Data Model: Rediseño de la Pantalla de Inicio de Sesión

Esta feature no introduce entidades de negocio, tablas ni columnas nuevas en Supabase/Postgres — es un cambio de presentación sobre una pantalla ya construida (FR-010). No hay Key Entities de dominio que documentar.

## Elementos de código (no entidades de negocio)

Para trazabilidad, estos son los únicos "datos" que participan en el rediseño, y viven exclusivamente en código/props de componente, nunca en base de datos:

| Elemento                                   | Tipo                                   | Origen                                                                                                                           |
| ------------------------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `title`                                    | prop de `LoginForm` (string)           | Ya existente — texto por app ("Panel Administrativo — Iniciar sesión", "Portal de Clientes — Iniciar sesión"), sin cambios       |
| Mensaje de valor institucional             | texto estático embebido en `LoginForm` | Nuevo — contenido de producto fijo, no calculado, no configurable por variables de entorno ni por base de datos (research.md #2) |
| `LoginFormValues` (`email`, `password`)    | ya existente                           | Sin cambios — mismos campos, misma validación Yup                                                                                |
| Resultado de `onSubmit` (`string \| null`) | ya existente                           | Sin cambios — mismo contrato de mensaje de error genérico (FR-010)                                                               |

No aplica ningún diagrama de relaciones ni regla de transición de estado — no hay ciclo de vida de datos involucrado en este cambio.
