# Research: Infraestructura Base del Monorepo

**Feature**: 001-monorepo-base-setup | **Date**: 2026-07-13

---

## Decisión 1: Gestor de Paquetes — pnpm

**Decision**: pnpm 9.x

**Rationale**:

- Soporte nativo de workspaces mediante `pnpm-workspace.yaml` sin configuración extra
- Protocolo `workspace:*` para dependencias internas permite que Turborepo resuelva el grafo de paquetes correctamente
- Instalación significativamente más rápida que npm gracias al store global con hard links
- Turborepo está optimizado y documentado con pnpm como caso de uso primario
- Compatible con Node.js 20 LTS y el ecosistema Next.js/React

**Alternatives considered**:

- `npm workspaces`: soportado por Turborepo pero más lento; sin soporte de `workspace:` protocol nativo hasta versiones recientes
- `yarn berry (PnP)`: compatibilidad más compleja con Next.js y Supabase CLI; overhead de configuración no justificado para este equipo
- `bun`: ecosistema aún en maduración; riesgo para entorno de producción en 2026

---

## Decisión 2: Versión de Turborepo — v2.x

**Decision**: Turborepo 2.x (latest stable)

**Rationale**:

- Turborepo 2 usa `tasks` en `turbo.json` (reemplazando `pipeline` de v1), con API más clara
- Soporte para `--filter` mejorado, útil para ejecutar tareas solo en apps afectadas por un cambio
- Remote caching disponible como opción futura para acelerar CI sin cambiar la configuración local
- Documentación oficial actualizada y ejemplos de la comunidad con pnpm + Next.js

**Key turbo.json tasks**:

```json
{
  "tasks": {
    "build": { "dependsOn": ["^build"], "outputs": [".next/**", "dist/**"] },
    "dev": { "persistent": true, "cache": false },
    "lint": { "dependsOn": ["^lint"] },
    "type-check": { "dependsOn": ["^build"] },
    "clean": { "cache": false }
  }
}
```

**Alternatives considered**:

- Turborepo v1: Funcional pero usa API `pipeline` deprecada; migración eventual necesaria
- Nx: Más poderoso pero más complejo de configurar; overkill para este tamaño de proyecto
- Lerna: Históricamente popular pero superado por Turborepo en DX y rendimiento

---

## Decisión 3: Supabase Local — Supabase CLI con Docker

**Decision**: `supabase` CLI 2.x que orquesta un stack local completo vía Docker

**Rationale**:

- `supabase start` levanta PostgreSQL, Auth, Storage, y otros servicios en contenedores Docker automáticamente
- Genera URLs y API keys locales idénticas en formato a producción → mismo código funciona en local y prod
- `supabase db diff` y `supabase migration` permiten gestionar el esquema de forma versionada
- Genera tipos TypeScript automáticamente con `supabase gen types typescript`, los cuales van a `packages/types/src/database.ts`
- Integra con Docker Compose del proyecto para orquestación unificada

**Flujo local**:

```bash
supabase start         # Levanta stack local (PostgreSQL + Auth + Storage)
supabase db reset      # Aplica migraciones y seeds
supabase gen types typescript --local > packages/types/src/database.ts
```

**Variables de entorno generadas**:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (solo backend/server components)

**Alternatives considered**:

- Docker Compose manual con imagen oficial de PostgreSQL: Requiere configurar Auth y Storage manualmente; mayor superficie de configuración
- Supabase remoto (proyecto free tier): Dependencia de red; no reproducible offline; riesgo de contaminar datos entre desarrolladores

---

## Decisión 4: Plataforma de CI — GitHub Actions

**Decision**: GitHub Actions con workflow YAML en `.github/workflows/ci.yml`

**Rationale**:

- Integración nativa con GitHub (asumido como plataforma de control de versiones)
- Gratuito para repositorios privados dentro de los límites del plan
- `actions/cache` con soporte explícito para pnpm store permite reutilizar dependencias entre runs
- Amplia comunidad y acciones disponibles (`setup-node`, `cache`, etc.)
- El workflow básico de CI (lint + type-check + build) puede correr en <10 minutos

**Workflow básico**:

```yaml
name: CI
on: [push, pull_request]
jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm turbo lint type-check build
```

**Alternatives considered**:

- GitLab CI: Válido si el equipo usa GitLab; requiere configuración diferente pero equivalente
- Bitbucket Pipelines: Menos común; documentación más limitada para este stack
- CircleCI: Funcional pero agrega una plataforma externa innecesaria si ya se usa GitHub

**Nota**: El workflow puede adaptarse a GitLab CI o Bitbucket con cambios mínimos de sintaxis.

---

## Decisión 5: ESLint — v9 con Flat Config

