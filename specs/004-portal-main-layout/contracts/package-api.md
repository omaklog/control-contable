# Contrato: cambios a `@control-contable/auth`

**Feature**: [../spec.md](../spec.md)

Esta feature solo agrega un campo a un tipo ya existente — no cambia ninguna firma de función.

```ts
export interface CurrentProfile {
  id: string
  role: AppRole
  isActive: boolean
  fullName: string | null
  mustChangePassword: boolean
  capabilities: Capability[]
  email: string // NUEVO — ver research.md #4
}
```

## Garantías del contrato

- `email` proviene de `supabase.auth.getUser()`, ya consultado dentro de `getCurrentProfile()` — su adición no introduce una consulta ni una llamada de red adicional.
- Ninguna función existente (`requireApp`, `requireCapability`) cambia de firma; ambas siguen devolviendo `CurrentProfile`, ahora con el campo adicional disponible para quien lo consuma (en este caso, `apps/portal/src/app/(app)/layout.tsx`).
- Este campo es de solo lectura desde la perspectiva de esta feature: no se agrega ninguna forma de que el usuario cambie su propio correo a través del layout.
