# Research: Expediente Fiscal

## Contexto heredado (por qué esto no es una feature "desde cero")

Una inspección del esquema real (`\d public.documentos`, `\d public.categorias_documento`) y del código de `apps` confirmó que **005-clientes-cobranza-expedientes** ya construyó las tablas base (`documentos`, `categorias_documento`), su RLS, su trigger de auditoría, y un trigger que bloquea incondicionalmente el DELETE físico — pero **ninguna aplicación (`apps/admin`, `apps/portal`) tiene todavía una sola pantalla que las use**. `apps/portal/src/components/layout/navigation.ts` ya tenía, desde 004, un ítem de menú reservado "Documentos Fiscales" (`capability: 'view_documents'`, `implemented: false`) — anticipando exactamente esta feature, igual que 015 encontró su slot "Obligaciones Fiscales" ya reservado. Este research documenta cómo reconciliar ese modelo de 2025 con las reglas de negocio explícitas de 016.

## Decisión 1: Los campos de "versionado" de 005 (`version`, `documento_anterior_id`, `estado='reemplazado'`) se mantienen, pero se documentan como mecanismo manual y opcional — no se automatiza ni se elimina

**Decisión**: No se toca el significado de `version`/`documento_anterior_id`/`estado='reemplazado'`. Siguen existiendo y siguen siendo rellenables a mano (como ya lo son hoy: `packages/utils/src/expedientes.integration.test.ts` los llena con un `INSERT`+`UPDATE` explícitos, no un trigger). 016 simplemente no construye ninguna UI ni lógica que los infiera automáticamente — la carga de un documento "sustituto" siempre se hace como un documento independiente nuevo (FR-016), y si el usuario quiere además marcar el anterior como `reemplazado`, lo hace como una acción manual explícita separada (fuera de alcance de esta feature: no se añade UI para esto en 016).

**Rationale**: FR-016 prohíbe que el _sistema_ determine o encadene versiones automáticamente — no prohíbe que exista un campo manual opcional. La constitución pide "posibilidad de reemplazar versiones... cuando aplique", que ya está satisfecha por el campo existente. Cambiar o remover esas columnas sería una migración innecesaria y arriesgada para datos ya sembrados en local, sin ningún requisito de negocio que lo exija.

**Alternatives considered**: Deprecar/eliminar `version`/`documento_anterior_id` — rechazado, no hay ningún requisito que lo pida y rompería el test de integración de 005 sin necesidad. Construir una UI de "marcar como reemplazo" en 016 — rechazado, no está en el alcance del documento fuente (que solo lista esa posibilidad como responsabilidad del usuario, sin pedir una pantalla específica).

## Decisión 2: `categoria_id` pasa de `not null` a opcional ("Sin clasificar" = ausencia de valor)

**Decisión**: `alter table documentos alter column categoria_id drop not null`. "Sin clasificar" en la UI es simplemente mostrar el documento cuando `categoria_id is null`, sin necesidad de una fila especial protegida en `categorias_documento`.

**Rationale**: Resuelto explícitamente en Clarifications (Q2, Opción A) — modelo de datos más limpio, no ensucia el catálogo con una entrada que no es un tipo real.

**Alternatives considered**: Fila reservada "Sin clasificar" en el catálogo — descartada por el usuario en la clarificación (requeriría protegerla de edición/desactivación sin beneficio claro).

## Decisión 3: Año/periodo del documento se deriva del Cumplimiento asociado — no se almacena en `documentos`

**Decisión**: `documentos` no gana columnas de año/periodo propias. La agrupación "Documentos por Periodo → Año → Periodo" se calcula en la capa de aplicación a partir del `cumplimiento_fiscal_documentos` → `cumplimientos_fiscales.periodo_inicio`/`periodo_etiqueta` ya existente (015). Un documento sin cumplimiento asociado es, por definición, un "Documento General".

**Rationale**: El spec (FR-008) ya exige que "cuando un documento esté asociado con un cumplimiento, el periodo deberá corresponder al periodo definido en dicho cumplimiento" — no hay ningún caso de negocio descrito donde un documento tenga periodo _sin_ tener cumplimiento. Derivar evita una fuente de verdad duplicada (columnas de periodo en `documentos` que podrían desincronizarse del cumplimiento) y reutiliza sin cambios el modelo de periodos ya construido en 015 (`calcular_periodo_fiscal`, `periodo_etiqueta`).

**Alternatives considered**: Columnas `anio`/`periodo_etiqueta` propias en `documentos`, asignables independientemente de un cumplimiento — rechazada: el documento fuente nunca describe un documento "por periodo" que no esté ligado a un cumplimiento; añadir esa columna sería alcance no solicitado y una fuente de inconsistencia.

