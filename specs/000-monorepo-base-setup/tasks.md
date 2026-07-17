# Tasks: Infraestructura Base del Monorepo

**Input**: Design documents from `specs/000-monorepo-base-setup/`

**Prerequisites**: plan.md ✅ | spec.md ✅ | research.md ✅ | data-model.md ✅ | contracts/ ✅

**Tests**: No test tasks incluidas — la especificación no solicita TDD para esta feature de infraestructura. La validación se hace mediante los escenarios del quickstart.md.

**Organization**: Tareas organizadas por User Story para implementación independiente.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede correr en paralelo (archivos distintos, sin dependencias entre sí)
- **[Story]**: User Story a la que pertenece (US1, US2, US3, US4)
- Rutas absolutas desde la raíz del repositorio

---

## Phase 1: Setup (Infraestructura Compartida del Monorepo)

**Purpose**: Inicialización del workspace y configuraciones base compartidas. Estas tareas crean el esqueleto del monorepo antes de cualquier código de aplicación.

- [x] T001 Create `pnpm-workspace.yaml` declaring `apps/*` and `packages/*` as workspace members
- [x] T002 Create root `package.json` with `name: "control-contable"`, `private: true`, `engines` (`node>=20`, `pnpm>=9`), `packageManager: "pnpm@9.x.x"`, and stub `scripts` section
- [x] T003 [P] Create `turbo.json` with tasks: `build` (outputs `.next/**`,`dist/**`, dependsOn `^build`), `dev` (persistent, no cache), `lint` (dependsOn `^lint`), `type-check` (dependsOn `^build`), `clean` (no cache)
- [x] T004 [P] Create root `.gitignore` excluding: `node_modules/`, `.next/`, `.turbo/`, `dist/`, `.env.local`, `.env*.local`, `*.env`, `supabase/.temp/`, `.DS_Store`, `*.log`
- [x] T005 [P] Create `packages/config/package.json` with `name: "@control-contable/config"`, `version: "0.0.0"`, `private: true`, and `exports` map for `./eslint`, `./prettier`, `./typescript/*`
- [x] T006 [P] Create `packages/config/typescript/base.json` with `compilerOptions`: `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `noImplicitOverride: true`, `moduleResolution: "bundler"`, `module: "ESNext"`, `target: "ES2022"`, `skipLibCheck: true`
- [x] T007 [P] Create `packages/config/typescript/nextjs.json` extending `./base.json` adding `lib: ["dom","dom.iterable","esnext"]`, `jsx: "preserve"`, `plugins: [{"name":"next"}]`, `allowJs: true`, `resolveJsonModule: true`
- [x] T008 [P] Create `packages/config/typescript/library.json` extending `./base.json` adding `lib: ["esnext"]`, `declaration: true`, `declarationMap: true`, `outDir: "./dist"`, `rootDir: "./src"`
- [x] T009 [P] Create `packages/config/eslint/index.js` as ESLint 9 flat config array: TypeScript parser (`@typescript-eslint/parser`), TypeScript plugin rules including `no-explicit-any: error`, `no-unused-vars: error`, `prefer-const: error`, `no-console: warn`
- [x] T010 [P] Create `packages/config/prettier/index.js` exporting config object: `semi: false`, `singleQuote: true`, `printWidth: 100`, `tabWidth: 2`, `trailingComma: "all"`, `arrowParens: "always"`

---

## Phase 2: Foundational (Prerequisitos Bloqueantes)

**Purpose**: Scaffolding de apps y paquetes compartidos. Debe completarse antes de cualquier User Story.

**⚠️ CRITICAL**: No se puede iniciar ninguna User Story hasta completar esta fase.

- [x] T011 Create `apps/portal/package.json` with `name: "@control-contable/portal"`, `private: true`, dependencies: `next@^15`, `react@^19`, `react-dom@^19`, `@mui/material@^6`, `@emotion/react@^11`, `@emotion/styled@^11`, `@supabase/supabase-js@^2`, `@control-contable/ui: "workspace:*"`, `@control-contable/types: "workspace:*"`, `@control-contable/utils: "workspace:*"`, devDeps: `@control-contable/config: "workspace:*"`, `typescript@^5`
- [x] T012 [P] Create `apps/admin/package.json` mirroring T011 with `name: "@control-contable/admin"` and same dependency set
- [x] T013 [P] Create `apps/portal/tsconfig.json` extending `@control-contable/config/typescript/nextjs.json`, `include: ["src/**/*","next-env.d.ts",".next/types/**/*.ts"]`, `exclude: ["node_modules"]`
- [x] T014 [P] Create `apps/admin/tsconfig.json` identical structure to T013
- [x] T015 [P] Create `apps/portal/eslint.config.js` importing base config from `@control-contable/config/eslint` and spreading it, adding Next.js plugin rules via `@next/eslint-plugin-next`
- [x] T016 [P] Create `apps/admin/eslint.config.js` with same structure as T015
- [x] T017 [P] Create `packages/ui/package.json` with `name: "@control-contable/ui"`, `private: true`, `main: "./src/index.ts"`, `types: "./src/index.ts"`, peerDeps: `react@^19`, `react-dom@^19`, `@mui/material@^6`, `@emotion/react@^11`, `@emotion/styled@^11`, deps: `@control-contable/types: "workspace:*"`, devDeps: `@control-contable/config: "workspace:*"`, `typescript@^5`
- [x] T018 [P] Create `packages/ui/tsconfig.json` extending `@control-contable/config/typescript/nextjs.json` (needs DOM for React components)
- [x] T019 [P] Create `packages/ui/src/index.ts` with `export {}` (empty export — components added in feature modules)
- [x] T020 [P] Create `packages/ui/eslint.config.js` importing from `@control-contable/config/eslint`
- [x] T021 [P] Create `packages/types/package.json` with `name: "@control-contable/types"`, `private: true`, `main: "./src/index.ts"`, `types: "./src/index.ts"`, devDeps: `@control-contable/config: "workspace:*"`, `typescript@^5` (no runtime deps — types only)
- [x] T022 [P] Create `packages/types/tsconfig.json` extending `@control-contable/config/typescript/library.json`
- [x] T023 [P] Create `packages/types/src/database.ts` with empty `export type Database = {}` placeholder (will be overwritten by `supabase gen types`)
- [x] T024 [P] Create `packages/types/src/domain/index.ts` with `export {}` (domain types added per feature module)
- [x] T025 [P] Create `packages/types/src/index.ts` re-exporting: `export * from './database'` and `export * from './domain'`
- [x] T026 [P] Create `packages/utils/package.json` with `name: "@control-contable/utils"`, `private: true`, `main: "./src/index.ts"`, `types: "./src/index.ts"`, deps: `@control-contable/types: "workspace:*"`, devDeps: `@control-contable/config: "workspace:*"`, `typescript@^5`
- [x] T027 [P] Create `packages/utils/tsconfig.json` extending `@control-contable/config/typescript/library.json`
- [x] T028 [P] Create `packages/utils/src/index.ts` with `export {}` (utilities added per feature module)
- [x] T029 [P] Create `packages/utils/eslint.config.js` and `packages/types/eslint.config.js` both importing from `@control-contable/config/eslint`
- [x] T030 Update root `package.json` to add final `scripts`: `"dev": "turbo dev"`, `"build": "turbo build"`, `"lint": "turbo lint"`, `"type-check": "turbo type-check"`, `"clean": "turbo clean"`, `"generate:types": "supabase gen types typescript --local > packages/types/src/database.ts"`, and `"prepare": "husky"`

**Checkpoint**: Estructura completa del monorepo definida. Ejecutar `pnpm install` para vincular workspaces. Iniciar work en User Stories.

---

## Phase 3: User Story 1 — Entorno Local Funcional (Priority: P1) 🎯 MVP

**Goal**: Un desarrollador nuevo puede clonar, instalar, configurar variables de entorno, iniciar Supabase y ver ambas apps corriendo en <15 minutos.

**Independent Test**: Clonar en máquina limpia → `pnpm install` sin errores → `supabase start` → configurar `.env.local` → `pnpm dev` → portal en `localhost:3000` y admin en `localhost:3001` renderizando sin errores.

### Implementation for User Story 1

- [x] T031 [US1] Initialize Supabase project: create `supabase/config.toml` via `supabase init` in project root, configure `project_id = "control-contable"`, set `[db] port = 54322`, `[api] port = 54321`, `[studio] port = 54323`
- [x] T032 [P] [US1] Create `apps/portal/next.config.ts` exporting config with `transpilePackages: ["@control-contable/ui","@control-contable/utils","@control-contable/types"]` and experimental settings for App Router
- [x] T033 [P] [US1] Create `apps/admin/next.config.ts` with identical transpilePackages config but port `3001` in dev server config
- [x] T034 [US1] Create `apps/portal/src/components/providers/EmotionCacheProvider.tsx` as `"use client"` component using `@emotion/cache` and `@emotion/react` for MUI + App Router compatibility
- [x] T035 [P] [US1] Create `apps/admin/src/components/providers/EmotionCacheProvider.tsx` identical to T034
- [x] T036 [US1] Create `apps/portal/src/lib/mui/theme.ts` exporting MUI theme created with `createTheme()` (neutral palette for portal operations)
- [x] T037 [P] [US1] Create `apps/admin/src/lib/mui/theme.ts` exporting MUI admin theme (can share palette with portal in this feature)
- [x] T038 [US1] Create `apps/portal/src/app/layout.tsx` as root layout wrapping children with `EmotionCacheProvider` and MUI `ThemeProvider`, including `CssBaseline`, `html` and `body` tags with `lang="es"`
- [x] T039 [P] [US1] Create `apps/admin/src/app/layout.tsx` with same structure as T038
- [x] T040 [US1] Create `apps/portal/src/app/page.tsx` rendering a basic page component (Typography heading "Portal de Control Contable" + MUI Box layout) to confirm MUI + App Router are working
- [x] T041 [P] [US1] Create `apps/admin/src/app/page.tsx` rendering basic page ("Panel Administrativo") to confirm admin app starts correctly
- [x] T042 [US1] Configure distinct dev ports: set `PORT=3000` in `apps/portal/.env.development` and `PORT=3001` in `apps/admin/.env.development`; update `turbo.json` dev task to pass port env vars
- [x] T043 [US1] Validate US1: run `pnpm install` + `supabase start` + `pnpm dev` and confirm portal accessible at `localhost:3000` and admin at `localhost:3001` without console errors

**Checkpoint**: US1 completa — developer puede tener el entorno corriendo con un flujo de comandos documentado.

---

## Phase 4: User Story 2 — Calidad de Código Automatizada (Priority: P2)

**Goal**: Commits con código mal formateado o con errores de linting son rechazados automáticamente antes de ser registrados.

**Independent Test**: Editar un archivo `.ts` con error de formato → `git add` → `git commit -m "test"` → commit rechazado con mensaje claro. Luego corregir → commit acepta.

### Implementation for User Story 2

- [x] T044 [US2] Add `husky@^9` and `lint-staged@^15` to root `package.json` devDependencies, then run `pnpm install` to install them and initialize Husky (creates `.husky/` directory via `prepare` script)
- [x] T045 [US2] Create `.husky/pre-commit` file (executable mode 755) containing `pnpm lint-staged` as the only command
- [x] T046 [US2] Configure `lint-staged` in root `package.json` with rules: `"*.{ts,tsx}"`: `["eslint --fix","prettier --write"]`, `"*.{js,jsx,mjs,cjs}"`: `["eslint --fix","prettier --write"]`, `"*.{json,md,mdx,yml,yaml,css}"`: `["prettier --write"]`
- [x] T047 [US2] Create root `.prettierrc.js` (or `prettier` field in `package.json`) referencing `@control-contable/config/prettier` so Prettier picks up the shared config
- [x] T048 [US2] Create root `eslint.config.js` as workspace root config (minimal — applies to root-level files like `turbo.json`, CI configs) importing from `@control-contable/config/eslint`
- [x] T049 [US2] Validate US2: create `packages/utils/src/bad-format.ts` with intentional spacing error → `git commit` → verify rejection message; delete file, commit clean → verify success

**Checkpoint**: US2 completa — calidad de código se verifica automáticamente en cada intento de commit.

---

## Phase 5: User Story 3 — Variables de Entorno Seguras (Priority: P2)

**Goal**: Desarrolladores tienen archivos de ejemplo documentados para configurar el entorno; es imposible commitear archivos de credenciales por accidente.

**Independent Test**: `git add apps/portal/.env.local` → archivo ignorado por .gitignore. `git show HEAD:apps/portal/.env.local.example` → muestra contenido documentado. App iniciada sin variables → mensaje de error claro.

### Implementation for User Story 3

- [x] T050 [US3] Create `apps/portal/.env.local.example` documenting all required variables: `NEXT_PUBLIC_SUPABASE_URL` (URL de Supabase local, valor ejemplo: `http://localhost:54321`), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clave anónima, valor ejemplo: `[anon-key-from-supabase-status]`), `SUPABASE_SERVICE_ROLE_KEY` (solo servidor — NO exponer al cliente), `NEXT_PUBLIC_APP_URL` (URL base: `http://localhost:3000`), each with a descriptive comment
- [x] T051 [P] [US3] Create `apps/admin/.env.local.example` with same variables adapted for admin (`NEXT_PUBLIC_APP_URL=http://localhost:3001`)
- [x] T052 [P] [US3] Create root `.env.example` documenting any workspace-level variables (currently none required — file serves as placeholder with instructional comments)
- [x] T053 [US3] Verify `root .gitignore` contains all necessary env file patterns: `.env.local`, `.env*.local`, `*.env`, `.env` (but NOT `.env.example` or `.env.local.example`) — update if any pattern is missing from T004
- [x] T054 [US3] Create `apps/portal/src/lib/env.ts` that reads and validates required env vars at startup using a typed schema (export `env` object — throw descriptive error listing missing vars if any required var is absent)
- [x] T055 [P] [US3] Create `apps/admin/src/lib/env.ts` with same validation pattern for admin-specific variables
- [x] T056 [US3] Import and call `env` validation from `apps/portal/src/app/layout.tsx` and `apps/admin/src/app/layout.tsx` to trigger validation on server startup (import at top of layout file)
- [x] T057 [US3] Validate US3: `git add apps/portal/.env.local` → verify file not staged; `git show HEAD:apps/portal/.env.local.example` → verify documented content; start app without env vars → verify descriptive error

