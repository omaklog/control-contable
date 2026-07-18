# Feature Specification: Editar y Eliminar Clientes (Panel Administrativo)

**Feature Branch**: `006-crud-clientes-admin`

**Created**: 2026-07-16

**Status**: Draft

**Input**: User description: "Crud de Clientes, este modulo se enfocará en dar de alta clientes desde el administrador, podra editar, actualizar y eliminar(soft delete) clientes, tendremos una lista paginada para ver los clientes con una columna con las diferentes opciones boton de agregar nuevo cliente con su formulario reutilizable para editar, al elminar mostrar warnings de confirmacion antes de eliminar etc"

## Clarifications

### Session 2026-07-16

- Q: ¿El formulario reutilizable de Cliente debe incluir también la gestión de sus Contactos, o solo los datos propios del Cliente? → A: Solo datos del Cliente — la gestión de Contactos se deja para una feature posterior dedicada.
- Q: ¿El formulario debe incluir el campo "Responsable asignado"? → A: No, queda fuera de esta feature.
- Q: ¿Cómo debe tratar el listado paginado a los clientes dados de baja (inactivos)? → A: Ocultarlos por defecto, con un filtro para mostrarlos cuando se necesite.

### Session 2026-07-16 (segunda sesión, mismo día)

- Q: ¿Debe la alta (creación) de clientes formar parte de este módulo en el Panel Administrativo? → A: No — la alta se realiza desde una feature futura en `apps/portal`; este módulo del Panel Administrativo se reduce a **editar y dar de baja (eliminar)** clientes ya existentes, sobre el listado paginado.
- Q: ¿Qué nivel de acceso debe tener el rol Auxiliar sobre Clientes? → A: Solo consulta (ver el listado); Auxiliar no puede crear, editar ni eliminar clientes en ningún módulo — consistente con la capacidad `view_clients` (sin `manage_clients`) ya asignada por defecto en `005-clientes-cobranza-expedientes`, que no requiere cambios.

### Session 2026-07-16 (tercera sesión, mismo día)