## Decisión 4: Un documento con como máximo un Cumplimiento asociado — se ajusta la tabla de asociación de 015, no se reemplaza

**Decisión**: Se agrega `create unique index cumplimiento_fiscal_documentos_documento_unique on cumplimiento_fiscal_documentos(documento_id)`. La tabla, sus políticas RLS, su trigger de validación "mismo cliente" y sus acciones ya construidas en 015 (`asociarDocumentoCumplimiento`/`desasociarDocumentoCumplimiento`) se conservan sin cambios de forma; el nuevo índice único es lo que impone la regla de negocio "máximo un cumplimiento por documento" (Reglas de Integridad del spec 016) a nivel de base de datos.

**Rationale**: 015 ya construyó exactamente el mecanismo de asociación/desasociación con auditoría que 016 necesita; reescribirlo sería duplicar trabajo. Lo único que 015 no impuso (porque no lo necesitaba entonces) es la unicidad por documento — 016 la agrega con el índice mínimo necesario.

**Alternatives considered**: Reemplazar la tabla de asociación por una columna `cumplimiento_id` directa en `documentos` — rechazada: reescribiría triggers, políticas y Server Actions ya probados en 015 sin beneficio adicional sobre simplemente añadir un índice único.

## Decisión 5: Asociación directa con Obligación Fiscal — columna nueva, puramente informativa (Clarifications, Q1)

**Decisión**: `documentos` gana `obligacion_fiscal_id uuid references obligaciones_fiscales(id)` (nullable). Esta columna no participa en el cálculo de Documentos Generales/por Periodo (Decisión 3) — es exclusivamente un campo de búsqueda/filtro/contexto, tal como resolvió la clarificación: la organización visual del expediente es independiente de esta relación de negocio.

**Rationale**: Resuelto explícitamente por el usuario en la sesión de clarificación.

## Decisión 6: Documentos Esperados — configuración por obligación + snapshot por cumplimiento, disparado por trigger

**Decisión**: Dos tablas nuevas:

- `documentos_esperados_obligacion` (configuración vigente, editable por Administrador): `id, obligacion_fiscal_id, categoria_documento_id, activo, created_at/by, updated_at/by`. Único `(obligacion_fiscal_id, categoria_documento_id)`.
- `cumplimiento_documentos_esperados` (snapshot inmutable): `id, cumplimiento_id, categoria_documento_id, created_at`. Se llena automáticamente mediante un trigger `AFTER INSERT` sobre `cumplimientos_fiscales` que copia la configuración `activo = true` vigente para la obligación de ese cumplimiento (resuelta vía `obligacion_fiscal_cliente_id → obligaciones_fiscales_cliente.obligacion_fiscal_id`, o directamente `obligacion_fiscal_id` para cumplimientos extraordinarios).

El estado "disponible/faltante" de cada esperado se calcula en la capa de aplicación (igual que "vencida" en 015): para cada fila de `cumplimiento_documentos_esperados`, existe un `documento` no eliminado, con ese `categoria_documento_id`, asociado a ese cumplimiento vía `cumplimiento_fiscal_documentos`.

**Rationale**: Un trigger sobre `cumplimientos_fiscales` cubre automáticamente tanto la generación mensual (`generar_cumplimientos_fiscales`, 015) como los cumplimientos extraordinarios creados a mano (015 US4) sin modificar ninguna de esas dos rutas de inserción — evita duplicar la lógica de snapshot en dos lugares. Usar `categoria_documento_id` (el Tipo de Documento ya existente) como la unidad de "Documento Esperado" reutiliza el catálogo en vez de inventar un catálogo paralelo, y permite comparar "esperado vs. disponible" con un simple `EXISTS`.

**Alternatives considered**: Calcular los esperados "vigentes al momento" en cada lectura, comparando fechas de vigencia en `documentos_esperados_obligacion` — rechazada: el spec exige explícitamente que un cambio posterior en la configuración "no modifique retroactivamente el historial de cumplimiento" (FR-011), lo que pide una copia inmutable, no un cálculo histórico basado en fechas de vigencia (más complejo y con el mismo resultado).

## Decisión 7: Eliminación lógica — nuevo valor de enum + columnas de auditoría directa + trigger de permiso por antigüedad y rol