**Checkpoint**: US3 completa — secretos protegidos, onboarding documentado, startup con validación explícita.

---

## Phase 6: User Story 4 — Integración Continua Básica (Priority: P3)

**Goal**: Al hacer push o abrir un PR, GitHub Actions ejecuta lint, type-check y build automáticamente, reportando el resultado.

**Independent Test**: Push a rama → GitHub Actions workflow aparece en Actions tab → ejecuta todas las verificaciones → pasa en código limpio, falla con mensaje claro en código con errores.

### Implementation for User Story 4

- [x] T058 [US4] Create `.github/workflows/ci.yml` defining trigger `on: [push, pull_request]`, job `quality` running on `ubuntu-latest` with steps: checkout, pnpm/action-setup@v4, actions/setup-node@v4 (node 20, cache pnpm), `pnpm install --frozen-lockfile`, `pnpm turbo lint type-check build`
- [x] T059 [US4] Add pnpm store cache configuration to the CI workflow: use `actions/cache@v4` with key `${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}` pointing to the pnpm store directory
- [x] T060 [US4] Create `.github/workflows/ci.yml` name and concurrency settings to cancel in-progress runs on the same branch (prevents redundant runs on fast pushes)
- [x] T061 [US4] Validate US4: push branch to GitHub remote → confirm Actions tab shows workflow → verify all steps pass on clean code; optionally introduce a lint error, push, verify CI fails with descriptive output

