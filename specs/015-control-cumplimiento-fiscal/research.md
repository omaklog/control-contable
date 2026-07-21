# Research: Control de Cumplimiento Fiscal

## 1. "Vencida" es siempre derivada, nunca almacenada (Clarifications)

**Decision**: El enum de estado almacenado (`cumplimiento_fiscal_estado`) solo tiene cuatro valores: `pendiente`, `en_proceso`, `presentada`, `no_aplica`. "Vencida" nunca se escribe en la columna — se calcula en cada consulta como `estado in ('pendiente','en_proceso') and fecha_limite < current_date`.

**Rationale**: Resuelto explícitamente por el usuario en `/speckit-clarify` (Question 1, Opción A) — evita cualquier proceso batch adicional al de generación mensual/manual, y garantiza que "Vencida" siempre sea exacta al momento de la consulta, sin depender de que un job de recálculo se haya ejecutado.

**Alternatives considered**: Un job diario que transicione filas Pendiente/En proceso vencidas a un quinto valor de enum `vencida`: rechazado por el propio usuario — más superficie de auditoría (cada transición sería un evento) y una vía adicional de inconsistencia si el job no corre.

## 2. Dos tablas: `cumplimientos_fiscales` y `cumplimiento_fiscal_documentos`

**Decision**: Tabla `cumplimientos_fiscales` (el registro central) más una tabla puente `cumplimiento_fiscal_documentos` (N:N con `documentos`, `005`), en vez de una columna array o una tabla que mezcle ambos conceptos.

**Rationale**: Un cumplimiento puede tener cero, uno o varios documentos asociados (FR-008); modelarlo como tabla puente permite marcar cuál es el acuse (`es_acuse boolean`) con un índice único parcial, auditar altas/bajas de documentos como eventos independientes (FR-014), y reutilizar `documentos` sin duplicar archivos (FR-009 exige validar que el documento pertenezca al mismo cliente, algo que una tabla puente con FKs explícitas valida naturalmente vía trigger).

## 3. Referencia a la obligación: `obligaciones_fiscales_cliente`, no directamente al catálogo

**Decision**: Un cumplimiento ordinario referencia `obligacion_fiscal_cliente_id` (FK a `obligaciones_fiscales_cliente`, `014`) — la fila ya configurada y potencialmente personalizada del cliente (con su periodicidad ya efectiva, incluyendo overrides por cliente) — no directamente `obligaciones_fiscales` (el catálogo, `013`). Un cumplimiento extraordinario deja `obligacion_fiscal_cliente_id` en `null` y opcionalmente referencia `obligacion_fiscal_id` (el catálogo) más una `descripcion` libre.

**Rationale**: El spec es explícito: "el módulo utilizará como base las obligaciones fiscales configuradas para cada cliente en Gestión Fiscal del Cliente" — la periodicidad efectiva de una obligación (que puede haberse personalizado por cliente, FR-007 de `014`) vive en `obligaciones_fiscales_cliente`, no en el catálogo. Referenciar el catálogo directamente perdería esa personalización al calcular periodos.

**Alternatives considered**: Referenciar ambas tablas siempre (catálogo + configuración del cliente) para cumplimientos ordinarios: rechazado — redundante, ya que `obligaciones_fiscales_cliente.obligacion_fiscal_id` permite llegar al catálogo vía join cuando se necesite (por ejemplo, para el filtro "por obligación").

## 4. Cálculo de periodos por periodicidad — alineado a calendario

**Decision**: Los periodos se calculan alineados al calendario, igual que la Assumption ya documentada en spec.md: Mensual = cada mes calendario; Bimestral = pares de meses desde enero (ene-feb, mar-abr, ...); Trimestral = trimestres calendario; Semestral = semestres calendario; Anual = año calendario. Se implementa mediante una función SQL `calcular_periodo_fiscal(periodicidad_nombre text, fecha date)` que interpreta el nombre exacto de la periodicidad (los valores sembrados por `012`: "Mensual", "Bimestral", "Trimestral", "Semestral", "Anual") y devuelve el inicio y fin del periodo calendario que contiene esa fecha.

**Rationale**: Postgres ofrece `date_trunc('quarter', ...)` nativo para trimestral y `date_trunc('year', ...)` para anual; bimestral y semestral requieren un cálculo manual simple (agrupar el mes en bloques de 2 o 6) que se implementa una sola vez en esta función, reutilizable tanto por la generación automática como por la manual.

**Alternatives considered**: Guardar un valor numérico de "meses por periodo" directamente en el catálogo de Periodicidades (`012`) en vez de interpretar el nombre: rechazado por ahora — requeriría modificar `012` (ya implementado y protegido) solo para este consumidor; interpretar el nombre exacto es suficiente mientras el catálogo de Periodicidades siga siendo un conjunto cerrado y protegido de cinco valores conocidos.

## 5. Generación: función `security definer` + `pg_cron`, invocable también manualmente

