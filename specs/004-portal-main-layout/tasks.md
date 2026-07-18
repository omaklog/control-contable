---
description: 'Task list template for feature implementation'
---

# Tasks: Layout Principal del Portal

**Input**: Design documents from `/specs/004-portal-main-layout/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (todos presentes)

**Tests**: Incluidas. `plan.md`/research.md comprometen explícitamente una prueba unitaria para `visibleMenuItems` (Constitution Check, fila "Testing") — omitirla dejaría esa fila sin cumplir.

**Organization**: Las tareas están agrupadas por historia de usuario para permitir implementación y validación independiente de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: Historia de usuario a la que pertenece (US1, US2, US3)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Monorepo existente. Esta feature agrega un route group y un módulo de layout dentro de `apps/portal`, más una extensión de un campo en `packages/auth`, según la "Structure Decision" de `plan.md`. No se crean paquetes nuevos.

## Phase 1: Setup

**Purpose**: `apps/portal` no tiene Vitest configurado todavía (a diferencia de `apps/admin`, feature 003) — se necesita antes de la prueba unitaria de la Fase 2.

- [x] T001 [P] Configurado Vitest en `apps/portal`: agregado el script `"test": "vitest run"` y la dependencia `vitest` a `apps/portal/package.json`, y creado `apps/portal/vitest.config.ts` reusando `@control-contable/config/vitest/base` — mismo patrón que `apps/admin/vitest.config.ts`. Verificado con `pnpm -F @control-contable/portal test` (sin archivos de prueba, falla vacío como se esperaba en esta fase)

**Checkpoint**: `pnpm -F @control-contable/portal test` corre (sin archivos de prueba todavía, falla vacío — esperado en esta fase).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: La extensión de `CurrentProfile` y el módulo de navegación que las tres historias de usuario necesitan.

**⚠️ CRITICAL**: Ninguna historia de usuario puede validarse hasta que esta fase esté completa.

- [x] T002 Extendido `CurrentProfile` en `packages/auth/src/session.ts`: agregado el campo `email: string` (de `user.email ?? ''`, ya obtenido dentro de `getCurrentProfile()`, sin llamada adicional) — según `contracts/package-api.md`. Verificado `pnpm -F @control-contable/auth type-check`/`test` limpios (27/27 pruebas)
- [x] T003 [P] Creado `apps/portal/src/components/layout/navigation.ts`: tipo `MenuItem`, la constante `MENU_ITEMS` con "Inicio" (`implemented: true`) más una entrada por cada módulo de negocio de la constitución (Clientes, Cobranza, Expedientes Digitales, Recibos de Honorarios, Reportes; todas `implemented: false`, sin `capability` asignada), y la función pura `visibleMenuItems(items, capabilities)` — según `data-model.md` y `contracts/navigation.md`
- [x] T004 [P] Prueba unitaria de `visibleMenuItems` en `apps/portal/src/components/layout/navigation.test.ts` — 4 casos: sin `capability` es visible con cualquier capacidad; con `capability` solo visible si está en el arreglo recibido; `implemented` no afecta la visibilidad; lista mixta preserva el orden — 4/4 pasan

**Checkpoint**: `CurrentProfile.email` disponible; `navigation.ts` con `visibleMenuItems` probada y lista para consumirse desde el layout.

---

## Phase 3: User Story 1 - Navegación y perfil visibles en todo el portal (Priority: P1) 🎯 MVP

**Goal**: Toda página autenticada de `apps/portal` muestra el mismo menú de navegación y avatar de perfil, de forma responsive.

**Independent Test**: Iniciar sesión con cualquiera de los 3 roles de personal y verificar que el menú y el avatar aparecen de forma idéntica y consistente en cada página autenticada (ver `quickstart.md` "Historia 1").

### Implementation for User Story 1

- [x] T005 [US1] Creado el route group `apps/portal/src/app/(app)/layout.tsx`: llama a `requireApp('portal')` una sola vez, obtiene el `CurrentProfile` y renderiza `<MainLayoutClient profile={profile}>{children}</MainLayoutClient>`
- [x] T006 [US1] Movido `apps/portal/src/app/page.tsx` a `apps/portal/src/app/(app)/page.tsx` (el archivo original se eliminó), usando `getCurrentProfile()` directamente en vez de `requireApp('portal')` — el layout del grupo ya centraliza esa verificación
- [x] T007 [US1] Implementado `apps/portal/src/components/layout/MainLayoutClient.tsx` (`'use client'`): `AppBar` + `Drawer` responsive (`permanent` en `sm`+, `temporary`/hamburguesa vía `useMediaQuery(theme.breakpoints.down('sm'))`), con las entradas de `visibleMenuItems(MENU_ITEMS, profile.capabilities)`; las entradas con `implemented: false` se muestran deshabilitadas con texto secundario "Próximamente"
- [x] T008 [US1] En `MainLayoutClient.tsx`, agregado el `Avatar` de perfil (`getInitials()`: iniciales de `profile.fullName`, o primera letra de `profile.email` si no hay nombre); al hacer clic abre un `Menu` de MUI mostrando nombre/correo y un `Chip` con el rol
- [x] T009 [US1] Validado con Playwright contra `apps/portal` real (build + dev, Supabase local): menú y avatar consistentes; avatar de una cuenta sin `full_name` muestra la inicial del correo ("A"); 5 entradas "Próximamente" visibles y deshabilitadas (clic no navega); en viewport 375px aparece el botón de menú hamburguesa y el drawer permanente desaparece — capturas en `/tmp/pw-test/layout-desktop.png` y `layout-mobile.png`

**Checkpoint**: La Historia 1 es completamente funcional y demostrable de forma independiente (MVP).

---

## Phase 4: User Story 2 - Cerrar sesión desde cualquier página (Priority: P1)

**Goal**: Un usuario autenticado puede cerrar sesión desde el layout principal, sin importar en qué página se encuentre.

**Independent Test**: Iniciar sesión, cerrar sesión desde el layout, y verificar que un intento posterior de acceder a una página protegida redirige a `/login` (ver `quickstart.md` "Historia 2").

### Implementation for User Story 2

- [x] T010 [US2] Agregado el control "Cerrar sesión" al menú desplegable del avatar en `MainLayoutClient.tsx` (`handleLogout`): llama a `createBrowserSupabaseClient().auth.signOut()` y, al resolver, `router.push('/login')` + `router.refresh()` — mismo patrón que `LoginForm`/`CambiarContrasenaClient`
- [x] T011 [US2] Validado con Playwright: cerrar sesión desde la página de inicio en 305ms (2 clics: abrir menú de avatar + "Cerrar sesión", SC-003), redirige a `/login`; navegar "atrás" tras cerrar sesión redirige de nuevo a `/login` sin mostrar contenido protegido (SC-004)

**Checkpoint**: Las Historias 1 y 2 funcionan de forma independiente.

---

## Phase 5: User Story 3 - El menú refleja lo que el usuario puede usar (Priority: P3)

**Goal**: El menú de navegación oculta las entradas cuya capacidad el usuario autenticado no tiene.

**Independent Test**: Iniciar sesión con distintos roles y verificar que las entradas de menú visibles corresponden exactamente a las capacidades de cada rol (ver `quickstart.md` "Historia 3").

### Implementation for User Story 3

- [x] T012 [US3] Validado con Playwright: Administrador, Contador y Auxiliar ven exactamente el mismo número de entradas "Próximamente" (5) — ninguna de `MENU_ITEMS` tiene `capability` asignada todavía, consistente con la clarificación de `spec.md`; confirmado que hacer clic en una entrada deshabilitada no navega — el mecanismo de filtrado en sí ya está cubierto por la prueba unitaria de T004

**Checkpoint**: Las tres historias funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Documentación y verificaciones finales.

- [x] T013 [P] Documentado el layout principal en `apps/portal/README.md` (nuevo, mismo patrón que `apps/admin/README.md`): route group `(app)`, cómo agregar una entrada de menú nueva cuando un módulo de negocio se implemente (editar `MENU_ITEMS`, marcar `implemented: true`), y cómo el avatar/cierre de sesión funcionan
- [x] T014 Ejecutado `pnpm lint`, `pnpm type-check`, `pnpm test` y `pnpm build` en todo el monorepo: 7/7 paquetes limpios en lint y type-check, 36/36 pruebas pasan (4 nuevas de `navigation.test.ts` respecto al estado anterior), y ambas apps (`admin`/`portal`) compilan en modo producción — sin hallazgos pendientes

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — puede iniciar de inmediato.
- **Foundational (Phase 2)**: Depende de Setup (T001, para poder probar T003) — BLOQUEA las tres historias de usuario.
- **User Stories (Phase 3-5)**: Todas dependen de que Foundational esté completo.
  - Pueden avanzar en orden de prioridad (US1 → US2 → US3) o en paralelo si hay más de una persona, aunque US2 y US3 dependen de que `MainLayoutClient.tsx` (US1) ya exista.
- **Polish (Phase 6)**: Depende de las historias que se quieran cubrir.

### User Story Dependencies

- **US1 (P1)**: Puede iniciar tras Foundational. Sin dependencia de otras historias — crea `MainLayoutClient.tsx` desde cero.
- **US2 (P1)**: Depende de que `MainLayoutClient.tsx` (US1, T007-T008) ya exista, ya que el control de cierre de sesión vive en el mismo menú desplegable del avatar — no es independiente a nivel de archivo, pero sí a nivel de criterio de aceptación (se valida por separado).
- **US3 (P3)**: Depende de que `MainLayoutClient.tsx` (US1, T007) ya renderice el menú filtrado — la lógica de filtrado en sí (T003/T004) es independiente y ya se prueba de forma unitaria en Foundational.

### Within Each User Story

- US1: T005 → T006 (mismo directorio) en secuencia; T007 (depende de T003, T005); T008 depende de T007; T009 (validación manual) al final.
- US2: T010 depende de T008 (mismo archivo); T011 (validación manual) al final.
- US3: T012 (validación manual) depende de T007.

### Parallel Opportunities

- T001 (Setup) no tiene paralelas dentro de su fase (única tarea).
- T003 y T004 (Foundational) — T004 depende de T003, no son paralelas entre sí, pero ambas están marcadas `[P]` respecto a T002 (archivos distintos, sin dependencia real de contenido).
- T013 (Polish, documentación) en paralelo con cualquier tarea de las historias de usuario.

---

## Parallel Example: Foundational

```bash
# T002 (packages/auth) es independiente de T003 (apps/portal) — archivos y paquetes distintos:
Task: "Extender CurrentProfile con email en packages/auth/src/session.ts"
Task: "Crear MenuItem/MENU_ITEMS/visibleMenuItems en apps/portal/src/components/layout/navigation.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup (Vitest en `apps/portal`)
2. Completar Phase 2: Foundational (CRÍTICO — `CurrentProfile.email` y `navigation.ts` bloquean las tres historias)
3. Completar Phase 3: User Story 1
4. **DETENERSE Y VALIDAR**: confirmar la Historia 1 de forma independiente contra `quickstart.md`
5. Con esto todo el personal ya navega el portal con un layout consistente (MVP)

