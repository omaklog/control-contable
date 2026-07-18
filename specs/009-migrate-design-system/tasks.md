---
description: 'Task list template for feature implementation'
---

# Tasks: Migración al Sistema de Diseño Compartido (Theme MUI)

**Input**: Design documents from `/specs/009-migrate-design-system/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/theme-tokens.md, quickstart.md

**Tests**: Se incluyen tareas de prueba unitaria porque el spec define criterios de éxito mecánicamente verificables (SC-007, contraste WCAG AA; FR-007, paridad claro/oscuro) y la Constitución exige pruebas unitarias para reglas críticas — no es un TDD estricto (no se exige que fallen primero), pero sí que existan.

**Organization**: Tareas agrupadas por historia de usuario (spec.md) para permitir implementación y prueba independientes de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: Historia de usuario a la que pertenece (US1..US5)
- Se incluye la ruta exacta de archivo en cada descripción

## Path Conventions

Monorepo existente (ver plan.md → Project Structure): paquete compartido `packages/ui/src/theme/`, consumido por `apps/admin/src` y `apps/portal/src`. No se crean proyectos ni paquetes nuevos.

---

## Phase 1: Setup

**Purpose**: Scaffolding del nuevo submódulo de Theme, sin lógica todavía.

- [x] T001 Crear el scaffold de `packages/ui/src/theme/` con módulos vacíos (exports `TODO`) para `colors.ts`, `typography.ts`, `spacing.ts`, `radius.ts`, `shadows.ts`, `light.ts`, `dark.ts`, `useColorMode.ts`, `types.ts`, `index.ts`, según la estructura de `plan.md`

**Checkpoint**: Estructura de archivos lista para implementar.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Contrato de tipos compartido por todos los módulos de tokens — bloquea el resto de las historias.

**⚠️ CRITICAL**: Ninguna historia puede empezar su implementación hasta completar esta fase.

- [x] T002 Definir los tipos TypeScript compartidos (`ColorTokens`, `TypographyTokens`, `SpacingScale`, `RadiusScale`, `ShadowTokens`, `ThemeMode`) en `packages/ui/src/theme/types.ts`, usados por todos los módulos de tokens de la Historia 1 y por el contrato de `ColorModeProvider` de la Historia 3

**Checkpoint**: Contrato de tipos listo — la implementación de historias puede comenzar.

---

## Phase 3: User Story 1 - Un Theme MUI compartido y verificable (Priority: P1) 🎯 MVP

**Goal**: Un único Theme de Material UI en `packages/ui/theme`, con variantes clara y oscura, que materialice `docs/ux/design-system.md` §1 y sea verificable de forma aislada (sin que ninguna app lo consuma todavía).

**Independent Test**: Envolver un componente MUI estándar (botón, campo, tarjeta) con `lightTheme`/`darkTheme` y confirmar que refleja los colores/tipografía/radios documentados; correr las pruebas unitarias de paridad y contraste.

### Implementation for User Story 1

- [x] T003 [P] [US1] Implementar `colors.ts` — paleta clara (§1.1: `primary.main` `#1e293b`, `secondary.main` `#3b82f6`, `background.default` `#f8fafc`, `background.paper` `#ffffff`, `divider` `#e2e8f0`, hover `#f1f5f9`, selección `#eff6ff`, `error.main` rojo semántico, texto secundario gris) y oscura (§1.2: `#0f172a`/`#1e293b`/`#38bdf8`/`#334155`/`#f8fafc`/`#94a3b8`, semánticos desplazados a rango 400-500) — nunca verde como color de estado — en `packages/ui/src/theme/colors.ts`
- [x] T004 [P] [US1] Implementar `typography.ts` — familia Inter para texto general, JetBrains Mono exclusiva para cifras/datos tabulares, jerarquía por peso, reducción de titulares grandes en móvil (§1.3) en `packages/ui/src/theme/typography.ts`
- [x] T005 [P] [US1] Implementar `spacing.ts` — unidad base 4px y escala de incrementos (§1.4) en `packages/ui/src/theme/spacing.ts`
- [x] T006 [P] [US1] Implementar `radius.ts` — escala única (8px estándar, 12px contenedores grandes, pill para chips/badges), idéntica en ambos modos (§1.5) en `packages/ui/src/theme/radius.ts`
- [x] T007 [P] [US1] Implementar `shadows.ts` — bordes de 1px como mecanismo principal de elevación + escala ligera reservada a Nivel 2 (modales/popovers) (§1.5) en `packages/ui/src/theme/shadows.ts`
- [x] T008 [US1] Implementar `light.ts` — `createTheme()` combinando colors/typography/spacing/radius/shadows para modo claro, en `packages/ui/src/theme/light.ts` (depende de T003-T007)
- [x] T009 [US1] Implementar `dark.ts` — mismo `shape.borderRadius`/`typography`/`spacing` que `light.ts`, solo cambia paleta/shadows (FR-007), en `packages/ui/src/theme/dark.ts` (depende de T003-T007)
- [x] T010 [US1] Crear el barrel export `index.ts` (`lightTheme`, `darkTheme` y re-export de los módulos de tokens) según `contracts/theme-tokens.md`, en `packages/ui/src/theme/index.ts` (depende de T008, T009)
- [x] T011 [P] [US1] Prueba unitaria de paridad: `lightTheme`/`darkTheme` comparten exactamente el mismo `shape.borderRadius`, `typography` y `spacing` (FR-007) en `packages/ui/src/theme/theme.test.ts`
- [x] T012 [P] [US1] Prueba unitaria de contraste WCAG 2.1 AA: calcular el ratio de contraste (luminancia relativa) de cada par texto/fondo e icono/fondo documentado, en ambos modos, y fallar por debajo de 4.5:1/3:1 (FR-002, SC-007, research.md #3) en `packages/ui/src/theme/contrast.test.ts`
- [x] T013 [US1] Exportar `lightTheme`/`darkTheme` desde `packages/ui/src/index.ts` (punto de entrada público del paquete) (depende de T010)

**Checkpoint**: El Theme es completo, tipado y verificable de forma aislada — listo para que las apps lo consuman (Historia 2).

---

## Phase 4: User Story 2 - Ambas aplicaciones consumen el mismo Theme (Priority: P1)

**Goal**: `apps/admin` y `apps/portal` consumen exclusivamente el Theme compartido, reemplazando por completo sus temas locales.

**Independent Test**: Iniciar sesión en cada app y confirmar visualmente que toda la interfaz ya construida usa el mismo color/tipografía/radios en ambas, sin residuos del tema anterior.

### Implementation for User Story 2

- [x] T014 [US2] Actualizar `apps/admin/src/components/providers/ThemeRegistry.tsx` para importar `lightTheme` desde `@control-contable/ui` en vez del tema local (depende de T013)
- [x] T015 [US2] Actualizar `apps/portal/src/components/providers/ThemeRegistry.tsx` para importar `lightTheme` desde `@control-contable/ui`, igual que T014 (depende de T013)
- [x] T016 [P] [US2] Eliminar por completo `apps/admin/src/lib/mui/theme.ts` (retirado, no dejarlo como código muerto — FR-008, Edge Case)
- [x] T017 [P] [US2] Eliminar por completo `apps/portal/src/lib/mui/theme.ts`, igual que T016
- [x] T018 [P] [US2] Cargar Inter y JetBrains Mono autohospedadas en `apps/admin/src/app/layout.tsx` vía `next/font/google` (autohospedado en build time, sin llamada a CDN en runtime — alternativa de research.md #5) mediante `apps/admin/src/lib/fonts.ts`, pasando las variables de fuente al `<html>` que envuelve `ThemeRegistry`
- [x] T019 [P] [US2] Cargar Inter y JetBrains Mono autohospedadas en `apps/portal/src/app/layout.tsx` vía `next/font/google`, igual que T018, mediante `apps/portal/src/lib/fonts.ts`
- [x] T020 [US2] Verificar con `grep -rn "lib/mui/theme" apps/admin/src apps/portal/src` que no quedan referencias al tema local (quickstart.md paso 2) (depende de T014-T019) — 0 coincidencias confirmadas

**Checkpoint**: Ambas apps ya son visualmente idénticas entre sí y consumen el Theme compartido (SC-005) — listo para Historias 3, 4 y 5 en paralelo.

---

## Phase 5: User Story 3 - Alternar entre modo claro y modo oscuro (Priority: P2)

**Goal**: Alternancia de modo persistida por navegador/dispositivo, con preferencia de sistema operativo por defecto.

**Independent Test**: Alternar el modo desde cualquiera de las dos apps y confirmar el cambio inmediato; cerrar/reabrir y confirmar que se mantiene.

### Implementation for User Story 3

- [x] T021 [US3] Implementar la función pura `resolveInitialMode({ storedMode, prefersDark }): 'light' | 'dark'` (preferencia de SO por defecto, `'light'` como respaldo si no se puede detectar — Edge Case) en `packages/ui/src/theme/useColorMode.tsx` (depende de T002) — implementado en `.tsx` (no `.ts`), ya que el archivo también define el JSX de `ColorModeProvider`
- [x] T022 [US3] Implementar `ColorModeProvider` + hook `useColorMode()` que envuelve la función pura, lee/escribe la clave de `localStorage` al alternar manualmente, expone `{ mode, toggleMode }` (FR-009/FR-010, data-model.md) en `packages/ui/src/theme/useColorMode.tsx` (depende de T021)
- [x] T023 [P] [US3] Prueba unitaria de `resolveInitialMode`: sin valor guardado + SO oscuro → oscuro; sin valor guardado + SO no detectable → claro; valor manual guardado prevalece sobre el SO en cualquier dirección (Edge Case, AS3/AS4) en `packages/ui/src/theme/useColorMode.test.ts`
- [x] T024 [US3] Exportar `ColorModeProvider`/`useColorMode` desde `packages/ui/src/theme/index.ts` y `packages/ui/src/index.ts` (depende de T022)
- [x] T025 [US3] Envolver `apps/admin/src/components/providers/ThemeRegistry.tsx` con `ColorModeProvider`, seleccionando `lightTheme`/`darkTheme` según `useColorMode().mode` (depende de T024, T014)
- [x] T026 [US3] Envolver `apps/portal/src/components/providers/ThemeRegistry.tsx` con `ColorModeProvider`, igual que T025 (depende de T024, T015)
- [x] T027 [US3] Agregar un `IconButton` (icono sol/luna) con `Tooltip`, en el `Toolbar` de `packages/ui/src/MainLayoutClient.tsx`, que llame a `useColorMode().toggleMode()` — compartido automáticamente por ambas apps (FR-009)

**Checkpoint**: El modo oscuro funciona y persiste en ambas apps de forma independiente del resto de historias.

---

## Phase 6: User Story 4 - Estados mostrados con el mismo lenguaje visual (Priority: P2)

**Goal**: Toda columna "Estado" ya construida usa el mismo Chip semántico, nunca texto plano.

**Independent Test**: Abrir el listado de Clientes (ambas apps) y el detalle de Cliente, confirmar que "Estado" usa el mismo Chip que ya usa Usuarios.

### Implementation for User Story 4

- [x] T028 [US4] Crear el componente `StatusChip` (props `status`, `label` opcional) que mapea valores de `estado` del dominio a color semántico (azul=positivo, rojo=negativo, gris=neutro, forma pill), según `contracts/theme-tokens.md`, en `packages/ui/src/StatusChip.tsx`
- [x] T029 [P] [US4] Exportar `StatusChip` desde `packages/ui/src/index.ts` (depende de T028)
- [x] T030 [P] [US4] Prueba unitaria del mapeo status→color de `StatusChip` (activo→azul, inactivo/obsoleto→gris, nunca verde) en `packages/ui/src/StatusChip.test.ts` (depende de T028) — implementada como prueba de la función pura exportada `resolveStatusChipVariant`, en `.test.ts` (no `.test.tsx`), consistente con el patrón ya establecido en el repo de probar lógica pura en vez de renderizar componentes (no hay infraestructura de React Testing Library/jsdom en este proyecto)
- [x] T031 [US4] Reemplazar el texto plano de Estado (`cliente.estado === 'activo' ? 'Activo' : 'Inactivo'`) por `StatusChip` en `apps/admin/src/app/(app)/clientes/ClientesClient.tsx` (depende de T028)
- [x] T032 [US4] Reemplazar el texto plano de Estado por `StatusChip` en `apps/portal/src/app/(app)/clientes/ClientesPortalClient.tsx` (depende de T028)
- [x] T033 [US4] Reemplazar el texto plano de Estado del Cliente (encabezado de ficha) por `StatusChip` en `packages/ui/src/ClienteDetalleClient.tsx` (depende de T028)
- [x] T034 [US4] Reemplazar el texto plano de Estado en la tabla de Contactos por `StatusChip` en `packages/ui/src/ClienteDetalleClient.tsx` (depende de T028)

**Checkpoint**: Todas las columnas "Estado" ya construidas (Usuarios, Clientes en ambas apps, Contactos) usan el mismo Chip semántico (SC-003).

---

## Phase 7: User Story 5 - Acciones por fila consistentes (Priority: P3)

**Goal**: Las acciones por fila ya construidas en tablas existentes siguen el mismo patrón que ya usa Usuarios (iconos + tooltip, siempre visibles, fila activa).

**Independent Test**: Comparar la tabla de Usuarios contra los listados de Clientes y Contactos tras esta historia — deben comportarse y verse igual.

### Implementation for User Story 5

- [x] T035 [US5] Migrar los botones de texto `Editar`/`Eliminar`/`Ver detalle` a `IconButton` + `Tooltip` (siempre visibles) y agregar `TableRow hover`, en `apps/admin/src/app/(app)/clientes/ClientesClient.tsx` (referencia: `apps/admin/src/app/(app)/usuarios/UsuariosClient.tsx`)
- [x] T036 [US5] Migrar el botón de texto `Ver detalle` a `IconButton` + `Tooltip` y agregar `TableRow hover`, en `apps/portal/src/app/(app)/clientes/ClientesPortalClient.tsx`
- [x] T037 [US5] Migrar los botones de texto de acciones de Contactos (`Editar`, `Marcar obsoleto`/`Reactivar`, `Marcar principal`) a `IconButton` + `Tooltip` (siempre visibles) y agregar `TableRow hover`, en `packages/ui/src/ClienteDetalleClient.tsx`

**Checkpoint**: Todas las tablas con acciones por fila ya construidas siguen el mismo patrón visual (SC-004).

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Verificación final y cierre de la documentación relacionada.

- [x] T038 [P] Ejecutar `pnpm --filter @control-contable/ui lint` y `pnpm --filter @control-contable/ui type-check`, corrigiendo lo que la migración haya introducido — sin errores
- [x] T039 [P] Ejecutar lint y type-check de `apps/admin` y `apps/portal` (`pnpm --filter admin lint && pnpm --filter admin type-check`, `pnpm --filter portal lint && pnpm --filter portal type-check`) — sin errores
- [x] T040 Actualizar `docs/ux/design-system.md` §10 marcando como resueltos los puntos ya rastreados de ThemeProvider compartido, Estado como texto plano y acciones por fila con botones de texto, cruzando referencia a `009-migrate-design-system`
- [x] T041 Ejecutar la validación de `quickstart.md` de punta a punta: 43/43 pruebas unitarias pasan (`packages/ui`), `grep -rn "lib/mui/theme" apps/admin/src apps/portal/src` sin coincidencias. Los pasos de verificación visual en navegador (paso 3 de `quickstart.md`) y de regresión funcional en vivo (paso 4) quedan a cargo del usuario — bloqueados para mí, sin Playwright/chromium disponible en este entorno

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — puede iniciar de inmediato.
- **Foundational (Phase 2)**: Depende de Setup — bloquea todas las historias.
- **Historia 1 (Phase 3)**: Depende de Foundational. Es la base de todo lo demás.
- **Historia 2 (Phase 4)**: Depende de que Historia 1 esté completa (necesita `lightTheme`/`darkTheme` exportados, T013).
- **Historia 3 (Phase 5)**: Depende de Historia 1 (tipos, T002) y de que Historia 2 haya conectado ambos `ThemeRegistry` (T014, T015) para poder envolverlos con `ColorModeProvider`.
- **Historia 4 (Phase 6)**: Depende solo de Historia 1 (Theme con colores semánticos) — puede avanzar en paralelo con Historia 3.
- **Historia 5 (Phase 7)**: Depende solo de Historia 1/2 (Theme y apps ya consumiéndolo) — puede avanzar en paralelo con Historias 3 y 4.
- **Polish (Phase 8)**: Depende de que todas las historias deseadas estén completas.

### User Story Dependencies

- **US1 (P1)**: Sin dependencias de otras historias — es la base.
- **US2 (P1)**: Depende de US1 (consume el Theme ya construido).
- **US3 (P2)**: Depende de US1 y US2 (envuelve los `ThemeRegistry` ya conectados).
- **US4 (P2)**: Depende de US1 únicamente — independiente de US2/US3, aunque su valor pleno se percibe una vez que ambas apps ya consumen el Theme.
- **US5 (P3)**: Depende de US1 únicamente — independiente de US3/US4, puede ejecutarse en paralelo con ellas.

### Parallel Opportunities

- T003-T007 (los 5 módulos de tokens de Historia 1) son independientes entre sí — en paralelo.
- T011 y T012 (pruebas de Historia 1) en paralelo entre sí, una vez que T010 está listo.
- T016/T017 (eliminar temas locales) y T018/T019 (cargar fuentes) en paralelo entre sí dentro de Historia 2.
- Una vez cerrada Historia 2 (checkpoint de Phase 4), las Historias 3, 4 y 5 pueden trabajarse en paralelo por distintas personas — no comparten archivos de implementación entre sí (Historia 3 toca `useColorMode.ts`/`ThemeRegistry.tsx`/`MainLayoutClient.tsx`; Historia 4 toca `StatusChip.tsx` y las pantallas de Clientes/Contactos; Historia 5 toca las mismas pantallas de Clientes/Contactos pero en las secciones de acciones — **atención**: T033/T034 (Historia 4) y T037 (Historia 5) tocan el mismo archivo `ClienteDetalleClient.tsx`, igual que T031/T035 tocan `ClientesClient.tsx` — coordinar si se ejecutan en paralelo por personas distintas para evitar conflictos de merge, aunque no son secciones que se solapen línea por línea).

---

## Parallel Example: User Story 1

```bash
# Lanzar los 5 módulos de tokens en paralelo:
Task: "Implementar colors.ts en packages/ui/src/theme/colors.ts"
Task: "Implementar typography.ts en packages/ui/src/theme/typography.ts"
Task: "Implementar spacing.ts en packages/ui/src/theme/spacing.ts"
Task: "Implementar radius.ts en packages/ui/src/theme/radius.ts"
Task: "Implementar shadows.ts en packages/ui/src/theme/shadows.ts"

# Una vez listos light.ts/dark.ts/index.ts, lanzar las 2 pruebas en paralelo:
Task: "Prueba de paridad en packages/ui/src/theme/theme.test.ts"
Task: "Prueba de contraste WCAG AA en packages/ui/src/theme/contrast.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational
3. Completar Phase 3: Historia 1
4. **DETENER y VALIDAR**: el Theme es correcto y verificable de forma aislada (aunque ninguna app lo consuma todavía)

### Incremental Delivery

1. Setup + Foundational + Historia 1 → Theme listo, sin impacto visible para el usuario final todavía.
2. - Historia 2 → **Primer impacto visible**: ambas apps ya se ven idénticas entre sí (MVP funcional real).
3. - Historia 3 → Modo oscuro disponible.
4. - Historia 4 → Estados consistentes en toda la app.
5. - Historia 5 → Acciones por fila consistentes en toda la app.
6. Cada historia agrega valor sin romper las anteriores.

### Parallel Team Strategy

Con varias personas: completar Setup + Foundational + Historia 1 + Historia 2 en conjunto (son secuenciales entre sí); a partir de ahí, una persona por Historia 3/4/5 en paralelo, coordinando los archivos compartidos señalados en "Parallel Opportunities".

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes entre sí.
- [Story] mapea cada tarea a su historia de usuario para trazabilidad.
- Ninguna tarea de este plan modifica reglas de negocio, permisos o datos (FR-014) — solo presentación.
- La validación visual en navegador (quickstart.md) queda a cargo del usuario: este entorno no cuenta con Playwright/chromium para automatizarla.
