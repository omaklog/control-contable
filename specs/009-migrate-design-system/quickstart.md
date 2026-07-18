# Quickstart: Validar la migración al Sistema de Diseño Compartido

Guía de validación end-to-end una vez implementada la feature. No sustituye a `tasks.md` (que detalla el trabajo de implementación) — asume que el Theme ya existe en `packages/ui/src/theme` y que ambas apps lo consumen.

## Prerrequisitos

- Dependencias instaladas (`pnpm install`) en la raíz del monorepo.
- Sin un servidor `next dev` corriendo sobre la misma app antes de ejecutar `pnpm build` (ver nota de entorno más abajo).

## 1. Verificar el Theme de forma aislada (unitario)

```bash
pnpm --filter @control-contable/ui test
```

**Resultado esperado**: pasan las pruebas de tokens de `packages/ui/src/theme` (contrato: `lightTheme`/`darkTheme` exportados, mismo `shape.borderRadius`/`typography`/`spacing` en ambos, ver contracts/theme-tokens.md) y la prueba de contraste WCAG 2.1 AA (research.md #3, SC-007) — 0 pares texto/fondo o icono/fondo por debajo de 4.5:1 / 3:1 en ningún modo.

## 2. Verificar tipado y lint del paquete y ambas apps

```bash
pnpm --filter @control-contable/ui lint
pnpm --filter @control-contable/ui type-check
pnpm --filter admin lint && pnpm --filter admin type-check
pnpm --filter portal lint && pnpm --filter portal type-check
```

**Resultado esperado**: sin errores. En particular, cero referencias residuales a `apps/{admin,portal}/src/lib/mui/theme` (deben estar eliminados, no solo sin usar).

```bash
grep -rn "lib/mui/theme" apps/admin/src apps/portal/src
```

**Resultado esperado**: sin coincidencias.

## 3. Validación visual manual (navegador) — SC-001, SC-002, SC-003, SC-004, SC-005

> Nota de entorno: no ejecutar `pnpm build` mientras un servidor `next dev` de la misma app esté activo (corrompe `.next`). Usar `lint`/`type-check` para verificación durante desarrollo activo; reservar `build` para cuando no haya un dev server corriendo, o reiniciarlo después.

1. Levantar ambas apps en desarrollo (`pnpm --filter admin dev`, `pnpm --filter portal dev`, puertos distintos).
2. Iniciar sesión en `apps/admin`: confirmar que sidebar, botones, tablas y chips usan la paleta navy/azul documentada (`#1e293b`/`#3b82f6`), no la paleta gris-azulada (`#37474F`) ni naranja (`#F57C00`) del tema anterior.
3. Repetir en `apps/portal`: confirmar que ya no usa su paleta azul/verde-azulado anterior (`#1565C0`/`#00897B`) — debe verse **idéntica** a `apps/admin` en color, tipografía y radios (SC-005).
4. En cualquiera de las dos apps, alternar el modo oscuro: confirmar que el cambio se aplica de inmediato (sin recargar), y que las cifras en columnas numéricas usan la fuente monoespaciada en ambos modos.
5. Cerrar la pestaña y volver a abrir la aplicación: confirmar que el modo elegido se mantiene (SC-006), y que abrir la otra aplicación en el mismo navegador respeta la misma preferencia manual.
6. Ir al listado de Clientes (ambas apps) y al detalle de un Cliente: confirmar que la columna "Estado" ya se muestra como Chip semántico (nunca texto plano) y que las acciones por fila son iconos con tooltip, siempre visibles, igual que en la gestión de Usuarios (SC-003, SC-004).

## 4. Regresión funcional (sin cambios de negocio — FR-014)

Repetir un flujo de alta/edición de Cliente y de cambio de estado de Contacto (ya cubiertos por las pruebas de specs 005-008) y confirmar que el comportamiento, las validaciones y los permisos por rol son idénticos a antes de la migración — solo debe cambiar la apariencia.
