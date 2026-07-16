# Contrato: menú de navegación de `apps/portal`

**Feature**: [../spec.md](../spec.md) | **Data model**: [../data-model.md](../data-model.md)

Definido en `apps/portal/src/components/layout/navigation.ts`. No es una API pública consumida fuera de `apps/portal` — se documenta aquí porque es la superficie que cualquier módulo de negocio futuro deberá extender para aparecer en el menú.

```ts
export interface MenuItem {
  label: string
  href: string
  icon: React.ComponentType
  capability?: Capability
  implemented: boolean
}

export const MENU_ITEMS: MenuItem[]

export function visibleMenuItems(items: MenuItem[], capabilities: Capability[]): MenuItem[]
```

## Garantías del contrato

- `visibleMenuItems` es una función pura (sin I/O): dadas las mismas entradas, siempre devuelve el mismo resultado — testeable con Vitest sin necesidad de una base de datos (research.md #3, mismo criterio que `roleDefaultCapabilities`/`canAccessApp` de la feature 003).
- Agregar un módulo de negocio nuevo al menú es, en principio, agregar una entrada a `MENU_ITEMS` con `implemented: true` y (si aplica) su `capability` — no requiere cambios en `MainLayoutClient` ni en el layout del route group.
- El filtrado por `capability` es estrictamente una decisión de presentación (qué se muestra en el menú): la protección real de cada módulo futuro sigue viviendo en `requireCapability`/RLS cuando ese módulo se implemente, nunca únicamente en que su entrada de menú esté oculta (constitución: "nunca confiar únicamente en validaciones del frontend").