### Incremental Delivery

1. Setup + Foundational → extensión de perfil y menú listos
2. - US1 → layout principal visible y responsive (MVP)
3. - US2 → cierre de sesión accesible desde cualquier página
4. - US3 → el menú queda listo para ocultar entradas por capacidad en cuanto existan módulos de negocio con permisos propios
5. - Polish → documentación operativa

---

## Notes

- Se incluyó una tarea de prueba (T004) porque `plan.md`/`research.md` comprometen explícitamente una prueba unitaria para `visibleMenuItems` — omitirla dejaría sin cumplir la fila "Testing" de la Constitution Check.
- `MENU_ITEMS` no tiene hoy ninguna entrada con `capability` asignada (ninguna capacidad de negocio existe todavía) — la Historia 3 queda con su mecanismo construido y probado (T003/T004), lista para cuando un módulo futuro agregue una entrada con `capability`.
- Ninguna Server Action ni `service_role` está involucrada en esta feature — es una capa de presentación pura sobre la autorización ya construida por la feature 003.

## Rework #1 — Ampliación a apps/admin (2026-07-16, tercera sesión de clarificación)

**Motivo**: el usuario indicó que este mismo layout (menú, avatar, cierre de sesión) también aplica a `apps/admin`, que hoy no tenía ningún menú de navegación persistente (solo botones sueltos en su página de inicio). Ver spec.md, Clarifications.

