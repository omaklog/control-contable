# Feature Specification: Contactos y Página de Detalle de Cliente

**Feature Branch**: `008-contactos-y-detalle-cliente`

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "Contactos: Agregar contactos a un cliente debe permitir agregar datos de contacto, como nombre del contacto, email y telefono, debe poder agregarse editarse y eliminarse desde el administrador y el portal, debemos hacer una pagina de detalle en admin y portal de cliente para poder visualizar los datos, su lista de contactos y su lista de pagos pendientes (que haremos mas adelante) ahi es donde debemos incluir las opciones para agregar nuevos contactos o servicios."

## Clarifications

### Session 2026-07-17

- Q: ¿Cómo debe comportarse "eliminar" un Contacto, dado que hoy la tabla no tiene baja lógica ni permiso de `delete`? → A: No se elimina — se marca como obsoleto (estado editable, sin borrado real) y además se agrega un indicador de "contacto principal" por Cliente.
- Q: ¿Qué tan visible debe ser la sección de "Pagos pendientes" en esta feature? → A: Visible como sección propia en la página de detalle del Cliente (sin lógica de cobranza todavía — ver Assumptions).
- Q: ¿El enlace hacia la página de detalle reemplaza alguna acción existente en los listados de Clientes? → A: No — se agrega junto a las acciones ya existentes (Editar/Eliminar en admin; ninguna en portal).

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Ver el detalle de un Cliente (Priority: P1) 🎯 MVP

Como Contador, Administrador o Auxiliar, quiero abrir una página de detalle de un Cliente para ver sus datos generales, su lista de Contactos y (más adelante) sus pagos pendientes, sin tener que buscar esa información en varias pantallas.

**Why this priority**: Es el punto de entrada de toda la funcionalidad de esta feature — sin la página de detalle no hay dónde mostrar ni gestionar los Contactos.

**Independent Test**: Con un Cliente ya existente (sin Contactos), abrir su página de detalle desde el listado de Clientes (admin y portal) y confirmar que se muestran sus datos generales y una lista de Contactos vacía.

**Acceptance Scenarios**:

1. **Given** un Cliente activo existe en el sistema, **When** el usuario navega a su página de detalle desde el listado de Clientes, **Then** se muestran sus datos generales (nombre, RFC, régimen fiscal, correo, teléfono, dirección fiscal, estado).
2. **Given** un Cliente sin Contactos registrados, **When** se abre su página de detalle, **Then** la sección de Contactos muestra un estado vacío.
3. **Given** un Cliente con uno o más Contactos, **When** se abre su página de detalle, **Then** se listan todos sus Contactos con nombre, teléfono y correo.
4. **Given** un usuario con capacidad `view_clients` (Auxiliar), **When** abre la página de detalle de un Cliente, **Then** puede ver sus datos y su lista de Contactos, pero no ve opciones para agregar, editar, marcar como obsoleto o designar como principal a ningún Contacto.

---

### User Story 2 - Gestionar los Contactos de un Cliente (Priority: P1)

Como Contador o Administrador, quiero agregar, editar y marcar como obsoletos los Contactos de un Cliente desde la página de detalle (tanto en el administrador como en el portal), y señalar cuál de ellos es el contacto principal, para mantener actualizados los datos de las personas con quienes nos comunicamos en cada Cliente sin perder su historial.

**Why this priority**: Es el objetivo funcional principal de esta feature — sin esto, la página de detalle sólo sería de lectura.

**Independent Test**: Desde la página de detalle de un Cliente, agregar un Contacto nuevo, editar sus datos, marcarlo como principal y luego marcarlo como obsoleto, confirmando en cada paso que la lista de Contactos se actualiza.

**Acceptance Scenarios**:

