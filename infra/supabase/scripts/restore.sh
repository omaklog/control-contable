#!/usr/bin/env bash
# infra/supabase/scripts/restore.sh
#
# Restaura un respaldo generado por backup.sh sobre un entorno nuevo o vacío
# (base de datos + archivos de Storage). Ver
# specs/002-supabase-docker-stack/contracts/backup-restore-cli.md.
#
# Uso: ./scripts/restore.sh --file ARCHIVO_DE_RESPALDO
set -euo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$COMPOSE_DIR"

# shellcheck disable=SC1091
[[ -f .env ]] && source .env

FILE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --file)
      FILE="$2"
      shift 2
      ;;
    *)
      echo "Uso: restore.sh --file ARCHIVO_DE_RESPALDO" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$FILE" ]]; then
  echo "Error: falta --file ARCHIVO_DE_RESPALDO" >&2
  exit 1
fi
if [[ ! -f "$FILE" ]]; then
  echo "Error: no existe el archivo de respaldo: $FILE" >&2
  exit 1
fi

FILE_ABS="$(cd "$(dirname "$FILE")" && pwd)/$(basename "$FILE")"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

DB_NAME="${POSTGRES_DB:-postgres}"
STORAGE_VOLUME="control-contable-supabase_storage-data"

echo "[restore] Extrayendo $FILE_ABS..."
tar xzf "$FILE_ABS" -C "$WORKDIR"

if [[ ! -f "$WORKDIR/db.sql.gz" || ! -f "$WORKDIR/storage.tar.gz" ]]; then
  echo "Error: el archivo de respaldo no contiene db.sql.gz y storage.tar.gz" >&2
  exit 1
fi

echo "[restore] Restaurando base de datos ($DB_NAME)..."
# -U supabase_admin: mismo rol usado por backup.sh para volcar (ver ese script);
# "postgres" no es superusuario en la imagen supabase/postgres.
gunzip -c "$WORKDIR/db.sql.gz" | docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" db psql -U supabase_admin -d "$DB_NAME" -v ON_ERROR_STOP=1

echo "[restore] Restaurando volumen de storage ($STORAGE_VOLUME)..."
# --xattrs / debian:bookworm-slim: ver nota en backup.sh — necesario para que
# Storage API pueda volver a servir los archivos restaurados.
docker run --rm \
  -v "$STORAGE_VOLUME":/data \
  -v "$WORKDIR":/backup:ro \
  debian:bookworm-slim sh -c "rm -rf /data/* && tar --xattrs --xattrs-include='*' -xzf /backup/storage.tar.gz -C /data"

echo "[restore] Restauración completa desde $FILE_ABS"
