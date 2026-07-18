# Research: Módulo de Servicios

## 1. Modelo de un único registro por Servicio Contratado (Clarifications, Q1)

**Decision**: `servicios_contratados` tiene una restricción de unicidad sobre `(cliente_id, servicio_id)` — nunca puede existir más de una fila para la misma combinación, sin importar su `estado`. Suspender, finalizar y reactivar son siempre `UPDATE`s sobre esa misma fila, nunca `INSERT`s nuevos.

**Rationale**: Confirmado explícitamente por el usuario durante `/speckit-specify`: el estado es "principalmente informativo y de control" para decidir si un servicio contratado debe considerarse al generar cobranza a futuro, no un ciclo de vida rígido con estados terminales. Un único registro por combinación simplifica el modelo (sin necesidad de "vincular" registros históricos entre sí) y hace que la regla de unicidad (FR-005) sea una simple restricción `UNIQUE` de base de datos, verificable en todo momento sin importar el estado.

**Alternatives considered**: Un registro nuevo por cada periodo de contratación (rechazado explícitamente por el usuario en la clarificación) — hubiera requerido una tabla adicional o una clave compuesta con rango de fechas para reconstruir "la línea de tiempo completa" del cliente+servicio, complejidad no justificada dado que el propio usuario aclaró que el estado es solo informativo.

## 2. Historial como vista filtrada de `business_audit_log`

**Decision**: No se crea una tabla de historial propia. Un trigger sobre `servicios_contratados` (AFTER INSERT/UPDATE) llama a `log_business_audit()` (ya existente, `005-clientes-cobranza-expedientes`) con `entidad = 'servicio_contratado'`, `entidad_id = id`, y un valor de `accion` específico según qué cambió: `'alta'`, `'cambio_precio'` (con `detalle` conteniendo precio anterior/nuevo), `'suspension'`, `'reactivacion'`, `'finalizacion'`. "Ver historial" (Historia 5) consulta `business_audit_log` filtrado por esa `entidad_id`, ordenado cronológicamente.

**Rationale**: Ya establecido como Assumption del spec — "Historial" y "Auditoría" son la misma fuente. Reutilizar `business_audit_log`/`log_business_audit()` evita una tabla de auditoría paralela (contradiría el patrón ya usado por `clientes`/`contactos`/`cargos_cobranza`) y satisface FR-014/FR-015 con la misma infraestructura.

**Alternatives considered**: Registrar solo `'modificacion'` genérica con un diff `before`/`after` (patrón actual de `trg_clientes_audit_fn`) — rechazado porque Historia 5 (AS1) requiere que el historial distinga claramente el tipo de evento (cambio de precio con valores anterior/nuevo, suspensión, reactivación, finalización) para ser útil como línea de tiempo legible, no solo como un diff técnico.

## 3. Alcance de pantallas: Catálogo solo en `apps/admin`

**Decision**: La pantalla "Catálogo de Servicios" (Historia 1: crear/editar/activar/desactivar, filtros) se construye únicamente en `apps/admin`, con un nuevo ítem de navegación "Servicios" gateado por la capacidad `manage_catalogs`. `apps/portal` no tiene esta pantalla.

**Rationale**: Consistente con el estado actual del sistema — `apps/portal` no tiene hoy ninguna pantalla de administración de catálogos (regímenes fiscales, categorías de documento tampoco se administran desde ahí), y la Constitución reserva "catálogos" y "configuración global" a `apps/admin`. Con la plantilla de capacidades ya existente (`ROLE_DEFAULT_CAPABILITIES`), solo Administrador tiene `manage_catalogs` por defecto, así que el ítem de navegación sería invisible para Contador/Auxiliar de cualquier forma.

