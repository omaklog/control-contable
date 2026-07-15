# Implementation Plan: Infraestructura Docker Autoalojada de Supabase

**Branch**: `002-supabase-docker-stack` | **Date**: 2026-07-14 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-supabase-docker-stack/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Desplegar, mediante Docker Compose, el stack self-hosted de Supabase (Postgres, gateway API/Kong, Auth/GoTrue, PostgREST, Storage API, Realtime, Studio) en el servidor local del despacho, con volúmenes persistentes para base de datos y archivos, respaldo automático diario (retención ≥30 días) más respaldo/restauración bajo demanda, y acceso restringido a la red interna / VPN·Tailscale — sin exposición directa a Internet. El enfoque técnico se basa en la referencia oficial de self-hosting de Supabase (imágenes versionadas explícitamente, no `latest`), adaptada a las convenciones de este monorepo (gestión de secretos vía `.env` no versionado, igual que `apps/*/.env.local`).

## Technical Context

**Language/Version**: N/A (no es una aplicación de código); Bash para scripts de orquestación/respaldo (compatible con el resto del repo, que ya usa scripts `sh`/bash en `.specify/scripts`).

**Primary Dependencies**: Docker Engine + Docker Compose v2; imágenes oficiales del stack self-hosted de Supabase (`postgres`, `kong`, `gotrue`, `postgrest`, `storage-api`, `realtime`, `studio`, `postgres-meta`), versionadas de forma explícita y alineadas con Postgres 15 (mismo `major_version` que `supabase/config.toml`).

**Storage**: PostgreSQL sobre volumen Docker nombrado `db-data`; Supabase Storage con backend de sistema de archivos sobre volumen Docker nombrado `storage-data`. Sin dependencia de un proveedor de nube.

**Testing**: Sin pruebas unitarias de código de aplicación (no aplica); validación mediante healthchecks de cada servicio, un script de smoke-test (verifica cada endpoint expuesto) y una prueba de restauración de respaldo en un entorno limpio (ver `quickstart.md`).

**Target Platform**: Servidor Linux del despacho (servidor local), alcanzable únicamente desde la red interna o mediante VPN/Tailscale.

**Project Type**: Infraestructura (stack de contenedores), no una aplicación `apps/*` del monorepo.

**Performance Goals**: No hay metas de rendimiento propias más allá de los criterios de éxito de la spec (arranque completo < 15 min, restauración completa < 30 min, verificación de estado < 1 min).

**Constraints**: Sin exposición directa a Internet (constitución + FR-005); respaldo automático diario con retención ≥30 días (constitución, sección "Backups automáticos" + FR-007); credenciales/secretos fuera del control de versiones (FR-006); apps `admin`/`portal` deben poder apuntar a este entorno solo por configuración, sin cambios de código (FR-008).

**Scale/Scope**: Un único servidor destino, escala de un despacho contable individual (ver Assumptions de la spec); sin alta disponibilidad multi-servidor en este alcance.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principio (constitución)                                               | Aplica a esta feature | Estado                                                                                                                                                                                                                                                        |
| ---------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Infraestructura: Docker, Docker Compose, servidor local, VPN/Tailscale | Sí                    | PASS — es el objeto mismo de la feature.                                                                                                                                                                                                                      |
| Backend: Supabase, PostgreSQL, Storage de Supabase                     | Sí                    | PASS — se usa el stack oficial self-hosted de Supabase.                                                                                                                                                                                                       |
| Seguridad: nunca exponer el servidor a Internet                        | Sí                    | PASS — FR-005 + decisión de research sobre binding de puertos solo a red interna/VPN.                                                                                                                                                                         |
| Seguridad: nunca contraseñas en texto plano / cifrado de credenciales  | Sí                    | PASS — FR-006 + decisión de research sobre `.env` no versionado.                                                                                                                                                                                              |
| Seguridad: siempre HTTPS                                               | Sí                    | PASS — resuelto en research.md (TLS terminado en la capa VPN/Tailscale o proxy interno), dado que no hay hostname público.                                                                                                                                    |
| Seguridad: backups automáticos diarios, retención ≥30 días             | Sí                    | **Corregido**: la spec original asumía respaldo manual/on-demand; se actualizó `spec.md` (Assumptions, FR-007, SC-006) para exigir respaldo automático diario + retención ≥30 días, alineado con la constitución. Sin esto habría sido una violación de gate. |
| Base de Datos: trazabilidad, soft delete                               | No aplica             | N/A — son reglas de esquema de aplicación (features de negocio), no de esta infraestructura de contenedores.                                                                                                                                                  |
| Testing: pruebas unitarias/integración para procesos críticos          | Parcial               | PASS (adaptado) — para infraestructura, la validación equivalente es healthchecks + smoke-test + prueba de restauración, documentada en `quickstart.md`.                                                                                                      |

No quedan violaciones sin justificar tras la corrección anterior. No se requiere completar `Complexity Tracking`.

**Re-check post-diseño (Fase 1)**: `research.md`, `data-model.md`, `contracts/` y `quickstart.md` concretan cada fila de la tabla anterior (red interna/VPN, `.env` no versionado, respaldo automático diario con retención ≥30 días, healthchecks por servicio) sin introducir servicios ni dependencias adicionales. La tabla se mantiene sin cambios: PASS.

## Project Structure

### Documentation (this feature)

```text
specs/002-supabase-docker-stack/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
infra/
└── supabase/
    ├── docker-compose.yml       # Stack self-hosted: db, kong, auth, rest, storage, realtime, meta, studio
    ├── .env.example             # Plantilla documentada de variables/secretos (patrón ya usado en apps/*/.env.local.example)
    ├── kong.yml                 # Configuración declarativa del gateway (rutas API/Auth/Storage/Realtime)
    ├── volumes/
    │   └── db/                  # Scripts de inicialización de Postgres (roles, jwt, esquema realtime)
    │                            # (los datos persistentes usan volúmenes Docker nombrados `db-data`/`storage-data`,
    │                            #  no un bind-mount adicional para storage — ver data-model.md)
    └── scripts/
        ├── backup.sh            # Respaldo completo (db + storage), invocado por cron y a demanda
        ├── restore.sh           # Restauración de un respaldo sobre un entorno nuevo/vacío
        ├── healthcheck.sh       # Verificación de estado de todos los componentes
        └── prune-backups.sh     # Rotación/retención (elimina respaldos > 30 días)

docker-compose.yml            # Sin cambios: sigue siendo la referencia de servicios auxiliares para desarrollo local (ya existente)
```

**Structure Decision**: Se crea un directorio nuevo `infra/supabase/` en la raíz del monorepo, separado del `docker-compose.yml` raíz existente (que documenta el flujo de _desarrollo local_ vía Supabase CLI y queda intacto). `infra/supabase/` contiene el stack _self-hosted_ de producción/operación real para el servidor del despacho, siguiendo la disposición de archivos de la referencia oficial de self-hosting de Supabase (`docker-compose.yml` + `.env` + `volumes/` + `kong.yml`), más los scripts de respaldo/restauración/verificación exigidos por FR-003, FR-004 y FR-007. No se toca la estructura de `apps/` ni `packages/`; las apps solo consumen este entorno mediante variables de entorno (FR-008), documentado en `contracts/env-contract.md`.

## Complexity Tracking

> No hay violaciones de la Constitution Check sin justificar. Esta sección no aplica.