**Checkpoint**: US4 completa — CI verifica calidad automáticamente en cada integración al repositorio remoto.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Mejoras que afectan a múltiples User Stories y la experiencia general del proyecto.

- [x] T062 [P] Create root `README.md` with: project overview, prerequisites (Node 20, pnpm 9, Docker, Supabase CLI), setup commands (`pnpm install`, `supabase start`, copy .env.local.example, `pnpm dev`), available scripts reference, and monorepo structure diagram
- [x] T063 [P] Add `.nvmrc` file at repo root with content `20` for Node version pinning (works with nvm and fnm)
- [x] T064 [P] Create `docker-compose.yml` at repo root as optional orchestration reference (documents the Supabase ports in Docker terms for teams that prefer docker-compose commands over supabase CLI directly)
- [x] T065 Run complete quickstart.md validation: execute all 8 scenarios documented in `specs/000-monorepo-base-setup/quickstart.md` and confirm all pass
- [x] T066 [P] Add `turbo.json` remote caching configuration stub (commented out) documenting how to enable Vercel Remote Cache or self-hosted cache for CI speedup in the future
- [x] T067 Verify Turborepo build cache works: run `pnpm build` twice and confirm second run uses cache (output shows `>>> FULL TURBO` cache hit indicators)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 — Setup**: Sin dependencias — iniciar inmediatamente
- **Phase 2 — Foundational**: Depende de Phase 1 completo — BLOQUEA todas las User Stories
- **Phase 3 — US1 (P1)**: Depende de Phase 2 — MVP mínimo entregable
- **Phase 4 — US2 (P2)**: Depende de Phase 2 — independiente de US1
- **Phase 5 — US3 (P2)**: Depende de Phase 2 — independiente de US1 y US2
- **Phase 6 — US4 (P3)**: Depende de Phase 2 — independiente de US1/2/3 (pero logicamente se valida mejor después de US2/US3)
- **Phase 7 — Polish**: Depende de todas las US deseadas completadas

