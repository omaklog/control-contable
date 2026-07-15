#!/usr/bin/env bash
# infra/supabase/scripts/healthcheck.sh
#
# Reporta, por cada componente del entorno self-hosted, si está
# running-healthy / running-unhealthy / stopped. Ver
# specs/002-supabase-docker-stack/contracts/backup-restore-cli.md.
#
# Uso: ./scripts/healthcheck.sh
# Salida: 0 si todos los componentes están running-healthy; 1 en caso contrario.
set -euo pipefail

SCRIPT_DIR="$(CDPATH="" cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="$(dirname "$SCRIPT_DIR")"
cd "$COMPOSE_DIR"

SERVICES=(db auth rest storage realtime meta studio kong)
overall_status=0

printf '%-10s %s\n' "SERVICIO" "ESTADO"
printf '%-10s %s\n' "--------" "------"

for service in "${SERVICES[@]}"; do
  container_id=$(docker compose ps -q "$service" 2>/dev/null || true)

  if [[ -z "$container_id" ]]; then
    printf '%-10s %s\n' "$service" "stopped"
    overall_status=1
    continue
  fi

  running=$(docker inspect --format='{{.State.Running}}' "$container_id" 2>/dev/null || echo "false")
  if [[ "$running" != "true" ]]; then
    printf '%-10s %s\n' "$service" "stopped"
    overall_status=1
    continue
  fi

  health=$(docker inspect --format='{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$container_id" 2>/dev/null || echo "unknown")
  case "$health" in
    healthy)
      printf '%-10s %s\n' "$service" "running-healthy"
      ;;
    none)
      # Servicio sin healthcheck propio definido: se reporta running.
      printf '%-10s %s\n' "$service" "running (sin healthcheck)"
      ;;
    *)
      printf '%-10s %s\n' "$service" "running-unhealthy ($health)"
      overall_status=1
      ;;
  esac
done

exit $overall_status