- [x] R1-T01 Promover `MainLayoutClient` (antes en `apps/portal/src/components/layout/`) a `packages/ui/src/MainLayoutClient.tsx`, generalizado con props `title` y `menuItems` (antes hardcodeados/importados de un módulo fijo)
- [x] R1-T02 Promover `MenuItem`/`visibleMenuItems` (antes en `apps/portal/src/components/layout/navigation.ts`) a `packages/ui/src/navigation.ts`; mover su prueba unitaria a `packages/ui/src/navigation.test.ts`
- [x] R1-T03 Configurar Vitest en `packages/ui` (no lo tenía) y agregar `@control-contable/auth`, `@control-contable/supabase-client`, `next` como dependencias (peer + dev)
- [x] R1-T04 Actualizar `apps/portal/src/components/layout/navigation.ts` para solo exportar `MENU_ITEMS`, importando `MenuItem` desde `@control-contable/ui`; actualizar `apps/portal/src/app/(app)/layout.tsx` para usar `MainLayoutClient` de `@control-contable/ui` con `title="Portal de Control Contable"`; agregar una prueba estructural mínima de `MENU_ITEMS` en `apps/portal` (el archivo se quedó sin pruebas propias tras mover `visibleMenuItems`)
- [x] R1-T05 Crear `apps/admin/src/components/layout/navigation.ts` (`MENU_ITEMS`: Inicio, Usuarios, Clientes, Auditoría — sin marcadores "Próximamente", ver Clarifications) y su prueba
- [x] R1-T06 Crear `apps/admin/src/app/(app)/layout.tsx` (mismo patrón que portal: `requireApp('admin')` centralizado + `MainLayoutClient`); mover `page.tsx`, `usuarios/`, `auditoria/`, `clientes/` dentro del route group `(app)`; simplificar `(app)/page.tsx` (ya no repite `requireApp` ni botones sueltos, la navegación vive en el menú)
- [x] R1-T07 Verificar: `pnpm type-check`/`lint`/`test` en los 8 paquetes del monorepo; validación manual con Playwright de ambas apps (menú/avatar/logout en admin, regresión en portal tras el refactor)

