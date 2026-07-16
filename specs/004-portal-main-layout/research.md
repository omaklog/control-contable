# Research: Layout Principal del Portal

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## 1. Exclusión de `/login` (y otras rutas) del layout mediante Route Group de Next.js

- **Decision**: Usar un route group `(app)` (`apps/portal/src/app/(app)/`) con su propio `layout.tsx`, que envuelve `page.tsx` (y cualquier página futura de módulos de negocio). `/login`, `/unauthorized` y `/cambiar-contrasena` permanecen como rutas hermanas fuera de ese grupo, sin heredar el layout principal.
- **Rationale**: Los route groups de Next.js App Router (carpeta entre paréntesis) permiten aplicar un layout distinto a un subconjunto de rutas sin que el grupo aparezca en la URL — es el mecanismo idiomático para "estas páginas no llevan el shell principal", ya usado implícitamente en este proyecto (login/unauthorized ya son páginas independientes sin layout compartido).
- **Alternatives considered**: Un único `layout.tsx` raíz con un condicional (`usePathname() === '/login'`) para decidir si renderizar el menú/avatar — rechazado: mezcla lógica de enrutamiento con presentación, es frágil ante nuevas rutas que deban excluirse, y obligaría a convertir el layout raíz en un Client Component solo para leer la ruta actual.

## 2. Centralización del guard de acceso en el layout del grupo

- **Decision**: `apps/portal/src/app/(app)/layout.tsx` llama a `requireApp('portal')` una sola vez y pasa el `CurrentProfile` resultante a `MainLayoutClient`. `page.tsx` (y páginas futuras dentro del grupo) ya no repiten esa llamada.
- **Rationale**: Un `redirect()` ejecutado dentro de un layout de Next.js impide que sus hijos se rendericen — la protección es completa sin duplicar la verificación. Evita repetir la misma línea en cada página del grupo (constitución: evitar duplicación de código; "toda lógica reutilizable deberá vivir fuera de la interfaz"), y el layout de todas formas necesita el `CurrentProfile` para el avatar y el filtrado de menú.
- **Alternatives considered**: Mantener `requireApp('portal')` en cada página además del layout — rechazado, verificación redundante sin beneficio de seguridad adicional.

## 3. Menú de navegación: lista estática en código, filtrada por capacidad

- **Decision**: Un arreglo `MENU_ITEMS` en `apps/portal/src/components/layout/navigation.ts` (`label`, `href`, `icon`, `capability?: Capability`, `implemented: boolean`) con una entrada por cada módulo de negocio de la constitución (Clientes, Cobranza, Expedientes Digitales, Recibos de Honorarios, Reportes), todas con `implemented: false` por ahora. Una función pura `visibleMenuItems(items: MenuItem[], capabilities: Capability[]): MenuItem[]` filtra las entradas cuya `capability` no esté en `capabilities` (FR-007); las entradas con `implemented: false` se muestran deshabilitadas y marcadas "próximamente" (FR-006), sin filtrarse.
- **Rationale**: No existe hoy ninguna fuente de datos real de la que leer estas entradas — no hay módulos de negocio implementados. Una lista en código es lo más simple y evita una tabla de "elementos de menú" en base de datos para lo que hoy es, literalmente, un mapa estático de la aplicación. Mismo criterio ya aplicado en `research.md` #4 de la feature `003-supabase-auth-roles` (ENUM fijo en vez de tabla dinámica de roles): evitar abstracciones prematuras sin un requisito real de configurabilidad en runtime.
- **Alternatives considered**: Tabla `menu_items` en base de datos, editable por un Administrador — rechazada, complejidad sin beneficio actual; nada en la especificación pide que el menú sea configurable en runtime, y añadiría una migración y RLS para un dato que hoy es enteramente estático.

## 4. Avatar y su valor de reemplazo (FR-002)

- **Decision**: Extender `CurrentProfile` (`packages/auth/src/session.ts`) con `email: string`. El dato ya se obtiene dentro de `getCurrentProfile()` vía `supabase.auth.getUser()` — solo faltaba incluirlo en el objeto devuelto, no requiere una consulta adicional. El avatar muestra las iniciales de `fullName` si existe; si no, la primera letra de `email`.
- **Rationale**: Satisface el Acceptance Scenario 2 de la Historia 1 de la spec tal como está escrito ("iniciales derivadas de su correo") sin costo adicional de I/O.
- **Alternatives considered**: Mostrar un ícono genérico de persona cuando falta `fullName`, sin derivar iniciales del correo — más simple de implementar, pero no cumple literalmente el criterio de aceptación ya definido; se descarta.

## 5. Cierre de sesión

- **Decision**: Un botón dentro del menú desplegable del avatar (`MainLayoutClient`, Client Component) que llama a `createBrowserSupabaseClient().auth.signOut()` y, al resolver, `router.push('/login')` + `router.refresh()`.
- **Rationale**: Mismo patrón ya usado y probado por `LoginForm`/`CambiarContrasenaClient` (feature 003) — sin necesidad de un Route Handler o Server Action dedicados. El middleware ya existente (`refreshSupabaseSession`) se encarga de que la sesión quede invalidada en la siguiente solicitud del servidor.
- **Alternatives considered**: Server Action `logout()` en vez de `signOut()` del cliente — rechazada, añade una vuelta al servidor sin ningún beneficio (no hay `service_role` involucrado; `signOut()` del lado del navegador ya es la operación correcta y completa).

## 6. Comportamiento responsive

- **Decision**: Patrón estándar de MUI — `Drawer` de variante `permanent` en pantallas ≥ `sm` y `temporary` (colapsable, activado por un botón de menú hamburguesa en el `AppBar`) en pantallas más pequeñas, usando `useMediaQuery(theme.breakpoints.up('sm'))`.
- **Rationale**: Es el patrón documentado y ya usado en incontables aplicaciones MUI; `@mui/material` ya está presente en el monorepo, sin necesitar una librería adicional.
- **Alternatives considered**: Comportamiento responsive hecho a mano con media queries CSS propias — rechazado, reinventa algo que MUI ya resuelve de forma accesible y probada (constitución: "Accesibilidad").

## Resumen de NEEDS CLARIFICATION resueltos

No quedaban marcadores `[NEEDS CLARIFICATION]` en `spec.md` al iniciar esta fase — se resolvieron durante `/speckit-specify` (contenido del menú y filtrado por rol, ver `spec.md` FR-006/FR-007). Todas las decisiones anteriores son de diseño técnico dentro del alcance ya definido por `spec.md` y la constitución del proyecto.