**Decision**: `generar_cumplimientos_fiscales()` es una función PL/pgSQL `security definer` que recorre clientes activos y sus obligaciones fiscales activas, calcula los periodos pendientes (desde la fecha de asignación de la obligación hasta hoy) usando `calcular_periodo_fiscal()`, e inserta las filas faltantes con `on conflict (cliente_id, obligacion_fiscal_cliente_id, periodo_inicio) where obligacion_fiscal_cliente_id is not null do nothing`. Se programa con `select cron.schedule('generar-cumplimientos-fiscales-mensual', '0 0 1 * *', $$select public.generar_cumplimientos_fiscales()$$)`, y la extensión `pg_cron` se habilita en la misma migración (`create extension if not exists pg_cron`). El botón "Generar cumplimientos" del Server Action invoca la misma función vía RPC.

**Rationale**: `pg_cron` está disponible en la imagen de Postgres usada por Supabase local (confirmado vía `select * from pg_available_extensions where name = 'pg_cron'`), aunque no estaba habilitada — es la forma más simple de cumplir "el sistema ejecutará automáticamente... el primer día de cada mes" sin infraestructura externa (sin necesidad de un cron externo o una Edge Function programada). `security definer` es necesario porque la función debe escribir cumplimientos de TODOS los clientes en una sola ejecución — no es expresable de forma significativa como una operación por-fila sujeta a RLS del usuario que la invoca (mismo criterio ya usado por `log_business_audit`/`has_capability`, también `security definer`); el Server Action sigue exigiendo `requireCapability('manage_clients')` antes de invocar la versión manual, para que la autorización se aplique en la capa de la aplicación.

**Alternatives considered**: Un cron externo (Vercel Cron, GitHub Actions) que llame a un endpoint HTTP: rechazado por ahora — introduce una dependencia de infraestructura fuera de Supabase sin necesidad, cuando `pg_cron` ya está disponible en la misma base de datos.

## 6. Historial reutiliza `business_audit_log` — sin tabla propia

**Decision**: Cada evento relevante (alta, cambio de estado, cambio de fecha límite, cambio de responsable, asociación/desasociación de documento, alta de extraordinaria) se registra vía `log_business_audit('cumplimiento_fiscal', id, accion, detalle)`, igual que Servicios Contratados (011). La pantalla de detalle consulta `business_audit_log` filtrado por `entidad = 'cumplimiento_fiscal'` y `entidad_id`, mismo patrón que `ServicioHistorialDialog`.

**Rationale**: El propio spec dice "los eventos relevantes del módulo deberán integrarse con el sistema de auditoría existente" — es una instrucción directa a reutilizar `business_audit_log`, no a construir un mecanismo de historial paralelo.

## 7. Fecha límite inicial — valor por defecto razonable, siempre editable

**Decision**: Al generarse un cumplimiento, la fecha límite inicial se calcula como el día 17 del mes siguiente al fin del periodo (`periodo_fin + 1 mes`, día 17) — el día de vencimiento estándar más común para declaraciones mensuales/bimestrales ante el SAT — y queda inmediatamente editable por FR-010.

**Rationale**: Ni la descripción de origen ni el spec definen una fórmula exacta ("la fecha límite será determinada... de acuerdo con la configuración establecida por el Administrador" no especifica esa configuración). Dado que FR-010 garantiza que la fecha límite de cualquier registro individual siempre puede corregirse sin afectar a otros, un valor por defecto razonable y ampliamente reconocido en el dominio fiscal mexicano es de bajo riesgo — a lo sumo requiere ajuste manual cuando el vencimiento real de una obligación difiera.

**Alternatives considered**: Exigir que el Administrador configure explícitamente el día de vencimiento por periodicidad antes de poder generar cumplimientos: rechazado por ahora — añadiría una nueva pantalla de configuración no solicitada por el spec; puede incorporarse después si el despacho lo requiere, sin romper compatibilidad (el valor generado seguiría siendo editable).

## 8. Ubicación: `apps/portal`, reutilizando el ítem de navegación ya reservado

**Decision**: Nueva ruta `apps/portal/src/app/(app)/obligaciones-fiscales/`, reutilizando el ítem de menú "Obligaciones Fiscales" que `apps/portal/src/components/layout/navigation.ts` ya reserva (`href: '/obligaciones-fiscales'`, actualmente `implemented: false`, sin capability). Se actualiza a `implemented: true` con `capability: 'view_clients'`.

**Rationale**: Es la primera pantalla "cruzada entre clientes" del sistema (a diferencia de 011/014, anidadas en el detalle de un cliente) — el propio comentario del archivo de navegación ya anticipaba este módulo ("'Obligaciones Fiscales' no tiene capacidad todavía (no existe ese módulo)"). `apps/admin` no tiene ni necesita un ítem equivalente: es exclusivamente para configuración/administración (Constitución), no para operación diaria.