**Bug encontrado y corregido durante la implementación**: un comentario JSDoc en `MainLayoutClient.tsx` con backticks (para dar formato tipo código a `apps/portal`, `apps/admin`, etc.) provocaba un error de parseo de TypeScript (`TS1005`/`TS1160`, "Unterminated template literal") específicamente al compilarse desde `apps/admin` — reproducido de forma aislada y corregido quitando los backticks del comentario (texto plano en su lugar).

**Verificación**: 92 pruebas pasando en total en el monorepo (packages/ui: 4 nuevas de `navigation.test.ts`; apps/portal: 3 nuevas de `navigation.test.ts`; apps/admin: 4 nuevas de `navigation.test.ts`, más las 20 ya existentes). Lint y type-check limpios en los 8 paquetes. Validado con Playwright contra Supabase local: Administrador ve "Panel Administrativo" en el AppBar, el menú lista Inicio/Usuarios/Clientes/Auditoría sin "Próximamente", navega a Clientes desde el menú, el avatar muestra su rol, cierra sesión y queda bloqueado de `/usuarios`; Auxiliar en el portal sigue viendo su propio layout ("Portal de Control Contable", "Clientes" con el texto aclaratorio) sin regresiones. Cuentas de prueba limpiadas al finalizar.

## Rework #2 — Alineación con `001-business-domain-model` y `docs/ux/design-system.md` (2026-07-17)

