# Contrato de interfaz: scripts de respaldo/restauración/verificación

**Feature**: [../spec.md](../spec.md)

Cumple FR-003, FR-004 y FR-007. Estos scripts viven en `infra/supabase/scripts/` y son la interfaz que usa tanto el cron diario como la persona de infraestructura (Historias 2 y 3).

## `backup.sh`

```text
Uso: backup.sh [--out DIR]
Ejecuta un respaldo completo (dump de la base de datos + archivo del volumen de storage),
empaquetados en un único archivo backup-YYYYMMDD-HHMMSS.tar.gz (contiene db.sql.gz y storage.tar.gz)
en DIR (por defecto BACKUP_OUTPUT_DIR, ./backups). La marca de tiempo permite orden cronológico y purga.
Invocado sin argumentos por el cron diario; invocado igual manualmente para respaldo a demanda (Historia 3).

Salida:
  0  Respaldo generado correctamente.
  >0 Fallo (base de datos no disponible, espacio insuficiente, etc.) — no debe dejar un respaldo parcial/corrupto.
```

## `restore.sh`

```text
Uso: restore.sh --file ARCHIVO_DE_RESPALDO
Restaura un respaldo previamente generado por backup.sh sobre un entorno nuevo o vacío.

Salida:
  0  Restauración completa; datos y archivos disponibles.
  >0 Fallo — el entorno destino no debe quedar en un estado parcialmente restaurado sin aviso explícito.
```

## `prune-backups.sh`

```text
Uso: prune-backups.sh [--retention-days N]  (default: 30, según constitución del proyecto)
Elimina los respaldos más antiguos que el umbral de retención.
Invocado por el mismo cron diario, después de backup.sh.
```

## `healthcheck.sh`

```text
Uso: healthcheck.sh
Reporta, por cada componente del entorno (db, kong, auth, rest, storage, realtime, meta, studio),
si está: running-healthy / running-unhealthy / stopped.

Salida:
  0  Todos los componentes running-healthy.
  1  Al menos un componente no está running-healthy (permite scripting/alertas simples).
```

## Garantías del contrato

- Todos los scripts son idempotentes en caso de reintento tras un fallo (no dejan estado corrupto a mitad de camino).
- Los nombres de archivo de respaldo son ordenables cronológicamente por texto (permite que `prune-backups.sh` decida qué borrar sin parsear metadatos adicionales).
- Ninguno de estos scripts requiere que las aplicaciones `admin`/`portal` estén corriendo — son independientes del ciclo de vida de las apps.

## Nota de implementación: estrategia de dos niveles para `db.sql.gz`

Validado end-to-end (levantar → respaldar → destruir volúmenes → restaurar), `backup.sh` genera el volcado de base de datos en dos partes para evitar que las extensiones internas de Supabase (`pgsodium`, `supabase_vault`, `pg_graphql`) rompan un `pg_dump --clean` genérico:

1. Esquema `public` (tablas propias del despacho): dump completo (esquema + datos), con `--clean --if-exists`.
2. Esquemas provistos por Supabase (`auth`, `storage`, `realtime`, `_realtime`): solo datos (`--data-only --disable-triggers`), excluyendo las tablas de control de versión de esquema (`auth.schema_migrations`, `storage.migrations`) que cada servicio repuebla por sí mismo en cada arranque.

Ambas partes se concatenan en un único `db.sql.gz` dentro del archivo de respaldo. El respaldo del volumen de storage usa `tar --xattrs` (imagen `debian:bookworm-slim`, no `alpine`, porque el `tar` de busybox no soporta atributos extendidos) — sin esto, Storage API no puede volver a servir los archivos restaurados (falla con `ENODATA`). `pg_dump`/`psql` se ejecutan como `supabase_admin`, no `postgres`, porque en la imagen `supabase/postgres` el rol `postgres` no es superusuario.
