-- NOTE: change to your own passwords for production environments
\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER supabase_auth_admin WITH PASSWORD :'pgpass';
ALTER USER supabase_storage_admin WITH PASSWORD :'pgpass';
-- supabase_functions_admin y pgbouncer no se ajustan: Edge Functions y el
-- pooler quedan fuera de alcance de esta feature (ver plan.md, 8 servicios).
