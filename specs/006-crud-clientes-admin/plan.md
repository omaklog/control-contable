# Implementation Plan: Editar y Eliminar Clientes (Panel Administrativo)

**Branch**: `006-crud-clientes-admin` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-crud-clientes-admin/spec.md`

## Summary

Construir, dentro de `apps/admin`, el listado paginado y las pantallas de edición/baja (soft-delete) del Cliente ya modelado en `005-clientes-cobranza-expedientes`. La alta (creación) de clientes **no** forma parte de esta feature — se construirá en una feature futura dentro de `apps/portal` (ver spec.md, Clarifications). El enfoque técnico reutiliza el patrón ya establecido en `apps/admin/src/app/usuarios` (Server Component que hace `requireCapability` + fetch server-side, Server Actions `'use server'` para las mutaciones, Client Component para la tabla/diálogos interactivos), con Formik+Yup para el formulario de edición (ya en el stack de la constitución) y paginación server-side vía `.range()`/`count` de PostgREST. No se agrega gestión de Contactos ni de responsable en esta feature; el listado oculta inactivos por defecto con un filtro para mostrarlos; el acceso a editar/dar de baja requiere `manage_clients` — en la práctica, solo Administrador, porque Contador y Auxiliar no tienen acceso a `apps/admin` (`003-supabase-auth-roles`).

## Technical Context

**Language/Version**: TypeScript 5.7 (strict)

**Primary Dependencies**: Next.js 15 (App Router, Server Components + Server Actions), React 19, Material UI 6, Formik + Yup (validación de formulario), `@control-contable/supabase-client` (server), `@control-contable/auth` (`requireCapability`)

**Storage**: PostgreSQL vía Supabase — tablas `clientes` y `regimenes_fiscales` ya existentes (`005-clientes-cobranza-expedientes`); esta feature no agrega tablas ni columnas

**Testing**: Vitest — pruebas unitarias de validación de formulario (Yup schema) y de las funciones puras de paginación/filtrado si las hubiera; sin pruebas de integración nuevas contra Supabase (no hay cambios de esquema)

**Target Platform**: Next.js server (`apps/admin`) sobre el servidor local del despacho, igual que el resto de la app

**Project Type**: Monorepo web — feature de UI dentro de una app ya existente (`apps/admin`), no se crean apps ni paquetes nuevos

**Performance Goals**: Paginación server-side (nunca cargar todos los clientes al cliente/navegador de una sola vez), consistente con "Rendimiento" de la constitución

**Constraints**: Reutilizar las reglas de integridad ya impuestas por la base de datos (RFC único, régimen fiscal compatible/vigente) en vez de duplicarlas; los errores de esas reglas deben mostrarse de forma clara sin perder los datos capturados en el formulario (FR-006). Esta feature no incluye una Server Action de creación — evitar dejar código muerto o rutas de alta sin usar.

**Scale/Scope**: Volumen esperado ya acotado en `005` (cientos de clientes) — la paginación server-side es suficiente, sin necesidad de virtualización de tabla

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Arquitectura por capas / lógica fuera de React**: las reglas de negocio (unicidad de RFC, compatibilidad/vigencia de régimen fiscal) ya viven en la base de datos (triggers/constraints de `005`); los componentes React solo capturan datos y muestran los errores que la base de datos devuelve — no se duplica lógica de negocio en el formulario. ✅ Cumple.
- **Monorepo / código compartido**: el schema de validación del formulario (Yup) y cualquier tipo compartido se ubican en el paquete/módulo apropiado dentro de `apps/admin` (esta feature no introduce una segunda app que necesite reutilizar el formulario, así que no se justifica moverlo a un paquete compartido todavía). ✅ Cumple, sin duplicación.
- **Multi-Usuario / roles**: el acceso a editar/dar de baja requiere `manage_clients`; el acceso de solo lectura requiere `view_clients` o `manage_clients` — reutiliza el modelo de capacidades ya definido, sin introducir un sistema de permisos paralelo ni cambiar la plantilla por rol de `005` (FR-010). Auxiliar (solo `view_clients`) puede consultar el listado, pero la UI no le muestra las acciones de editar/dar de baja. ✅ Cumple.
- **Seguridad**: toda mutación pasa por Server Actions autenticadas (`requireCapability('manage_clients')`), nunca por una llamada directa desde el cliente; las validaciones del formulario en el navegador son un complemento de UX, la autoridad real es la base de datos (RLS + constraints ya existentes). ✅ Cumple.
- **Base de Datos (trazabilidad, soft-delete)**: la baja de un Cliente reutiliza el soft-delete ya definido (`estado = 'inactivo'`), nunca `DELETE`; no se requieren cambios de esquema. ✅ Cumple (FR-008).
- **UI**: Material UI, formularios consistentes, confirmaciones para operaciones críticas (diálogo de confirmación antes de dar de baja, FR-007). ✅ Cumple.

No se detectan violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/006-crud-clientes-admin/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/admin/
└── src/
    └── app/
        └── clientes/
            ├── page.tsx              # Server Component: requireCapability('view_clients'), fetch paginado + filtro de inactivos
            ├── actions.ts            # 'use server': updateCliente, setClienteEstado (soft-delete/reactivar) — sin createCliente, la alta vive en apps/portal
            ├── ClientesClient.tsx    # Client Component: tabla paginada, columna de acciones (editar/eliminar), estado del filtro de inactivos
            ├── ClienteForm.tsx       # Client Component de edición (Formik + Yup) — usado por ClientesClient en un Dialog, siempre con un cliente existente
            └── clienteFormSchema.ts  # Esquema Yup + tipos del formulario (validaciones de UX; la autoridad real sigue siendo la base de datos)
```

**Structure Decision**: Se sigue el mismo patrón ya establecido en `apps/admin/src/app/usuarios` (Server Component + Server Actions + Client Component), agregando un módulo hermano `apps/admin/src/app/clientes` sin tocar `packages/*`. `ClienteForm.tsx` es ahora un formulario de **edición únicamente** (la alta se construirá como una pantalla separada en `apps/portal`, en una feature futura); si en ese momento conviene compartir el esquema Yup (`clienteFormSchema.ts`) entre ambas apps, se promoverá a `packages/ui` o a un paquete de validaciones — esta feature no lo hace todavía porque solo tiene un consumidor (`apps/admin`).

## Complexity Tracking

> No violations — section not applicable.
