---
description: 'Task list template for feature implementation'
---

# Tasks: Rediseño de la Pantalla de Inicio de Sesión

**Input**: Design documents from `/specs/010-login-screen-redesign/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/login-form.md, quickstart.md

**Tests**: No se incluyen tareas de prueba unitaria nueva — este cambio es de presentación pura (FR-010) sin lógica de negocio nueva que probar; se reutilizan y re-verifican las pruebas ya existentes de `009-migrate-design-system` en la fase de Polish.

**Organization**: Tareas agrupadas por historia de usuario (spec.md).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos/comandos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1..US3)

## Path Conventions

Todo el cambio vive en `packages/ui/src/LoginForm.tsx` y `packages/ui/src/Logo.tsx` (paquete compartido). Ninguna página consumidora (`apps/admin/src/app/login/page.tsx`, `apps/portal/src/app/login/page.tsx`) se modifica (contracts/login-form.md).

---

## Phase 1: Setup

**Purpose**: Confirmar que no se requieren dependencias nuevas antes de tocar el componente.

- [x] T001 Confirmar que `@mui/icons-material` (ya dependencia de `packages/ui`) expone los iconos necesarios para correo, candado y flecha/entrada — sin agregar ninguna dependencia nueva al `package.json`

**Checkpoint**: Sin bloqueos de dependencias — se puede empezar a modificar `LoginForm.tsx`/`Logo.tsx`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Corrección compartida que necesita el logo en ambos lugares donde aparece en esta pantalla (el logo pequeño ya existente y el logo grande del nuevo panel de marca).

**⚠️ CRITICAL**: Bloquea la Historia 1, que muestra el logo en tamaño grande dentro del panel de marca.

- [x] T002 Corregir `packages/ui/src/Logo.tsx`: reemplazar el `fill="#1565c0"` hardcodeado del `<rect>` de fondo por `theme.palette.primary.main` (vía `useTheme()`), sin cambiar la firma de props (`size`) ni el resto del marcado SVG (research.md #3)

**Checkpoint**: El logo ya no tiene ningún color hardcodeado — listo para usarse en el panel de marca de la Historia 1.

---

## Phase 3: User Story 1 - Pantalla de acceso en dos paneles, alineada al sistema de diseño (Priority: P1) 🎯 MVP

**Goal**: Layout de dos paneles (formulario + marca/valor) en escritorio, apilado a un solo panel en pantallas angostas, construido exclusivamente con el Theme compartido.

**Independent Test**: Abrir `/login` en cualquiera de las dos apps en una ventana de escritorio y confirmar visualmente los dos paneles con los colores/tipografía/radios del Theme; reducir el ancho de la ventana y confirmar que el formulario sigue siendo usable sin scroll horizontal.

### Implementation for User Story 1

- [x] T003 [US1] Construir la sección interna de "panel de marca/valor" dentro de `packages/ui/src/LoginForm.tsx` (o un sub-componente no exportado en el mismo archivo): logo grande (`Logo`, ya corregido en T002), mensaje de valor institucional estático de dos líneas (research.md #2), leyendo únicamente `theme.palette`/`theme.typography`/`theme.shape` (depende de T002)
- [x] T004 [US1] Reestructurar el contenedor raíz de `LoginForm` en un layout de dos columnas (flex/grid de MUI): panel de formulario (contenido ya existente: logo pequeño, `title`, alertas, campos, botón) + panel de marca/valor (T003), visibles ambos en pantallas ≥ `sm` (depende de T003)
- [x] T005 [US1] Ocultar o apilar el panel de marca/valor en pantallas < `sm` (reutilizar `theme.breakpoints.down('sm')`, mismo punto de corte que `packages/ui/src/MainLayoutClient.tsx`, research.md #4), de forma que el panel de formulario ocupe el ancho completo y no requiera scroll horizontal (FR-004) (depende de T004)
- [x] T006 [US1] Revisar `LoginForm.tsx` completo y confirmar que ningún color, tipografía o radio se define de forma local (todo vía `theme.*` o componentes MUI sin `sx` de color hardcodeado) — corregir cualquier valor local encontrado (FR-002, SC-001) (depende de T005)

**Checkpoint**: La pantalla de acceso ya muestra el layout de dos paneles correctamente en escritorio y se comporta bien en móvil — MVP de esta feature completo.

---

## Phase 4: User Story 2 - Campos de acceso con iconos y mejor jerarquía visual (Priority: P2)

**Goal**: Iconos identificadores en los campos de correo/contraseña y en el botón de acceso.

**Independent Test**: Mirar el formulario ya migrado y confirmar el icono de sobre en correo, el icono de candado en contraseña (junto al control de mostrar/ocultar ya existente), y el icono de flecha en el botón de acceso.

### Implementation for User Story 2

- [x] T007 [US2] Agregar un icono de sobre como `startAdornment` del campo de correo en `packages/ui/src/LoginForm.tsx` (research.md #5) (depende del checkpoint de la Historia 1)
- [x] T008 [US2] Agregar un icono de candado como `startAdornment` del campo de contraseña, conservando sin cambios el `endAdornment` ya existente de mostrar/ocultar contraseña (depende de T007, mismo archivo)
- [x] T009 [US2] Agregar un icono de flecha/entrada como `endIcon` del botón de envío, conservando sin cambios su texto ("Iniciar sesión"/"Ingresando…") y su estado `disabled` durante el envío (depende de T008, mismo archivo)

**Checkpoint**: Los campos y el botón ya tienen la jerarquía visual con iconos, sin alterar la validación ni el comportamiento de envío.

---

## Phase 5: User Story 3 - Modo claro y modo oscuro en la pantalla de acceso (Priority: P2)

**Goal**: La pantalla de acceso hereda correctamente el modo claro/oscuro activo, sin lógica ni valores propios de modo.

**Independent Test**: Alternar el modo oscuro en cualquier pantalla ya autenticada, cerrar sesión, y confirmar que `/login` se muestra en modo oscuro en ambos paneles.

### Implementation for User Story 3

- [x] T010 [US3] Verificar en el navegador (o releyendo `LoginForm.tsx`) que el layout de dos paneles (Historia 1) y los iconos (Historia 2) cambian correctamente de paleta al alternar `ColorModeProvider`/`useColorMode` ya conectado en `ThemeRegistry` de ambas apps — corregir cualquier valor que no reaccione al cambio de modo (FR-007) (depende del checkpoint de la Historia 2) — verificado por inspección estática: `grep -nE "#[0-9a-fA-F]{3,8}|rgb\(|rgba\(|'white'|'black'" packages/ui/src/LoginForm.tsx packages/ui/src/Logo.tsx` no arroja coincidencias, todo color proviene de `theme.*`

**Checkpoint**: El modo oscuro funciona en la nueva pantalla de acceso sin código ni valores adicionales específicos de esta pantalla.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final de que nada se rompió y de que ninguna página consumidora necesitó cambios.

- [x] T011 [P] Ejecutar `pnpm --filter @control-contable/ui lint && pnpm --filter @control-contable/ui type-check`, `pnpm --filter admin type-check` y `pnpm --filter portal type-check` — confirmar 0 errores y 0 cambios necesarios en `apps/admin/src/app/login/page.tsx` / `apps/portal/src/app/login/page.tsx` (quickstart.md paso 1) — sin errores; `git diff --stat` de ambos `page.tsx` confirma 0 cambios
- [x] T012 [P] Ejecutar `pnpm --filter @control-contable/ui test` — confirmar que las pruebas ya existentes de `009-migrate-design-system` (theme, `StatusChip`, `useColorMode`) siguen pasando sin regresión (quickstart.md paso 2) — 43/43 pasan
- [ ] T013 Ejecutar la validación visual manual de `quickstart.md` (paso 3): dos paneles en escritorio, apilado en móvil, ciclo de modo claro/oscuro, mensaje de error de autenticación sin cambios, redirección tras login exitoso sin cambios — **Bloqueada para mí**: a cargo del usuario, sin Playwright/chromium disponible en este entorno

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias.
- **Foundational (Phase 2)**: Depende de Setup — bloquea la Historia 1 (el logo corregido se usa en el panel de marca).
- **Historia 1 (Phase 3)**: Depende de Foundational. Es el MVP — todo lo demás se apoya en el layout de dos paneles ya construido.
- **Historia 2 (Phase 4)**: Depende de que la Historia 1 esté completa (mismo archivo, mismo formulario ya reestructurado).
- **Historia 3 (Phase 5)**: Depende de que las Historias 1 y 2 estén completas (verifica que todo lo ya construido reaccione al modo).
- **Polish (Phase 6)**: Depende de que todas las historias estén completas.

### User Story Dependencies

- **US1 (P1)**: Depende de Foundational (T002) — es la base del resto.
- **US2 (P2)**: Depende de US1 — agrega iconos sobre el layout ya construido.
- **US3 (P2)**: Depende de US1 y US2 — es una verificación de que ambas ya son theme-aware, no introduce layout nuevo.

### Parallel Opportunities

- Dentro de cada historia, las tareas modifican el mismo archivo (`LoginForm.tsx`) y son intencionalmente secuenciales — no se marcan en paralelo para evitar conflictos de edición.
- En Polish, T011 y T012 son comandos independientes (lint/type-check vs. test) y pueden ejecutarse en paralelo.

---

## Parallel Example: Polish

```bash
# Lanzar en paralelo:
Task: "pnpm --filter @control-contable/ui lint && pnpm --filter @control-contable/ui type-check && pnpm --filter admin type-check && pnpm --filter portal type-check"
Task: "pnpm --filter @control-contable/ui test"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (corrección del logo)
3. Completar Phase 3: Historia 1
4. **DETENER y VALIDAR**: la pantalla de acceso ya muestra el layout de dos paneles correctamente, en escritorio y en móvil, en ambas apps.

### Incremental Delivery

1. Setup + Foundational + Historia 1 → **MVP visible**: pantalla de acceso rediseñada con dos paneles.
2. - Historia 2 → Campos y botón con iconos.
3. - Historia 3 → Confirmación de que el modo claro/oscuro ya funciona correctamente en la nueva pantalla.
4. Polish → Verificación final sin regresiones.

---

## Notes

- Ninguna tarea de este plan modifica el flujo de autenticación, la validación o las redirecciones ya existentes (FR-010).
- Ninguna tarea requiere cambios en `apps/admin/src/app/login/page.tsx` ni `apps/portal/src/app/login/page.tsx` (mismo contrato de props, contracts/login-form.md).
- La validación visual en navegador (quickstart.md) queda a cargo del usuario: este entorno no cuenta con Playwright/chromium para automatizarla.
