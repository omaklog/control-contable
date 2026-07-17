# Data Model: Contactos y Página de Detalle de Cliente

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

## Cambios de esquema: `public.contactos`

La tabla ya existe desde [`005-clientes-cobranza-expedientes`](../005-clientes-cobranza-expedientes/data-model.md):

```sql
create table public.contactos (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.clientes (id),
  nombre text not null,
  telefono text not null,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users (id),
  updated_by uuid references auth.users (id)
);
```

Esta feature agrega, vía nueva migración (`research.md` Decisión 2 y 3):

| Columna        | Tipo                                                              | Default    | Propósito                                        |
| -------------- | ----------------------------------------------------------------- | ---------- | ------------------------------------------------ |
| `estado`       | `public.contacto_estado` (nuevo enum: `'activo'` \| `'obsoleto'`) | `'activo'` | Reemplaza la eliminación física (FR-006)         |
| `es_principal` | `boolean`                                                         | `false`    | Marca el contacto principal del Cliente (FR-007) |

Más el índice:

```sql
create unique index contactos_principal_unico
  on public.contactos (cliente_id)
  where es_principal;
```

que garantiza a lo más un `es_principal = true` por `cliente_id` (research.md Decisión 3). No se agrega ningún `grant delete` — la política `contactos_update_manage` ya existente (select/insert/update, `005`) cubre las transiciones de `estado` y `es_principal` sin cambios de RLS.

## Modelo de UI: `ContactoFormValues` (`packages/utils/src/contactoForm.ts`, NUEVO)

| Campo      | Tipo     | Obligatorio | Notas          |
| ---------- | -------- | ----------- | -------------- |
| `nombre`   | `string` | Sí          | FR-004, FR-010 |
| `telefono` | `string` | Sí          | FR-004, FR-010 |
| `email`    | `string` | No          | FR-004         |

`contactoFormSchema` (Yup) valida `nombre` y `telefono` no vacíos, y `email` como correo válido cuando no está vacío. `mapearErrorContactoAMensaje(error)` traduce errores de Postgres a mensajes claros (mismo patrón que `mapearErrorClienteAMensaje`).

## Modelo de lectura: `ContactoRow` (fila de la lista de Contactos del detalle)

| Campo         | Origen                   | Uso en UI                                                                                            |
| ------------- | ------------------------ | ---------------------------------------------------------------------------------------------------- |
| `id`          | `contactos.id`           | key de fila, target de las Server Actions                                                            |
| `nombre`      | `contactos.nombre`       | columna "Nombre"                                                                                     |
| `telefono`    | `contactos.telefono`     | columna "Teléfono"                                                                                   |
| `email`       | `contactos.email`        | columna "Correo" (puede ser `null`)                                                                  |
| `estado`      | `contactos.estado`       | determina si se muestra por defecto (oculto si `'obsoleto'` salvo que se active "mostrar obsoletos") |
| `esPrincipal` | `contactos.es_principal` | badge "Principal" en la fila                                                                         |

## Modelo de lectura: `ClienteDetalle` (datos generales mostrados en la página de detalle)

Mismos campos que `ClienteRow` de [`006-crud-clientes-admin/data-model.md`](../006-crud-clientes-admin/data-model.md) (nombre, tipoPersona, rfc, regimenFiscalCodigo, regimenFiscalDescripcion, correo, telefono, direccionFiscal, estado) — esta feature no agrega ni modifica campos de `clientes`, solo los consulta por `id` en vez de paginados.

## Parámetros de la lista de Contactos (estado del Client Component, no de la URL)

| Parámetro          | Tipo      | Default | Efecto                                                                         |
| ------------------ | --------- | ------- | ------------------------------------------------------------------------------ |
| `mostrarObsoletos` | `boolean` | `false` | Si es `true`, incluye Contactos con `estado = 'obsoleto'` en la lista (FR-003) |

A diferencia del filtro de inactivos de Cliente (que vive en `searchParams` porque pagina), este es estado puramente de cliente (sin pareja de servidor) porque la lista de Contactos de un Cliente no pagina (Scale/Scope: unidades por Cliente).

## Reutilizado sin cambios

- `ClienteFormValues`, `RegimenFiscalOption`, `clienteFormSchema`, `filtrarRegimenesPorTipoPersona`, `mapearErrorClienteAMensaje` (`packages/utils/src/clienteForm.ts`) — el formulario de edición de Cliente no cambia; esta feature no lo invoca desde el detalle (ver Assumptions de spec.md: la página de detalle no rediseña la edición de Cliente).
- `calcularTotalPaginas` (`packages/utils/src/paginacion.ts`) — no se usa en esta feature (la lista de Contactos no pagina), pero se documenta que sigue disponible si un Cliente futuro con volumen alto de Contactos lo requiriera.
