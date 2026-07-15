# Contrato: API de `packages/supabase-client` y `packages/auth`

**Feature**: [../spec.md](../spec.md)

Superficie que `apps/admin` y `apps/portal` consumen; cualquier cambio de firma aquí es un cambio de contrato para ambas apps.

## `@control-contable/supabase-client`

```ts
// @control-contable/supabase-client/browser — Client Components
export function createBrowserSupabaseClient(): SupabaseClient<Database>

// @control-contable/supabase-client/server — Server Components / Route Handlers / Server Actions
export function createServerSupabaseClient(): Promise<SupabaseClient<Database>>

// @control-contable/supabase-client/middleware — usado por el middleware.ts de cada app
export function refreshSupabaseSession(request: NextRequest): Promise<NextResponse>
```

- Se exponen como **tres subpaths independientes** (`/browser`, `/server`, `/middleware`), no un único barrel `index.ts`: `server.ts` usa `next/headers` (solo válido en runtime Node de Server Components) y `middleware.ts` corre en el runtime Edge — mezclarlos en un mismo punto de entrada arriesgaría arrastrar código incompatible con Edge al bundle del middleware.
- `Database` proviene de `@control-contable/types` (regenerado tras la migración, incluye `profiles`, `profile_change_history`, `account_invitations`).
- Ninguna de estas funciones expone la `service_role` key al navegador; las operaciones que la requieren (invitar, cambiar rol, desactivar) viven en Server Actions/Route Handlers, no en este paquete.

## `@control-contable/auth`

> **Revisión 2026-07-15**: se elimina `AccountType`/`accountTypeForRole` (ya no existe `account_type`, ver research.md #12); `requireAccountType()` se reemplaza por `requireApp()`; `hasPermission()` (matriz pura por rol) se conserva como `roleDefaultCapabilities()` y se agrega la resolución de excepciones por usuario (research.md #13).

```ts
export type AppRole = 'administrador' | 'contador' | 'auxiliar'
export type AppName = 'admin' | 'portal'
export type Capability = 'manage_users' | 'view_auth_audit_log' | 'manage_user_permissions'
// ... resto de la matriz de role-permissions.md

// Plantilla por defecto (pura, sin I/O) — NO considera ajustes por usuario.
export function roleDefaultCapabilities(role: AppRole): Capability[]

// Regla fija de acceso por app (pura, no ajustable por usuario — research.md #12).
export function canAccessApp(role: AppRole, app: AppName): boolean

export interface CurrentProfile {
  id: string
  role: AppRole
  isActive: boolean
  mustChangePassword: boolean
  fullName: string | null
  /** Plantilla del rol + permission_overrides del usuario ya resueltos (research.md #13). */
  capabilities: Capability[]
}

// Server-only: consulta profiles + permission_overrides para auth.uid() de la
// sesión actual y resuelve `capabilities` (plantilla de roleDefaultCapabilities
// más las excepciones vigentes de permission_overrides).
export function getCurrentProfile(): Promise<CurrentProfile | null>

// Lanza redirect()/notFound() de Next.js si no se cumple la condición —
// pensado para usarse en layouts/Server Components raíz de cada app.
// Ambas redirigen a /cambiar-contrasena (no a la ruta que se estaba pidiendo)
// si mustChangePassword es true — ver research.md #10. La propia página
// /cambiar-contrasena llama a getCurrentProfile() directamente (nunca a estas
// dos) para no auto-redirigirse en bucle.
export function requireApp(app: AppName): Promise<CurrentProfile>
export function requireCapability(capability: Capability): Promise<CurrentProfile>
```

## Garantías del contrato

- `requireApp`/`requireCapability` son la única forma en que las apps protegen rutas — no se implementan chequeos de rol ad-hoc dispersos en componentes individuales (consistente con `plan.md`: la lógica de autorización vive en `packages/auth`, no en componentes React).
- `roleDefaultCapabilities` y `canAccessApp` son funciones puras (sin I/O) — testeables con Vitest sin necesidad de una base de datos (research.md #8), igual que antes `hasPermission`.
- `canAccessApp` no consulta `permission_overrides`: el acceso a aplicaciones es una regla fija por rol, deliberadamente no ajustable por usuario (research.md #12) — evita que un ajuste de capacidades termine ampliando, indirectamente, qué aplicación puede abrir un usuario.
- `getCurrentProfile`/`requireApp`/`requireCapability` son server-only (no se ejecutan en el navegador); dependen de `createServerSupabaseClient()` de `@control-contable/supabase-client`.
- `requireCapability()` verifica pertenencia en `profile.capabilities` (ya resuelto por `getCurrentProfile()`) — no vuelve a calcular la plantilla ni a consultar `permission_overrides` por su cuenta.
- Ningún usuario con `mustChangePassword = true` puede alcanzar una página distinta de `/cambiar-contrasena` mientras ese estado persista (FR-013) — la redirección ocurre en el mismo punto donde ya se resuelve `role`/`capabilities`, sin lógica adicional dispersa en cada página.
