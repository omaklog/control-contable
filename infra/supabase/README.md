# infra/supabase — Stack self-hosted de Supabase

Entorno de backend autoalojado (base de datos, API, autenticación y almacenamiento) para el servidor local del despacho. Ver la especificación completa en [`specs/002-supabase-docker-stack/`](../../specs/002-supabase-docker-stack/).

Este directorio es **independiente** del `docker-compose.yml` en la raíz del monorepo, que sigue siendo solo la referencia del flujo de _desarrollo local_ vía Supabase CLI (`supabase start` / `supabase stop`). `infra/supabase/` es el entorno de producción/operación real, pensado para correr en el servidor del despacho.

## Servicios incluidos

`db` (Postgres), `kong` (gateway API), `auth` (GoTrue), `rest` (PostgREST), `storage` (Storage API), `realtime`, `meta` (postgres-meta) y `studio` (Supabase Studio). Ver [`contracts/service-endpoints.md`](../../specs/002-supabase-docker-stack/contracts/service-endpoints.md) para el detalle de rutas.

## Arranque (Historia 1)

```bash
cd infra/supabase
cp .env.example .env
# Editar .env: generar POSTGRES_PASSWORD, JWT_SECRET, ANON_KEY, SERVICE_ROLE_KEY reales
# (ver contracts/env-contract.md) y ajustar BIND_ADDRESS a la IP interna/VPN del servidor.

docker compose up -d
./scripts/healthcheck.sh
```

`healthcheck.sh` reporta el estado de cada componente (`running-healthy` / `running-unhealthy` / `stopped`) y termina con código `0` solo si todos están saludables.

Una vez saludable, configura `apps/admin/.env.local` y `apps/portal/.env.local` con los valores de este entorno (mismos nombres de variable que ya usan hoy contra el Supabase de desarrollo local — ver [`contracts/env-contract.md`](../../specs/002-supabase-docker-stack/contracts/env-contract.md)); no se requiere ningún cambio de código en las apps.

## Detener y reiniciar (Historia 2)

```bash
docker compose down      # detención controlada; los volúmenes db-data/storage-data persisten
docker compose up -d     # reinicio
./scripts/healthcheck.sh # confirma que todos los componentes recuperaron su estado
```

Los datos de la base de datos y los archivos de Storage sobreviven a `docker compose down` porque viven en los volúmenes Docker nombrados `db-data` y `storage-data`, no en los contenedores. Solo `docker compose down -v` los elimina (úsalo únicamente para pruebas deliberadas de restauración, nunca en el servidor del despacho con datos reales).

## Respaldo y restauración (Historia 3)

```bash
./scripts/backup.sh                          # respaldo completo (db + storage), a demanda
./scripts/restore.sh --file backups/<archivo> # restaura un respaldo sobre un entorno nuevo/vacío
./scripts/prune-backups.sh                    # elimina respaldos más antiguos que BACKUP_RETENTION_DAYS (30 por defecto)
```

### Respaldo automático diario (FR-007)

La constitución del proyecto exige respaldo diario automático con retención ≥30 días. Programa una entrada de cron en el servidor del despacho (ajustando la ruta a donde esté clonado el repositorio):

```cron
# Respaldo diario a las 02:00, seguido de la purga de respaldos con más de 30 días
0 2 * * * cd /ruta/al/repo/infra/supabase && ./scripts/backup.sh >> /var/log/supabase-backup.log 2>&1 && ./scripts/prune-backups.sh >> /var/log/supabase-backup.log 2>&1
```

Ver [`contracts/backup-restore-cli.md`](../../specs/002-supabase-docker-stack/contracts/backup-restore-cli.md) para el contrato completo de cada script.

## Seguridad de red (FR-005)

Solo `kong` (puerto `KONG_API_PORT`) y `studio` (puerto `STUDIO_PORT`) publican puertos, y ambos se enlazan exclusivamente a `BIND_ADDRESS` (por defecto `127.0.0.1`, para poder validar el stack en una máquina de prueba). En el servidor real del despacho, `BIND_ADDRESS` debe fijarse a la IP de la interfaz interna/VPN·Tailscale — nunca `0.0.0.0` ni una IP pública. El resto de los servicios (`db`, `auth`, `rest`, `storage`, `realtime`, `meta`) no publican ningún puerto al host; solo son alcanzables entre sí dentro de la red Docker del proyecto.

## Referencias

- Especificación, plan y decisiones técnicas: [`specs/002-supabase-docker-stack/`](../../specs/002-supabase-docker-stack/) (`spec.md`, `plan.md`, `research.md`, `data-model.md`)
- Variables de entorno y qué consumen `apps/admin`/`apps/portal`: [`contracts/env-contract.md`](../../specs/002-supabase-docker-stack/contracts/env-contract.md)
- Interfaz de los scripts de respaldo/restauración/verificación: [`contracts/backup-restore-cli.md`](../../specs/002-supabase-docker-stack/contracts/backup-restore-cli.md)
- Rutas expuestas por el gateway Kong: [`contracts/service-endpoints.md`](../../specs/002-supabase-docker-stack/contracts/service-endpoints.md)
- Guía de validación paso a paso de las tres historias: [`quickstart.md`](../../specs/002-supabase-docker-stack/quickstart.md)
