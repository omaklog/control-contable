#!/usr/bin/env bash
# infra/supabase/scripts/prune-backups.sh
#
# Elimina los respaldos generados por backup.sh más antiguos que el umbral de
# retención (30 días por defecto, según la constitución del proyecto —
# sección "Backups automáticos"). Ver
# specs/002-supabase-docker-stack/contracts/backup-restore-cli.md.
#
# Uso: ./scripts/prune-backups.sh [--retention-days N]
set -euo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$COMPOSE_DIR"

# shellcheck disable=SC1091
[[ -f .env ]] && source .env

OUT_DIR="${BACKUP_OUTPUT_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --retention-days)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    *)
      echo "Uso: prune-backups.sh [--retention-days N]" >&2
      exit 1
      ;;
  esac
done

if [[ ! -d "$OUT_DIR" ]]; then
  echo "[prune-backups] No existe $OUT_DIR, nada que purgar."
  exit 0
fi

echo "[prune-backups] Eliminando respaldos con más de $RETENTION_DAYS días en $OUT_DIR..."
deleted=0
while IFS= read -r -d '' f; do
  echo "  eliminando $f"
  rm -f "$f"
  deleted=$((deleted + 1))
done < <(find "$OUT_DIR" -maxdepth 1 -name 'backup-*.tar.gz' -mtime "+$RETENTION_DAYS" -print0)

echo "[prune-backups] Respaldos eliminados: $deleted"
