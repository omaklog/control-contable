# Research: Cobranza

## Contexto heredado (por qué esto no es una feature "desde cero")

005-clientes-cobranza-expedientes ya construyó `cargos_cobranza` (un cargo = un concepto, único por `cliente_id+periodo_mes+periodo_anio+concepto`), `pagos` (a nivel `cliente_id`, no por cargo), `cargo_pagos` (join N—N que reparte un pago entre varios cargos y viceversa), y `recibos` (1 recibo por pago, generado por trigger sobre `cargo_pagos`). Ninguna aplicación (`apps/admin`, `apps/portal`) tiene todavía pantalla alguna sobre estas tablas — solo existen pruebas de integración y una función pura (`calcularEstadoCargo` en `packages/utils/src/cobranza.ts`). El placeholder de navegación "Cobranza" en `apps/portal` sigue `implemented: false`.

017 pide un modelo distinto: una **cabecera** (`cobranza`) única por cliente+periodo, con **líneas congeladas** (`conceptos_cobranza`) que no dependen del estado actual de su origen, y **pagos aplicados directamente a la cabecera** (no repartidos entre conceptos). Esto es estructuralmente incompatible con el reparto N—N de `cargo_pagos`. Dado que no hay UI ni datos de producción sobre el modelo de 005 (confirmado por investigación previa a este plan), la Decisión 1 es reemplazar esas tablas en vez de mantener dos modelos en paralelo.

## Decisión 1: Reemplazar `cargos_cobranza`/`cargo_pagos` por `cobranzas` + `conceptos_cobranza`; `pagos` pasa a referenciar la cobranza, no al cliente

**Decisión**: Nueva tabla `cobranzas` (cabecera, única por `cliente_id+periodo_mes+periodo_anio`). Nueva tabla `conceptos_cobranza` (líneas, `cobranza_id` FK, `tipo` enum `servicio_recurrente|cargo_extraordinario`, monto congelado, referencia opcional a su origen). `pagos.cliente_id` se reemplaza por `pagos.cobranza_id` (un pago aplica a una cobranza completa, nunca se reparte entre conceptos). Se eliminan `cargo_pagos`, `cargos_cobranza` y sus triggers/funciones (`bloquear_cargo_cliente_inactivo`, `recalcular_estado_cargo_cobranza`, `generar_o_actualizar_recibo` original).

**Rationale**: Es la única forma de representar fielmente "una cobranza, múltiples conceptos, pagos sobre la cobranza" (FR-001, FR-014). El reparto N—N de `cargo_pagos` resolvía un problema que 017 ya no tiene (pagos que cubren cargos de distintos periodos/conceptos de forma independiente) — mantenerlo sería complejidad sin propósito.

**Alternatives considered**: Conservar `cargos_cobranza` como está y agregar una tabla `cobranzas` que solo agrupe cargos existentes por cliente+periodo — rechazada: el pago seguiría necesitando repartirse vía `cargo_pagos` entre cargos individuales para que cada uno calculara su propio estado, contradiciendo "un pago se registra sobre la cobranza, no sobre un concepto" (Decisión final de arquitectura funcional del spec fuente).

## Decisión 2: `recibos` se conserva, pero se genera directo desde `pagos` (no vía `cargo_pagos`)

**Decisión**: `recibos` mantiene su forma (`pago_id` único, `folio` con la misma secuencia `REC-000001`, snapshot inmutable de `concepto`/`monto`). El trigger que lo genera se mueve de `cargo_pagos` (eliminado) a `pagos` (`AFTER INSERT`), tomando el `concepto` como una concatenación de las descripciones de los conceptos de la cobranza pagada (o simplemente el periodo/etiqueta de la cobranza, más simple ahora que un pago ya no se reparte entre varios cargos de distintos periodos).

**Rationale**: La constitución exige "recibos emitidos" como parte de la funcionalidad de cobranza, aunque el documento fuente de 017 no lo mencione — se preserva por mandato constitucional (Constitution Check). Generarlo directo desde `pagos` es más simple que antes: ya no hace falta "anexar" conceptos de distintos cargos a un recibo existente, porque un pago siempre pertenece a una única cobranza.

