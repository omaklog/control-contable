# Implementation Plan: Modelado de Datos — Clientes, Cobranza y Expedientes

**Branch**: `005-clientes-cobranza-expedientes` | **Date**: 2026-07-16 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-clientes-cobranza-expedientes/spec.md`

## Summary

Definir el modelo de datos base del despacho contable: **Cliente** (con su **Régimen Fiscal** y sus **Contacto**s), **Cargo de cobranza**, **Pago** (con **Método de Pago** como catálogo), **Recibo** (con snapshot inmutable de concepto), **Categoría de documento** y **Documento de expediente**, junto con sus relaciones, reglas de integridad (RFC único mientras activo, régimen fiscal compatible con el tipo de persona y vigente, soft-delete, versionado sin eliminación física, generación automática de recibos con concepto congelado) y trazabilidad/auditoría exigidas por la constitución. El enfoque técnico consiste en migraciones de Postgres (esquema, constraints, triggers, RLS, semillas de catálogo) más los tipos TypeScript derivados (`packages/types`) y funciones puras de acceso a datos reutilizables desde `apps/admin` y `apps/portal`, sin construir aún pantallas de captura — estas se definirán en features posteriores por módulo (Clientes, Cobranza, Expedientes).

## Technical Context

**Language/Version**: TypeScript 5.7 (strict), SQL (PostgreSQL 15 vía Supabase)

**Primary Dependencies**: Next.js 15 (App Router), React 19, Supabase JS (`@supabase/supabase-js`, `@supabase/ssr`), Material UI 6 (fases futuras de UI), Zod/Yup para validación (Yup ya usado en el stack de la constitución)

**Storage**: PostgreSQL local (Supabase self-hosted vía Docker Compose); archivos de expediente en Supabase Storage (bucket dedicado, fuera del alcance de datos de esta especificación salvo por el metadato `Documento`)

**Testing**: Vitest (unitarias para funciones puras de cálculo de estado de cobranza y validación) + pruebas de integración contra Supabase local para RLS/constraints, siguiendo el patrón ya usado en `packages/auth`

**Target Platform**: Next.js server (apps/admin, apps/portal) sobre servidor local del despacho, acceso remoto vía VPN/Tailscale

**Project Type**: Monorepo web (pnpm + Turborepo) — este feature es principalmente de **capa de datos** (migraciones + tipos + servicios), no introduce una app nueva

**Performance Goals**: Listados de cobranza y expediente paginados; consultas de "clientes al corriente/con adeudo" resueltas con una sola consulta indexada (sin cálculo N+1 en el cliente)

**Constraints**: RLS obligatorio en todas las tablas nuevas (acceso limitado al personal autenticado con capacidad correspondiente, reutilizando `app_role`/`permission_overrides` de `003-supabase-auth-roles`); ninguna eliminación física de `Cliente` ni `Documento`; solo PDF en `Documento`

**Scale/Scope**: Volumen esperado de un despacho contable pequeño/mediano (cientos de clientes, miles de cargos/pagos/documentos por año) — no requiere particionamiento ni sharding

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

- **Arquitectura por capas / lógica fuera de React**: el modelo de datos y las reglas de negocio (unicidad de RFC, transición de estados de Cargo, generación de Recibo, versionado de Documento) se definen en Postgres (constraints/triggers) y en funciones puras de `packages/*`, no en componentes React. ✅ Cumple.
- **Monorepo / código compartido**: los tipos derivados del esquema (`packages/types`) y cualquier lógica de acceso a datos reutilizable entre `apps/admin`/`apps/portal` se ubican en paquetes compartidos, no duplicados por app. ✅ Cumple.
- **Base de Datos (trazabilidad, soft-delete)**: todas las entidades nuevas incluyen `created_at`, `updated_at`, `created_by`, `updated_by`; `Cliente` y `Documento` usan soft-delete/estado en vez de `DELETE` físico. ✅ Cumple (FR-017, FR-003, FR-015).
- **Documentos Digitales**: solo PDF, categorías configurables, historial de versiones sin eliminación física salvo autorización explícita. ✅ Cumple (FR-010 a FR-016).
- **Cobranza**: clientes al corriente/con adeudo, historial de pagos, recibos emitidos consultables en cualquier momento. ✅ Cumple (FR-005 a FR-009).
- **Auditoría**: altas/modificaciones de clientes, cambios en pagos, carga/eliminación de documentos y generación de recibos quedan registrados. ✅ Cumple (FR-018) — se reutiliza el patrón de tabla de auditoría ya introducido en `003-supabase-auth-roles` (`profile_change_history`), extendido con una tabla de auditoría de negocio genérica o específica por entidad (a decidir en Phase 1/research).
- **Multi-Usuario / roles**: el acceso respeta los roles Administrador/Contador/Auxiliar y el sistema de capacidades ya existente; esta especificación no introduce un sistema de permisos paralelo. ✅ Cumple (FR-019).
- **Seguridad**: RLS en todas las tablas nuevas; ninguna validación exclusiva de frontend. ✅ Cumple (a detallar en `contracts/db-functions-rls.md`).
- **Catálogos** (régimen fiscal, método de pago): ambos son catálogos consultables por el personal, con gobernanza de escritura reservada a Administrador (mismo patrón que Categoría de documento), consistente con "Catálogos" y "Multi-Usuario" de la constitución. ✅ Cumple (FR-020, FR-021, FR-022, FR-024).
- **Integridad de documentos fiscales**: el Recibo conserva un snapshot inmutable del concepto que cubre, evitando que un documento fiscal ya emitido cambie retroactivamente — alineado con "Nunca... confiar únicamente en validaciones del frontend" y con el principio general de trazabilidad de la constitución. ✅ Cumple (FR-025).

No se detectan violaciones que requieran justificación en Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/005-clientes-cobranza-expedientes/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md         # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
supabase/
└── migrations/
    └── <timestamp>_clientes_cobranza_expedientes_schema.sql   # tablas, enums, constraints, triggers, RLS, semilla de regimenes_fiscales desde assets/regimenes.json

specs/005-clientes-cobranza-expedientes/
└── assets/regimenes.json   # dato fuente (catálogo SAT) para la semilla de la migración — no se referencia en tiempo de ejecución

packages/
├── types/
│   └── src/database.ts        # tipos regenerados (supabase gen types) tras aplicar la migración
├── auth/
│   └── src/                   # sin cambios de forma; se reutiliza requireApp/requireCapability para autorizar acceso a los nuevos módulos
└── utils/
    └── src/                   # funciones puras compartidas: cálculo de estado de cargo (pendiente/pagado/vencido), validación de RFC

apps/
├── admin/
│   └── src/app/               # sin pantallas nuevas en esta feature (solo capa de datos); las pantallas de Clientes/Cobranza/Expedientes se planean en features posteriores
└── portal/
    └── src/app/               # idem
```

**Structure Decision**: Esta especificación se implementa como una migración de Postgres (`supabase/migrations/`) que crea el esquema de Clientes (incluidos Régimen Fiscal y Contacto), Cobranza (incluido Método de Pago como catálogo) y Expedientes con sus constraints, triggers, políticas RLS y la semilla del catálogo de Régimen Fiscal (a partir de `assets/regimenes.json`), más la regeneración de tipos en `packages/types`, y funciones puras de validación/cálculo de estado en `packages/utils` reutilizables por ambas apps. No se agregan pantallas de captura en `apps/admin`/`apps/portal` en esta feature — la especificación de origen definió explícitamente que el alcance es "las entidades... campos y tipos", dejando las pantallas para planeación posterior por módulo.

## Complexity Tracking

> No violations — section not applicable.
