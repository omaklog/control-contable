---
description: 'Task list template for feature implementation'
---

# Tasks: Infraestructura Docker Autoalojada de Supabase

**Input**: Design documents from `/specs/002-supabase-docker-stack/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md (todos presentes)

**Tests**: No se solicitaron pruebas automatizadas explícitas en la spec. Para esta feature de infraestructura, el equivalente de "pruebas" son los healthchecks de cada servicio y la validación manual contra `quickstart.md`, incluidos como tareas propias de cada historia.

**Organization**: Las tareas están agrupadas por historia de usuario para permitir implementación y validación independiente de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: Historia de usuario a la que pertenece (US1, US2, US3)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Todas las rutas son relativas a la raíz del monorepo, dentro del nuevo directorio `infra/supabase/` (ver "Structure Decision" en `plan.md`). No se modifica `apps/`, `packages/`, ni el `docker-compose.yml` raíz existente (ese sigue siendo el flujo de desarrollo local vía Supabase CLI).

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Crear el esqueleto de archivos del entorno autoalojado.

- [x] T001 Crear la estructura de directorios y archivos vacíos `infra/supabase/docker-compose.yml`, `infra/supabase/.env.example`, `infra/supabase/kong.yml`, `infra/supabase/volumes/db/`, `infra/supabase/volumes/storage/`, `infra/supabase/scripts/` según la "Structure Decision" de `plan.md`
- [x] T002 [P] Agregar `infra/supabase/.env` al `.gitignore` de la raíz del repositorio (nunca versionar secretos reales) — ya cubierto por el patrón genérico `*.env` existente en `.gitignore`; verificado con `git check-ignore -v infra/supabase/.env`
- [x] T003 [P] Documentar en `infra/supabase/.env.example` las variables `POSTGRES_PASSWORD`, `JWT_SECRET`, `ANON_KEY`, `SERVICE_ROLE_KEY`, `KONG_API_PORT`, `STUDIO_PORT` (nombres y descripción, sin valores reales) según `contracts/env-contract.md`

**Checkpoint**: Esqueleto de archivos listo; ningún secreto real está versionado.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Levantar el stack completo (servicios, volúmenes, red, healthchecks) que las tres historias comparten. Ninguna historia es demostrable sin esto.

**⚠️ CRITICAL**: Ninguna historia de usuario puede validarse hasta que esta fase esté completa.

- [x] T004 Definir en `infra/supabase/docker-compose.yml` los servicios `db` (Postgres, alineado a `major_version = 15` de `supabase/config.toml`), `kong`, `auth` (GoTrue), `rest` (PostgREST), `storage`, `realtime`, `meta` y `studio`, cada uno con una etiqueta de imagen versionada explícita (nunca `latest`) según `research.md` §1 y §7 — versiones verificadas contra Docker Hub (misma generación, mayo 2024): `supabase/postgres:15.1.1.47`, `kong:2.8.1`, `supabase/gotrue:v2.151.0`, `postgrest/postgrest:v12.0.3`, `supabase/storage-api:v1.0.6`, `supabase/realtime:v2.28.36`, `supabase/postgres-meta:v0.80.1`, `supabase/studio:20240506-2976cd6`
- [x] T005 [P] Escribir `infra/supabase/kong.yml.template` con las rutas declarativas `/rest/v1`, `/auth/v1`, `/storage/v1`, `/realtime/v1` (+ `/pg/` para meta, uso interno de Studio) hacia sus servicios upstream, según `contracts/service-endpoints.md` — Kong 2.8.1 no soporta sustitución de variables de entorno en config declarativa, por lo que se agregó `infra/supabase/kong-entrypoint.sh` (resuelve la plantilla a `kong.yml` en el arranque) y se ajustó el servicio `kong` en `docker-compose.yml` para usarlo como entrypoint
- [x] T006 Agregar los volúmenes Docker nombrados `db-data` y `storage-data` en `infra/supabase/docker-compose.yml`, montados respectivamente en los servicios `db` y `storage` (depende de T004; ver `data-model.md` "Volumen de datos") — cumple FR-002
- [x] T007 Restringir en `infra/supabase/docker-compose.yml` la publicación de todos los puertos (Kong, Studio) a la interfaz de red interna/VPN·Tailscale del servidor, sin binding a `0.0.0.0` (depende de T004; ver `research.md` §4) — cumple FR-005 y la regla de constitución "nunca exponer el servidor a Internet"; parametrizado vía `BIND_ADDRESS` (default `127.0.0.1` para validación local, se fija a la IP interna/VPN real en el `.env` del servidor)
- [x] T008 Agregar bloques `healthcheck:` en `infra/supabase/docker-compose.yml` para `db` (`pg_isready`), `kong` (`kong health`), `auth` (`/health`), `rest`, `storage` (`/status`), `realtime` y `meta` (TCP) y `studio` (`/api/profile`) (depende de T004; ver `research.md` §8) — cumple FR-004

**Checkpoint**: `docker compose config` valida sin errores; `docker compose up -d` levantó los ocho servicios y los ocho reportan `healthy`. Verificado end-to-end: `rest/v1` exige `apikey` (401 sin ella, 200 con `anon`), `auth/v1/health` → 200, `storage/v1/status` → 200 (abierta, sin key-auth), `/pg/` (meta) exige `apikey` y solo acepta `service_role` (401 sin ella, 200 con `service_role`). Kong y Studio publican sus puertos únicamente en `127.0.0.1` (placeholder de `BIND_ADDRESS`), confirmando FR-005.

---

## Phase 3: User Story 1 - Levantar el entorno de backend en el servidor del despacho (Priority: P1) 🎯 MVP

**Goal**: Un único procedimiento levanta todo el backend (base de datos, API, autenticación, storage) de forma autoalojada, y las apps `admin`/`portal` pueden conectarse solo por configuración.

**Independent Test**: Levantar el entorno desde cero y verificar que los cuatro componentes quedan disponibles y responden, sin depender de datos reales de clientes (ver `quickstart.md` "Historia 1").

### Implementation for User Story 1

- [x] T009 [US1] Implementar `infra/supabase/scripts/healthcheck.sh`: agrega `docker compose ps` con una verificación puntual de cada endpoint y reporta por servicio `running-healthy` / `running-unhealthy` / `stopped`, con código de salida 0/1, según `contracts/backup-restore-cli.md` — probado forzando `docker compose stop meta` (reporta `stopped`, exit 1) y en estado sano (exit 0)
- [x] T010 [US1] Documentar en `infra/supabase/README.md` el procedimiento único y repetible de arranque (`docker compose up -d` + `./scripts/healthcheck.sh`) — cumple FR-003
- [x] T011 [US1] Validar manualmente de extremo a extremo a nivel de API (auth + REST + storage): se creó un usuario vía `/auth/v1/admin/users`, se inició sesión vía `/auth/v1/token?grant_type=password` obteniendo un JWT real, se insertó y leyó un registro vía `/rest/v1/` respetando RLS (rol `authenticated`), y se subió/descargó un archivo vía `/storage/v1/object` con contenido idéntico — Acceptance Scenario 3 verificado. **Nota de alcance**: no se ejecutó a través de la UI de `apps/admin`/`apps/portal` porque su lógica de login (feature `003-supabase-auth-roles`) aún no está implementada; `contracts/env-contract.md` confirma que las apps usan exactamente estos mismos nombres de variable, por lo que apuntar su `.env.local` a este entorno no requiere cambios de código una vez esa feature exista.

**Checkpoint**: La Historia 1 es completamente funcional y demostrable de forma independiente (MVP) a nivel de infraestructura/API.

---

## Phase 4: User Story 2 - Detener, reiniciar y actualizar el entorno sin pérdida de datos (Priority: P2)

**Goal**: Detener/reiniciar el entorno completo sin perder información, y poder verificar el estado de cada componente.

**Independent Test**: Detener y reiniciar el entorno con datos de prueba cargados, confirmando que persisten y que el estado de cada componente es verificable (ver `quickstart.md` "Historia 2").

### Implementation for User Story 2

- [x] T012 [US2] Documentar en `infra/supabase/README.md` el procedimiento de detención y reinicio controlado (`docker compose down` / `docker compose up -d`), reutilizando `./scripts/healthcheck.sh` (T009) para confirmar la recuperación de estado — cumple FR-003 y FR-004
- [x] T013 [US2] Validar manualmente: con los datos de prueba de la Historia 1 (fila en `smoke_test`, archivo `test-bucket/smoke.txt`), se ejecutó `docker compose down` (sin `-v`) seguido de `docker compose up -d`; los volúmenes `db-data`/`storage-data` persistieron, los 8 servicios volvieron a `running-healthy` en ~1s (`healthcheck.sh`, muy por debajo de SC-004) y tanto la fila de la tabla como el archivo de Storage se confirmaron intactos vía API tras el reinicio — Acceptance Scenarios 1-3 de la Historia 2 verificados (SC-002, SC-004)

**Checkpoint**: Las Historias 1 y 2 funcionan de forma independiente.

---

## Phase 5: User Story 3 - Respaldo y restauración de la información del despacho (Priority: P3)

**Goal**: Generar y restaurar copias de respaldo completas (base de datos + archivos), tanto de forma automática diaria como a demanda.

**Independent Test**: Generar un respaldo con datos de prueba, simular una pérdida en un entorno separado, y restaurar verificando que la información se recupera por completo (ver `quickstart.md` "Historia 3").

### Implementation for User Story 3

- [x] T014 [P] [US3] Implementar `infra/supabase/scripts/backup.sh` (`--out DIR` opcional): genera un `pg_dump` del servicio `db` y empaqueta (`tar --xattrs`) el volumen `storage-data`, nombrando el archivo resultante con marca de tiempo `YYYYMMDD-HHMMSS`, según `contracts/backup-restore-cli.md` y `data-model.md` "Copia de respaldo". Implementado con la estrategia de dos niveles documentada en la "Nota de implementación" del contrato (dump completo de `public` + datos-solo de `auth`/`storage`/`realtime`/`_realtime` excluyendo tablas de migración), usando `supabase_admin` (no `postgres`) y la imagen `debian:bookworm-slim` para el `tar` del volumen
- [x] T015 [P] [US3] Implementar `infra/supabase/scripts/restore.sh --file ARCHIVO`: restaura un respaldo generado por `backup.sh` sobre un entorno nuevo o vacío, según `contracts/backup-restore-cli.md`
- [x] T016 [P] [US3] Implementar `infra/supabase/scripts/prune-backups.sh --retention-days N` (default 30): elimina respaldos más antiguos que el umbral de retención, según `contracts/backup-restore-cli.md` y la sección "Backups automáticos" de la constitución
- [x] T017 [US3] Configurar y documentar en `infra/supabase/README.md` una entrada de cron diaria que invoque `./scripts/backup.sh` seguido de `./scripts/prune-backups.sh` sin intervención manual (depende de T014 y T016) — cumple FR-007 y SC-006
- [x] T018 [US3] Validado end-to-end en un ciclo completo real (no solo revisión): se generó un respaldo con datos de prueba (fila en `smoke_test`, usuario de auth, archivo en Storage), se destruyeron los volúmenes (`docker compose down -v`) simulando pérdida total, se recreó el entorno (`up -d`) y se ejecutó `restore.sh` — exit 0 en ~2s. Se confirmaron los tres tipos de dato recuperados: fila de tabla vía REST, login del usuario vía Auth (200), y descarga del archivo vía Storage (200, contenido idéntico) — Acceptance Scenarios 1-2 de la Historia 3 verificados, muy por debajo del objetivo de 30 minutos (SC-003)

**Checkpoint**: Las tres historias funcionan de forma independiente.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Verificaciones finales que abarcan más de una historia.

- [x] T019 [P] Completar `infra/supabase/README.md` con una sección de introducción que enlace los procedimientos de arranque (US1), detención/reinicio (US2) y respaldo/restauración (US3), y referencie `contracts/env-contract.md`, `contracts/backup-restore-cli.md` y `contracts/service-endpoints.md` — agregada sección "Referencias" al final del README
- [x] T020 Verificado: `docker compose ps` muestra que solo `kong` y `studio` publican puertos, ambos enlazados a `BIND_ADDRESS` (`127.0.0.1` en esta validación); una prueba de conexión desde la IP de la red LAN de la máquina (`192.168.1.75:8000` y `:8082`) fue rechazada (`Connection refused`), confirmando que el binding a `127.0.0.1` realmente restringe el acceso y no es solo una etiqueta — SC-005 verificado. En el servidor real del despacho, `BIND_ADDRESS` se fija a la IP interna/VPN en lugar de `127.0.0.1`.
- [x] T021 **Parcialmente verificable en esta sesión**: no es posible observar 30 días reales de operación continua. Se verificó en su lugar el mecanismo de retención de `prune-backups.sh` de forma sintética: se crearon archivos `backup-*.tar.gz` con fechas de modificación de hace 40, 35 y 10 días, y `./scripts/prune-backups.sh --retention-days 30` eliminó correctamente los dos archivos de más de 30 días y conservó el reciente. La verificación de "un respaldo por cada día sin huecos" durante 30 días reales de cron queda pendiente de observación en operación real (ver `README.md`, sección de cron).
- [x] T022 Actualizar la sección "Comandos de Supabase" y el árbol de "Estructura del monorepo" del `README.md` raíz para referenciar el nuevo flujo autoalojado en `infra/supabase/` junto al flujo de desarrollo local existente vía Supabase CLI, evitando confusión entre ambos

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Sin dependencias — puede iniciar de inmediato.
- **Foundational (Phase 2)**: Depende de Setup — BLOQUEA las tres historias de usuario.
- **User Stories (Phase 3-5)**: Todas dependen de que Foundational esté completo.
  - Pueden avanzar en paralelo o en orden de prioridad (US1 → US2 → US3).
- **Polish (Phase 6)**: Depende de que las historias que se quieran cubrir estén completas (T020/T021 requieren al menos T007 y T017 respectivamente).

### User Story Dependencies

- **US1 (P1)**: Puede iniciar tras Foundational. Sin dependencia de otras historias.
- **US2 (P2)**: Puede iniciar tras Foundational. Reutiliza `healthcheck.sh` (T009, creado en US1) pero es independientemente verificable con sus propios criterios de aceptación.
- **US3 (P3)**: Puede iniciar tras Foundational. Independiente de US1/US2 en su lógica (los scripts de respaldo no requieren que las apps estén conectadas), aunque su validación de extremo a extremo es más significativa una vez que US1 ya cargó datos de prueba.

### Within Each User Story

- US1: T009 (script) → T010 (documentación) → T011 (validación, depende de T009/T010 y de Foundational completo)
- US2: T012 (documentación, reutiliza T009) → T013 (validación)
- US3: T014, T015, T016 en paralelo (archivos distintos) → T017 (depende de T014 y T016) → T018 (validación, depende de T014-T017)

### Parallel Opportunities

- T002 y T003 (Setup) en paralelo tras T001.
- T005 (kong.yml) en paralelo con T004 dentro de Foundational (archivo distinto, sin dependencia).
- T014, T015 y T016 (scripts de US3) en paralelo entre sí (archivos distintos).
- US1, US2 y US3 pueden trabajarse en paralelo por personas distintas una vez completada la fase Foundational, aunque US2/US3 ganan realismo si se validan después de que US1 ya cargó datos de prueba.

---

## Parallel Example: Foundational

```bash
# Una vez T004 (servicios base) está en curso, este archivo independiente puede avanzar en paralelo:
Task: "Escribir infra/supabase/kong.yml con las rutas declarativas del gateway"
```

## Parallel Example: User Story 3

```bash
# Los tres scripts son archivos distintos sin dependencias entre sí:
Task: "Implementar infra/supabase/scripts/backup.sh"
Task: "Implementar infra/supabase/scripts/restore.sh"
Task: "Implementar infra/supabase/scripts/prune-backups.sh"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (CRÍTICO — bloquea las tres historias)
3. Completar Phase 3: User Story 1
4. **DETENERSE Y VALIDAR**: confirmar la Historia 1 de forma independiente contra `quickstart.md`
5. Con esto el entorno ya es operable para desarrollo/pruebas de las apps `admin`/`portal`

### Incremental Delivery

1. Setup + Foundational → entorno base listo
2. - US1 → entorno operable, apps conectadas (MVP)
3. - US2 → operación diaria segura (detener/reiniciar sin pérdida de datos)
4. - US3 → continuidad ante fallas (respaldo automático diario + restauración)
5. - Polish → verificación de exposición de red y de la política de retención a 30 días

---

## Notes

- No se generaron tareas de "pruebas automatizadas" porque la spec no las solicitó explícitamente; el equivalente para esta feature de infraestructura son las tareas de validación manual contra `quickstart.md` (T011, T013, T018, T020, T021), consistente con la Constitution Check de `plan.md`.
- `infra/supabase/` es un directorio nuevo; no se modifica el `docker-compose.yml` raíz existente (flujo de desarrollo local vía Supabase CLI), salvo la actualización de referencia en el README raíz (T022).
- Ningún secreto real se versiona: `infra/supabase/.env` queda excluido desde T002; solo `.env.example` se versiona.