1. **Given** la página de detalle de un Cliente, **When** el usuario agrega un Contacto con nombre y teléfono (correo opcional), **Then** el Contacto aparece de inmediato en la lista, marcado como activo.
2. **Given** un Contacto existente, **When** el usuario edita su nombre, teléfono o correo y guarda, **Then** la lista refleja los datos actualizados.
3. **Given** un Contacto existente, **When** el usuario lo marca como obsoleto, **Then** deja de aparecer en la lista por defecto, pero puede volver a consultarse activando un filtro de "mostrar obsoletos"; el Contacto NO se elimina de forma definitiva.
4. **Given** un Contacto marcado como obsoleto, **When** el usuario lo reactiva, **Then** vuelve a aparecer en la lista por defecto como activo.
5. **Given** un Cliente con al menos un Contacto, **When** el usuario marca a uno de ellos como "contacto principal", **Then** ese Contacto queda identificado como principal y, si existía otro marcado como principal, deja de estarlo (sólo puede haber un contacto principal a la vez por Cliente).
6. **Given** el formulario de alta o edición de un Contacto, **When** se intenta guardar sin nombre o sin teléfono, **Then** se muestra un error de validación y no se guarda el Contacto.
7. **Given** un Contacto agregado o modificado desde el portal, **When** se abre la página de detalle del mismo Cliente en el administrador, **Then** los cambios son visibles ahí también (y viceversa).

---

### User Story 3 - Reservar el espacio para pagos pendientes (Priority: P3)

Como Contador o Administrador, quiero que la página de detalle de un Cliente ya tenga un lugar reservado para su lista de pagos pendientes, para que cuando esa funcionalidad se construya más adelante no sea necesario rediseñar la página.

**Why this priority**: Es explícitamente un adelanto de una funcionalidad futura (cobranza) — no bloquea el valor de las Historias 1 y 2, pero el usuario pidió dejar el lugar listo.

**Independent Test**: Abrir la página de detalle de cualquier Cliente y confirmar que existe una sección de "Pagos pendientes" claramente identificada, sin necesidad de que muestre datos reales todavía.

**Acceptance Scenarios**:

1. **Given** la página de detalle de un Cliente, **When** se revisa la página completa, **Then** existe una sección de "Pagos pendientes" visualmente diferenciada de la de Contactos.

---

### Edge Cases

- ¿Qué pasa si dos usuarios editan el mismo Contacto al mismo tiempo? El último guardado exitoso prevalece (mismo comportamiento que la edición de Clientes existente).
- ¿Qué pasa si se intenta abrir la página de detalle de un Cliente que no existe o al que el usuario no tiene acceso? Se muestra un estado "no encontrado" sin exponer datos de otros Clientes.
- ¿Qué pasa si se marca como obsoleto un Contacto que ya fue marcado como obsoleto por otro usuario (por ejemplo, doble clic)? La operación es idempotente: el Contacto simplemente queda (o permanece) como obsoleto, sin error visible.
- ¿Qué pasa si se marca como principal un Contacto de un Cliente que no tiene ningún Contacto activo previo? Queda como principal sin necesidad de desmarcar a nadie más.
- ¿Qué pasa si el único contacto principal de un Cliente se marca como obsoleto? El Cliente queda temporalmente sin contacto principal marcado, hasta que se designe uno nuevo (activo u obsoleto).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema DEBE proveer una página de detalle de Cliente en el administrador y otra en el portal, accesibles desde sus respectivos listados de Clientes.
- **FR-002**: La página de detalle DEBE mostrar los datos generales del Cliente (nombre, RFC, tipo de persona, régimen fiscal, correo, teléfono, dirección fiscal, estado).
- **FR-003**: La página de detalle DEBE mostrar la lista completa de Contactos activos del Cliente (nombre, teléfono, correo, indicador de contacto principal), con la opción de mostrar también los obsoletos.
- **FR-004**: El sistema DEBE permitir agregar un Contacto a un Cliente con nombre (obligatorio), teléfono (obligatorio) y correo (opcional).
- **FR-005**: El sistema DEBE permitir editar los datos de un Contacto existente (nombre, teléfono, correo).
- **FR-006**: El sistema NO DEBE eliminar un Contacto de forma definitiva; en su lugar, DEBE permitir marcarlo como obsoleto (y reactivarlo posteriormente), conservando su historial.
- **FR-007**: El sistema DEBE permitir designar a un Contacto de un Cliente como su "contacto principal"; sólo puede haber un contacto principal a la vez por Cliente, y al marcar uno nuevo se retira automáticamente la marca de principal del anterior (si existía).
- **FR-008**: Sólo los usuarios con la capacidad de gestión de Clientes (`manage_clients`) DEBEN poder agregar, editar, marcar como obsoleto/reactivar, o designar como principal a un Contacto; los usuarios con acceso de sólo lectura (`view_clients`) DEBEN poder ver la página de detalle y la lista de Contactos, pero no esas opciones de gestión.
- **FR-009**: Los cambios en los Contactos de un Cliente hechos desde una app (administrador o portal) DEBEN reflejarse de inmediato al consultar el mismo Cliente desde la otra app.
- **FR-010**: El formulario de alta/edición de Contacto DEBE validar que el nombre y el teléfono no estén vacíos antes de permitir guardar.
- **FR-011**: La página de detalle DEBE incluir una sección visible de "Pagos pendientes" del Cliente, sin lógica de cobranza (montos, vencimientos, generación de cargos) en esta feature — ver Assumptions.
- **FR-012**: El listado de Clientes del administrador DEBE agregar un enlace/botón hacia la página de detalle en cada fila, sin remover sus acciones existentes (Editar, Dar de baja); el listado de Clientes del portal DEBE agregar el mismo enlace hacia el detalle en cada fila.