### User Story Dependencies

- **US1 (P1)**: Inicia tras Phase 2. Sin dependencias de otras User Stories.
- **US2 (P2)**: Inicia tras Phase 2. Sin dependencias de US1 (hooks son independientes de las apps).
- **US3 (P2)**: Inicia tras Phase 2. Sin dependencias de US1 o US2 (env vars son independientes).
- **US4 (P3)**: Inicia tras Phase 2. Sin dependencias de US1/2/3 (CI es independiente).

### Within Each User Story

- Archivos de configuración (`next.config.ts`, `tsconfig.json`) antes de código de aplicación
- Providers antes de layout, layout antes de pages
- Validar al final de cada US antes de marcar como completa

### Parallel Opportunities

- **Phase 1**: T003–T010 todos en paralelo después de T001 y T002
- **Phase 2**: T011/T012 en paralelo (portal vs admin); T013-T029 todos en paralelo entre sí; T030 al final
- **Phase 3 (US1)**: T032/T033 paralelo; T034/T035 paralelo; T036/T037 paralelo; T038/T039 paralelo; T040/T041 paralelo
- **Phase 5 (US3)**: T050/T051/T052 paralelo; T054/T055 paralelo
- **Phase 7**: T062/T063/T064/T066 todos en paralelo

---

## Parallel Example: Phase 2 (Foundational)