**Alternatives considered**: Exponer el catálogo también en modo solo-lectura en `apps/portal` — rechazado por ahora: nadie en `apps/portal` necesita administrar el catálogo, y la selección de un servicio del catálogo al agregarlo a un cliente (Historia 2) no requiere una pantalla de catálogo separada, solo una consulta `SELECT` (ver #4) para poblar un selector dentro de `ClienteDetalleClient`.

## 4. Permisos: reutilizar capacidades ya existentes

**Decision**:

- `servicios` (catálogo): `SELECT` disponible para cualquier miembro del staff autenticado (mismo patrón que `regimenes_fiscales_select_all_staff`, ya que cualquier persona que gestione clientes necesita ver los servicios disponibles al asignarlos); `INSERT`/`UPDATE` gateados por `has_capability('manage_catalogs')`.
- `servicios_contratados`: `SELECT` gateado por `has_capability('view_clients')`; `INSERT`/`UPDATE` (agregar, cambiar precio, suspender, reactivar, finalizar) gateados por `has_capability('manage_clients')` — idéntico al patrón ya usado por `contactos` en `008-contactos-y-detalle-cliente`.

**Rationale**: Ninguna de las dos tablas introduce un concepto de permisos nuevo — el catálogo es análogo a `regimenes_fiscales` (dato de referencia, editable solo por Administrador vía `manage_catalogs`), y los servicios contratados son análogos a `contactos` (dato propio de un cliente, editable por quien gestiona clientes). Evita expandir `Capability`/`ROLE_DEFAULT_CAPABILITIES` (`packages/auth/src/roles.ts`) innecesariamente.

**Alternatives considered**: Introducir `view_services`/`manage_services` como capacidades dedicadas — rechazado: no hay ninguna necesidad de un permiso más granular que lo ya existente (nadie necesita gestionar servicios contratados sin poder gestionar clientes, ni administrar el catálogo sin poder administrar catálogos en general), y añadir capacidades nuevas obligaría a tocar `packages/auth/src/roles.ts`, su espejo SQL (`has_capability`), y la matriz de permisos ya documentada en `003-supabase-auth-roles/contracts/role-permissions.md` sin un beneficio claro.

## 5. Ubicación de la sección "Servicios" en el detalle de cliente

**Decision**: Se agrega como una nueva sección (`Paper`) dentro del `ClienteDetalleClient` de una sola columna ya existente, inmediatamente después de la sección de Contactos — no se migra la pantalla a una experiencia con pestañas.

**Rationale**: `docs/ux/design-system.md` §10 punto 4 ya señala esta migración como pendiente "cuando esos dominios existan y tengan datos que mostrar" — pero migrar a pestañas de una vez implicaría tocar también los espacios reservados para Obligaciones Fiscales, Documentos y Cobranza, ninguno de los cuales tiene todavía modelo de datos propio. Hacerlo ahora sería un cambio de estructura de pantalla mucho mayor que "Módulo de Servicios", y no fue parte de lo pedido en este spec.

**Alternatives considered**: Migrar `ClienteDetalleClient` a pestañas como parte de este spec — rechazado por alcance; queda documentado como trabajo futuro, sin bloquear esta feature.

## 6. Auditoría diferenciada por tipo de cambio

**Decision**: El trigger de `servicios_contratados` inspecciona qué cambió entre `OLD` y `NEW` para decidir el valor de `accion` a registrar (en vez de un `'modificacion'` genérico): compara `OLD.precio_acordado <> NEW.precio_acordado` → `'cambio_precio'` (con `detalle = {precio_anterior, precio_nuevo}`); compara `OLD.estado <> NEW.estado` → `'suspension'`/`'reactivacion'`/`'finalizacion'` según el nuevo valor.

**Rationale**: Necesario para que Historia 5 (AS1) y FR-007/FR-014 puedan mostrar un historial legible por tipo de evento, no solo un diff genérico — ver #2.

**Alternatives considered**: Un único trigger genérico como el de `clientes` (`trg_clientes_audit_fn`) — insuficiente aquí porque ese patrón no distingue el tipo de cambio, y esta feature sí lo requiere explícitamente.

## Resumen de NEEDS CLARIFICATION resueltos

Ninguno pendiente — las 2 ambigüedades detectadas para esta feature (Categoría de servicio, ciclo de vida de Finalizado) ya se resolvieron durante `/speckit-specify` (la segunda mediante una pregunta directa al usuario).
