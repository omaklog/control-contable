# Contrato de interfaz: endpoints internos del entorno

**Feature**: [../spec.md](../spec.md)

Cumple FR-005 (acceso restringido a red interna/VPN) y documenta lo que el gateway Kong expone hacia el resto del sistema.

| Ruta (vía Kong)        | Servicio upstream | Consumido por                                      | Red de acceso                           |
| ---------------------- | ----------------- | -------------------------------------------------- | --------------------------------------- |
| `/rest/v1/*`           | PostgREST         | `apps/admin`, `apps/portal`                        | Interna / VPN·Tailscale (nunca pública) |
| `/auth/v1/*`           | GoTrue (Auth)     | `apps/admin`, `apps/portal`                        | Interna / VPN·Tailscale                 |
| `/storage/v1/*`        | Storage API       | `apps/admin`, `apps/portal`                        | Interna / VPN·Tailscale                 |
| `/realtime/v1/*`       | Realtime          | `apps/admin`, `apps/portal` (si aplica)            | Interna / VPN·Tailscale                 |
| `/pg/*`                | postgres-meta     | Supabase Studio (uso interno, solo `service_role`) | Interna / VPN·Tailscale                 |
| Studio (puerto propio) | Supabase Studio   | Persona de infraestructura                         | Interna / VPN·Tailscale                 |

## Garantías del contrato

- Ninguna de estas rutas se publica en la interfaz WAN del servidor (ver `research.md` §4).
- El conjunto de rutas replica el mismo espacio de nombres (`/rest/v1`, `/auth/v1`, `/storage/v1`) que ya usa el SDK `@supabase/supabase-js` contra el entorno de desarrollo local — no se requiere lógica distinta en las apps para hablar con el entorno autoalojado (ver `env-contract.md`).