- Q: `apps/admin` no tiene ningún menú de navegación hoy (solo botones sueltos en la página de inicio, condicionados por capacidad) — ¿cómo se agrega el acceso a Clientes? → A: Agregar un botón más en la página de inicio, con el mismo patrón ya usado para "Gestión de usuarios" y "Auditoría" — visible solo si el usuario tiene `view_clients` o `manage_clients`. **Superada más abajo (sesión 2026-07-18)**: ese patrón de botones ya no existe — reemplazado por el menú lateral persistente de `004-portal-main-layout` (Rework #1), construido el mismo día pero después de esta decisión.
- Q: `apps/portal` ya tiene una entrada "Clientes" en su menú marcada "Próximamente" (sin pantalla real ahí) — ¿qué cambio se espera en esa entrada dentro de esta feature? → A: Actualizar su texto/tooltip para aclarar que la edición y baja de clientes ya están disponibles desde el Panel Administrativo, aunque el alta desde el portal siga pendiente de una feature futura. **Superada más abajo (sesión 2026-07-18)**: `007-alta-cliente-portal` ya implementó el alta completa en el portal — la entrada ya no está pendiente en absoluto.

### Session 2026-07-18 (alineación con `001-business-domain-model` y `docs/ux/design-system.md`)

- Contexto: dos features posteriores a esta (ambas también del 2026-07-16 o después) reemplazaron por completo los mecanismos que FR-016/FR-017 describían, sin que este spec se actualizara: `004-portal-main-layout` (Rework #1, mismo día) le dio a `apps/admin` un menú lateral persistente (reemplazando los "botones sueltos en la página de inicio" que FR-016 describe) y `007-alta-cliente-portal` implementó el alta de clientes en `apps/portal` (dejando obsoleto el mecanismo `pendingLabel`/tooltip que FR-017 y su implementación —`tasks.md` T027— construyeron específicamente para anunciar que esa alta "seguía pendiente").
- Q: ¿Se corrigen FR-016/FR-017 y la Assumption sobre "apps/admin sin menú persistente" para reflejar la arquitectura real? → A: Sí — ver FR-016/FR-017 (reescritos) y Assumptions. No es una decisión de producto nueva, es documentar lo que ya construyeron `004` y `007`.
- Q: ¿Se agrega una referencia a los gaps de `design-system.md` §10 (acciones de fila siempre visibles, "Estado" como texto plano en `ClientesClient.tsx`) ya que 006 es dueño de esa pantalla? → A: Sí, como nota de Assumptions — sin aplicar el cambio de código aquí (ya está registrado como pendiente en `design-system.md`, no se duplica el seguimiento).

### Session 2026-07-18 (segunda sesión, `/speckit-clarify`)

- Q: El Acceptance Scenario 3 de la Historia 1 y su Edge Case dicen que el estado vacío del listado "invita a agregar el primer cliente" — pero FR-015 excluye explícitamente el alta de este módulo (se hace desde `apps/portal`), y el código real (`ClientesClient.tsx`) ya muestra solo un mensaje plano sin ninguna invitación. ¿Se corrige el texto del spec para que coincida con FR-015 y con la implementación? → A: Sí — el estado vacío muestra un mensaje plano explicando que no hay clientes, sin invitar a agregar (no hay ningún botón de alta en este módulo al que esa invitación pudiera apuntar).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Consultar la lista paginada de clientes (Priority: P1)

Un miembro del personal con acceso al Panel Administrativo (hoy, solo Administrador — ver `003-supabase-auth-roles`) abre el módulo de Clientes y ve un listado paginado de todos los clientes registrados, con una columna de acciones disponible por cada fila.

**Why this priority**: Es la vista base sobre la que ocurren todas las demás interacciones de este módulo (edición, baja) — sin ella no hay forma de localizar un cliente para operar sobre él.

**Independent Test**: Puede probarse sembrando clientes directamente en la base de datos (sin usar el formulario de esta feature) y verificando que aparecen correctamente listados, paginados y con su columna de acciones.

**Acceptance Scenarios**:

1. **Given** existen más clientes de los que caben en una página, **When** el personal abre el listado, **Then** ve solo la primera página y puede navegar a las páginas siguientes.
2. **Given** el listado de clientes, **When** el personal lo consulta, **Then** cada fila muestra al menos nombre/razón social, RFC, correo y estado (activo/inactivo).
3. **Given** no existe ningún cliente registrado todavía, **When** el personal abre el listado, **Then** ve un mensaje de estado vacío claro explicando que no hay clientes registrados — sin invitar a agregar uno, ya que el alta no es parte de este módulo (FR-015).
4. **Given** existen clientes activos e inactivos, **When** el personal abre el listado sin aplicar ningún filtro, **Then** solo ve los clientes activos.
5. **Given** el listado de clientes, **When** el personal activa el filtro para mostrar inactivos, **Then** también ve los clientes dados de baja.
6. **Given** el personal con capacidad `view_clients` o `manage_clients` está en el Panel Administrativo, **When** consulta el menú de navegación (`004-portal-main-layout`, Rework #1), **Then** ve una entrada "Clientes" que lo lleva al listado.

---

### User Story 2 - Editar los datos de un cliente existente (Priority: P1)

Un miembro del personal selecciona la opción de editar desde la columna de acciones de un cliente en el listado; se abre un formulario prellenado con los datos actuales del cliente, y al guardar los cambios se reflejan de inmediato en el listado.

**Why this priority**: Es la operación de escritura central de este módulo — la alta ocurre desde `apps/portal` (fuera de esta especificación, ver Clarifications), así que editar es la principal forma en que el Panel Administrativo modifica datos de Cliente.

**Independent Test**: Puede probarse editando un cliente ya existente (sembrado directamente o dado de alta desde `apps/portal`), confirmando que el formulario se prellena correctamente y que los cambios se guardan.

**Acceptance Scenarios**:

1. **Given** un cliente existente, **When** el personal elige "Editar" desde la columna de acciones, **Then** se abre el formulario prellenado con los datos actuales de ese cliente.
2. **Given** el formulario de edición abierto, **When** el personal modifica uno o más campos y guarda, **Then** el listado refleja de inmediato los cambios.
3. **Given** el formulario de edición, **When** el personal intenta guardar un cambio que viola una regla de negocio ya existente (RFC duplicado, régimen fiscal incompatible o no vigente), **Then** el sistema rechaza el guardado y muestra un mensaje de error claro.
4. **Given** un cliente dado de baja (inactivo), **When** el personal lo edita, **Then** el sistema permite corregir sus datos igualmente, sin reactivarlo automáticamente.

---

### User Story 3 - Dar de baja un cliente con confirmación (Priority: P2)

Un miembro del personal elige la opción de eliminar desde la columna de acciones de un cliente; el sistema muestra un diálogo de advertencia pidiendo confirmación explícita antes de aplicar la baja (soft delete), sin eliminar físicamente su información.

**Why this priority**: Depende de que ya existan clientes que dar de baja; es la operación más sensible del módulo, de ahí la prioridad más baja pero el requisito explícito de confirmación.

**Independent Test**: Puede probarse eligiendo "Eliminar" sobre un cliente existente, confirmando que aparece el diálogo de advertencia, y verificando tanto el camino de cancelar (nada cambia) como el de confirmar (el cliente pasa a inactivo sin desaparecer de la base de datos).

**Acceptance Scenarios**:

1. **Given** un cliente activo, **When** el personal elige "Eliminar" desde la columna de acciones, **Then** el sistema muestra un diálogo de confirmación explícito antes de aplicar cualquier cambio.
2. **Given** el diálogo de confirmación de baja, **When** el personal cancela, **Then** el cliente permanece sin cambios.
3. **Given** el diálogo de confirmación de baja, **When** el personal confirma, **Then** el cliente pasa a estado inactivo (soft delete) sin eliminarse físicamente, y su historial permanece consultable.

---

### Edge Cases

- ¿Qué pasa si se intenta editar el RFC de un cliente a uno que ya usa otro cliente activo? El sistema rechaza el guardado (RFC único entre clientes activos, ya definido en el modelo de datos).
- ¿Qué pasa si se intenta cambiar el tipo de persona de un cliente a uno incompatible con su régimen fiscal ya asignado? El sistema revalida la combinación tipo de persona + régimen fiscal al guardar y rechaza si no es compatible.
- ¿Qué pasa si no existe ningún cliente registrado todavía? El listado muestra un mensaje de estado vacío explicando que no hay clientes registrados, sin invitar a agregar uno — el alta no es parte de este módulo (FR-015; ver US1, AS3).
- ¿Qué pasa si el personal cierra el formulario de edición sin guardar? No se aplica ningún cambio.
- ¿Qué pasa si se intenta dar de baja un cliente que tiene cargos de cobranza pendientes o documentos activos en su expediente? La baja procede igual — los cargos y documentos existentes no se cancelan ni se ocultan automáticamente (mismo comportamiento ya definido en 005-clientes-cobranza-expedientes).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar, dentro del Panel Administrativo, un listado paginado de todos los Clientes registrados.
- **FR-002**: Cada fila del listado DEBE mostrar, como mínimo: nombre o razón social, RFC, correo, y estado (activo/inactivo).
- **FR-003**: Cada fila del listado DEBE incluir una columna de acciones con, como mínimo, las opciones de editar y de dar de baja (eliminar) el cliente.
- **FR-004**: El formulario de edición DEBE prellenarse con los datos actuales del cliente seleccionado desde la columna de acciones.
- **FR-005**: El formulario DEBE capturar, como mínimo, los campos ya definidos para Cliente: nombre o razón social, tipo de persona, RFC, régimen fiscal, correo, teléfono y dirección fiscal.
- **FR-006**: El sistema DEBE validar en el formulario las mismas reglas de negocio ya establecidas a nivel de datos: RFC único entre clientes activos, y régimen fiscal compatible con el tipo de persona y vigente; DEBE mostrar un mensaje de error claro cuando una de estas reglas se viole, sin perder los datos capturados.
- **FR-007**: Al elegir dar de baja (eliminar) un cliente, el sistema DEBE mostrar un diálogo de confirmación explícito antes de aplicar cualquier cambio.
- **FR-008**: Dar de baja un cliente NUNCA DEBE eliminarlo físicamente; DEBE aplicar el mismo soft-delete (cambio de estado a inactivo) ya definido en el modelo de datos, conservando su historial consultable.
- **FR-009**: El sistema DEBE permitir editar los datos de un cliente sin importar si está activo o inactivo, sin reactivarlo automáticamente por el solo hecho de editarlo.
- **FR-010**: El acceso para editar o dar de baja clientes desde el Panel Administrativo DEBE requerir la capacidad `manage_clients`; el acceso de solo consulta al listado DEBE requerir `view_clients` o `manage_clients` (capacidades ya definidas en 005-clientes-cobranza-expedientes, sin cambios). El rol Auxiliar (que solo tiene `view_clients`) DEBE poder consultar el listado, pero NUNCA DEBE ver ni ejecutar las acciones de editar o dar de baja.
- **FR-011**: El listado paginado DEBE permitir navegar entre páginas cuando el número de clientes exceda el tamaño de una página.
- **FR-012**: El formulario DEBE capturar únicamente los datos propios del Cliente; la gestión de Contactos (agregar/editar/eliminar) queda fuera de alcance de esta feature y se abordará en una feature posterior dedicada.
- **FR-013**: El formulario NO DEBE incluir en esta feature el campo de responsable asignado; ese campo queda fuera de alcance por ahora.
- **FR-014**: El listado paginado DEBE ocultar por defecto los clientes dados de baja (inactivos), y DEBE ofrecer un filtro que permita al personal mostrarlos cuando lo necesite.
- **FR-015**: La alta (creación) de clientes NO forma parte de esta feature; se realiza desde una feature futura en `apps/portal` (ver Clarifications, sesión 2026-07-16 (segunda sesión), y Assumptions).
- **FR-016**: El sistema DEBE ofrecer, dentro del Panel Administrativo, una entrada de navegación "Clientes" que enlace al listado paginado, visible solo si el usuario tiene la capacidad `view_clients` o `manage_clients`. **Actualizado 2026-07-18**: el mecanismo original (un botón en la página de inicio, mismo patrón que "Gestión de usuarios"/"Auditoría") ya no existe — `004-portal-main-layout` (Rework #1) sustituyó todos los botones sueltos de `apps/admin` por un menú lateral persistente (`apps/admin/src/components/layout/navigation.ts`); "Clientes" vive ahí hoy, gateado por la misma capacidad. El requisito de fondo (acceso condicionado por capacidad, sin cambios) sigue cumplido, solo cambió el mecanismo de navegación que lo satisface.
- **FR-017**: ~~La entrada "Clientes" del menú de `apps/portal` (marcada "Próximamente") DEBE actualizar su texto/tooltip para aclarar que la edición y baja de clientes ya están disponibles desde el Panel Administrativo, aunque el alta desde el portal siga pendiente de una feature futura.~~ **Superado 2026-07-18**: `007-alta-cliente-portal` implementó el alta completa de clientes en `apps/portal` — la entrada "Clientes" de su menú ya está `implemented: true`, sin marcador "Próximamente" ni tooltip aclaratorio (el mecanismo `pendingLabel` construido específicamente para este FR ya no se usa ahí). Este requisito queda retirado, sin reemplazo — su propósito ya no aplica.

### Key Entities _(include if feature involves data)_

- **Cliente**, **Contacto** y **Régimen Fiscal**: entidades y reglas de negocio ya definidas en `005-clientes-cobranza-expedientes` (modelo de datos, migraciones y validaciones ya implementadas). Esta feature no modifica su esquema — construye las pantallas de captura y consulta sobre ese modelo ya existente.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: El personal puede editar y guardar los cambios de un cliente existente en menos de 2 minutos.
- **SC-002**: El 100% de los intentos de dar de baja un cliente pasan primero por un diálogo de confirmación explícito — ninguna baja ocurre sin esa confirmación.
- **SC-003**: El 100% de los clientes dados de baja permanecen consultables, sin pérdida de su información ni de su historial.
- **SC-004**: El personal puede localizar un cliente específico navegando el listado paginado sin recargar la página completa entre páginas.

## Assumptions

- Esta feature no incluye un cuadro de búsqueda/filtro por texto sobre el listado — solo paginación; una función de búsqueda queda fuera de alcance y se evaluará en una fase posterior si se requiere.
- El módulo se construye dentro de `apps/admin` (Panel Administrativo) y se limita a **editar y dar de baja** clientes ya existentes (ver Clarifications, sesión 2026-07-16 (segunda sesión)). La **alta** de clientes se construirá en una feature futura dentro de `apps/portal`, alineado con la gestión diaria de clientes que la constitución del proyecto ya ubicaba ahí; esa feature futura deberá, a su vez, definir qué roles pueden dar de alta (al menos Contador y Administrador; Auxiliar queda excluido de crear/editar/eliminar en cualquier módulo, ver FR-010).
- **(Superada 2026-07-18, ver FR-016)** `apps/admin` no tiene un menú de navegación persistente — el acceso a los módulos existentes (Usuarios, Auditoría) se hace mediante botones en la página de inicio, condicionados por capacidad. Esta feature sigue ese mismo patrón para Clientes (FR-016) en vez de construir un menú/sidebar nuevo; si una feature futura decide dar a `apps/admin` un menú persistente (similar al de `apps/portal`), ese cambio deberá cubrir todos los módulos existentes, no solo Clientes — queda fuera de alcance aquí. **Ya sucedió**: `004-portal-main-layout` (Rework #1) le dio a `apps/admin` exactamente ese menú persistente, cubriendo Inicio/Usuarios/Clientes/Auditoría de una sola vez.
- **(2026-07-18)** `ClientesClient.tsx` (esta feature) no sigue dos reglas generales de `docs/ux/design-system.md` (publicado después de construir esta pantalla): acciones de fila siempre visibles en vez de solo al hacer hover (§5), y la columna "Estado" como texto plano en vez de un Chip semántico (§4). Ya registrado como pendiente en `docs/ux/design-system.md` §10 (punto 1) junto con el mismo gap de `ClienteDetalleClient.tsx` (`008`) — sin cambio de alcance funcional aquí, el seguimiento vive en ese documento, no se duplica en esta especificación.
- No se define en esta especificación un mecanismo de control de concurrencia optimista (por ejemplo, detectar ediciones simultáneas de dos usuarios sobre el mismo cliente); en caso de edición simultánea, la última en guardarse prevalece.
- El tamaño de página y el orden por defecto del listado (por ejemplo, alfabético por nombre) son detalles de implementación que se definirán en la fase de planeación, no en esta especificación de negocio.
- El formulario reutiliza y respeta las mismas reglas de integridad ya implementadas a nivel de base de datos en `005-clientes-cobranza-expedientes` (RFC único entre activos, compatibilidad y vigencia de régimen fiscal); esta especificación no redefine esas reglas, solo exige que el formulario las respete y comunique sus violaciones con claridad.
