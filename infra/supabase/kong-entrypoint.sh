#!/bin/sh
# infra/supabase/kong-entrypoint.sh
#
# Kong 2.8.1 no sustituye variables de entorno dentro de la configuración
# declarativa (a diferencia de versiones más recientes de Kong). Este script
# resuelve kong.yml.template -> kong.yml reemplazando los placeholders
# $SUPABASE_ANON_KEY y $SUPABASE_SERVICE_KEY por su valor real antes de
# arrancar Kong con el comando por defecto de la imagen.
set -eu

TEMPLATE="/home/kong/kong.yml.template"
RESOLVED="/home/kong/kong.yml"

perl -pe '
  s/\$SUPABASE_ANON_KEY/$ENV{SUPABASE_ANON_KEY}/g;
  s/\$SUPABASE_SERVICE_KEY/$ENV{SUPABASE_SERVICE_KEY}/g;
' "$TEMPLATE" > "$RESOLVED"

exec /docker-entrypoint.sh kong docker-start