```bash
# Group A — Portal and Admin app scaffolding (run together):
Task T011: "Create apps/portal/package.json"
Task T012: "Create apps/admin/package.json"

# Group B — tsconfig and eslint for apps (run after T005 config package exists):
Task T013: "Create apps/portal/tsconfig.json"
Task T014: "Create apps/admin/tsconfig.json"
Task T015: "Create apps/portal/eslint.config.js"
Task T016: "Create apps/admin/eslint.config.js"

# Group C — Package scaffolding (all in parallel):
Task T017-T019: "packages/ui scaffold"
Task T021-T025: "packages/types scaffold"
Task T026-T028: "packages/utils scaffold"
```

## Parallel Example: User Story 1 (US1)

```bash
# Group A — Next.js configs (run together after Phase 2):
Task T032: "Create apps/portal/next.config.ts"
Task T033: "Create apps/admin/next.config.ts"

# Group B — Providers and themes (run together):
Task T034: "apps/portal EmotionCacheProvider"
Task T035: "apps/admin EmotionCacheProvider"
Task T036: "apps/portal MUI theme"
Task T037: "apps/admin MUI theme"

# Group C — Layouts and pages (after Group B):
Task T038: "apps/portal layout.tsx"    # needs T034, T036
Task T039: "apps/admin layout.tsx"     # needs T035, T037
Task T040: "apps/portal page.tsx"      # can parallel with T039
Task T041: "apps/admin page.tsx"       # can parallel with T038
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup (T001–T010)
2. Completar Phase 2: Foundational (T011–T030) — bloquea todo
3. Completar Phase 3: US1 (T031–T043)
4. **PARAR Y VALIDAR**: Ejecutar quickstart.md Escenarios 1 y 2
5. Si pasa → MVP entregable: developer puede iniciar el entorno local

### Incremental Delivery

1. Phase 1 + Phase 2 → Estructura del monorepo lista
2. - Phase 3 (US1) → Entorno local funcional → **Demo/validación**
3. - Phase 4 (US2) → Calidad de código automatizada → **Demo/validación**
4. - Phase 5 (US3) → Seguridad de credenciales → **Demo/validación**
5. - Phase 6 (US4) → CI pipeline activo → **Demo/validación**
6. - Phase 7 (Polish) → Repositorio production-ready

### Parallel Team Strategy

Con 2+ desarrolladores una vez completado Phase 2:

- **Dev A**: US1 (entorno local, MUI setup)
- **Dev B**: US2 + US3 (hooks de git + env vars)
- **Dev C**: US4 (CI pipeline — solo requiere GitHub Actions YAML)
- Todos integran al final con validación independiente por story

---

## Notes

- [P] = diferentes archivos, sin dependencias entre las tareas marcadas
- [USN] = trazabilidad con User Story específica del spec.md
- Ejecutar `pnpm install` después de T030 para vincular todos los workspaces
- En Phase 3, ejecutar `supabase init` antes de T031 si Supabase CLI no está inicializado
- Cada User Story puede validarse de forma independiente usando los escenarios de quickstart.md
- No commitear hasta que lint-staged pase (evitar deuda técnica desde el primer commit)
- Supabase keys locales (`supabase status`) cambian con cada `supabase start` — documenta el proceso en README
