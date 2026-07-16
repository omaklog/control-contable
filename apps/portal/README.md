# apps/portal — Portal de Control Contable

Aplicación de operación diaria para todo el personal del despacho (Administrador, Contador, Auxiliar) — a diferencia de `apps/admin`, exclusiva de Administrador. Ver la especificación completa de autenticación/roles en [`specs/003-supabase-auth-roles/`](../../specs/003-supabase-auth-roles/) y la del layout principal en [`specs/004-portal-main-layout/`](../../specs/004-portal-main-layout/).

## Layout principal

Todas las páginas autenticadas viven dentro del route group `apps/portal/src/app/(app)/`, que tiene su propio `layout.tsx`:

- Llama a `requireApp('portal')` **una sola vez** para todo el grupo — ninguna página dentro de `(app)` necesita repetir esa verificación, ya que un `redirect()` en el layout impide que sus hijos se rendericen.
- Renderiza `MainLayoutClient` (`apps/portal/src/components/layout/MainLayoutClient.tsx`), que dibuja el `AppBar`/`Drawer` de navegación y el avatar de perfil.

`/login`, `/unauthorized` y `/cambiar-contrasena` quedan **fuera** de este route group a propósito — son pasos previos o forzados a la navegación normal, no llevan el layout principal.

## Menú de navegación

Definido en `apps/portal/src/components/layout/navigation.ts`:

- `MENU_ITEMS`: un arreglo estático (no hay tabla en base de datos — ver `specs/004-portal-main-layout/research.md` #3) con una entrada por cada módulo de negocio de la constitución. Hoy todas tienen `implemented: false` (se muestran deshabilitadas, marcadas "Próximamente") excepto "Inicio".
- `visibleMenuItems(items, capabilities)`: función pura que oculta las entradas cuya `capability` no esté entre las capacidades efectivas del usuario. Ninguna entrada tiene `capability` asignada todavía — los 3 roles ven el mismo menú mientras no exista un módulo con permisos propios.

**Para agregar un módulo de negocio ya implementado**: cambiar su entrada en `MENU_ITEMS` a `implemented: true` (y opcionalmente asignarle una `capability` si su acceso debe restringirse por rol) — no requiere tocar `MainLayoutClient.tsx` ni el layout del route group.

## Avatar y cierre de sesión

El avatar (esquina superior derecha del `AppBar`) muestra las iniciales del nombre del usuario (`profiles.full_name`) o, si no hay nombre configurado, la primera letra de su correo. Al hacer clic se abre un menú con el nombre/rol y el control "Cerrar sesión", que invoca `auth.signOut()` y redirige a `/login`.

## Variables de entorno

Ver `.env.local.example`.
