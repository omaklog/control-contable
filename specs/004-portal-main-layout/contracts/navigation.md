# Contrato: menú de navegación (`packages/ui` + `MENU_ITEMS` por app)

**Feature**: [../spec.md](../spec.md) | **Data model**: [../data-model.md](../data-model.md)

`MenuItem`/`visibleMenuItems` viven en `packages/ui/src/navigation.ts`, compartidos por `apps/portal` y `apps/admin` (FR-010). Cada app define su propio arreglo `MENU_ITEMS` en `apps/{portal,admin}/src/components/layout/navigation.ts` — no es una API pública consumida fuera del monorepo, pero sí la superficie que cualquier módulo de negocio futuro deberá extender para aparecer en el menú de su app.

**Contenido vigente de `apps/portal/.../navigation.ts`** (FR-006/FR-007, actualizado 2026-07-17): Inicio (implementado), Clientes (implementado, `capability: 'manage_clients'`), Cobranza (`capability: 'view_billing'`, `implemented: false`), Documentos Fiscales (`capability: 'view_documents'`, `implemented: false`), Obligaciones Fiscales (sin `capability`, `implemented: false`). `apps/admin/.../navigation.ts` no cambia (Inicio, Usuarios, Clientes, Auditoría — ya implementados).

```ts
export interface MenuItem {
  label: string
  href: string
  icon: React.ComponentType
  capability?: Capability
  implemented: boolean
  /** Texto alternativo a "Próximamente" cuando implemented=false (006-crud-clientes-admin, FR-017). */
  pendingLabel?: string
}

export const MENU_ITEMS: MenuItem[]

export function visibleMenuItems(items: MenuItem[], capabilities: Capability[]): MenuItem[]
```

## Garantías del contrato

- `visibleMenuItems` es una función pura (sin I/O): dadas las mismas entradas, siempre devuelve el mismo resultado — testeable con Vitest sin necesidad de una base de datos (research.md #3, mismo criterio que `roleDefaultCapabilities`/`canAccessApp` de la feature 003).
- Agregar un módulo de negocio nuevo al menú es, en principio, agregar una entrada a `MENU_ITEMS` con `implemented: true` y (si aplica) su `capability` — no requiere cambios en `MainLayoutClient` ni en el layout del route group.
- El filtrado por `capability` es estrictamente una decisión de presentación (qué se muestra en el menú): la protección real de cada módulo futuro sigue viviendo en `requireCapability`/RLS cuando ese módulo se implemente, nunca únicamente en que su entrada de menú esté oculta (constitución: "nunca confiar únicamente en validaciones del frontend").
