# Research: Módulo de Administración de Catálogos

## 1. ¿Cómo representar "Administración > Catálogos" en la navegación existente?

**Decision**: Una única entrada plana `Catálogos` en `MENU_ITEMS` (`apps/admin/src/components/layout/navigation.ts`), gateada por `capability: 'manage_catalogs'` (la capability ya existente, reutilizada de 011), con `href: '/catalogos'`. Esa ruta renderiza el "hub" (lista de catálogos disponibles — en v1, solo Periodicidades), y cada catálogo tiene su propia subruta (`/catalogos/periodicidades`).

**Rationale**: `MenuItem`/`visibleMenuItems` (`packages/ui/src/navigation.ts`) implementan una lista plana sin soporte de submenús anidados — `isActiveMenuItem` resalta por prefijo de ruta, lo cual ya cubre correctamente subrutas como `/catalogos/periodicidades` bajo la entrada padre `/catalogos` sin cambios adicionales. Construir un mecanismo de menú anidado de varios niveles solo para esta feature sería una inversión de infraestructura no solicitada por el spec (Assumptions: "no se asume una estructura de menú anidada de varios niveles"). El comentario existente en `navigation.ts` ("sin marcadores 'Próximamente' para módulos administrativos futuros (Catálogos, Configuración) aún no especificados") anticipaba exactamente esta feature — se actualiza al implementar.

**Alternatives considered**:

- Submenú anidado bajo "Administración" con Catálogos como hijo: requeriría extender `MenuItem` con `children` y el layout con soporte de expansión/colapso — sobre-ingeniería para un solo catálogo hijo en v1.
- Registrar cada catálogo como entrada de nivel superior (sin hub): contradice FR-012 ("todos los catálogos deben ser accesibles desde un único punto de entrada").

## 2. Selección mediante Autocomplete (FR-007) — no hay precedente en el código

**Decision**: El propio listado de Periodicidades usa `@mui/material/Autocomplete` como control de búsqueda/filtrado (búsqueda por escritura anticipada sobre `nombre`), en lugar del patrón "campo de texto + botón Buscar" usado por `ServiciosClient.tsx`/`UsuariosClient.tsx`. Esto satisface de forma demostrable el criterio de prueba de Historia 4 ("puede probarse buscando un valor del catálogo de Periodicidades escribiendo parte de su nombre y confirmando que aparece como sugerencia seleccionable") sin necesitar un módulo consumidor externo (Gestión Fiscal, que aún no existe).

**Rationale**: Se confirmó vía `grep -rl "Autocomplete" apps packages --include="*.tsx"` que ningún componente del monorepo usa hoy `Autocomplete` de MUI — no hay un patrón compartido que reutilizar todavía. Dado que solo hay un catálogo protegido concreto en esta feature, se implementa el control directamente en `PeriodicidadesClient.tsx` en vez de crear un componente reutilizable prematuro en `packages/ui` (mismo criterio que la Structure Decision del plan: extraer cuando exista una segunda consumidora real).

**Alternatives considered**:

- Un componente genérico `CatalogoAutocomplete<T>` en `packages/ui` reutilizable por cualquier catálogo futuro: descartado por ahora (YAGNI — un solo uso real hoy); queda como candidato natural de extracción cuando la siguiente especificación de catálogo (p. ej. Tipos de Documento) lo necesite.

## 3. Esquema de la tabla `periodicidades`

**Decision**: Tabla dedicada `public.periodicidades` (no polimórfica, FR-010), con las columnas mínimas exigidas por el contrato común (FR-002/FR-004/FR-005/FR-006):

| Columna       | Tipo          | Notas                                                             |
| ------------- | ------------- | ----------------------------------------------------------------- |
| `id`          | `uuid`        | PK, `gen_random_uuid()`                                           |
| `nombre`      | `text`        | obligatorio; único solo entre registros `activo` (índice parcial) |
| `descripcion` | `text`        | opcional                                                          |
| `estado`      | enum          | `periodicidad_estado` (`activo`/`inactivo`), default `activo`     |
| `created_at`  | `timestamptz` | default `now()`                                                   |
| `updated_at`  | `timestamptz` | default `now()`                                                   |
| `created_by`  | `uuid`        | FK `auth.users`, nullable (poblado por el seed de la migración)   |
| `updated_by`  | `uuid`        | FK `auth.users`, nullable                                         |

