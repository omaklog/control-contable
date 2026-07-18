# Research: Rediseño de la Pantalla de Inicio de Sesión

## 1. Dónde vive el layout de dos paneles

**Decision**: Construir el panel de marca/valor como una sección interna de `packages/ui/src/LoginForm.tsx` (o un sub-componente no exportado en el mismo archivo), sin cambiar la firma pública de `LoginForm` (`title`, `onSubmit`, `onSuccess`).

**Rationale**: Ambas páginas consumidoras (`apps/admin/src/app/login/page.tsx`, `apps/portal/src/app/login/page.tsx`) hoy solo renderizan `<LoginForm .../>` sin ningún wrapper propio. Si el panel de marca viviera en otro componente que las páginas debieran importar y ensamblar, se necesitaría tocar ambas páginas — innecesario cuando el objetivo es un cambio de presentación contenido en un único componente ya compartido.

**Alternatives considered**: Crear un componente `LoginScreen` nuevo que envuelva `LoginForm` y el panel de marca, exportado por separado — rechazado por ahora: agrega una capa de indirección sin necesidad real, ya que ningún otro flujo (aparte de las dos páginas de login) necesita el panel de marca de forma independiente.

## 2. Contenido del panel de marca/valor

**Decision**: Un mensaje de valor institucional breve y genérico, sin cifras: un título corto (ej. "Gestión contable, sin fricciones.") y una línea de apoyo que describe el propósito del sistema para el despacho (ej. "Plataforma interna para administrar clientes, cobranza y expedientes fiscales."), reutilizando el logo y el nombre por app ya existentes (`title` de `LoginForm`).

**Rationale**: El spec (FR-003, Assumptions) ya descarta cifras/estadísticas, inventadas o reales. Un mensaje de valor corto y verídico sobre el propósito del sistema es coherente con la descripción de la Constitución del propio proyecto (administración de clientes, cobranza, expedientes fiscales) sin inventar métricas de negocio que no existen en este alcance.

**Alternatives considered**: Dejar el panel de marca vacío (solo color/logo, sin mensaje) — rechazado: perdería el valor de "mensaje de valor institucional" que pide explícitamente la Historia 1 del spec, sin aportar nada a cambio.

## 3. Corrección del color hardcodeado en `Logo.tsx`

**Decision**: Reemplazar el `fill="#1565c0"` hardcodeado del rectángulo de fondo del logo por `theme.palette.primary.main` (vía `useTheme()`/`sx`), manteniendo el resto del SVG (texto "CC", tamaño configurable) sin cambios.

**Rationale**: FR-002 exige que el panel de marca/valor (donde el logo se muestra en tamaño grande, según la Historia 1) se construya "sin colores... propios de esta pantalla" — el logo ya se muestra ahí. `#1565c0` es, además, un residuo literal del tema local de `apps/portal` que se retiró por completo en `009-migrate-design-system`; corregirlo aquí cierra ese último rastro. El logo se usa también en `MainLayoutClient`, así que la corrección beneficia a toda la aplicación, no solo a esta pantalla.

**Alternatives considered**: Dejar el color hardcodeado tal cual, ya que "no es parte del alcance del spec" — rechazado: contradice literalmente FR-002 en la pantalla que este mismo spec está rediseñando, y es una corrección de una línea sin riesgo.

## 4. Punto de corte (breakpoint) para ocultar/apilar el panel de marca

**Decision**: Reutilizar el mismo breakpoint ya usado en el resto de la aplicación para colapsar el layout de escritorio a uno de una sola columna (`theme.breakpoints.down('sm')`, ya usado en `packages/ui/src/MainLayoutClient.tsx` para colapsar el Drawer permanente a uno temporal).

**Rationale**: Consistencia — el mismo punto de corte ya define "pantalla angosta" en el resto del sistema; introducir uno distinto para esta pantalla generaría un comportamiento responsive inconsistente entre el login y el resto de la aplicación ya migrada.

**Alternatives considered**: Un breakpoint propio más grande (ej. `md`) para ocultar el panel de marca antes — rechazado, sin justificación funcional distinta a la ya usada en el layout principal; no hay ninguna razón documentada para que el login se comporte diferente.

## 5. Iconos de campos y botón

**Decision**: Icono de sobre (`MailOutlineIcon` o equivalente) como `startAdornment` del campo de correo; icono de candado (`LockOutlinedIcon` o equivalente) como `startAdornment` del campo de contraseña, conservando el `endAdornment` ya existente de mostrar/ocultar contraseña; icono de flecha de entrada (`LoginIcon` o `ArrowForwardIcon`) como `endIcon` del botón principal.

**Rationale**: Iconografía ya disponible en `@mui/icons-material` (misma librería ya usada en todo el resto de la migración de `009`), sin necesitar activos nuevos. Coincide con el patrón de la referencia (`docs/ux/screenshots/login_reference/`) sin fabricar una dependencia nueva.

**Alternatives considered**: Ninguna — es una elección de iconografía de bajo riesgo dentro de una librería ya establecida en el proyecto.

## Resumen de NEEDS CLARIFICATION resueltos

Ninguno pendiente — las 3 ambigüedades detectadas para esta feature (fotografía vs. panel tonal, contenido del panel de marca, "recordarme"/MFA) ya se resolvieron durante `/speckit-specify`, y `/speckit-clarify` no encontró ambigüedades adicionales de alto impacto.
