# Implementation Plan: Infraestructura Base del Monorepo

**Branch**: `000-monorepo-base-setup` | **Date**: 2026-07-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/000-monorepo-base-setup/spec.md`

## Summary

Crear la estructura inicial del monorepo del sistema contable como un workspace con dos aplicaciones web (portal y panel administrativo) y cuatro paquetes compartidos (ui, types, utils, config). La infraestructura incluye gestión automatizada de calidad de código en cada commit, entorno local reproducible mediante contenedores, gestión segura de variables de entorno y un pipeline básico de integración continua.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Node.js 20 LTS

**Primary Dependencies**:

- Turborepo 2.x — orquestación de tareas y caché del monorepo
- pnpm 9.x — gestor de paquetes con soporte nativo de workspaces
- Next.js 15.x — framework para ambas aplicaciones web
- React 19.x — biblioteca de interfaz de usuario
- Material UI 6.x — sistema de componentes
- ESLint 9.x (flat config) — análisis estático
- Prettier 3.x — formateo de código
- Husky 9.x — hooks de git
- lint-staged 15.x — verificaciones en archivos staged
- Supabase CLI — entorno local de base de datos y servicios

**Storage**: Supabase (PostgreSQL) — instancia local via Supabase CLI + Docker

**Testing**: Verificación de tipos con `tsc --noEmit`; pruebas de módulos de negocio en features posteriores

**Target Platform**: Navegadores web modernos (Chrome, Firefox, Safari, Edge); entorno de desarrollo macOS/Linux

**Project Type**: Monorepo — dos aplicaciones Next.js + cuatro paquetes compartidos

**Performance Goals**:

- Hot reload en cambios de paquetes compartidos: <5 segundos
- Pipeline de CI completo: <10 minutos
- Instalación de dependencias (primera vez): <5 minutos

**Constraints**:

- Onboarding de desarrollador nuevo: <15 minutos desde cero
- Windows fuera de alcance (v1)
- Sin despliegue automático (CD) en esta versión
- Supabase local obligatorio para desarrollo (sin mocks de base de datos)

**Scale/Scope**: 2 aplicaciones, 4 paquetes compartidos, equipo pequeño (1-5 desarrolladores)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio                         | Estado  | Notas                                                                                     |
| --------------------------------- | ------- | ----------------------------------------------------------------------------------------- |
| TypeScript strict                 | ✅ PASS | `tsconfig` base en `packages/config` con `strict: true` compartido                        |
| ESLint sin errores                | ✅ PASS | ESLint 9 flat config centralizado en `packages/config/eslint`                             |
| Prettier obligatorio              | ✅ PASS | Config compartida + Husky/lint-staged lo fuerzan en cada commit                           |
| Material UI                       | ✅ PASS | Incluido en `packages/ui` y en ambas apps                                                 |
| Supabase / PostgreSQL             | ✅ PASS | Supabase CLI para local, mismo servicio para ambas apps                                   |
| Docker / Docker Compose           | ✅ PASS | Supabase CLI usa Docker internamente; `docker-compose.yml` orquesta el stack              |
| Arquitectura por capas            | ✅ PASS | Definida en la estructura de cada app (Presentation → Use Cases → Services → Persistence) |
| Monorepo apps/portal + apps/admin | ✅ PASS | Ambas aplicaciones en `apps/` con paquetes compartidos en `packages/`                     |
| Seguridad: sin secrets en repo    | ✅ PASS | `.gitignore` bloquea `.env*` excepto `.env.example`; Husky verifica pre-commit            |
| Soft delete / auditoría           | ⚪ N/A  | Esta feature es infraestructura; la lógica de datos se define en features posteriores     |
| Backup automático                 | ⚪ N/A  | Fuera del alcance de esta feature de infraestructura                                      |

**Gate result**: ✅ PASS — Se puede proceder a Phase 0 y Phase 1.

## Project Structure

### Documentation (this feature)

```text
specs/000-monorepo-base-setup/
├── plan.md              # Este archivo
├── research.md          # Phase 0 — decisiones técnicas y alternativas
├── data-model.md        # Phase 1 — grafo de paquetes y contratos de dependencia
├── quickstart.md        # Phase 1 — guía de validación end-to-end
├── contracts/           # Phase 1 — APIs públicas de cada paquete compartido
│   ├── package-ui.md
│   ├── package-types.md
│   ├── package-utils.md
│   └── package-config.md
└── tasks.md             # Phase 2 — generado por /speckit-tasks (NO por este comando)
```

### Source Code (repository root)

```text
control-contable/                    # Raíz del monorepo
├── apps/
│   ├── portal/                      # Aplicación principal del despacho
│   │   ├── src/
│   │   │   ├── app/                 # Next.js App Router (pages, layouts, routes)
│   │   │   ├── components/          # Componentes específicos del portal
│   │   │   ├── modules/             # Módulos de negocio (clients, billing, files, reports)
│   │   │   │   └── [module]/
│   │   │   │       ├── components/
│   │   │   │       ├── hooks/
│   │   │   │       ├── services/
│   │   │   │       └── types.ts
│   │   │   └── lib/                 # Utilidades y configuración del portal
│   │   ├── public/
│   │   ├── .env.local.example       # Variables de entorno documentadas
│   │   ├── next.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── admin/                       # Panel administrativo
│       ├── src/
│       │   ├── app/                 # Next.js App Router
│       │   ├── components/          # Componentes específicos del admin
│       │   ├── modules/             # Módulos admin (users, roles, audit, catalogs, config)
│       │   │   └── [module]/
│       │   │       ├── components/
│       │   │       ├── hooks/
│       │   │       ├── services/
│       │   │       └── types.ts
│       │   └── lib/
│       ├── public/
│       ├── .env.local.example
│       ├── next.config.ts
│       ├── package.json
│       └── tsconfig.json
├── packages/
│   ├── ui/                          # Componentes de interfaz compartidos
│   │   ├── src/
│   │   │   ├── components/          # Componentes Material UI extendidos
│   │   │   └── index.ts             # Punto de entrada público
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── types/                       # Tipos TypeScript compartidos
│   │   ├── src/
│   │   │   ├── database.ts          # Tipos generados de Supabase
│   │   │   ├── domain/              # Tipos de dominio del negocio
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── utils/                       # Utilidades compartidas
│   │   ├── src/
│   │   │   ├── date/
│   │   │   ├── format/
│   │   │   ├── validation/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── config/                      # Configuraciones compartidas
│       ├── eslint/
│       │   └── index.js             # ESLint flat config base
│       ├── prettier/
│       │   └── index.js             # Prettier config base
│       ├── typescript/
│       │   ├── base.json            # tsconfig base (strict)
│       │   ├── nextjs.json          # tsconfig para apps Next.js
│       │   └── library.json         # tsconfig para paquetes compartidos
│       └── package.json
├── .github/
│   └── workflows/
│       └── ci.yml                   # Pipeline de CI (lint, type-check, build)
├── supabase/                        # Configuración Supabase local
│   ├── config.toml
│   └── migrations/                  # Migraciones iniciales (vacías en esta feature)
├── docker-compose.yml               # Orquestación del stack local (si se necesita complementar)
├── .env.example                     # Variables de entorno del workspace raíz
├── .gitignore                       # Incluye .env*, .env.local, etc.
├── .husky/
│   └── pre-commit                   # Hook: lint-staged
├── turbo.json                       # Configuración de tareas Turborepo
├── pnpm-workspace.yaml              # Definición de workspaces pnpm
├── package.json                     # Raíz: scripts globales, devDependencies compartidas
└── .prettierrc.js → packages/config/prettier/index.js  # Symlink o referencia
```

**Structure Decision**: Se eligió la estructura de monorepo con `apps/` y `packages/` separados, siguiendo las convenciones estándar de Turborepo y la Constitución del proyecto. Cada app tiene su propia estructura de módulos de negocio para mantener el bajo acoplamiento. Los paquetes compartidos no tienen sub-estructura compleja en esta versión inicial.

## Complexity Tracking

No hay violaciones a la Constitución. La complejidad del monorepo (Turborepo + dos apps + cuatro paquetes) está explícitamente mandatada por la Constitución del proyecto y los requerimientos del sistema.
