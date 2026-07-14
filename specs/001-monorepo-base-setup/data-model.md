# Data Model: Infraestructura Base del Monorepo

**Feature**: 001-monorepo-base-setup | **Date**: 2026-07-13

Esta feature es de infraestructura. No define entidades de base de datos. El "modelo de datos" aquí documenta el **grafo de dependencias de paquetes** del monorepo y las **configuraciones compartidas** como entidades de primer orden.

---

## Grafo de Dependencias del Monorepo

```
apps/portal ──────────┐
                       ├──> packages/ui
apps/admin ───────────┤──> packages/types
                       ├──> packages/utils
                       └──> packages/config

packages/ui ──────────┤──> packages/types
packages/utils ────────┘──> packages/types
```

### Reglas del Grafo

1. Las apps (`apps/*`) pueden depender de cualquier paquete compartido (`packages/*`)
2. Los paquetes compartidos **no** pueden depender de las apps
3. `packages/types` es el único paquete que no depende de otros paquetes internos
4. `packages/config` es consumido como devDependency (no como dependencia de runtime)
5. No se permiten dependencias circulares entre paquetes

---

## Entidades de Configuración

### Workspace Root (`package.json` raíz)

Representa la configuración global del monorepo.

| Campo                | Tipo    | Descripción                                     |
| -------------------- | ------- | ----------------------------------------------- |
| `name`               | string  | `"control-contable"` — nombre del monorepo      |
| `private`            | boolean | `true` — nunca publicar el root                 |
| `scripts.dev`        | string  | `"turbo dev"` — inicia todas las apps           |
| `scripts.build`      | string  | `"turbo build"` — compila todo                  |
| `scripts.lint`       | string  | `"turbo lint"` — lint de todo el monorepo       |
| `scripts.type-check` | string  | `"turbo type-check"` — verificación de tipos    |
| `scripts.clean`      | string  | `"turbo clean"` — limpia artefactos de build    |
| `prepare`            | string  | `"husky"` — instala hooks de git                |
| `lint-staged`        | object  | Reglas para archivos staged (ver sección Hooks) |
| `engines.node`       | string  | `">=20"`                                        |
| `engines.pnpm`       | string  | `">=9"`                                         |
| `packageManager`     | string  | `"pnpm@9.x.x"`                                  |

### Turbo Tasks (`turbo.json`)

Representa el grafo de tareas de Turborepo.

| Tarea        | Depende de | Salidas (cache)       | Notas                          |
| ------------ | ---------- | --------------------- | ------------------------------ |
| `build`      | `^build`   | `.next/**`, `dist/**` | Construye dependencias primero |
| `dev`        | —          | Sin caché             | `persistent: true`             |
| `lint`       | `^lint`    | —                     | Sin salidas cacheables         |
| `type-check` | `^build`   | —                     | Necesita builds de paquetes    |
| `clean`      | —          | Sin caché             | Elimina artefactos             |

### Package Workspace (`pnpm-workspace.yaml`)

Define las ubicaciones de los paquetes en el monorepo.

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

---

## Variables de Entorno

Las variables de entorno son una entidad de configuración crítica. Se organizan en dos niveles:

### Variables del Portal (`apps/portal/.env.local`)

| Variable                        | Ámbito             | Requerida | Descripción                                               |
| ------------------------------- | ------------------ | --------- | --------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Público (cliente)  | Sí        | URL de la instancia Supabase local/prod                   |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Público (cliente)  | Sí        | Clave anónima de Supabase (segura para exponer)           |
| `SUPABASE_SERVICE_ROLE_KEY`     | Privado (servidor) | Sí        | Clave de service role (solo Server Components/API Routes) |
| `NEXT_PUBLIC_APP_URL`           | Público (cliente)  | Sí        | URL base de la aplicación (para redirecciones)            |

### Variables del Admin (`apps/admin/.env.local`)

| Variable                        | Ámbito             | Requerida | Descripción                                       |
| ------------------------------- | ------------------ | --------- | ------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Público (cliente)  | Sí        | URL de la instancia Supabase (la misma instancia) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Público (cliente)  | Sí        | Clave anónima de Supabase                         |
| `SUPABASE_SERVICE_ROLE_KEY`     | Privado (servidor) | Sí        | Clave de service role                             |
| `NEXT_PUBLIC_APP_URL`           | Público (cliente)  | Sí        | URL base del panel admin                          |

### Reglas de Seguridad para Variables de Entorno

- Variables con prefijo `NEXT_PUBLIC_` son expuestas al navegador — **nunca** incluir secrets aquí
- `SUPABASE_SERVICE_ROLE_KEY` es un secret — solo accesible en contextos de servidor
- Los archivos `.env.local` **nunca** se commitean (`.gitignore` los excluye)
- Los archivos `.env.local.example` **sí** se commitean con valores de ejemplo documentados

---

## Hooks de Calidad (lint-staged)

### Reglas por tipo de archivo

| Patrón           | Verificaciones                     |
| ---------------- | ---------------------------------- |
| `*.{ts,tsx}`     | `eslint --fix`, `prettier --write` |
| `*.{js,jsx,mjs}` | `eslint --fix`, `prettier --write` |
| `*.{json,jsonc}` | `prettier --write`                 |
| `*.{md,mdx}`     | `prettier --write`                 |
| `*.{yml,yaml}`   | `prettier --write`                 |
| `*.css`          | `prettier --write`                 |

---

## Estructura de Paquetes Compartidos

### `packages/types` — Tipos TypeScript

Punto de entrada único. No tiene runtime, solo tipos.

```typescript
// packages/types/src/index.ts
export * from './database' // Tipos generados por Supabase CLI
export * from './domain' // Tipos de dominio del negocio (vacíos en esta feature)
```

### `packages/ui` — Componentes de Interfaz

Exporta componentes React reutilizables basados en Material UI.

```typescript
// packages/ui/src/index.ts
// En esta feature: solo la estructura, sin componentes concretos
// Los componentes se añaden en features de módulos de negocio
export {}
```

### `packages/utils` — Utilidades

Exporta funciones puras reutilizables.

```typescript
// packages/utils/src/index.ts
// En esta feature: solo la estructura
export {}
```

### `packages/config` — Configuraciones

No exporta código de runtime. Es consumido como devDependency.

```
packages/config/
├── eslint/index.js        # ESLint flat config base
├── prettier/index.js      # Prettier config base
└── typescript/
    ├── base.json          # tsconfig base (strict)
    ├── nextjs.json        # Extiende base para apps Next.js
    └── library.json       # Extiende base para packages sin DOM
```