### Key Entities _(include if feature involves data)_

- **Contacto**: Persona de contacto de un Cliente. Atributos: nombre, teléfono, correo (opcional), estado (activo/obsoleto — reemplaza la eliminación definitiva) e indicador de contacto principal (a lo más uno por Cliente). Pertenece a un único Cliente; un Cliente puede tener varios Contactos.
- **Cliente**: Entidad ya existente (005/006/007) — esta feature agrega una vista de detalle que consolida su información junto con sus Contactos y (a futuro) sus pagos pendientes.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Un usuario con permiso de gestión puede agregar un Contacto nuevo a un Cliente en menos de 30 segundos desde que abre la página de detalle.
- **SC-002**: El 100% de los Contactos agregados, editados, marcados como obsoletos/reactivados o redesignados como principal desde una app aparecen correctamente reflejados en la otra app sin intervención manual.
- **SC-003**: El 100% de los intentos de guardar un Contacto sin nombre o sin teléfono son rechazados con un mensaje de error claro.
- **SC-004**: Los usuarios de sólo lectura (Auxiliar) pueden llegar a la página de detalle de un Cliente y consultar su lista de Contactos, pero no tienen forma de agregar, editar, marcar como obsoleto o designar como principal a ninguno.
- **SC-005**: En ningún momento un Cliente queda con más de un Contacto marcado simultáneamente como principal.

## Assumptions

- Un Contacto pertenece exactamente a un Cliente (sin Contactos compartidos entre Clientes).
- El modelo de capacidades reutiliza `view_clients` (lectura) y `manage_clients` (gestión) ya definido para Clientes — no se introduce una capacidad nueva específica para Contactos.
- La página de detalle es una pantalla adicional a los listados existentes de Clientes (admin y portal); esta feature no rediseña esos listados salvo por la incorporación del enlace hacia el detalle (FR-012).
- La sección de "Pagos pendientes" de la página de detalle es visible en esta feature (no se omite), pero no incluye ninguna lógica de negocio de cobranza real (cálculo de montos, vencimientos, generación/consulta de cargos) — el diseño detallado de esa sección (qué datos mostrar y cómo) se define en la feature de cobranza que la construya; aquí sólo se reserva y rotula el espacio dentro del layout de la página de detalle.
- "Obsoleto" reemplaza por completo a la eliminación de Contactos en esta feature: no existe un borrado definitivo desde la interfaz.
- No se agrega auditoría (`business_audit_log`) para los cambios de Contactos en esta feature — los Contactos no son una entidad financiera crítica como Clientes o pagos.
