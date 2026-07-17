# Data Model: Alta de Cliente desde el Portal

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

Esta feature no agrega ni modifica tablas — reutiliza `clientes` y `regimenes_fiscales`, ya definidas en [`005-clientes-cobranza-expedientes/data-model.md`](../005-clientes-cobranza-expedientes/data-model.md). Los modelos de UI de escritura (`ClienteFormValues`, `RegimenFiscalOption`) ya fueron definidos en [`006-crud-clientes-admin/data-model.md`](../006-crud-clientes-admin/data-model.md) y promovidos a `packages/utils` en la primera iteración de esta feature. Este documento agrega el modelo de lectura para la tabla del portal, nuevo en esta segunda iteración.

## Modelo de lectura: `ClienteListItem` (fila de la tabla del portal)

Igual que `ClienteRow` de `006-crud-clientes-admin`, pero sin necesidad de exponer `regimenFiscalDescripcion` (no se muestra en esta tabla, que no tiene modo edición):

| Campo    | Origen            | Uso en UI                                                 |
| -------- | ----------------- | --------------------------------------------------------- |
| `id`     | `clientes.id`     | key de fila                                               |
| `nombre` | `clientes.nombre` | columna "Nombre"; también participa en el filtro de texto |
| `rfc`    | `clientes.rfc`    | columna "RFC"; también participa en el filtro de texto    |
| `correo` | `clientes.correo` | columna "Correo"                                          |
| `estado` | `clientes.estado` | columna "Estado" (badge activo/inactivo)                  |

## Parámetros de listado (`searchParams` de `page.tsx`)

| Parámetro          | Tipo                  | Default              | Efecto                                                                                                                            |
| ------------------ | --------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `page`             | `number` (1-indexed)  | `1`                  | Página del listado a mostrar                                                                                                      |
| `mostrarInactivos` | `'true' \| undefined` | ausente (= `false`)  | Si está presente, incluye clientes con `estado = 'inactivo'` (FR-003)                                                             |
| `q`                | `string \| undefined` | ausente (sin filtro) | Filtra por coincidencia parcial contra `nombre` o `rfc` (FR-002, research.md Decisión 6); al cambiar, la UI reinicia `page` a `1` |

## Reutilizado sin cambios de la primera iteración

- `ClienteFormValues`, `RegimenFiscalOption` (`packages/utils/src/clienteForm.ts`) — valores capturados en el modal de alta.
- `calcularTotalPaginas(total, porPagina)` — antes solo en `apps/admin`, ahora promovido a `packages/utils/src/paginacion.ts` (research.md, plan.md Project Structure) para que `apps/portal` lo reutilice sin duplicar la fórmula.
