# Quickstart: Validar el rediseño de la pantalla de inicio de sesión

Guía de validación una vez implementado el rediseño. Asume que `LoginForm.tsx` y `Logo.tsx` ya fueron modificados según `plan.md`/`contracts/login-form.md`.

## Prerrequisitos

- Dependencias instaladas (`pnpm install`).
- Sin un servidor `next dev` corriendo sobre la misma app antes de ejecutar `pnpm build` (ver nota de entorno más abajo).

## 1. Verificar tipado y lint

```bash
pnpm --filter @control-contable/ui lint
pnpm --filter @control-contable/ui type-check
pnpm --filter admin type-check
pnpm --filter portal type-check
```

**Resultado esperado**: sin errores. En particular, cero cambios necesarios en `apps/admin/src/app/login/page.tsx` ni `apps/portal/src/app/login/page.tsx` (contrato de props sin cambios, ver contracts/login-form.md).

## 2. Pruebas unitarias (si se extrajo lógica pura)

```bash
pnpm --filter @control-contable/ui test
```

**Resultado esperado**: las pruebas ya existentes de `009-migrate-design-system` (theme, `StatusChip`, `useColorMode`) siguen pasando sin regresión; si se extrajo una función pura para el criterio de breakpoint (research.md #4), su prueba unitaria también pasa.

## 3. Validación visual manual (navegador) — SC-001 a SC-005

> Nota de entorno: no ejecutar `pnpm build` mientras un servidor `next dev` de la misma app esté activo (corrompe `.next`). Usar `lint`/`type-check` durante desarrollo activo.

1. Levantar ambas apps en desarrollo (`pnpm --filter admin dev`, `pnpm --filter portal dev`).
2. Abrir `/login` en `apps/admin` en una ventana de escritorio: confirmar que se ven simultáneamente el panel de formulario (logo, título, campos con icono, botón con icono) y el panel de marca/valor (mismo logo corregido, mensaje institucional, sin cifras, sin fotografía) — mismos colores/tipografía/radios que el resto de la app ya migrada.
3. Repetir en `apps/portal` — confirmar identidad visual equivalente (mismo Theme), con el `title` propio de esa app.
4. Reducir el ancho de la ventana (o usar las herramientas de dispositivo móvil del navegador) por debajo del breakpoint `sm`: confirmar que el panel de marca/valor se oculta o se apila, y que el formulario de acceso permanece completo, legible y sin necesidad de scroll horizontal.
5. Alternar el modo oscuro en cualquier pantalla ya autenticada, cerrar sesión, y confirmar que `/login` se muestra en modo oscuro, con ambos paneles usando la paleta oscura (sin ningún panel "atrapado" en modo claro).
6. Provocar un error de autenticación (correo/contraseña incorrectos) y confirmar que el mensaje genérico ya existente se sigue mostrando en el mismo lugar, sin cambios de redacción ni de comportamiento.
7. Iniciar sesión exitosamente y confirmar que la redirección posterior (`/`) ocurre exactamente igual que antes del rediseño.

## 4. Regresión funcional (sin cambios de lógica — FR-010)

Confirmar que el flujo de autenticación (credenciales válidas, credenciales inválidas, cuenta inactiva en `apps/portal`) se comporta idéntico a como lo hacía antes de este rediseño — solo cambia la apariencia.
