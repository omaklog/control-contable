# Implementation Plan: Layout Principal del Portal

**Branch**: `004-portal-main-layout` | **Date**: 2026-07-15 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-portal-main-layout/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Construir el layout principal compartido por `apps/portal` y `apps/admin` (`packages/ui/MainLayoutClient`): un menú de navegación persistente (con entradas propias por app, mostradas como "próximamente" mientras no existan en el caso de `apps/portal`), el avatar de perfil del usuario autenticado (nombre/rol, con respaldo por correo si no hay nombre), y un control de cierre de sesión accesible desde cualquier página. Se apoya en la autorización ya construida por la feature `003-supabase-auth-roles` (`requireApp`, `CurrentProfile.capabilities`) sin modificarla — solo la centraliza en un layout de Next.js y la refleja visualmente. No introduce datos nuevos en base de datos: el menú es una lista estática en código por app, filtrada en tiempo de render por las capacidades efectivas del usuario.

**Estado**: Feature ya implementada (`tasks.md`, incluyendo el Rework #1 de ampliación a `apps/admin`/`packages/ui`). Este re-planeamiento (2026-07-17) cubre únicamente los **ajustes pendientes** detectados al alinear `spec.md` con `001-business-domain-model` y `docs/ux/design-system.md` (ver spec.md, Clarifications, sesión 2026-07-17), sin reabrir el resto de la feature:

1. Contenido de `MENU_ITEMS` en `apps/portal/src/components/layout/navigation.ts` (FR-006): reemplazar Cobranza/Expedientes Digitales/Recibos de Honorarios/Reportes por Cobranza/Documentos Fiscales/Obligaciones Fiscales.
2. Asignar `capability: 'view_billing'` (Cobranza) y `capability: 'view_documents'` (Documentos Fiscales) reusando capacidades ya existentes de `packages/auth` (FR-007) — "Obligaciones Fiscales" queda sin `capability` (no existe todavía).
3. Indicador de ítem de menú activo + accesibilidad (FR-011/FR-012), en `packages/ui/src/MainLayoutClient.tsx` — no existía ningún requisito ni implementación de esto antes de la sesión de clarificación.

No hay cambios de alcance funcional, de base de datos, ni de dependencias nuevas.

## Technical Context

**Language/Version**: TypeScript 5.7 (strict, sin `any`), Next.js 15 (App Router), React 19 — mismas versiones ya usadas por `apps/portal`.

**Primary Dependencies**: Material UI (ya presente) — `AppBar`, `Drawer`, `Toolbar`, `Menu`, `Avatar`, `List`/`ListItem`, `useMediaQuery` para el comportamiento responsive. `next/navigation` (`usePathname`) para detectar la ruta activa (FR-011/FR-012, research.md #7 — nuevo). `@control-contable/auth` (ya presente). `@control-contable/supabase-client/browser` (ya presente, para `auth.signOut()`). Ninguna dependencia nueva se agrega para los ajustes pendientes.

**Storage**: N/A — no se agregan tablas ni columnas de base de datos. Las entradas del menú de navegación son una lista estática en código por app (ver data-model.md, research.md #3), no un recurso persistido.

**Testing**: Vitest (ya presente en `packages/ui`, `apps/portal`, `apps/admin`) para la función pura de filtrado de entradas de menú por capacidad (`visibleMenuItems`) y para el contenido actualizado de `MENU_ITEMS`; validación manual con Playwright para el layout visual, el indicador de ítem activo (visual + `aria-current` + foco de teclado) y el comportamiento responsive — mismo enfoque que la feature `003-supabase-auth-roles`.

**Target Platform**: Navegador (Next.js SSR/Client Components) — mismo entorno de despliegue que el resto del monorepo.

**Project Type**: Aplicación web (monorepo existente). Componente de layout compartido en `packages/ui`; cada app (`apps/portal`, `apps/admin`) mantiene su propia lista `MENU_ITEMS`. Los ajustes pendientes de esta pasada tocan `apps/portal/.../navigation.ts` (contenido) y `packages/ui/src/MainLayoutClient.tsx` (indicador activo); `apps/admin` no cambia (su lista y su comportamiento no se ven afectados por FR-006/FR-007).

**Performance Goals**: SC-002 (identificar la sesión activa en menos de 5 segundos) — trivial para un elemento persistente ya presente en cada carga de página; sin metas de throughput propias.

**Constraints**: FR-008 exige que `/login` quede fuera del layout principal — se resuelve con un route group de Next.js App Router (research.md #1), no con lógica condicional dentro de un único layout. FR-009 exige comportamiento responsive (constitución, "UI: Responsive"). FR-011/FR-012 (nuevos) exigen que el ítem de menú activo se distinga con más de una señal visual y sea accesible por teclado/lector de pantalla (constitución, "UI: Accesibilidad"; `docs/ux/design-system.md` §2.3/§7) — sin depender de un `ThemeProvider` compartido que todavía no existe (`docs/ux/design-system.md` §10, nota #2, sigue diferido).

**Scale/Scope**: Dos aplicaciones (`apps/portal`, `apps/admin`). `apps/portal`: 5 entradas de menú (Inicio implementado; Clientes implementado con `capability: 'manage_clients'`; Cobranza, Documentos Fiscales y Obligaciones Fiscales como marcadores "próximamente" según la arquitectura de información vigente — `docs/ux/design-system.md` §2.2, spec.md FR-006). `apps/admin`: 4 entradas ya implementadas (Inicio, Usuarios, Clientes, Auditoría de acceso), sin marcadores "próximamente" (FR-006). 3 roles de personal (Administrador, Contador, Auxiliar) en `apps/portal`; Administrador únicamente en `apps/admin`.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio (constitución)                                                              | Aplica | Estado                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Arquitectura: reglas de negocio fuera de componentes React                            | Sí     | PASS — el guard de acceso (`requireApp`) y el filtrado de menú (`visibleMenuItems`) viven en funciones fuera de la UI; los componentes React solo los consumen.                                                                                                                                                                          |
| Seguridad: autenticación obligatoria / control de permisos por usuario                | Sí     | PASS — el layout del route group centraliza `requireApp('portal')`; ningún hijo del grupo puede renderizar sin sesión válida (FR-001, FR-005).                                                                                                                                                                                           |
| Seguridad: validación tanto frontend como backend                                     | Sí     | PASS — el filtrado de menú es solo UX (frontend); el acceso real a cada módulo futuro seguirá protegido por `requireCapability`/RLS cuando ese módulo exista, no por el menú.                                                                                                                                                            |
| UI: Material UI, responsive, confirmaciones en operaciones críticas                   | Sí     | PASS — usa componentes MUI (`AppBar`/`Drawer`/`Avatar`/`Menu`); responsive con el patrón estándar de MUI (research.md #6); cerrar sesión no se considera una operación crítica destructiva (ver spec.md Assumptions), no requiere confirmación.                                                                                          |
| UI: Accesibilidad                                                                     | Sí     | **Nuevo (2026-07-17)** — antes solo cubierta implícitamente por los componentes MUI. FR-011/FR-012 la hacen explícita: `aria-current="page"` en el ítem activo + anillo de foco visible de 2px en todo ítem interactivo del menú (research.md #8 — nuevo). PASS una vez implementado; hoy es un gap real de código (ver spec.md FR-012). |
| Multi-Usuario: roles Administrador, Contador, Auxiliar                                | Sí     | PASS — el menú se filtra por las capacidades efectivas ya resueltas por la feature 003 (`CurrentProfile.capabilities`), sin introducir un modelo de roles propio.                                                                                                                                                                        |
| Testing: pruebas unitarias para reglas de negocio, integración para procesos críticos | Sí     | PASS — prueba unitaria para `visibleMenuItems` (research.md #3); el cierre de sesión y la navegación se validan manualmente (no hay un "proceso crítico" nuevo más allá de lo ya cubierto por la feature 003).                                                                                                                           |

No se identifican violaciones. No se requiere completar `Complexity Tracking`.

**Re-check post-diseño (Fase 1)**: `research.md`, `data-model.md`, `contracts/` y `quickstart.md` concretan cada fila anterior (route group `(app)`, extensión de `CurrentProfile`, `MenuItem`/`visibleMenuItems`) sin introducir nada fuera de lo ya evaluado. La tabla se mantiene sin cambios: PASS.

**Re-check adicional (2026-07-17, ajustes pendientes)**: la fila "UI: Accesibilidad" se agrega explícitamente por FR-011/FR-012 (research.md #7/#8 — nuevos); el resto de la tabla no cambia — los ajustes de contenido de `MENU_ITEMS` (FR-006) y reutilización de capacidades (FR-007) no introducen dependencias, datos ni riesgos nuevos. PASS.

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

Estado real tras el Rework #1 (`tasks.md`, 2026-07-16) — el layout se promovió a `packages/ui`. Se marcan con **AJUSTE PENDIENTE** los únicos archivos que cambian en esta pasada (2026-07-17); el resto ya existe sin cambios:

```text
packages/ui/src/
├── MainLayoutClient.tsx            # AJUSTE PENDIENTE — agregar detección de ruta activa (usePathname,
│                                   # research.md #7) + aria-current/foco visible en el ítem activo
│                                   # (FR-011/FR-012, research.md #8). Resto sin cambios (AppBar/Drawer
│                                   # responsive, Avatar con menú desplegable, cierre de sesión).
└── navigation.ts                   # Sin cambios — MenuItem/visibleMenuItems (interfaz ya correcta,
                                    # ver contracts/navigation.md)

apps/portal/src/
├── app/(app)/layout.tsx            # Sin cambios — requireApp('portal') + <MainLayoutClient>
├── app/(app)/page.tsx              # Sin cambios
├── app/login|unauthorized|cambiar-contrasena/  # Sin cambios — fuera del route group (FR-008)
└── components/layout/navigation.ts # AJUSTE PENDIENTE (FR-006/FR-007) — reemplazar Cobranza/Expedientes
                                    # Digitales/Recibos de Honorarios/Reportes por Cobranza (capability
                                    # 'view_billing'), Documentos Fiscales (capability 'view_documents'),
                                    # Obligaciones Fiscales (sin capability todavía)

apps/admin/src/
├── app/(app)/layout.tsx            # Sin cambios — requireApp('admin') + <MainLayoutClient>
└── components/layout/navigation.ts # Sin cambios — Inicio/Usuarios/Clientes/Auditoría ya correctos;
                                    # spec.md FR-006 solo aclara en texto que "Auditoría" aquí es de
                                    # acceso (003), no toca este archivo

packages/auth/src/session.ts        # Sin cambios — CurrentProfile.email ya agregado (Fase 2 original)
```

**Structure Decision**: Se mantiene la decisión original — route group `(app)` por app (research.md #1), guard de acceso centralizado en el layout del grupo (research.md #2), `MENU_ITEMS` como lista de código plano por app sin persistencia (research.md #3) — y la del Rework #1: el componente de layout y el tipo `MenuItem`/`visibleMenuItems` viven una sola vez en `packages/ui` (FR-010), cada app mantiene su propio `navigation.ts` con solo `MENU_ITEMS`. Los ajustes pendientes de esta pasada NO cambian esa estructura: se limitan al contenido de un arreglo de datos (`apps/portal/.../navigation.ts`) y a una mejora acotada del componente ya compartido (`packages/ui/MainLayoutClient.tsx`) para leer la ruta actual y exponerla como `aria-current` + foco visible — no requieren un `ThemeProvider` nuevo ni tocar `apps/admin`.

## Complexity Tracking

> No hay violaciones de la Constitution Check que requieran justificación. Esta sección no aplica.