**Decisión**: `alter type documento_estado add value 'eliminado'`; `documentos` gana `eliminado_en timestamptz`, `eliminado_por uuid references auth.users(id)`. Un trigger `BEFORE UPDATE` sobre `documentos` detecta la transición `OLD.estado <> 'eliminado' AND NEW.estado = 'eliminado'` y verifica el rol del actor (`select role from public.profiles where id = auth.uid()`): Administrador siempre permitido; Contador/Auxiliar solo si `now() - OLD.fecha_carga <= interval '3 months'`; en cualquier otro caso `raise exception`. Las vistas operativas (expediente del cliente, vista global) filtran `estado <> 'eliminado'` en sus consultas, análogo a como el resto del sistema ya filtra por `estado = 'activo'`.

**Rationale**: RLS por sí sola no puede distinguir limpiamente "esta es la transición específica a eliminado" de "esta es cualquier otra actualización de metadatos" sin duplicar la misma lógica condicional dentro de la cláusula `WITH CHECK` — un trigger da un mensaje de error claro y sigue el mismo patrón ya usado en 015 (`validar_documento_mismo_cliente_cumplimiento`) de "RLS para la capacidad gruesa, trigger para la regla fina". La antigüedad se calcula siempre contra `fecha_carga` (nunca `updated_at`), satisfaciendo FR-023 directamente en la condición del trigger.

**Alternatives considered**: Tabla de "papelera" separada donde se mueve la fila al eliminar — rechazada explícitamente por el propio spec 016 (la papelera es una capacidad futura, fuera de alcance; el modelo debe _prepararse_ para ella, no implementarla ya).

## Decisión 8: `manage_documents` se extiende a Contador y Auxiliar

**Decisión**: `packages/auth/src/roles.ts` — `ROLE_DEFAULT_CAPABILITIES.contador` y `.auxiliar` agregan `'manage_documents'` (antes exclusivo de `administrador`). `specs/003-supabase-auth-roles/contracts/role-permissions.md` se actualiza para reflejar la nueva matriz. `view_documents` no cambia (ya estaba en los tres roles).

**Rationale**: El spec 016 exige que Contador y Auxiliar puedan cargar, clasificar, asociar y eliminar documentos (con límite de antigüedad solo en la eliminación, Decisión 7) — eso requiere la capacidad de escritura `manage_documents`, no solo lectura. El propio contrato de 003 documentaba esta capacidad como "sin módulo todavía" precisamente en espera de la feature que la usara primero; 016 es esa feature.

**Alternatives considered**: Dejar `manage_documents` exclusivo de Administrador y introducir una capacidad nueva más granular (`upload_documents`) — rechazada: añadiría una capacidad más a mantener sin beneficio, cuando el propio contrato de 003 ya reservó `manage_documents` para este propósito exacto.

## Decisión 9: Almacenamiento — bucket privado único + URLs firmadas de corta duración

**Decisión**: Un bucket de Supabase Storage privado (`expedientes`), con ruta `{cliente_id}/{documento_id}.pdf`. La subida ocurre desde una Server Action (usa la sesión del usuario, respeta RLS de Storage) que primero inserta la fila en `documentos` (para obtener el `id`) y luego sube el archivo a esa ruta; ver/descargar usa `createSignedUrl` con expiración corta (5 minutos). Ningún acceso público ni URL permanente.

**Rationale**: Satisface directamente FR-020 y la sección "Seguridad de los Documentos"/"Almacenamiento" del documento fuente. Usar el `id` del documento (no el nombre original) como nombre de archivo evita colisiones y no expone el nombre original en la ruta de almacenamiento.

**Alternatives considered**: Un bucket por cliente — rechazada, complica la administración de buckets sin beneficio de seguridad adicional (el aislamiento ya lo da la ruta + RLS de Storage por prefijo).

## Decisión 10: Vista global de Expedientes — mismo patrón de paginación/filtros en servidor que 015

**Decisión**: Nueva ruta `apps/portal/(app)/documentos-fiscales`, Server Component que pagina y filtra en el servidor (cliente, RFC, tipo, año/periodo, obligación, cumplimiento, fecha de alta, usuario que cargó), reutilizando el mismo estilo de `apps/portal/(app)/obligaciones-fiscales/page.tsx` (015): filtros vía `searchParams`, joins con `clientes`, `categorias_documento`, `cumplimientos_fiscales`, `obligaciones_fiscales`, y una consulta batch a `profiles` para nombres de usuario (mismo patrón ya usado para `responsable_id` en 015).

**Rationale**: Consistencia con el patrón ya validado en 015 para la primera pantalla transversal entre clientes; evita introducir un estilo de paginación/filtrado distinto.

**Alternatives considered**: Filtrado client-side sobre todo el dataset — rechazada por rendimiento a escala de "cientos de clientes, decenas de documentos cada uno" (constitución, "Rendimiento").
