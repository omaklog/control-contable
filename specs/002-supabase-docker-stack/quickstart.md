# Quickstart de validación: Infraestructura Docker Autoalojada de Supabase

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Esta guía valida end-to-end las tres historias de usuario de la spec. No sustituye `tasks.md` (fase de implementación); asume que `infra/supabase/` ya existe con la estructura descrita en `plan.md`.

## Prerrequisitos

- Docker Engine + Docker Compose v2 instalados en el servidor del despacho (o una máquina equivalente para validación).
- Acceso a la red interna del despacho o a la VPN/Tailscale del servidor (ver Constraints en `plan.md`).
- `infra/supabase/.env.example` copiado a `infra/supabase/.env` con secretos reales generados (ver `contracts/env-contract.md`).

## Historia 1 — Levantar el entorno desde cero

```bash
cd infra/supabase
docker compose up -d
./scripts/healthcheck.sh   # espera hasta ver todos los componentes running-healthy
```

**Resultado esperado**: todos los servicios (`db`, `kong`, `auth`, `rest`, `storage`, `realtime`, `meta`, `studio`) quedan `running-healthy` en menos de 15 minutos (SC-001). Configurar `apps/admin/.env.local` y `apps/portal/.env.local` con los valores de `contracts/env-contract.md` y confirmar que ambas apps pueden autenticar un usuario de prueba, leer/escribir un registro y subir/descargar un archivo (Acceptance Scenario 3 de la Historia 1).

## Historia 2 — Detener, reiniciar y verificar estado sin pérdida de datos

```bash
# Con datos de prueba ya cargados desde la Historia 1:
docker compose down          # detención controlada
docker compose up -d         # reinicio
./scripts/healthcheck.sh
```

**Resultado esperado**: los mismos datos y archivos cargados antes de `docker compose down` siguen presentes y accesibles (SC-002); `healthcheck.sh` reporta el estado de cada componente en menos de 1 minuto (SC-004).

## Historia 3 — Respaldo y restauración

```bash
./scripts/backup.sh                       # respaldo manual a demanda
ls infra/supabase/backups/                # confirmar el archivo con marca de tiempo

# Simular pérdida en un entorno separado/limpio:
docker compose down -v                    # elimina volúmenes (solo en el entorno de prueba)
docker compose up -d
./scripts/restore.sh --file infra/supabase/backups/<archivo-generado>
```

**Resultado esperado**: tras la restauración, los datos y archivos previamente respaldados están disponibles tal como estaban al momento del respaldo (SC-003), en menos de 30 minutos.

## Validación del respaldo automático diario (FR-007, SC-006)

```bash
crontab -l | grep backup.sh   # confirmar que el cron diario está programado
./scripts/prune-backups.sh --retention-days 30
ls infra/supabase/backups/ | sort   # confirmar ausencia de huecos en las fechas de los últimos 30 días una vez en operación
```

## Validación de no exposición a Internet (FR-005, SC-005)

Desde una red externa (fuera de la interna/VPN del despacho), confirmar que ningún puerto del stack (Kong, Studio) responde. Solo debe responder desde dentro de la red interna o a través de la VPN/Tailscale.

## Referencias

- Variables y contrato de configuración: [contracts/env-contract.md](./contracts/env-contract.md)
- Interfaz de los scripts de respaldo/restauración: [contracts/backup-restore-cli.md](./contracts/backup-restore-cli.md)
- Rutas expuestas por el gateway: [contracts/service-endpoints.md](./contracts/service-endpoints.md)
- Entidades operativas: [data-model.md](./data-model.md)
- Decisiones técnicas: [research.md](./research.md)
