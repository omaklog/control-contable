#!/usr/bin/env bash
# infra/supabase/scripts/backup.sh
#
# Genera un respaldo completo (base de datos + archivos de Storage) del
# entorno self-hosted, empaquetado en un único archivo con marca de tiempo.
# Invocado sin argumentos por el cron diario (ver README.md) o manualmente
# para un respaldo a demanda (Historia 3). Ver
# specs/002-supabase-docker-stack/contracts/backup-restore-cli.md.
#
# Uso: ./scripts/backup.sh [--out DIR]
set -euo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$COMPOSE_DIR"

# shellcheck disable=SC1091
[[ -f .env ]] && source .env

OUT_DIR="${BACKUP_OUTPUT_DIR:-./backups}"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --out)
      OUT_DIR="$2"
      shift 2
      ;;
    *)
      echo "Uso: backup.sh [--out DIR]" >&2
      exit 1
      ;;
  esac
done

mkdir -p "$OUT_DIR"
OUT_DIR_ABS="$(cd "$OUT_DIR" && pwd)"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

DB_NAME="${POSTGRES_DB:-postgres}"
STORAGE_VOLUME="control-contable-supabase_storage-data"
FINAL_ARCHIVE="$OUT_DIR_ABS/backup-$TIMESTAMP.tar.gz"

echo "[backup] Volcando base de datos ($DB_NAME)..."
# -U supabase_admin: en la imagen supabase/postgres, "postgres" NO es
# superusuario (ver docs de self-hosting, "remove-superuser-access");
# supabase_admin es el rol real con privilegios para volcar/restaurar objetos
# del sistema.
#
# Estrategia de dos niveles (evita los conflictos de --clean con extensiones
# como pgsodium/vault/pg_graphql, cuyas dependencias internas de funciones y
# triggers no se pueden recrear de forma segura con un dump genérico):
#   1) Esquema `public` (tablas propias del despacho): dump completo
#      (esquema + datos), porque nada de esto existe hasta que la aplicación
#      lo crea.
#   2) Esquemas provistos por Supabase (auth, storage, realtime, _realtime):
#      solo DATOS (--data-only), porque su estructura ya la crea la misma
#      imagen de Postgres en cada arranque (mismas versiones ancladas, ver
#      research.md §7) — solo hace falta reponer los datos de usuarios,
#      archivos y sesiones, no las tablas/funciones/extensiones en sí.
docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" db pg_dump -U supabase_admin -d "$DB_NAME" \
  --clean --if-exists --schema=public \
  > "$WORKDIR/db-public.sql"

# auth.schema_migrations y storage.migrations son tablas de control de
# versión de esquema: cada arranque de auth/storage las repuebla desde cero
# a partir de las migraciones embebidas en la propia imagen, por lo que
# incluirlas en el dump de datos solo produciría conflictos de clave
# duplicada contra un entorno recién inicializado (no representan
# información del despacho).
docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" db pg_dump -U supabase_admin -d "$DB_NAME" \
  --data-only --disable-triggers \
  --schema=auth --schema=storage --schema=realtime --schema=_realtime \
  --exclude-table=auth.schema_migrations \
  --exclude-table=storage.migrations \
  > "$WORKDIR/db-managed-data.sql"

cat "$WORKDIR/db-public.sql" "$WORKDIR/db-managed-data.sql" | gzip > "$WORKDIR/db.sql.gz"

echo "[backup] Empaquetando volumen de storage ($STORAGE_VOLUME)..."
# --xattrs: Storage API guarda metadatos (content-type, etc.) como atributos
# extendidos del archivo, no solo en la base de datos; sin --xattrs los
# archivos restaurados fallan al servirse (ENODATA). Se usa debian:bookworm-slim
# (GNU tar con --xattrs de fábrica) en vez de alpine (tar de busybox, sin
# --xattrs, y evita depender de la red para instalar paquetes en cada respaldo).
docker run --rm \
  -v "$STORAGE_VOLUME":/data:ro \
  -v "$WORKDIR":/backup \
  debian:bookworm-slim tar --xattrs --xattrs-include='*' -czf /backup/storage.tar.gz -C /data .

echo "[backup] Generando archivo final -> $FINAL_ARCHIVE"
tar czf "$FINAL_ARCHIVE" -C "$WORKDIR" db.sql.gz storage.tar.gz

echo "[backup] Respaldo completo: $FINAL_ARCHIVE"
