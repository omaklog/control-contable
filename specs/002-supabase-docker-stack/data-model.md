# Data Model: Infraestructura Docker Autoalojada de Supabase

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Esta feature es de infraestructura (no introduce tablas de negocio ni esquema de aplicación). Las "entidades" relevantes, tomadas de la sección **Key Entities** de `spec.md`, son entidades operativas/de configuración, no filas de base de datos:

## Entorno de backend

Conjunto de servicios (`db`, `kong`, `auth`, `rest`, `storage`, `realtime`, `meta`, `studio`) que operan como una sola unidad desplegable vía `docker-compose.yml`.

| Atributo       | Descripción                                                                  |
| -------------- | ---------------------------------------------------------------------------- |
| `project_name` | Nombre del proyecto Docker Compose (aísla la red/volúmenes de otros stacks). |
| `version`      | Conjunto de tags de imagen fijados por servicio (ver research.md §7).        |
| `estado`       | Derivado de `docker compose ps` por servicio: running / stopped / unhealthy. |
| `red`          | Red Docker interna; puertos publicados solo hacia interfaz interna/VPN.      |

## Volumen de datos

Espacio de almacenamiento persistente, independiente del ciclo de vida de los contenedores.

| Atributo     | Descripción                                                             |
| ------------ | ----------------------------------------------------------------------- |
| `nombre`     | `db-data` (Postgres) o `storage-data` (archivos de Storage API).        |
| `tipo`       | Volumen Docker nombrado, con bind al disco local del servidor.          |
| `ciclo_vida` | Sobrevive a `docker compose down` (no se elimina salvo `-v` explícito). |

## Copia de respaldo

Snapshot completo de los datos y archivos del entorno en un momento dado.

| Atributo    | Descripción                                                                     |
| ----------- | ------------------------------------------------------------------------------- |
| `timestamp` | Fecha/hora de creación, usada como parte del nombre de archivo (orden y purga). |
| `origen`    | `db` (dump de Postgres) y `storage` (archivo empaquetado del volumen).          |
| `tipo`      | `automatico` (cron diario) o `manual` (bajo demanda, Historia 3).               |
| `retención` | Se conserva mínimo 30 días; `prune-backups.sh` elimina lo más antiguo.          |

## Configuración/credenciales del entorno

Parámetros sensibles necesarios para operar el entorno, gestionados fuera del control de versiones.

| Atributo         | Descripción                                                                     |
| ---------------- | ------------------------------------------------------------------------------- |
| `variable`       | Nombre de la variable de entorno (ver `contracts/env-contract.md`).             |
| `almacenamiento` | Archivo `infra/supabase/.env`, excluido de git; documentado en `.env.example`.  |
| `consumidores`   | Servicios del stack y, para el subconjunto público, `apps/admin`/`apps/portal`. |

## Relaciones

- Un **Entorno de backend** tiene exactamente un `db-data` y un `storage-data` (**Volumen de datos**).
- Un **Entorno de backend** genera múltiples **Copias de respaldo** a lo largo del tiempo (una diaria automática + N manuales).
- Un **Entorno de backend** se configura mediante un conjunto fijo de **Configuración/credenciales**, consumido tanto por los propios servicios internos como (el subconjunto público) por `apps/admin` y `apps/portal`.

No hay transiciones de estado complejas: el entorno es running/stopped por servicio, y cada respaldo es inmutable una vez creado (solo se elimina por rotación de retención).
