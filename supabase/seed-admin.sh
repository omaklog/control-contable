#!/usr/bin/env bash
# supabase/seed-admin.sh
#
# Crea el primer usuario Administrador del sistema. Es un paso de arranque
# indispensable: el sistema no tiene autoregistro (FR-010), así que sin este
# script no existiría ninguna cuenta capaz de invitar a las demás.
#
# Uso:
#   SUPABASE_URL=http://127.0.0.1:54321 \
#   SUPABASE_SERVICE_ROLE_KEY=<service_role key de `supabase status`> \
#   DB_CONTAINER=supabase_db_control-contable \
#   ./supabase/seed-admin.sh admin@despacho.com "ContraseñaSegura123!"
#
# Por defecto usa la URL/llave estándar de `supabase start` en local y el
# nombre de contenedor que genera la CLI a partir de project_id en config.toml.
set -euo pipefail

EMAIL="${1:-}"
PASSWORD="${2:-}"

if [[ -z "$EMAIL" || -z "$PASSWORD" ]]; then
  echo "Uso: $0 <email> <password>" >&2
  exit 1
fi

SUPABASE_URL="${SUPABASE_URL:-http://127.0.0.1:54321}"
SUPABASE_SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU}"
DB_CONTAINER="${DB_CONTAINER:-supabase_db_control-contable}"

echo "[seed-admin] Creando usuario en Auth ($EMAIL)..."
RESPONSE="$(curl -sS -X POST "$SUPABASE_URL/auth/v1/admin/users" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"email_confirm\":true}")"

USER_ID="$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)"

if [[ -z "$USER_ID" ]]; then
  echo "[seed-admin] Error: no se pudo crear el usuario. Respuesta:" >&2
  echo "$RESPONSE" >&2
  exit 1
fi

echo "[seed-admin] Usuario creado con id $USER_ID. Creando perfil Administrador..."
docker exec -i "$DB_CONTAINER" psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c "insert into public.profiles (id, account_type, role, is_active) values ('$USER_ID', 'staff', 'administrador', true);"

echo "[seed-admin] Listo. $EMAIL ya puede iniciar sesión como Administrador en apps/admin."
