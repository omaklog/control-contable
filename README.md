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

# 4. Iniciar las aplicaciones
pnpm dev
```

Las aplicaciones quedan disponibles en:

- **Portal**: http://localhost:3000
- **Admin**: http://localhost:3001
- **Supabase Studio**: http://localhost:54323

## Scripts

| Comando               | Descripción                                            |
| --------------------- | ------------------------------------------------------ |
| `pnpm dev`            | Inicia todas las apps en modo desarrollo               |
| `pnpm build`          | Compila todas las apps para producción                 |
| `pnpm lint`           | Analiza el código con ESLint en todo el monorepo       |
| `pnpm type-check`     | Verifica tipos TypeScript en todo el monorepo          |
| `pnpm clean`          | Elimina artefactos de build                            |
| `pnpm generate:types` | Regenera tipos TypeScript desde el esquema de Supabase |

## Estructura del monorepo

```
control-contable/
├── apps/
│   ├── portal/          # Aplicación principal del despacho (puerto 3000)
│   └── admin/           # Panel administrativo (puerto 3001)
├── packages/
│   ├── ui/              # Componentes de interfaz compartidos (Material UI)
│   ├── types/           # Tipos TypeScript compartidos (BD + dominio)
│   ├── utils/           # Utilidades compartidas (puras, sin DOM)
│   └── config/          # Configuraciones de ESLint, Prettier y TypeScript
├── supabase/            # Configuración y migraciones de Supabase local
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

## Calidad de código

Los commits pasan automáticamente por verificaciones de formato (Prettier) y análisis estático (ESLint). Un commit con errores es rechazado automáticamente.

Para verificar manualmente antes de commitear:

```bash
pnpm lint
pnpm type-check
```
