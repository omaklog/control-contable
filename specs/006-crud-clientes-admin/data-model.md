# Data Model: Editar y Eliminar Clientes (Panel Administrativo)

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

Esta feature no agrega ni modifica tablas — reutiliza `clientes` y `regimenes_fiscales`, ya definidas en [`005-clientes-cobranza-expedientes/data-model.md`](../005-clientes-cobranza-expedientes/data-model.md). Este documento describe únicamente los modelos de UI (lectura y escritura) que esta feature agrega sobre ese esquema.

## Modelo de lectura: `ClienteRow` (fila del listado)

Proyección de `clientes` (más el nombre del régimen fiscal, vía join a `regimenes_fiscales`) usada por la tabla paginada:

| Campo                      | Origen                                  | Uso en UI                                       |
| -------------------------- | --------------------------------------- | ----------------------------------------------- |
| `id`                       | `clientes.id`                           | key de fila, referencia para editar/dar de baja |
| `nombre`                   | `clientes.nombre`                       | columna "Nombre"                                |
| `rfc`                      | `clientes.rfc`                          | columna "RFC"                                   |
| `correo`                   | `clientes.correo`                       | columna "Correo"                                |
| `estado`                   | `clientes.estado`                       | columna "Estado" (badge activo/inactivo)        |
| `tipoPersona`              | `clientes.tipo_persona`                 | prellenado del formulario de edición            |
| `regimenFiscalCodigo`      | `clientes.regimen_fiscal_codigo`        | prellenado del formulario de edición            |
| `regimenFiscalDescripcion` | `regimenes_fiscales.descripcion` (join) | mostrado de forma legible en el formulario      |
| `telefono`                 | `clientes.telefono`                     | prellenado del formulario de edición            |
| `direccionFiscal`          | `clientes.direccion_fiscal`             | prellenado del formulario de edición            |

## Modelo de escritura: `ClienteFormValues`

Valores capturados por `ClienteForm.tsx` en modo edición (validados con Yup antes de enviarse a `updateCliente`) — no existe un modo alta en esta feature (ver research.md, Decisión 2):

| Campo                 | Tipo                  | Regla de UX (la autoridad real es la base de datos)                                                 |
| --------------------- | --------------------- | --------------------------------------------------------------------------------------------------- |
| `nombre`              | `string`              | requerido, no vacío                                                                                 |
| `tipoPersona`         | `'fisica' \| 'moral'` | requerido                                                                                           |
| `rfc`                 | `string`              | requerido; formato validado con `esRfcValido()` de `packages/utils` (mismo validador de `005`)      |
| `regimenFiscalCodigo` | `string`              | requerido; opciones del selector filtradas por `tipoPersona` y vigencia (Decisión 3 de research.md) |
| `correo`              | `string`              | requerido, formato de correo                                                                        |
| `telefono`            | `string \| null`      | opcional                                                                                            |
| `direccionFiscal`     | `string \| null`      | opcional                                                                                            |

## Catálogo de apoyo: `RegimenFiscalOption`

Proyección de `regimenes_fiscales` usada únicamente para poblar el selector del formulario (no se persiste ni se modifica en esta feature):

| Campo                 | Origen                                     |
| --------------------- | ------------------------------------------ |
| `codigo`              | `regimenes_fiscales.codigo`                |
| `descripcion`         | `regimenes_fiscales.descripcion`           |
| `aplicaPersonaFisica` | `regimenes_fiscales.aplica_persona_fisica` |
| `aplicaPersonaMoral`  | `regimenes_fiscales.aplica_persona_moral`  |
| `fechaFinVigencia`    | `regimenes_fiscales.fecha_fin_vigencia`    |

## Parámetros de listado (`searchParams` de `page.tsx`)

| Parámetro          | Tipo                  | Default             | Efecto                                                                              |
| ------------------ | --------------------- | ------------------- | ----------------------------------------------------------------------------------- |
| `page`             | `number` (1-indexed)  | `1`                 | Página del listado a mostrar                                                        |
| `mostrarInactivos` | `'true' \| undefined` | ausente (= `false`) | Si está presente, incluye clientes con `estado = 'inactivo'` en el listado (FR-014) |
