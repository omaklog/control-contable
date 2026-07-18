# Implementation Plan: Módulo de Servicios

**Branch**: `011-gestion-servicios` | **Date**: 2026-07-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-gestion-servicios/spec.md`

## Summary

Construir el catálogo de Servicios del despacho (`servicios`, CRUD administrado — nombre, descripción, categoría de texto libre, estado Activo/Inactivo) y los Servicios Contratados por cliente (`servicios_contratados`, un único registro por combinación cliente+servicio, con precio acordado, estado Activo/Suspendido/Finalizado libremente transicionable, vigencia y observaciones), integrados dentro de `ClienteDetalleClient` (packages/ui) como una nueva sección "Servicios", junto a la ya existente de Contactos. Reutiliza la infraestructura de auditoría de negocio ya establecida (`business_audit_log`/`log_business_audit()`, `has_capability()`) y los permisos ya existentes (`manage_catalogs` para el catálogo, `manage_clients`/`view_clients` para los servicios contratados) — no introduce capacidades nuevas. No calcula ni genera cobranza (FR-016): solo expone la información que el futuro módulo de Cobranza consultará.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict, sin `any` sin justificar — Constitución)

**Primary Dependencies**: Next.js App Router (Server Actions), Supabase/PostgreSQL (RLS, triggers), Material UI 6 + Theme compartido de `009-migrate-design-system` (`StatusChip` para estados, patrón `IconButton`+`Tooltip` para acciones por fila), Formik + Yup para los formularios de alta/cambio de precio

**Storage**: PostgreSQL vía Supabase — 2 tablas nuevas (`servicios`, `servicios_contratados`), reutilizando `business_audit_log` (ya existente, `005-clientes-cobranza-expedientes`) para historial/auditoría, sin tablas de auditoría propias

**Testing**: Vitest para pruebas unitarias de mapeo de errores/validaciones (mismo patrón que `mapearErrorClienteAMensaje`/`mapearErrorContactoAMensaje` de `005`/`008`); pruebas de integración contra Supabase local para las reglas de RLS y de unicidad (mismo patrón que `businessAuditLog.integration.test.ts` de `009`); validación visual manual en navegador para las pantallas (sin Playwright/chromium en este entorno)

**Target Platform**: Web — Catálogo de Servicios solo en `apps/admin` (pantalla de administración, ver research.md #3); Servicios del Cliente en ambas apps (`apps/admin`, `apps/portal`), dentro de `ClienteDetalleClient` compartido

**Project Type**: Monorepo web existente — no se crean proyectos ni paquetes nuevos

**Performance Goals**: Sin metas de rendimiento específicas más allá de los patrones ya establecidos (paginación en el catálogo si crece, consistente con el resto del sistema — Constitución, sección Rendimiento)

**Constraints**: El catálogo NO almacena precios (FR-003); un cambio de precio no debe alterar información ya generada antes del cambio (FR-006); nunca más de un servicio contratado por combinación cliente+servicio, sin importar su estado (FR-005); ninguna acción sobre el servicio contratado de un cliente afecta el catálogo ni a otros clientes (FR-012); el módulo no genera cobranza ni pagos (FR-016)

**Scale/Scope**: 2 tablas nuevas, 1 pantalla nueva (Catálogo de Servicios, solo admin), 1 sección nueva dentro de una pantalla ya existente (`ClienteDetalleClient`, ambas apps), sin cambios a los módulos de Clientes/Contactos ya construidos más que agregar la nueva sección

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio (Constitución)                                                                           | Evaluación                                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arquitectura de la Aplicación — módulo "Servicios" ya listado                                      | ✅ La Constitución ya incluye "Servicios" como módulo principal (actualizado en `001-business-domain-model`) — este spec lo implementa por primera vez, sin desviarse de los límites ya documentados (Gestión de Servicios no administra cobranza/pagos/documentos) |
| Código Compartido — evitar duplicación entre apps                                                  | ✅ La sección "Servicios" vive en `ClienteDetalleClient` (packages/ui), consumida sin lógica duplicada por ambas apps, igual que Contactos (`008`)                                                                                                                  |
| Arquitectura por capas — lógica de negocio fuera de componentes React                              | ✅ Las reglas (unicidad, transición de estados, precio no retroactivo) se aplican en Server Actions + constraints/triggers de base de datos, nunca en el componente React                                                                                           |
| Base de Datos — trazabilidad, nunca eliminar físicamente, preferir soft delete                     | ✅ `servicios` y `servicios_contratados` incluyen `created_at`/`updated_at`/`created_by`/`updated_by`; ningún registro se elimina físicamente — el ciclo de vida se refleja únicamente vía `estado` (FR-008, Assumptions)                                           |
| Seguridad — control de permisos por usuario, registro de auditoría                                 | ✅ Reutiliza `has_capability()` (RLS) y `log_business_audit()` (auditoría), ya establecidos — sin mecanismos nuevos de permisos ni de auditoría                                                                                                                     |
| UI — Material UI, responsive, formularios con Formik/Yup, confirmaciones para operaciones críticas | ✅ Reutiliza el Theme compartido y los patrones ya migrados (`StatusChip`, `IconButton`+`Tooltip`); finalizar un servicio contratado pide confirmación (operación con impacto visible en Cobranza a futuro)                                                         |
| Testing — pruebas unitarias para reglas de negocio, integración para procesos críticos             | ✅ Pruebas unitarias para el mapeo de errores (unicidad, transición de estados) y de integración para la regla de unicidad + RLS, mismo patrón que specs anteriores                                                                                                 |

Sin violaciones. No se requiere la tabla de Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/011-gestion-servicios/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   └── db-functions-rls.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
supabase/migrations/
└── <timestamp>_servicios_schema.sql   # NUEVO — enums, tablas servicios/servicios_contratados, triggers de auditoría, RLS

apps/admin/src/app/(app)/servicios/
├── page.tsx               # NUEVO — Server Component: carga servicios (paginado, filtros nombre/categoría/estado)
├── ServiciosClient.tsx     # NUEVO — Client Component: tabla + filtros + Crear/Editar/Activar/Desactivar (Historia 1)
└── actions.ts              # NUEVO — Server Actions: createServicio, updateServicio, setServicioEstado

apps/admin/src/components/layout/navigation.ts
└── MENU_ITEMS                # MODIFICADO — nuevo ítem "Servicios", gate `manage_catalogs` (research.md #3)

apps/admin/src/app/(app)/clientes/[clienteId]/actions.ts
└── # MODIFICADO — nuevas Server Actions: agregarServicioContratado, cambiarPrecioServicioContratado,
    #   suspenderServicioContratado, reactivarServicioContratado, finalizarServicioContratado

apps/portal/src/app/(app)/clientes/[clienteId]/actions.ts
└── # MODIFICADO — mismas Server Actions que admin, mismo patrón ya usado para Contactos (008)

packages/ui/src/ClienteDetalleClient.tsx
└── # MODIFICADO — nueva sección "Servicios" (listado + acciones), junto a la sección Contactos ya existente;
    #   nuevas props: `servicios: ServicioContratadoRow[]`, `serviciosDisponibles: ServicioOption[]`,
    #   `onAgregarServicio`, `onCambiarPrecio`, `onSuspenderServicio`, `onReactivarServicio`, `onFinalizarServicio`

packages/ui/src/
├── ServicioContratadoForm.tsx   # NUEVO — modal compartido: agregar servicio / cambiar precio (Formik+Yup)
└── ServicioHistorialDialog.tsx  # NUEVO — modal compartido: línea de tiempo de un servicio contratado (Historia 5)

packages/utils/src/
└── mapearErrorServicioAMensaje.ts  # NUEVO — mapeo de errores de Postgres a mensajes genéricos, mismo patrón que 005/008
```

**Structure Decision**: El Catálogo de Servicios (Historia 1) es una pantalla nueva **solo en `apps/admin`** (research.md #3) — no se agrega a `apps/portal`, consistente con que hoy no existe una pantalla de "Configuración"/catálogos en el portal. Los Servicios Contratados (Historias 2-5) viven dentro de `ClienteDetalleClient` (packages/ui), consumido sin cambios de arquitectura por ambas apps — mismo patrón ya usado por Contactos en `008-contactos-y-detalle-cliente`. No se migra `ClienteDetalleClient` a una experiencia tabulada completa (`docs/ux/design-system.md` §9/§10 punto 4) en este spec — la nueva sección "Servicios" se agrega en el mismo formato de una sola columna ya usado hoy (junto a Contactos), dejando la migración a pestañas para cuando existan más dominios (Documentos, Cobranza, Obligaciones) con datos reales que mostrar ahí, tal como ya lo señala esa nota.

## Complexity Tracking

_No aplica — sin violaciones de la Constitución que justificar._