**Alternatives considered**: Eliminar `recibos` por no estar en el alcance explícito de 017 — rechazada por el requisito constitucional explícito.

## Decisión 3: Estados de ciclo de vida de la cobranza como un único `estado` enum

**Decisión**: `cobranzas.estado` es un enum `cobranza_estado: 'vigente' | 'cancelada' | 'eliminada'`. "Eliminación lógica" (FR-019, solo sin pagos) y "cancelación/anulación" (FR-020, con pagos) son la misma clase de transición a nivel de dato — ambas ocultan la cobranza de las consultas operativas normales conservando historial — pero con precondiciones de negocio distintas, aplicadas por un trigger, no por RLS.

**Rationale**: Un solo campo de estado es suficiente para "oculta de operación normal, visible en historial/auditoría" en ambos casos; distinguir `eliminada` de `cancelada` conserva la intención original de cada operación para quien audite después, sin necesitar dos mecanismos de datos distintos.

**Alternatives considered**: Un booleano `eliminado` + un booleano `cancelado` independientes — rechazada por permitir combinaciones sin sentido de negocio (una cobranza "eliminada y cancelada" a la vez); el enum de 3 valores es más simple y ya excluyente por construcción.

## Decisión 4: Estado de pago y de vencimiento como vista SQL agregada, no columnas almacenadas

**Decisión**: Vista `cobranzas_resumen` que expone, por cobranza, `total_conceptos` (suma de `conceptos_cobranza.monto`), `total_pagado` (suma de `pagos.monto`), `saldo` (`total_conceptos - total_pagado`), `estado_pago` (`pendiente|parcial|pagada`, derivado del saldo) y `estado_vencimiento` (`vigente|vencida`, derivado de `fecha_limite` vs. `current_date`, solo relevante cuando `estado_pago <> 'pagada'`). Ningún campo derivado se almacena en `cobranzas`.

**Rationale**: FR-015/FR-016/FR-017 exigen que ambos estados se recalculen siempre a partir de los pagos reales y la fecha actual — almacenarlos requeriría mantenerlos sincronizados con cada INSERT de pago y con el paso del tiempo (un cron diario, como se evitó deliberadamente en 016 para "vencida"). Una vista agregada resuelve ambos en una sola consulta por listado, evitando el problema N+1 que tendría recalcular en JS por cada fila al filtrar/paginar cobranzas (a diferencia de 015, donde una sola fila objetivo se recalculaba por página vista).

**Alternatives considered**: Calcular en JS tras traer cobranzas + conceptos + pagos por separado (patrón de 015/016) — rechazada aquí porque la bandeja de cobranza pagina y filtra por estos mismos campos derivados (`estado_pago`, `estado_vencimiento`), y hacerlo en JS obligaría a traer TODAS las cobranzas del despacho a memoria antes de poder filtrar/paginar por estado — no escala igual que 015 (que solo derivaba "vencida", un booleano simple, sobre filas ya acotadas).

## Decisión 5: Generación automática — `pg_cron` diario + verificación interna del día configurado

**Decisión**: `generar_cobranzas(p_forzar boolean default false)` — si `p_forzar` es falso, primero verifica `extract(day from current_date) = (select dia_generacion from configuracion_cobranza)` y sale sin hacer nada si no coincide; si es verdadero (invocado manualmente), omite esa verificación. `pg_cron` programa esta función para ejecutarse **diariamente** (no solo el día 1), dejando que la función decida si le toca actuar ese día.

**Rationale**: El día de generación es configurable por el Administrador (FR-018) y los cambios deben aplicar de inmediato hacia adelante. Reprogramar la expresión cron cada vez que cambia la configuración (como se consideró en 015 para la generación mensual, que sí tiene un día fijo) agregaría una dependencia entre la Server Action de configuración y `cron.schedule`; verificar el día dentro de la función evita ese acoplamiento y sigue siendo trivialmente idempotente.

