# Implementation Plan: Migración al Sistema de Diseño Compartido (Theme MUI)

**Branch**: `009-migrate-design-system` | **Date**: 2026-07-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-migrate-design-system/spec.md`

## Summary

Construir un único Theme de Material UI en `packages/ui/theme` (colores, tipografía, espaciado, radios, elevaciones, variantes clara/oscura) que materialice `docs/ux/design-system.md` §1 y §8, y migrar `apps/admin`/`apps/portal` para consumirlo exclusivamente, retirando sus dos temas locales divergentes. Incluye un mecanismo de alternancia claro/oscuro persistido por navegador (preferencia de SO por defecto, override manual), y la migración visual de los patrones ya pendientes (§10 de `design-system.md`): columnas de "Estado" como Chip semántico y acciones por fila como `IconButton` + `Tooltip` siempre visibles, en las pantallas que aún usan texto plano o botones de texto. Es una migración exclusivamente de presentación — ninguna regla de negocio, permiso o dato cambia (FR-014).

## Technical Context

**Language/Version**: TypeScript 5.7 (strict, sin `any` sin justificar — Constitución)

**Primary Dependencies**: `@mui/material` 6, `@mui/icons-material` 6, `@emotion/react`/`@emotion/styled` 11 (motor de estilos de MUI), Next.js 15 (App Router, `next/font/local` para autohospedar fuentes), React 19

**Storage**: N/A para el Theme (vive en código, sin persistencia — Key Entity "Theme" del spec). La "Preferencia de modo" se persiste solo en el navegador/dispositivo (no en Supabase/Postgres, no asociada a la cuenta — FR-010)

**Testing**: Vitest (ya usado en `packages/ui`, `packages/utils`) para pruebas unitarias de tokens de color/contraste; validación manual en navegador para lo visual (sin Playwright/chromium disponible en este entorno — mismo límite ya documentado en specs anteriores)

**Target Platform**: Web — `apps/admin` y `apps/portal` (Next.js App Router), ambos ya montados sobre Supabase/Postgres compartido

**Project Type**: Monorepo web existente (paquete compartido `packages/ui` + dos apps consumidoras) — no introduce proyectos nuevos

**Performance Goals**: Alternancia de modo aplicada en <2s sin recargar la página (SC-002); sin regresión perceptible de tiempo de carga por la migración de tema (solo cambia de dónde se importan los valores, no la cantidad de CSS-in-JS generado)

**Constraints**: Contraste mínimo WCAG 2.1 AA (4.5:1 texto normal, 3:1 texto grande/iconos) en ambos modos (FR-002, SC-007); fuentes autohospedadas sin dependencia de CDN externo en tiempo de ejecución (Constitución — evitar exponer dependencias innecesarias a Internet); cero cambios de lógica de negocio, permisos o datos (FR-014)

**Scale/Scope**: 1 Theme compartido consumido por 2 aplicaciones; migración de los componentes/pantallas ya construidos: layout principal (`MainLayoutClient`), pantallas de autenticación (`LoginForm`, `SetNewPasswordForm`), gestión de Usuarios (ya sigue el patrón objetivo, sirve de referencia), listados de Clientes (ambas apps), detalle de Cliente con Contactos — sin pantallas de negocio nuevas

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio (Constitución)                                                                                           | Evaluación                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Código Compartido — evitar duplicación entre apps                                                                  | ✅ Cumple por diseño: el objetivo mismo de la feature es eliminar los dos temas locales duplicados y centralizar en `packages/ui` (FR-001, FR-008)                                                                                                                             |
| Arquitectura por capas — lógica de negocio fuera de componentes React                                              | ✅ Cumple: el Theme es un artefacto de presentación puro, sin reglas de negocio; FR-014 lo blinda explícitamente                                                                                                                                                               |
| UI — Material UI, responsive, accesibilidad, formularios consistentes                                              | ✅ Refuerza el gate: agrega un requisito de accesibilidad (contraste WCAG 2.1 AA, FR-002/SC-007) que antes no existía de forma explícita                                                                                                                                       |
| UI — debe seguir `/docs/ux/design.md` (y por extensión `docs/ux/design-system.md`, ya la fuente de verdad vigente) | ✅ Cumple: el Theme traduce directamente §1 y §8 de `design-system.md` a valores de MUI                                                                                                                                                                                        |
| Calidad de código — TypeScript strict, sin duplicación                                                             | ✅ Cumple: un único módulo de tokens, tipado, sin `any`                                                                                                                                                                                                                        |
| Testing — pruebas unitarias para reglas de negocio, integración para procesos críticos                             | ✅ Aplicable de forma adaptada: no hay reglas de negocio en un Theme, pero sí una regla verificable (contraste) que se cubre con pruebas unitarias (ver research.md #3); no se requieren pruebas de integración porque no hay proceso de negocio ni acceso a datos involucrado |
| Seguridad — nunca exponer dependencias innecesarias a Internet                                                     | ✅ Cumple: fuentes autohospedadas vía `next/font/local`, no CDN externo (Assumptions del spec)                                                                                                                                                                                 |

Sin violaciones. No se requiere la tabla de Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/009-migrate-design-system/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   └── theme-tokens.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
packages/ui/src/
├── theme/                          # NUEVO — único Theme compartido (FR-001)
│   ├── colors.ts                   # Paleta clara + oscura (design-system.md §1.1, §1.2)
│   ├── typography.ts               # Inter (texto general) + JetBrains Mono (tabular) (§1.3)
│   ├── spacing.ts                  # Unidad base 4px y escala (§1.4)
│   ├── radius.ts                   # Escala única 8/12/pill, idéntica en ambos modos (§1.5)
│   ├── shadows.ts                  # Bordes 1px + elevación ligera Nivel 2 (§1.5)
│   ├── light.ts                    # createTheme(modo claro) a partir de los tokens
│   ├── dark.ts                     # createTheme(modo oscuro) a partir de los tokens
│   ├── useColorMode.ts             # Hook/contexto: preferencia de SO por defecto + override manual persistido (FR-009/FR-010)
│   └── index.ts                    # Barrel export: theme, ColorModeProvider, useColorMode
├── StatusChip.tsx                   # NUEVO — Chip semántico único para columnas "Estado" (FR-012), generaliza el patrón ya usado en Usuarios/ClienteDetalleClient
├── RowActionsMenu.tsx (o equivalente) # NUEVO si se generaliza — patrón IconButton + Tooltip + fila activa ya usado en Usuarios (FR-013)
├── MainLayoutClient.tsx              # MODIFICADO — consume el Theme compartido, sin colores propios
├── ClienteDetalleClient.tsx          # MODIFICADO — Estado como StatusChip, acciones migradas si aplica
├── LoginForm.tsx / SetNewPasswordForm.tsx # Sin cambios funcionales; heredan el Theme automáticamente vía ThemeProvider
└── index.ts                          # Agrega los nuevos exports (theme, StatusChip, etc.)

apps/admin/src/
├── components/providers/ThemeRegistry.tsx  # MODIFICADO — importa el Theme + ColorModeProvider de packages/ui
├── lib/mui/theme.ts                        # ELIMINADO — retirado por completo (FR-008, Edge Case)
└── app/(app)/clientes/**/*Client.tsx        # MODIFICADO — Estado a StatusChip, acciones a IconButton+Tooltip (FR-012/013)

apps/portal/src/
├── components/providers/ThemeRegistry.tsx  # MODIFICADO — igual que admin
├── lib/mui/theme.ts                        # ELIMINADO
└── app/(app)/clientes/**/*Client.tsx        # MODIFICADO — igual que admin

apps/admin/src/app/layout.tsx, apps/portal/src/app/layout.tsx
                                             # Sin cambios estructurales (ya envuelven en ThemeRegistry); solo cambia qué theme consume ThemeRegistry internamente
```

**Structure Decision**: Se mantiene la estructura de monorepo ya establecida (`packages/ui` compartido + `apps/admin`/`apps/portal` consumidores). No se crea ningún paquete ni aplicación nueva. El Theme se agrega como un submódulo nuevo (`theme/`) dentro del paquete `packages/ui` ya existente, exactamente en la ruta que el usuario especificó en el Input del spec. Los dos temas locales (`apps/{admin,portal}/src/lib/mui/theme.ts`) se eliminan al finalizar la migración, no se dejan como código muerto.

## Complexity Tracking

_No aplica — sin violaciones de la Constitución que justificar._
