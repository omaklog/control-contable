# Implementation Plan: Rediseño de la Pantalla de Inicio de Sesión

**Branch**: `010-login-screen-redesign` | **Date**: 2026-07-18 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-login-screen-redesign/spec.md`

## Summary

Rediseñar `LoginForm` (componente compartido en `packages/ui`, consumido sin cambios por `apps/admin/src/app/login/page.tsx` y `apps/portal/src/app/login/page.tsx`) para presentar un layout de dos paneles en escritorio — panel de formulario + panel de marca/valor institucional, ambos construidos exclusivamente con el Theme de `009-migrate-design-system` — que se apila a un solo panel (el formulario) en pantallas angostas. Incluye iconos en los campos de correo/contraseña y en el botón de acceso, y corrige que `Logo` (usado en esta misma pantalla) tenga un color de marca hardcodeado en vez de tomarlo del Theme. Es exclusivamente un cambio de presentación: no se toca `onSubmit`/`onSuccess`, la validación Yup, los mensajes de error genéricos, ni las redirecciones ya existentes (FR-010).

## Technical Context

**Language/Version**: TypeScript 5.7 (strict, sin `any` sin justificar — Constitución)

**Primary Dependencies**: `@mui/material` 6 (`Box`, `Grid`/flex layout, `TextField`, `InputAdornment`, `Button`), `@mui/icons-material` (iconos de correo, candado, flecha de acceso), Formik + Yup (validación ya existente, sin cambios), el Theme compartido de `packages/ui/src/theme` (`009-migrate-design-system`)

**Storage**: N/A — sin entidades ni persistencia nueva; el flujo de Supabase Auth ya existente no cambia (FR-010)

**Testing**: Vitest (ya usado en `packages/ui`) para la lógica pura que se extraiga (p. ej. el criterio de qué modo/breakpoint oculta el panel de marca, si se extrae a una función); validación visual manual en navegador para el layout (sin Playwright/chromium en este entorno, mismo límite ya documentado en specs anteriores)

**Target Platform**: Web — `apps/admin` y `apps/portal` (Next.js App Router), pantalla `/login` de ambas, ya montada sobre el `ThemeRegistry` compartido corregido en `009`

**Project Type**: Monorepo web existente — no se crean proyectos ni paquetes nuevos; el cambio vive en un componente ya compartido (`packages/ui/src/LoginForm.tsx`)

**Performance Goals**: Sin regresión en el tiempo para iniciar sesión (SC-004) — el rediseño no agrega pasos ni llamadas de red nuevas

**Constraints**: Cero valores de color/tipografía/radio propios de esta pantalla (FR-002, SC-001); sin fotografías ni activos de imagen externos (Assumptions); el panel de marca no debe mostrar cifras ni estadísticas, inventadas o reales (FR-003); sin opción "recordarme" ni aviso de MFA (FR-008); sin enlace de recuperación de contraseña (FR-009)

**Scale/Scope**: 1 componente compartido (`LoginForm`), consumido sin cambios de API por 2 páginas (`apps/admin/src/app/login/page.tsx`, `apps/portal/src/app/login/page.tsx`); además una corrección puntual a `packages/ui/src/Logo.tsx` (color hardcodeado → color del Theme)

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio (Constitución)                                                               | Evaluación                                                                                                                                                                                                                |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Código Compartido — evitar duplicación entre apps                                      | ✅ `LoginForm` sigue siendo el único componente de login, consumido sin cambios de API por ambas apps; ninguna lógica se duplica                                                                                          |
| Arquitectura por capas — lógica de negocio fuera de componentes React                  | ✅ No se toca `onSubmit`/`onSuccess`, la validación Yup, ni la lógica de autenticación (FR-010) — solo presentación                                                                                                       |
| UI — Material UI, responsive, accesibilidad                                            | ✅ Refuerza el gate: agrega el requisito explícito de que el formulario nunca quede oculto/recortado en pantallas angostas (FR-004)                                                                                       |
| UI — debe seguir `docs/ux/design-system.md` (fuente de verdad vigente)                 | ✅ El panel de marca se construye exclusivamente con los tokens ya documentados (§1.5, "capas tonales y bordes de 1px, no fotografía")                                                                                    |
| Calidad de código — TypeScript strict, sin duplicación                                 | ✅ Un único componente, tipado, sin valores hardcodeados nuevos; corrige uno ya existente (`Logo.tsx`)                                                                                                                    |
| Testing — pruebas unitarias para reglas de negocio, integración para procesos críticos | ✅ Adaptado: no hay reglas de negocio nuevas; se agrega una prueba unitaria solo si se extrae una función pura (criterio de breakpoint) — no se requiere prueba de integración porque el flujo de autenticación no cambia |
| Seguridad — nunca sugerir una capacidad de seguridad que no existe                     | ✅ Refuerza el gate: FR-008/FR-009 excluyen explícitamente "recordarme", MFA y recuperación de contraseña de autoservicio porque ninguna existe hoy — evita inducir a error al usuario                                    |

Sin violaciones. No se requiere la tabla de Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/010-login-screen-redesign/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md         # Phase 1 output (/speckit-plan command)
├── contracts/            # Phase 1 output (/speckit-plan command)
│   └── login-form.md
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
packages/ui/src/
├── LoginForm.tsx          # MODIFICADO — layout de dos paneles, iconos en campos/botón; misma prop API (title, onSubmit, onSuccess)
├── Logo.tsx               # MODIFICADO — reemplaza el color de marca hardcodeado (#1565c0) por theme.palette.primary.main
└── SetNewPasswordForm.tsx # Sin cambios (fuera de alcance — pantalla distinta, no cubierta por este spec)

apps/admin/src/app/login/page.tsx    # Sin cambios — sigue renderizando <LoginForm title=... onSubmit=... onSuccess=... />
apps/portal/src/app/login/page.tsx   # Sin cambios — misma razón
```

**Structure Decision**: El cambio se contiene por completo dentro de `packages/ui` (componente ya compartido). No se crea ningún componente nuevo exportado desde el paquete: el panel de marca/valor se implementa como una sección interna de `LoginForm.tsx` (o un sub-componente no exportado en el mismo archivo), precisamente para que ninguna de las dos páginas consumidoras (`apps/admin`, `apps/portal`) necesite cambios — mismo contrato de props que ya usan hoy.

## Complexity Tracking

_No aplica — sin violaciones de la Constitución que justificar._
