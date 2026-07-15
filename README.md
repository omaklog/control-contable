# Control Contable

Sistema de administración para despacho contable — monorepo con Next.js, Supabase y Material UI.

## Requisitos

- [Node.js 20 LTS](https://nodejs.org/) (`node -v` → `v20.x.x`)
- [pnpm 9.x](https://pnpm.io/) (`pnpm -v` → `9.x.x`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) corriendo
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`supabase -v` → `2.x.x`)

## Configuración inicial

```bash
# 1. Instalar dependencias
pnpm install

# 2. Iniciar el stack local de Supabase (PostgreSQL + Auth + Storage)
supabase start

# 3. Configurar variables de entorno (usar las keys que muestra supabase start)
cp apps/portal/.env.local.example apps/portal/.env.local
cp apps/admin/.env.local.example apps/admin/.env.local
# Editar cada .env.local con los valores mostrados por `supabase status`

# 4. Sembrar el primer usuario Administrador (no hay autoregistro — ver apps/admin/README.md)
./supabase/seed-admin.sh admin@despacho.com "ContraseñaSegura123!"

# 5. Iniciar las aplicaciones
pnpm dev
```

Las aplicaciones quedan disponibles en:

- **Portal**: http://localhost:3000
- **Admin**: http://localhost:3001
- **Supabase Studio**: http://localhost:54323

## Scripts

| Comando               | Descripción                                                |
| --------------------- | ---------------------------------------------------------- |
| `pnpm dev`            | Inicia todas las apps en modo desarrollo                   |
| `pnpm build`          | Compila todas las apps para producción                     |
| `pnpm lint`           | Analiza el código con ESLint en todo el monorepo           |
| `pnpm type-check`     | Verifica tipos TypeScript en todo el monorepo              |
| `pnpm test`           | Ejecuta las pruebas (unitarias + integración) del monorepo |
| `pnpm clean`          | Elimina artefactos de build                                |
| `pnpm generate:types` | Regenera tipos TypeScript desde el esquema de Supabase     |

## Estructura del monorepo

```
control-contable/
├── apps/
│   ├── portal/          # Aplicación principal del despacho (puerto 3000)
│   └── admin/           # Panel administrativo (puerto 3001)
├── packages/
│   ├── ui/               # Componentes de interfaz compartidos (Material UI)
│   ├── types/            # Tipos TypeScript compartidos (BD + dominio)
│   ├── utils/            # Utilidades compartidas (puras, sin DOM)
│   ├── auth/             # Roles/permisos y guards de autorización (requireRole, hasPermission)
│   ├── supabase-client/  # Cliente de Supabase para browser/server/middleware (Next.js App Router)
│   └── config/           # Configuraciones de ESLint, Prettier, TypeScript y Vitest
├── supabase/            # Configuración y migraciones de Supabase local (desarrollo, vía CLI)
├── infra/supabase/      # Stack self-hosted de Supabase para el servidor del despacho (Docker Compose)
├── .github/workflows/   # Pipeline de CI (GitHub Actions)
└── specs/               # Especificaciones y plan de implementación
```

## Gestión de variables de entorno

- Los archivos `.env.local` **nunca** se commitean (están en `.gitignore`)
- Usa los archivos `.env.local.example` como plantilla documentada
- Para obtener las keys locales: `supabase status`

## Comandos de Supabase

```bash
supabase start          # Iniciar stack local
supabase stop           # Detener stack local
supabase status         # Ver URLs y API keys
supabase db reset       # Aplicar migraciones desde cero
pnpm generate:types     # Regenerar tipos TypeScript del esquema
```

Lo anterior es el flujo de **desarrollo local** (Supabase CLI, en tu propia máquina). Para el entorno **autoalojado** que corre en el servidor del despacho (Docker Compose, sin depender de Supabase Cloud), ver [`infra/supabase/README.md`](infra/supabase/README.md) — son entornos independientes; las apps se conectan a uno u otro solo cambiando las variables de `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` en su `.env.local`, sin cambios de código.

## Autenticación y roles

El sistema no tiene autoregistro: toda cuenta de personal se crea manualmente por un Administrador, sin invitación por correo. `apps/admin` es exclusiva del rol Administrador; `apps/portal` es accesible para Administrador, Contador y Auxiliar. Ver [`apps/admin/README.md`](apps/admin/README.md) para el procedimiento de siembra del primer Administrador y el flujo de alta/gestión de usuarios, y [`specs/003-supabase-auth-roles/`](specs/003-supabase-auth-roles/) para la especificación completa (roles, permisos, RLS, auditoría).

## Calidad de código

Los commits pasan automáticamente por verificaciones de formato (Prettier) y análisis estático (ESLint). Un commit con errores es rechazado automáticamente.

Para verificar manualmente antes de commitear:

```bash
pnpm lint
pnpm type-check
```