**Alternatives considered**: Reprogramar `cron.schedule` cada vez que cambia `dia_generacion` — rechazada por acoplar la configuración de negocio a la administración de `pg_cron`, con más piezas que pueden desincronizarse.

## Decisión 6: Congelamiento — copiar el monto, no solo referenciar el origen

**Decisión**: `conceptos_cobranza.monto` se copia del `precio_acordado` del `servicio_contratado` (o del `monto` del `cargo_extraordinario`) en el momento del INSERT del concepto — nunca se recalcula ni se sincroniza después. `conceptos_cobranza` conserva además `servicio_contratado_id`/`cargo_extraordinario_id` como referencia informativa (para trazabilidad), pero esa referencia NO se usa para mostrar el monto — el monto mostrado siempre es la columna congelada.

**Rationale**: Es la única forma de cumplir FR-006/FR-007/FR-011 (cambios posteriores en precio/servicio/cargo extraordinario no deben alterar cobranzas ya generadas) sin ambigüedad: si el monto se derivara en lectura desde el origen, un cambio posterior en el servicio alteraría retroactivamente la cobranza histórica.

**Alternatives considered**: Ninguna — es un requisito explícito e inequívoco del spec fuente ("el importe deberá quedar congelado").

## Decisión 7: Configuración de días — acción reservada a Administrador, no solo a `manage_billing`

**Decisión**: `actualizarConfiguracionCobranza` (Server Action) llama `requireCapability('manage_billing')` para la entrada general, pero además verifica explícitamente `currentProfile.role === 'administrador'` antes de aplicar el cambio — igual patrón que el trigger de eliminación por antigüedad de 016 (verificación de rol además de capacidad).

**Rationale**: `manage_billing` hoy la comparten Administrador y Contador, pero el spec fuente reserva explícitamente "Modificar configuraciones relacionadas con fechas límite" a Administrador (no aparece en la sección de permisos de Contador). Introducir una capacidad nueva solo para esta acción sería desproporcionado frente a una verificación de rol directa, ya usada en el sistema para reglas más finas que una capacidad.

**Alternatives considered**: Nueva capacidad `manage_billing_config` — rechazada por ser una única acción de configuración, no un módulo nuevo; no se justifica ampliar `ALL_CAPABILITIES` para un solo botón.

## Decisión 8: `configuracion_cobranza` como tabla singleton (una sola fila)

**Decisión**: Tabla con clave primaria fija (`id boolean primary key default true, check (id)`) — patrón estándar de Postgres para forzar una única fila. Columnas `dia_generacion smallint default 1`, `dia_limite_pago smallint default 20`, `updated_at`, `updated_by`.

**Rationale**: No existe un mecanismo de configuración global en el sistema todavía (confirmado por investigación previa); los cambios son siempre prospectivos porque cada `cobranza` congela su propia `fecha_limite` al generarse (Decisión 6) — la tabla de configuración nunca necesita historial propio, solo el valor vigente.

**Alternatives considered**: Tabla de configuración versionada con vigencia por fechas — rechazada por sobre-ingeniería: como el valor se congela en cada cobranza al generarse, no hace falta reconstruir "qué día límite regía en tal fecha" — eso ya quedó grabado en `cobranzas.fecha_limite`.

## Decisión 9: Ubicación de la UI — todo en `apps/portal`

**Decisión**: Toda la funcionalidad de 017 vive en `apps/portal/(app)/cobranza`, incluida la configuración de días (visible solo cuando el usuario es Administrador).

**Rationale**: Contador y Auxiliar necesitan generar cargos extraordinarios, registrar pagos y consultar cobranzas, pero no tienen acceso a `apps/admin` (`canAccessApp`); poner cualquier parte del flujo ahí los excluiría. El Administrador ya usa `apps/portal` para todo lo demás (015, 016), así que no hay necesidad de una pantalla espejo en `apps/admin`.

**Alternatives considered**: Configuración de días en `apps/admin/catalogos` — rechazada porque fragmentaría el flujo de cobranza entre dos aplicaciones sin beneficio, y Contador (que sí interactúa con cobranza a diario) nunca vería esa pantalla de todos modos.