**Rationale**: Mismo patrón de columnas que `servicios` (011) y `regimenes_fiscales` (auditoría + estado). La unicidad de `nombre` se implementa como índice único parcial `where estado = 'activo'` (idéntico criterio a como `clientes` valida RFC único solo entre clientes activos) — permite reutilizar un nombre después de inactivar un registro (Edge Cases del spec).

**Alternatives considered**:

- Constraint `unique(nombre)` simple (sin filtrar por estado): rechazado — impediría reutilizar un nombre inactivado, violando explícitamente el edge case del spec.
- Añadir `created_by`/`updated_by` como `not null`: rechazado para v1 porque el catálogo se puebla por una migración/seed (sin usuario autenticado en ese contexto), no por un formulario de Administrador; quedan nullable y sin usarse activamente hasta que Periodicidades (u otro catálogo) deje de ser protegido.

## 4. RLS: "protegido" se garantiza en la base de datos, no solo en la UI

**Decision**: `periodicidades` tiene **una sola política RLS**: `periodicidades_select_all_staff`, análoga a `servicios_select_all_staff` (`exists (select 1 from public.profiles where id = auth.uid() and is_active)`). No se otorga ningún `grant insert/update/delete` ni política alguna de escritura a `authenticated` — ni siquiera condicionada a `has_capability('manage_catalogs')`.

**Rationale**: El spec es explícito: "un catálogo protegido no admite operaciones de creación, edición, activación o inactivación... para ningún usuario, ni siquiera Administrador" (FR-014, Edge Cases). Si se otorgara `insert`/`update` gateado por `manage_catalogs` (como en `servicios`) y simplemente se ocultaran los botones en la UI, cualquier llamada directa a la API de Supabase por parte de un Administrador podría escribir en el catálogo — una violación de la Constitución ("nunca confiar únicamente en validaciones del frontend"). Omitir las políticas de escritura por completo hace que la protección sea una garantía de la base de datos, no una convención de interfaz.

**Alternatives considered**:

- Políticas de escritura restringidas a `service_role` únicamente: equivalente en efecto (el rol `authenticated` nunca podría escribir), pero como no se necesita ninguna ruta de escritura ni siquiera administrativa en v1, es más simple omitir las políticas de escritura del todo; se documenta en `contracts/db-functions-rls.md` como el patrón a seguir si en el futuro Periodicidades (u otro catálogo) deja de ser protegido.

## 5. Auditoría de negocio (`business_audit_log`) — no aplica a un catálogo sin escritura

**Decision**: No se integra `log_business_audit()` para `periodicidades` en esta feature. Las columnas `created_at`/`updated_at`/`created_by`/`updated_by` satisfacen el requisito de auditoría de nivel de fila (FR-006) sin necesidad de eventos de negocio, ya que no existe ninguna acción de alta/edición/activación/inactivación expuesta a auditar.

**Rationale**: `business_audit_log` (005) registra eventos de transiciones de negocio (alta, cambio de estado, etc.) disparados por triggers en `insert`/`update` — no hay tales transiciones en un catálogo protegido de solo lectura. El contrato documentado en `contracts/db-functions-rls.md` especifica que un catálogo **editable** futuro (p. ej. Tipos de Documento) SÍ debe integrar `log_business_audit()` siguiendo el mismo patrón que `servicios` (011), ya que ese sí tendrá transiciones reales que auditar.

## 6. Contenido inicial de Periodicidades

**Decision**: Se siembra en la propia migración un conjunto inicial razonable y suficiente para el dominio de un despacho contable mexicano: `Mensual`, `Bimestral`, `Trimestral`, `Semestral`, `Anual`. Ninguna se marca `inactivo`.

**Rationale**: El spec deja explícitamente fuera de su alcance el listado exacto de valores ("su contenido inicial se resuelve como parte de la implementación de este módulo, sin que este spec defina el listado exacto de valores" — Assumptions). Estas cinco periodicidades cubren los ciclos de obligaciones fiscales mexicanas más comunes (pagos provisionales mensuales de ISR/IVA, declaraciones bimestrales del RIF/RESICO, etc.) y son consistentes con el propósito declarado del catálogo (apoyar el futuro módulo de Gestión Fiscal).
