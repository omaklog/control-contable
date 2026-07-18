# Data Model: Layout Principal del Portal

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

Esta feature no agrega tablas ni migraciones de base de datos. Extiende un tipo ya existente (`CurrentProfile`, de `packages/auth`) y define una estructura de código (no persistida) para el menú de navegación.

## `CurrentProfile` (extensión)

Definido en `packages/auth/src/session.ts` (feature `003-supabase-auth-roles`). Se agrega un campo:

| Columna | Tipo   | Notas                                                                                                                                                                                                                                             |
| ------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `email` | string | Correo del usuario autenticado, obtenido de `supabase.auth.getUser()` dentro de `getCurrentProfile()` — ya se consulta ahí, no requiere una llamada adicional. Usado como respaldo del avatar cuando `fullName` es nulo (FR-002, research.md #4). |

El resto de `CurrentProfile` (`id`, `role`, `isActive`, `fullName`, `mustChangePassword`, `capabilities`) no cambia — ver `specs/003-supabase-auth-roles/contracts/package-api.md`.

## `MenuItem` (estructura de código, no persistida)

El tipo `MenuItem` y la función `visibleMenuItems` viven en `packages/ui/src/navigation.ts` (compartidos por ambas apps, FR-010). Cada app define su propio arreglo estático `MENU_ITEMS` — no en base de datos (ver research.md #3) — en `apps/portal/src/components/layout/navigation.ts` y `apps/admin/src/components/layout/navigation.ts` respectivamente; ambos usan la misma forma de `MenuItem`.

| Campo         | Tipo                      | Notas                                                                                                                                                                 |
| ------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `label`       | string                    | Texto visible de la entrada de menú.                                                                                                                                  |
| `href`        | string                    | Ruta de destino; solo se navega si `implemented` es `true`.                                                                                                           |
| `icon`        | componente de ícono MUI   | Ícono mostrado junto al texto.                                                                                                                                        |
| `capability`  | `Capability \| undefined` | Si se define, la entrada solo es visible para usuarios cuyas `capabilities` efectivas la incluyan (FR-007). Si no se define, es visible para los 3 roles de personal. |
| `implemented` | boolean                   | `false` = la entrada se muestra deshabilitada y marcada "próximamente" (FR-006); `true` = enlace funcional.                                                           |

**Función de resolución**: `visibleMenuItems(items: MenuItem[], capabilities: Capability[]): MenuItem[]` — función pura (sin I/O) que retorna solo las entradas cuyo `capability` (si existe) está incluido en `capabilities`. No filtra por `implemented`; ese campo solo afecta el estilo/interactividad de la entrada, no su visibilidad.

## Relaciones

- `MenuItem.capability`, cuando se define, referencia un valor del tipo `Capability` de `packages/auth` (mismo catálogo que usa `requireCapability`/`permission_overrides` en la feature 003) — no se define un catálogo de capacidades nuevo para el menú.
- No hay relación con tablas de base de datos: `MENU_ITEMS` es una constante en el bundle de `apps/portal`, evaluada en cada render junto con el `CurrentProfile` ya resuelto por el layout.
