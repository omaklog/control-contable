# Research: Infraestructura Docker Autoalojada de Supabase

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## 1. Base del stack self-hosted

- **Decision**: Usar como base la referencia oficial de self-hosting de Supabase (servicios: `db` (Postgres), `kong` (API gateway), `auth`/GoTrue, `rest`/PostgREST, `storage`/Storage API, `realtime`, `meta`/postgres-meta, `studio`), en lugar de construir un stack propio desde cero.
- **Rationale**: Es la combinación de servicios mantenida por el propio proveedor, ya compatible con las librerías `@supabase/*` que usan `apps/admin` y `apps/portal`, y con el modelo de autenticación/roles definido en la feature `003-supabase-auth-roles` (RLS, JWT, `anon`/`service_role`). Adoptarla reduce el riesgo de incompatibilidades de protocolo con el cliente JS.
- **Alternatives considered**: Ensamblar un stack mínimo a mano (Postgres + PostgREST + GoTrue + MinIO) — rechazado porque duplica trabajo de integración que Supabase ya resuelve (enrutamiento vía Kong, esquema de roles `anon`/`authenticated`/`service_role`, JWT compartido) y se desviaría con el tiempo del comportamiento asumido por el resto del proyecto.

## 2. Persistencia de datos

- **Decision**: Volúmenes Docker nombrados: `db-data` (PGDATA de Postgres) y `storage-data` (backend de archivos de Storage), montados sobre disco local del servidor del despacho.
- **Rationale**: Cumple FR-002 (persistencia ante reinicios/detenciones) sin depender de un proveedor de almacenamiento externo, consistente con la escala de un único servidor asumida en la spec.
- **Alternatives considered**: Backend de objetos compatible con S3 (p. ej. MinIO) para Storage — rechazado por ahora: agrega un servicio adicional sin necesidad clara a la escala actual (Assumptions de la spec); se puede introducir después sin romper el contrato de Storage API que consumen las apps.

## 3. Respaldo automático y retención

- **Decision**: Job programado (cron del host o contenedor sidecar con cron) que ejecuta `scripts/backup.sh` una vez al día: `pg_dump` contra el contenedor `db` + empaquetado (`tar`) del volumen `storage-data`, guardando cada respaldo con marca de fecha. `scripts/prune-backups.sh` elimina respaldos con más de 30 días. `scripts/backup.sh` también puede invocarse manualmente a demanda (Historia 3).
- **Rationale**: La constitución del proyecto exige explícitamente "respaldo diario de la base de datos", "respaldo diario del almacenamiento de documentos" y "retención de al menos 30 días" (sección "Backups automáticos"). Esto corrige la asunción inicial de la spec (respaldo manual/on-demand), que ya fue actualizada para exigir automatización diaria (ver `spec.md` Assumptions, FR-007, SC-006).
- **Alternatives considered**: Respaldo solo manual/a demanda — rechazado, viola directamente la regla "Siempre: Backups automáticos" de la constitución.

## 4. Exposición de red y acceso remoto

- **Decision**: Los puertos de los servicios (Kong/API gateway, Studio) se publican únicamente en la interfaz de red interna del despacho o en la interfaz de la VPN/Tailscale del servidor — nunca en `0.0.0.0` hacia la WAN. Ningún puerto del stack se expone directamente a Internet.
- **Rationale**: Cumple la regla "Nunca... exponer el servidor directamente a Internet" de la constitución y FR-005. El acceso administrativo remoto ya se resuelve fuera de esta feature mediante VPN/Tailscale (Assumptions de la spec).
- **Alternatives considered**: Proxy inverso con TLS público (Let's Encrypt) accesible desde Internet — rechazado, requeriría exponer un hostname público, en conflicto directo con la constitución.

## 5. HTTPS / TLS

- **Decision**: Dado que el tráfico permanece dentro de la red privada (interna o VPN/Tailscale) y no hay hostname público, el cifrado en tránsito se apoya en el túnel cifrado de la propia VPN/Tailscale; si se requiere HTTPS explícito frente a Kong, se termina con un certificado interno/privado (proxy interno tipo Caddy/Nginx), no con una CA pública.
- **Rationale**: Satisface la regla "Siempre: HTTPS" de la constitución sin contradecir la prohibición de exponer el servidor a Internet (que impediría obtener un certificado público estándar vía HTTP-01).
- **Alternatives considered**: Certificado público (Let's Encrypt) — rechazado por requerir exposición pública del hostname.

## 6. Gestión de secretos y credenciales

- **Decision**: Todas las credenciales sensibles (contraseña de Postgres, `JWT secret`, llaves `anon`/`service_role`, credenciales SMTP si se usan) se definen en `infra/supabase/.env`, excluido de git mediante `.gitignore`, con `infra/supabase/.env.example` documentando cada variable sin valores reales.
- **Rationale**: Cumple FR-006 y la regla de constitución "nunca guardar contraseñas en texto plano" (en el repositorio); sigue el mismo patrón ya usado por `apps/*/.env.local` + `.env.local.example`, documentado en el README del proyecto.
- **Alternatives considered**: Vault externo o Docker secrets — rechazado por complejidad innecesaria para un solo servidor en este alcance; puede revisitarse si el despacho crece a múltiples servidores.

## 7. Versionado de imágenes

- **Decision**: Cada imagen del stack se fija a una etiqueta de versión explícita (nunca `latest`), registrada en `infra/supabase/.env` o en el propio `docker-compose.yml`, con la versión mayor de Postgres alineada a `major_version = 15` de `supabase/config.toml` (el mismo usado en desarrollo local vía CLI).
- **Rationale**: Da reproducibilidad ante reinicios/actualizaciones (SC-002) y evita drift de comportamiento entre el entorno de desarrollo (CLI) y el autoalojado de producción.
- **Alternatives considered**: Etiquetas flotantes (`latest`) — rechazado, rompe la garantía de reinicio idéntico (FR-003) y puede introducir cambios de comportamiento sin aviso.

## 8. Verificación de estado

- **Decision**: Cada servicio define un `healthcheck` en `docker-compose.yml` (Postgres: `pg_isready`; Kong: `/status`; PostgREST: ruta raíz; GoTrue: `/health`; Storage: `/status`), y `scripts/healthcheck.sh` agrega el resultado de `docker compose ps` más una verificación puntual de cada endpoint.
- **Rationale**: Satisface FR-004 y SC-004 (verificar el estado de cada componente en menos de 1 minuto) sin necesitar una plataforma de monitoreo dedicada.
- **Alternatives considered**: Stack de monitoreo (Prometheus/Grafana) — fuera de alcance inicial; posible mejora futura si el despacho lo requiere.

## Resumen de NEEDS CLARIFICATION resueltos

No quedaban marcadores `[NEEDS CLARIFICATION]` en `spec.md` al iniciar esta fase. El único ajuste necesario fue de consistencia con la constitución (respaldo automático diario vs. la asunción original de respaldo manual), ya corregido directamente en `spec.md` antes de este documento.
