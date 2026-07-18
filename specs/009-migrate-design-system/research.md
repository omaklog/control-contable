# Research: Migración al Sistema de Diseño Compartido (Theme MUI)

## 1. Dónde y cómo construir el Theme compartido

**Decision**: Construir el Theme como módulos de tokens TypeScript planos (`colors.ts`, `typography.ts`, `spacing.ts`, `radius.ts`, `shadows.ts`) que alimentan dos fábricas `createTheme()` de MUI (`light.ts`, `dark.ts`), reexportadas desde `packages/ui/src/theme/index.ts`.

**Rationale**: Es exactamente la estructura que el usuario pidió en el Input del spec, mantiene una única fuente de verdad tipada, y permite probar los valores de los tokens (incluido el contraste, ver #3) con pruebas unitarias simples sin necesidad de renderizar componentes ni un navegador.

**Alternatives considered**: Tokens como JSON/CSS custom properties consumidos tanto por MUI como por CSS plano — rechazado por ser una capa de indirección adicional no pedida por la Constitución (que ya establece Material UI como el sistema de theming) y que complicaría el tipado estricto exigido.

## 2. Mecanismo de alternancia y persistencia del modo claro/oscuro

**Decision**: Un `ColorModeProvider` (contexto de React) y un hook `useColorMode()` en `packages/ui/src/theme`, que en el primer render de cliente: (1) lee una clave dedicada en `localStorage`; (2) si no existe, usa `window.matchMedia('(prefers-color-scheme: dark)')`; (3) si el usuario alterna manualmente, escribe la elección en esa misma clave, que desde ese momento tiene prioridad sobre la detección de SO — igual en ambas aplicaciones, ya que ambas comparten el mismo dominio de navegador/dispositivo lógico.

**Rationale**: Cubre FR-009/FR-010 y la Historia 3 (AS1-AS4) tal como se aclararon en `/speckit-clarify`: por defecto sigue al sistema operativo, el override manual persiste por navegador/dispositivo, sin tocar la cuenta del usuario ni Supabase.

**Alternatives considered**: Persistir la preferencia en una cookie leída en el servidor (para evitar parpadeo en el primer render) — rechazado por ahora: añade complejidad de SSR (lectura de cookie en cada Server Component) no pedida por el spec, que explícitamente no asocia la preferencia a la cuenta ni requiere sincronía entre dispositivos; el pequeño parpadeo inicial en la primera carga (antes de que el script de cliente aplique el modo) es un costo aceptado, no un requisito de la especificación. Persistir en una tabla de Supabase por usuario — rechazado explícitamente por el spec (Key Entity "Preferencia de modo": "no asociada a la cuenta del usuario ni sincronizada entre dispositivos").

## 3. Verificación mecánica del contraste (WCAG 2.1 AA)

**Decision**: Una prueba unitaria en Vitest (`packages/ui/src/theme/*.test.ts`) que calcula el ratio de contraste (fórmula de luminancia relativa WCAG) para cada par texto/fondo e icono/fondo definido en `colors.ts`, en ambos modos, y falla si algún par no alcanza 4.5:1 (texto normal) o 3:1 (texto grande/iconos).

**Rationale**: Hace que SC-007 sea verificable de forma repetible en cada ejecución de `pnpm test`, sin depender de una herramienta externa ni de inspección visual manual — alineado con el principio de Testing de la Constitución (pruebas unitarias para reglas críticas) y con la limitación ya conocida de este entorno (sin Playwright/chromium para validación visual automatizada).

**Alternatives considered**: Herramienta de auditoría de accesibilidad basada en navegador (ej. axe-core sobre una página renderizada) — rechazada por ahora porque requeriría infraestructura de pruebas end-to-end no disponible en este entorno; queda como mejora futura opcional, no bloqueante para esta migración.

## 4. Reemplazo completo de los temas locales existentes

**Decision**: `apps/admin/src/lib/mui/theme.ts` y `apps/portal/src/lib/mui/theme.ts` se eliminan por completo; ambos `ThemeRegistry.tsx` importan el Theme (y el `ColorModeProvider`) desde `@control-contable/ui` en su lugar.

**Rationale**: FR-008 exige un reemplazo completo, no una coexistencia; y el Edge Case del spec es explícito en que los dos temas locales "no quedan como una alternativa ni como valores de respaldo". Eliminar el archivo (en vez de dejarlo sin usar) evita que alguien vuelva a importarlo por error en el futuro.

**Alternatives considered**: Dejar los archivos locales como código muerto "por si acaso" — rechazado, contradice tanto el spec como la práctica ya establecida en este proyecto de no dejar código muerto tras una migración.

## 5. Fuentes tipográficas autohospedadas

**Decision**: Cargar Inter y JetBrains Mono mediante `next/font/local` (o el mecanismo equivalente de auto-hospedado de Next.js) en cada aplicación, en vez de un `<link>` a Google Fonts u otro CDN externo.

**Rationale**: Alineado con la Constitución ("evitar exponer servicios/dependencias innecesarias a Internet") y con la Assumption ya documentada en el spec sobre fuentes autohospedadas.

**Alternatives considered**: `next/font/google` (que sigue autohospedando el archivo de fuente en build time, sin llamada a runtime a Google) sería igualmente aceptable si simplifica la obtención de los archivos de fuente — decisión de implementación menor a resolver en `/speckit-tasks`, no afecta el contrato del Theme.

## 6. Migración de "Estado" y acciones por fila a un componente compartido

**Decision**: Generalizar el patrón ya validado en `UsuariosClient.tsx` (Chip semántico pill para Estado; `IconButton` + `Tooltip`, siempre visibles, con `TableRow hover`, para acciones) en uno o dos componentes reutilizables de `packages/ui` (p. ej. `StatusChip`), en vez de repetir el patrón manualmente en cada pantalla migrada (`ClientesClient` en ambas apps, `ClienteDetalleClient`, listado de Contactos).

**Rationale**: Evita duplicar la lógica de color-por-estado en cada pantalla (Constitución: evitar duplicación de código) y hace que FR-012/FR-013 sean auto-consistentes por construcción, no por disciplina manual repetida.

**Alternatives considered**: Migrar cada pantalla de forma independiente sin extraer un componente compartido — rechazado, ya se identificó este mismo patrón repetido en al menos 3 pantallas distintas durante las sesiones de refinamiento de specs 005-008; extraerlo ahora es más barato que seguir difiriéndolo.

## Resumen de NEEDS CLARIFICATION resueltos

Ninguno pendiente — las dos ambigüedades detectadas para esta feature (persistencia del modo, estándar de contraste) ya se resolvieron durante `/speckit-specify` y `/speckit-clarify` respectivamente, antes de esta fase.