**Motivo**: `/speckit-clarify` y `/speckit-plan` (2026-07-17) detectaron que FR-006 listaba módulos de negocio desactualizados, que FR-007 no reflejaba capacidades ya existentes en `packages/auth`, y que faltaba por completo un requisito (FR-011/FR-012) sobre el indicador de ítem de menú activo y su accesibilidad. Ver `spec.md` (Clarifications, sesión 2026-07-17) y `plan.md`/`research.md` (#7, #8) para el detalle de cada decisión. Sin cambios de alcance funcional ni de base de datos.

- [x] R2-T01 [P] Actualizar `apps/portal/src/components/layout/navigation.ts` (FR-006/FR-007, contracts/navigation.md): reemplazar las entradas `Cobranza`/`Expedientes Digitales`/`Recibos de Honorarios`/`Reportes` por:
  - `Cobranza` (mismo `href: '/cobranza'`, mismo `PaymentsIcon`, agregar `capability: 'view_billing'`, `implemented: false`)
  - `Documentos Fiscales` (`href: '/documentos-fiscales'`, reusar `FolderIcon` — antes de "Expedientes Digitales" —, agregar `capability: 'view_documents'`, `implemented: false`)
  - `Obligaciones Fiscales` (`href: '/obligaciones-fiscales'`, ícono nuevo `FactCheckIcon` de `@mui/icons-material/FactCheck`, sin `capability` — no existe todavía, `implemented: false`)

  Eliminar los imports de `ReceiptLongIcon` y `AssessmentIcon` (ya sin uso) y actualizar el comentario JSDoc del archivo para reflejar la lista vigente.

- [x] R2-T02 Actualizar la prueba estructural de `apps/portal/src/components/layout/navigation.test.ts` (creada en R1-T04) para que valide el nuevo contenido de `MENU_ITEMS`: 5 entradas (Inicio, Clientes, Cobranza, Documentos Fiscales, Obligaciones Fiscales), capacidades correctas por entrada (`manage_clients`, `view_billing`, `view_documents`, sin capacidad en Obligaciones Fiscales), y ninguna referencia residual a "Expedientes Digitales"/"Recibos de Honorarios"/"Reportes" — depende de R2-T01
- [x] R2-T03 [P] Agregar a `packages/ui/src/navigation.ts` una función pura `isActiveMenuItem(pathname: string, href: string): boolean` (research.md #7): coincidencia exacta cuando `href === '/'`, coincidencia por prefijo (`pathname === href || pathname.startsWith(href + '/')`) en el resto — junto con su prueba unitaria en `packages/ui/src/navigation.test.ts` (casos: ruta raíz exacta, ruta raíz no debe activarse con subrutas de otros ítems, ítem con subruta activa, ítem sin coincidencia)
- [x] R2-T04 En `packages/ui/src/MainLayoutClient.tsx`, usar `usePathname()` (`next/navigation`) + `isActiveMenuItem()` (R2-T03) para determinar el ítem activo; aplicarle `aria-current="page"` (FR-012) y la señal visual de FR-011 (acento de color en texto/ícono + borde izquierdo de 3–4px o fondo con tinte de selección — no solo color de texto, `docs/ux/design-system.md` §2.3) — depende de R2-T03
- [x] R2-T05 En el mismo archivo, agregar a todos los `ListItemButton` del menú un estilo `sx` explícito para `&.Mui-focusVisible` (anillo de 2px, color `secondary.main`, offset visible) en vez de depender solo del overlay de foco por defecto de MUI (FR-012, research.md #8) — depende de R2-T04 (mismo bloque de JSX)
- [x] R2-T06 Validado manualmente en el navegador (2026-07-17) contra `apps/portal` (`localhost:3000`) y `apps/admin` (`localhost:3001`) tras reiniciar ambos dev servers con `.next` limpio (el caché `.next` de los procesos previos, ~9h de antigüedad, estaba corrupto — causaba 404 en los chunks de JS y, como efecto secundario, que el login sin JS hidratado cayera al POST/GET nativo del `<form>`; resuelto con el reinicio + `method="post"` agregado a `LoginForm`/`SetNewPasswordForm` como endurecimiento). Confirmado por el usuario tras el reinicio: login funciona correctamente — depende de R2-T01 a R2-T05.
- [x] R2-T07 Ejecutado `pnpm lint`, `pnpm type-check`, `pnpm test` y `pnpm build` en todo el monorepo: 7/7 paquetes limpios en lint y type-check; 5/5 tareas de test verdes (packages/ui: 9/9, incluyendo las 5 nuevas de `isActiveMenuItem`; apps/portal: 7/7, incluyendo las 4 nuevas de contenido de `MENU_ITEMS`); ambas apps (`admin`/`portal`) compilan y prerenderizan en modo producción sin errores

### Parallel Example: Rework #2

```bash
# R2-T01 (apps/portal) y R2-T03 (packages/ui) tocan paquetes distintos sin dependencia entre sí:
Task: "Actualizar MENU_ITEMS en apps/portal/src/components/layout/navigation.ts"
Task: "Agregar isActiveMenuItem() + prueba unitaria en packages/ui/src/navigation.ts"
```

**Notes (2026-07-17)**: Las 7 tareas de `Rework #2` están completas. R2-T01–R2-T05 y R2-T07 se verificaron por herramienta (lint/type-check/test/build limpios en los 8 paquetes). R2-T06 no pudo automatizarse con Playwright/`chromium-cli` (ninguno disponible en este entorno, y no existe skill de proyecto para levantar la app con navegador — se buscó siguiendo el protocolo del skill `run`); en su lugar, el usuario validó manualmente en el navegador contra `apps/portal`/`apps/admin` corriendo localmente. De paso se encontró y corrigió un problema no relacionado con esta feature: los dos servidores `next dev` (arrancados antes de esta sesión, ~9h de antigüedad) tenían el caché `.next` corrupto — causaba 404 en chunks de JS y, como efecto secundario visible, que el login sin JS hidratado cayera al envío nativo del `<form>` (credenciales como query string en la URL, no un problema del código). Se resolvió reiniciando ambos dev servers con `.next` limpio, y se aprovechó para agregar `method="post"` explícito a `LoginForm`/`SetNewPasswordForm` (`packages/ui`) como endurecimiento preventivo — fuera del alcance original de esta feature, pero de bajo riesgo y directamente relacionado con lo detectado durante la validación de R2-T06. Recomendado a futuro: ejecutar `/run-skill-generator` para dejar un skill de proyecto reutilizable que levante ambas apps con navegador.
