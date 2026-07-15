# Contrato de configuración: apps → entorno self-hosted

**Feature**: [../spec.md](../spec.md)

Cumple FR-008: las aplicaciones `admin` y `portal` deben poder apuntar al entorno autoalojado únicamente mediante configuración, sin cambios de código — el mismo contrato de variables que ya usan hoy contra el Supabase local (CLI), solo con valores distintos.

## Variables que consumen `apps/admin` y `apps/portal`

| Variable                        | Origen                                                    | Descripción                                                      |
| ------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL pública del gateway Kong del entorno autoalojado      | Reemplaza el `http://127.0.0.1:54321` usado en desarrollo local. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave `anon` generada al configurar `infra/supabase/.env` | Igual rol que la key `anon` que hoy entrega `supabase status`.   |
| `SUPABASE_SERVICE_ROLE_KEY`     | Llave `service_role` generada en `infra/supabase/.env`    | Solo para uso de servidor (nunca expuesta al cliente).           |

Estas variables se colocan en `apps/admin/.env.local` y `apps/portal/.env.local`, siguiendo el mismo patrón que `apps/*/.env.local.example` ya documentado en el README del proyecto — no se requiere ningún cambio en el código de las aplicaciones para apuntar al entorno autoalojado en lugar del entorno de desarrollo local.

## Variables internas del stack (`infra/supabase/.env`)

No consumidas directamente por las apps, pero necesarias para levantar el entorno (ver `research.md` §6 para la política de gestión de secretos):

| Variable            | Descripción                                                         |
| ------------------- | ------------------------------------------------------------------- |
| `POSTGRES_PASSWORD` | Contraseña del superusuario de Postgres.                            |
| `JWT_SECRET`        | Secreto compartido para firmar/verificar los JWT emitidos por Auth. |
| `ANON_KEY`          | JWT con rol `anon`, expuesto a clientes (ver tabla anterior).       |
| `SERVICE_ROLE_KEY`  | JWT con rol `service_role`, solo backend.                           |
| `KONG_API_PORT`     | Puerto interno/VPN donde se publica el gateway.                     |
| `STUDIO_PORT`       | Puerto interno/VPN donde se publica Supabase Studio.                |

## Garantías del contrato

- Los nombres y el significado de `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` son idénticos a los que ya usan las apps contra el Supabase de desarrollo local — solo cambia el valor.
- Ningún valor real de estas variables se versiona en git; `infra/supabase/.env.example` documenta cada nombre sin secretos reales, igual que `apps/*/.env.local.example`.
