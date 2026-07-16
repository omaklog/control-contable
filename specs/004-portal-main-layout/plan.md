# Implementation Plan: Layout Principal del Portal

**Branch**: `004-portal-main-layout` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-portal-main-layout/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Construir el layout principal de `apps/portal`: un menú de navegación persistente (con entradas para los módulos de negocio de la constitución, mostradas como "próximamente" mientras no existan), el avatar de perfil del usuario autenticado (nombre/rol, con respaldo por correo si no hay nombre), y un control de cierre de sesión accesible desde cualquier página. Se apoya en la autorización ya construida por la feature `003-supabase-auth-roles` (`requireApp`, `CurrentProfile.capabilities`) sin modificarla — solo la centraliza en un layout de Next.js y la refleja visualmente. No introduce datos nuevos en base de datos: el menú es una lista estática en código, filtrada en tiempo de render por las capacidades efectivas del usuario.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict, sin `any`), Next.js 15 (App Router), React 19 — mismas versiones ya usadas por `apps/portal`.

**Primary Dependencies**: Material UI (ya presente) — `AppBar`, `Drawer`, `Toolbar`, `Menu`, `Avatar`, `List`/`ListItem`, `useMediaQuery` para el comportamiento responsive. `@control-contable/auth` (ya presente; requiere una extensión menor de `CurrentProfile`, ver research.md #4). `@control-contable/supabase-client/browser` (ya presente, para `auth.signOut()`).

**Storage**: N/A — no se agregan tablas ni columnas de base de datos. Las entradas del menú de navegación son una lista estática en código (ver data-model.md, research.md #3), no un recurso persistido.

**Testing**: Vitest (ya introducido en el monorepo) para la función pura de filtrado de entradas de menú por capacidad (`visibleMenuItems`); validación manual con Playwright para el layout visual, el comportamiento responsive y el flujo de cierre de sesión — mismo enfoque que la feature `003-supabase-auth-roles`.

**Target Platform**: Navegador (Next.js SSR/Client Components) — mismo entorno de despliegue que el resto del monorepo.

**Project Type**: Aplicación web (monorepo existente); cambios acotados a `apps/portal` y una extensión menor de `packages/auth`.

**Performance Goals**: SC-002 (identificar la sesión activa en menos de 5 segundos) — trivial para un elemento persistente ya presente en cada carga de página; sin metas de throughput propias.

**Constraints**: FR-008 exige que `/login` quede fuera del layout principal — se resuelve con un route group de Next.js App Router (research.md #1), no con lógica condicional dentro de un único layout. FR-009 exige comportamiento responsive (constitución, "UI: Responsive").

**Scale/Scope**: Una sola aplicación (`apps/portal`); ~5 entradas de menú (marcadores de posición para los módulos de negocio futuros de la constitución: Clientes, Cobranza, Expedientes Digitales, Recibos de Honorarios, Reportes); 3 roles de personal.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio (constitución)                                                              | Aplica | Estado                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arquitectura: reglas de negocio fuera de componentes React                            | Sí     | PASS — el guard de acceso (`requireApp`) y el filtrado de menú (`visibleMenuItems`) viven en funciones fuera de la UI; los componentes React solo los consumen.                                                                                 |
| Seguridad: autenticación obligatoria / control de permisos por usuario                | Sí     | PASS — el layout del route group centraliza `requireApp('portal')`; ningún hijo del grupo puede renderizar sin sesión válida (FR-001, FR-005).                                                                                                  |
| Seguridad: validación tanto frontend como backend                                     | Sí     | PASS — el filtrado de menú es solo UX (frontend); el acceso real a cada módulo futuro seguirá protegido por `requireCapability`/RLS cuando ese módulo exista, no por el menú.                                                                   |
| UI: Material UI, responsive, confirmaciones en operaciones críticas                   | Sí     | PASS — usa componentes MUI (`AppBar`/`Drawer`/`Avatar`/`Menu`); responsive con el patrón estándar de MUI (research.md #6); cerrar sesión no se considera una operación crítica destructiva (ver spec.md Assumptions), no requiere confirmación. |
| Multi-Usuario: roles Administrador, Contador, Auxiliar                                | Sí     | PASS — el menú se filtra por las capacidades efectivas ya resueltas por la feature 003 (`CurrentProfile.capabilities`), sin introducir un modelo de roles propio.                                                                               |
| Testing: pruebas unitarias para reglas de negocio, integración para procesos críticos | Sí     | PASS — prueba unitaria para `visibleMenuItems` (research.md #3); el cierre de sesión y la navegación se validan manualmente (no hay un "proceso crítico" nuevo más allá de lo ya cubierto por la feature 003).                                  |

No se identifican violaciones. No se requiere completar `Complexity Tracking`.

**Re-check post-diseño (Fase 1)**: `research.md`, `data-model.md`, `contracts/` y `quickstart.md` concretan cada fila anterior (route group `(app)`, extensión de `CurrentProfile`, `MenuItem`/`visibleMenuItems`) sin introducir nada fuera de lo ya evaluado. La tabla se mantiene sin cambios: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/004-portal-main-layout/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
apps/portal/src/
├── app/
│   ├── layout.tsx                  # Root layout (html/body/ThemeRegistry) — sin cambios
│   ├── (app)/                      # NUEVO — route group: layout principal (menú + avatar + logout)
│   │   ├── layout.tsx              # NUEVO — llama a requireApp('portal') una sola vez (research.md #2);
│   │   │                           # renderiza <MainLayoutClient profile={...}> alrededor de los hijos
│   │   └── page.tsx                # MOVIDO desde app/page.tsx — ya no llama a requireApp() por su cuenta
│   ├── login/page.tsx              # Sin cambios — fuera del route group (app), sin el layout principal (FR-008)
│   ├── unauthorized/page.tsx       # Sin cambios — fuera del route group (app)
│   └── cambiar-contrasena/         # Sin cambios — fuera del route group (app); es un paso obligatorio
│                                   # intermedio, no navegación normal (ver Assumptions)
├── components/
│   └── layout/                     # NUEVO
│       ├── MainLayoutClient.tsx    # 'use client' — AppBar/Drawer responsive, menú de navegación,
│       │                           # Avatar con menú desplegable (nombre/rol/correo, botón de cierre de sesión)
│       └── navigation.ts           # NUEVO — MENU_ITEMS estático + visibleMenuItems(items, capabilities)
│                                   # (función pura, ver research.md #3 y data-model.md)
└── middleware.ts                   # Sin cambios

packages/auth/src/session.ts         # Extendido — CurrentProfile.email (de auth.getUser(), sin consulta nueva)
```

**Structure Decision**: Se usa un route group de Next.js App Router (`(app)`) para acotar el layout principal exactamente a las páginas que deben llevarlo, sin afectar las URLs ni tocar `/login`, `/unauthorized` o `/cambiar-contrasena` (research.md #1) — cumple FR-008 sin lógica condicional. El guard de acceso (`requireApp('portal')`) se centraliza en el `layout.tsx` de ese grupo en vez de repetirse en cada página (research.md #2), consistente con el mandato de la constitución de mantener la lógica reutilizable fuera de los componentes React. La lista de entradas de menú y su filtrado por capacidad viven en un módulo de código plano (`navigation.ts`), no en base de datos, porque hoy no existe ningún módulo de negocio real del que leerlas (research.md #3) — evita una abstracción/tabla prematura, mismo criterio que ya se aplicó al modelo de roles de la feature 003. El único cambio a un paquete compartido es agregar `email` a `CurrentProfile` en `packages/auth`, reutilizando un dato que `getCurrentProfile()` ya obtiene de Supabase Auth.

## Complexity Tracking

> No hay violaciones de la Constitution Check que requieran justificación. Esta sección no aplica.
