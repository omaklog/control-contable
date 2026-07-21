# Quickstart: Control de Cumplimiento Fiscal

## Prerrequisitos

- Supabase local corriendo, con la migración de esta feature aplicada (incluye `create extension if not exists pg_cron`).
- `packages/types/src/database.ts` regenerado.
- Al menos un cliente Activo con una o más Obligaciones Fiscales Activas configuradas (`014-obligaciones-fiscales-cliente`), y con `responsable_id` asignado.
- Al menos un documento cargado en el Expediente Fiscal (`005`) de ese mismo cliente.
- `apps/portal` corriendo, con un usuario con capability `view_clients`/`manage_clients`.

## Escenario 1 — Generación automática y manual (Historia 1, FR-001 a FR-003, FR-017)

1. Invocar manualmente `select generar_cumplimientos_fiscales();` (o el botón "Generar cumplimientos" en la bandeja).
2. Confirmar que se crea un cumplimiento por cada obligación activa del cliente, con el periodo correspondiente a su periodicidad.
3. Ejecutar la generación de nuevo — confirmar que no se crean duplicados (`select count(*) from cumplimientos_fiscales` no cambia).
4. Entrar a la bandeja principal (`/obligaciones-fiscales` en `apps/portal`) y confirmar que los cumplimientos aparecen, con los vencidos primero.
5. Filtrar por cliente, RFC, obligación, periodo, estado y responsable — confirmar que el listado se acota correctamente en cada caso.

## Escenario 2 — Seguimiento de estado y evidencia documental (Historia 2, FR-004 a FR-009)

1. Tomar un cumplimiento Pendiente y marcarlo En proceso.
2. Marcarlo como Presentada y asociar uno o varios documentos del Expediente Fiscal del mismo cliente, identificando cuál es el acuse.
3. Intentar asociar un documento de otro cliente — confirmar que se rechaza.
4. Cambiar la fecha límite de un cumplimiento Pendiente a una fecha pasada y confirmar que la bandeja lo muestra como Vencida sin que nadie lo haya marcado manualmente.
5. Confirmar que un cumplimiento Presentada nunca se muestra como Vencida, sin importar su fecha límite.

## Escenario 3 — Ajustes individuales de fecha límite y responsable (Historia 3, FR-010, FR-011)

1. Cambiar la fecha límite de un cumplimiento y confirmar que ningún otro cumplimiento (mismo cliente u otro) se ve afectado.
2. Cambiar el responsable asignado al cliente en el módulo Clientes, y luego generar un nuevo cumplimiento — confirmar que usa el nuevo responsable.
3. Confirmar que los cumplimientos generados antes del cambio conservan el responsable anterior.

## Escenario 4 — Cumplimiento extraordinario (Historia 4, FR-012/FR-013)

1. Registrar un cumplimiento extraordinario seleccionando una obligación del catálogo y una descripción — confirmar que admite periodo, fecha límite, estado, responsable y documentos igual que uno ordinario.
2. Registrar otro sin seleccionar ninguna obligación del catálogo — confirmar que la descripción es el elemento principal para identificarlo.

## Escenario 5 — Historial de cambios (Historia 5, FR-014)

1. Sobre un mismo cumplimiento, cambiar su estado, su fecha límite, y asociar/desasociar un documento.
2. Consultar su historial y confirmar que cada cambio aparece en orden cronológico, con usuario, fecha/hora, y los valores anterior/nuevo cuando aplique.