**Decision**: ESLint 9.x usando flat config (`eslint.config.js`)

**Rationale**:

- ESLint 9 deprecó el sistema `.eslintrc` en favor de `eslint.config.js` (flat config)
- La flat config es más predecible: sin cascada implícita de archivos, sin reglas heredadas sorpresa
- `@typescript-eslint/eslint-plugin` v8 soporta flat config nativamente
- `eslint-config-next` (Next.js) actualizado para flat config en versiones recientes
- Una sola configuración base en `packages/config/eslint/index.js`, extendida por cada app/paquete

**Configuración base**:

```js
// packages/config/eslint/index.js
import { defineConfig } from 'eslint/config'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
export default defineConfig([
  { files: ['**/*.{ts,tsx}'], plugins: { '@typescript-eslint': tsPlugin },
    languageOptions: { parser: tsParser },
    rules: { '@typescript-eslint/no-explicit-any': 'error', ... } }
])
```

**Alternatives considered**:

- ESLint 8 con `.eslintrc.json`: Funcional pero en vías de deprecación; migración inevitable
- Biome: Herramienta prometedora que combina lint + format, pero aún en maduración; incompatibilidades con algunas reglas de TypeScript-ESLint

---

## Decisión 6: Husky — v9

**Decision**: Husky 9.x

**Rationale**:

- Husky 9 cambió el formato de hooks: scripts en `.husky/pre-commit` (sin usar `husky add` command)
- Activación automática con `"prepare": "husky"` en `package.json` raíz
- Compatible con pnpm y funciona correctamente en macOS/Linux
- Se integra con lint-staged para ejecutar verificaciones solo en archivos modificados (staged)

**Configuración**:

```bash
# .husky/pre-commit
pnpm lint-staged
```

```json
// package.json raíz
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix", "prettier --write"],
    "*.{json,md,yml,yaml}": ["prettier --write"]
  }
}
```

**Alternatives considered**:

- lefthook: Alternativa más rápida escrita en Go; menos adoptada en ecosistema JavaScript
- simple-git-hooks: Más simple pero menos funciones; requiere instalación manual

---

## Decisión 7: Node.js — v20 LTS

**Decision**: Node.js 20 LTS (Iron)

**Rationale**:

- LTS activo hasta abril 2026, mantenimiento hasta abril 2028
- Soportado oficialmente por Next.js 15, Turborepo 2, y Supabase CLI
- Disponible en todas las imágenes de CI estándar (`ubuntu-latest` en GitHub Actions)
- `.nvmrc` o `package.json#engines` documenta la versión requerida para el equipo

**Alternatives considered**:

- Node.js 22 LTS: LTS desde octubre 2024; compatible con el stack pero algunos packages aún en proceso de certificación
- Node.js 18 LTS: EOL en abril 2025; no recomendado para proyectos nuevos

---

## Decisión 8: Estructura de Módulos en Apps — Por Dominio de Negocio

**Decision**: Módulos organizados por dominio de negocio dentro de cada app, con capas explícitas

**Rationale**:

- La Constitución define los módulos principales: Clientes, Cobranza, Expedientes, Recibos, Reportes, Usuarios, Auditoría, Configuración
- Cada módulo encapsula components/, hooks/, services/, y types.ts propios
- Las reglas de negocio en services/, no en componentes React
- Compatible con la arquitectura en capas (Presentation → Use Cases → Services → Persistence)
- Facilita la adición de nuevos módulos sin modificar la configuración global

**Alternatives considered**:

- Por tipo técnico (components/, hooks/, services/ a nivel app): Crea acoplamiento entre módulos; dificulta encontrar código relacionado a una función de negocio
- Feature flags por módulo: Complejidad innecesaria en esta etapa

---

## Resolución de NEEDS CLARIFICATION

No había marcadores `[NEEDS CLARIFICATION]` en el spec. Todos los aspectos técnicos tenían suficiente contexto en la Constitución del proyecto o se resolvieron con las decisiones anteriores.

## Resumen de Decisiones

| Área                   | Decisión             | Versión |
| ---------------------- | -------------------- | ------- |
| Package manager        | pnpm                 | 9.x     |
| Monorepo orchestration | Turborepo            | 2.x     |
| Node.js                | LTS Iron             | 20.x    |
| Apps framework         | Next.js              | 15.x    |
| UI components          | Material UI          | 6.x     |
| Database/backend       | Supabase CLI (local) | 2.x     |
| Linting                | ESLint flat config   | 9.x     |
| Formatting             | Prettier             | 3.x     |
| Git hooks              | Husky                | 9.x     |
| Staged checks          | lint-staged          | 15.x    |
| CI platform            | GitHub Actions       | -       |
