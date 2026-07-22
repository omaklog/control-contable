# Implementation Plan: Expediente Fiscal

**Branch**: `016-expediente-fiscal` | **Date**: 2026-07-21 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-expediente-fiscal/spec.md`

## Summary

Convertir el modelo documental ya existente desde 005 (`documentos` + `categorias_documento`, con almacenamiento pero sin ninguna interfaz) en un Expediente Fiscal usable: clasificación opcional ("Sin clasificar"), asociación exclusiva con como máximo un Cumplimiento Fiscal (015) y opcionalmente con una Obligación Fiscal (013) de forma solo informativa, organización automática en "Documentos Generales"/"Documentos por Periodo" (derivada del cumplimiento asociado, sin columnas de año/periodo propias), Documentos Esperados configurables por obligación con snapshot histórico por cumplimiento, eliminación lógica con permisos por antigüedad (Administrador sin límite; Contador/Auxiliar ≤ 3 meses), una vista global de Expedientes entre clientes (reutilizando el placeholder de navegación "Documentos Fiscales" ya reservado en `apps/portal`), y acceso a archivos exclusivamente vía URLs firmadas de corta duración sobre Supabase Storage.

## Technical Context

**Language/Version**: TypeScript 5 (strict, `exactOptionalPropertyTypes` + `noUncheckedIndexedAccess`), Next.js App Router (React 19)

**Primary Dependencies**: MUI (componentes + iconos), Formik + Yup (formulario de carga/clasificación), Supabase JS client (`@supabase/supabase-js` vía `@control-contable/supabase-client`), Supabase Storage (subida/URLs firmadas), `@control-contable/auth` (`requireCapability`)

**Storage**: PostgreSQL (Supabase local) — extiende `documentos`/`categorias_documento` (005) y `cumplimiento_fiscal_documentos` (015); agrega `documentos_esperados_obligacion` y `cumplimiento_documentos_esperados`. Archivos binarios en un nuevo bucket privado de Supabase Storage (no en la base de datos).

**Testing**: Vitest (unit en `packages/utils`, integración contra Supabase local real en `packages/utils/src/*.integration.test.ts`), Playwright no disponible en este entorno (validación manual de UI queda pendiente para el usuario, igual que en 015)

**Target Platform**: `apps/portal` (expediente por cliente + vista global) y `apps/admin` (catálogo de Tipos de Documento y Documentos Esperados de una obligación, dentro de `/catalogos`)

**Project Type**: Web monorepo (Next.js App Router, `apps/admin` + `apps/portal` + `packages/*`)

**Performance Goals**: Sin metas de throughput específicas — prioridad en paginación y consultas acotadas por cliente/filtros (constitución, "Rendimiento"), consistente con el resto del sistema.

**Constraints**: Solo PDF, máximo 20 MB por archivo (límite ya vigente desde 005, `TAMANO_MAXIMO_DOCUMENTO_BYTES`); URLs de acceso a archivos siempre firmadas y de corta duración; nunca eliminación física (bloqueada ya por trigger desde 005).

**Scale/Scope**: Alcance de un despacho contable único, cientos de clientes, expedientes con decenas de documentos cada uno — sin necesidad de particionamiento o índices especializados más allá de los ya usados en el resto del sistema.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio de la Constitución                                                                                                                                                                         | Cumplimiento                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Documentos Digitales — "únicamente archivos PDF", "clasificados por categorías y fecha", "múltiples documentos por categoría", "historial de carga", "nombre original", "tamaño máximo configurable" | ✅ Reutiliza el modelo de 005 (`documentos.formato` check, `categoria_id`, `tamano_bytes` check, `nombre_original`, `fecha_carga`) sin cambios en estas reglas.                                                                                                                                                                                                                                                                                                  |
| Documentos Digitales — "posibilidad de reemplazar versiones conservando historial cuando aplique"                                                                                                    | ✅ con matiz: el spec 016 (FR-016) decide explícitamente que el sistema **no** determina ni encadena versiones automáticamente. El campo `documento_anterior_id`/`version`/`estado='reemplazado'` de 005 sigue existiendo como mecanismo **manual y opcional** (el usuario puede marcarlo si lo desea) — la constitución dice "posibilidad de", no "automatización obligatoria", así que ambas conviven sin violación. Ver research.md Decisión 1.               |
| Documentos Digitales — "Nunca deberán eliminarse físicamente documentos sin autorización explícita"                                                                                                  | ✅ El trigger `bloquear_delete_documento` (005) ya bloquea incondicionalmente cualquier DELETE; 016 añade eliminación lógica (`estado='eliminado'`) como único mecanismo de borrado, sin tocar ese trigger.                                                                                                                                                                                                                                                      |
| Base de Datos — trazabilidad, soft delete, timestamps de creación/modificación y usuario                                                                                                             | ✅ Se reutiliza `log_business_audit`/`business_audit_log` (existente) vía nuevos triggers de auditoría sobre `documentos`, `documentos_esperados_obligacion` y las asociaciones; se agregan `eliminado_en`/`eliminado_por` para trazabilidad directa del borrado lógico.                                                                                                                                                                                         |
| Catálogos — "Las documentos del expediente tendrán una categoria definida en el administrador"                                                                                                       | ✅ con matiz: `categoria_id` pasa de obligatorio a opcional (Clarifications, Q2) para soportar "Sin clasificar" explícitamente permitido por el spec 016 — la categoría sigue viniendo del catálogo administrado, solo que ahora es opcional en el documento.                                                                                                                                                                                                    |
| Multi-Usuario — roles Administrador/Contador/Auxiliar                                                                                                                                                | ✅ con ajuste: `manage_documents` (hoy exclusivo de Administrador, `packages/auth/src/roles.ts`, marcado "sin módulo todavía" en `specs/003-supabase-auth-roles/contracts/role-permissions.md`) se extiende a Contador y Auxiliar, porque el spec 016 exige que ambos puedan cargar/asociar/eliminar documentos (con límite de antigüedad solo para la eliminación). Esto es exactamente lo que 003 anticipó ("expone las primitivas... para cuando... exista"). |
| Rendimiento — paginación, consultas eficientes                                                                                                                                                       | ✅ La vista global de Expedientes pagina en el servidor igual que 015 (`obligaciones-fiscales`), sin cargar el expediente completo del despacho de una sola vez.                                                                                                                                                                                                                                                                                                 |
| Testing — pruebas unitarias de reglas de negocio y de integración para procesos críticos                                                                                                             | ✅ Se seguirá el mismo patrón de `packages/utils/src/*.test.ts` + `*.integration.test.ts` ya usado en 011/013/014/015.                                                                                                                                                                                                                                                                                                                                           |

No se detectan violaciones que requieran Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/016-expediente-fiscal/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── db-functions-rls.md  # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
supabase/migrations/
└── 20260722100000_expediente_fiscal_schema.sql
    # categoria_id opcional en documentos; obligacion_fiscal_id, eliminado_en,
    # eliminado_por en documentos; unique(documento_id) en
    # cumplimiento_fiscal_documentos; documentos_esperados_obligacion;
    # cumplimiento_documentos_esperados (+ trigger de snapshot); trigger de
    # antigüedad/rol para eliminación lógica; triggers de auditoría; RLS.

packages/auth/src/roles.ts
    # ROLE_DEFAULT_CAPABILITIES: agrega 'manage_documents' a contador y auxiliar

packages/utils/src/
├── documentoForm.ts / .test.ts
│   # Yup schema de carga/clasificación + mapeo de errores Postgres → mensaje
├── documentosEsperadosForm.ts / .test.ts
│   # Yup schema de configuración de Documentos Esperados en una obligación
└── documentos.integration.test.ts
    # Reglas de negocio contra Supabase local: opcionalidad de categoría,
    # máximo un cumplimiento por documento, snapshot de esperados, antigüedad
    # de eliminación por rol, aislamiento por cliente

apps/portal/src/app/(app)/
├── clientes/[clienteId]/
│   ├── page.tsx                      # [MODIFICAR] carga documentos + tipos de documento del cliente
│   └── actions.ts                    # [MODIFICAR] agrega subir, clasificar, asociar/desasociar, eliminar
├── documentos-fiscales/              # Vista global (US3) — activa el placeholder ya
│   ├── page.tsx                      # reservado en navigation.ts (`implemented: true`)
│   └── DocumentosFiscalesClient.tsx
└── obligaciones-fiscales/[cumplimientoId]/
    ├── CumplimientoDetalleClient.tsx # [MODIFICAR] agrega sección "Documentos Esperados" (US2)
    └── actions.ts                    # [MODIFICAR] agrega obtenerDocumentosEsperados

packages/ui/src/
├── ClienteDetalleClient.tsx  # [MODIFICAR] renderiza <ExpedienteFiscalSection> (mismo patrón
│                             # que Servicios/Obligaciones: misma página, sin ruta nueva)
└── ExpedienteFiscalSection.tsx
    # Documentos Generales / Documentos por Periodo, carga, clasificación,
    # asociar/desasociar cumplimiento u obligación, eliminar (US1, US4)

apps/admin/src/app/(app)/catalogos/
├── page.tsx                                  # [MODIFICAR] agrega entradas de Tipos de Documento
├── tipos-documento/
│   ├── page.tsx                              # Catálogo de Tipos de Documento (categorias_documento)
│   └── TiposDocumentoClient.tsx
└── obligaciones-fiscales/
    ├── page.tsx                              # [MODIFICAR] carga documentos esperados vigentes
    └── ObligacionesFiscalesClient.tsx        # [MODIFICAR] agrega gestión de Documentos Esperados (US5)

specs/003-supabase-auth-roles/contracts/role-permissions.md
    # [MODIFICAR] refleja manage_documents ahora también en Contador/Auxiliar
```

**Structure Decision**: El expediente por cliente NO es una ruta nueva — vive dentro de la misma página `/clientes/[clienteId]` (mismo patrón que Contactos/Servicios/Obligaciones Fiscales del Cliente, todos secciones del componente compartido `ClienteDetalleClient` en `packages/ui`, no como 015 que sí es transversal y por eso tiene ruta propia). Dado el tamaño de `ClienteDetalleClient.tsx` (~1000 líneas), el expediente se extrae a un componente propio (`ExpedienteFiscalSection.tsx`) que `ClienteDetalleClient` renderiza inline, siguiendo el mismo patrón ya usado para `ServicioHistorialDialog`/`ObligacionFiscalClienteForm`. La vista global de Expedientes sí es una ruta nueva y transversal, y activa el placeholder de navegación `Documentos Fiscales` (`capability: 'view_documents'`) ya reservado en `apps/portal/src/components/layout/navigation.ts` desde 004 — mismo patrón de "slot pre-reservado reutilizado" que 015 usó para `Obligaciones Fiscales`. La administración de Tipos de Documento y de Documentos Esperados vive en `apps/admin/catalogos`, junto a los catálogos de 012/013, reutilizando `manage_catalogs`.

## Complexity Tracking

> No violations to justify — table intentionally omitted.
