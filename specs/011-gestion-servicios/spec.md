# Feature Specification: Módulo de Servicios

**Feature Branch**: `011-gestion-servicios`

**Created**: 2026-07-18

**Status**: Draft

**Input**: User description: "MODULO DE SERVICIOS. Objetivo: Administrar el catálogo de servicios ofrecidos por el despacho y la relación contractual de los servicios asignados a cada cliente. El módulo deberá permitir configurar los servicios disponibles, asignarlos a clientes, administrar precios, estados y vigencias, así como proporcionar información a otros módulos del sistema. Alcance: catálogo de servicios, servicios contratados por cliente, precio acordado por cliente, estado del servicio, vigencia, historial de cambios, auditoría. Fuera de alcance: cobranza, pagos, obligaciones fiscales, documentos, notificaciones. Incluye reglas de unicidad de servicio por cliente, reglas de precio (definido al asignar, no en el catálogo; cambios futuros no retroactivos), estados (Activo/Suspendido/Finalizado), vigencia (inicio/fin), historial de cambios y auditoría de eventos. Pantallas: Catálogo de Servicios (filtros por nombre/categoría/estado; crear/editar/activar/desactivar) y Servicios del Cliente dentro de Cliente 360 (listado con precio/estado/inicio/fin/observaciones; agregar servicio/cambiar precio/suspender/finalizar/ver historial). Dependencias: proporciona información a Cobranza, Gestión Fiscal y Reportes, cada uno con sus propias reglas."

## Clarifications

### Session 2026-07-18

- Q: Cada servicio del catálogo tiene una "Categoría" (además de Nombre, Descripción, Estado) y el listado se filtra por Categoría. ¿La Categoría es un catálogo administrado por separado (como ya ocurre con Régimen Fiscal o Categoría de Documento), o es un campo de texto libre que la persona que crea el servicio escribe directamente? → A: Campo de texto libre capturado directamente en el servicio (sin pantalla de administración de categorías separada) — el filtro por categoría en el listado usa los valores ya existentes entre los servicios registrados, no una lista predefinida.
- Q: Un servicio contratado puede estar Activo, Suspendido o Finalizado; el texto original describe Finalizado como "concluyó definitivamente" pero también como reactivable. ¿Reactivar un servicio contratado Finalizado continúa el mismo registro (mismo historial, mismo servicio contratado), o crea uno nuevo? → A: Mismo registro. El estado (Activo/Suspendido/Finalizado) es principalmente informativo y de control (indica si ese servicio contratado debe considerarse al generar nuevas cobranzas), no un ciclo de vida rígido con transiciones restringidas — un servicio contratado Finalizado puede reactivarse directamente a Activo conservando su mismo registro e historial completo, igual que ya ocurre entre Suspendido y Activo. En consecuencia, solo puede existir **un** servicio contratado por combinación de cliente + servicio del catálogo (nunca dos, sin importar su estado) — no se crean registros nuevos al reactivar.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Mantener el catálogo de servicios del despacho (Priority: P1) 🎯 MVP

Como Administrador, quiero crear y mantener el catálogo de servicios que el despacho ofrece (nombre, descripción, categoría, estado), para tener una lista única y consistente de servicios que luego se pueda asignar a cualquier cliente, en vez de que cada persona escriba el nombre del servicio de forma distinta cada vez.

**Why this priority**: Es la base de todo lo demás — sin un catálogo no hay nada que asignar a un cliente ni de qué tomar información para Cobranza/Gestión Fiscal/Reportes.

**Independent Test**: Puede probarse creando, editando, activando y desactivando servicios del catálogo, y confirmando que el listado se puede filtrar por nombre, categoría y estado, sin necesidad de que ningún cliente tenga todavía un servicio asignado.

**Acceptance Scenarios**:

1. **Given** el catálogo de servicios, **When** un Administrador crea un servicio nuevo con nombre, descripción, categoría y observaciones internas opcionales, **Then** el servicio queda visible en el catálogo con estado Activo por defecto.
2. **Given** un servicio ya existente en el catálogo, **When** un Administrador edita su nombre, descripción o categoría, **Then** los cambios se reflejan de inmediato en el catálogo, sin afectar los servicios ya contratados por clientes con el nombre/descripción anterior en su historial.
3. **Given** un servicio Activo en el catálogo, **When** un Administrador lo desactiva, **Then** el servicio deja de estar disponible para asignarse a nuevos clientes, pero los clientes que ya lo tienen contratado no se ven afectados.
4. **Given** el listado del catálogo, **When** se filtra por nombre, categoría o estado, **Then** solo se muestran los servicios que cumplen el filtro aplicado.

---

### User Story 2 - Asignar y dar seguimiento a los servicios contratados por un cliente (Priority: P1)

Como persona del despacho con permiso de gestión de clientes, quiero asignar servicios del catálogo a un cliente específico (con su precio acordado, fecha de inicio y observaciones), y ver de un vistazo qué servicios tiene activos, suspendidos o finalizados, para saber exactamente qué le estoy prestando a ese cliente y en qué condiciones.

**Why this priority**: Es el segundo pilar del módulo — el catálogo (Historia 1) no aporta valor operativo hasta que se pueda asignar a un cliente real; junto con la Historia 1 forma el MVP funcional completo.

**Independent Test**: Puede probarse entrando al detalle de un cliente (Cliente 360, pestaña Servicios), agregando un servicio del catálogo con un precio acordado, y confirmando que aparece en el listado de servicios de ese cliente con su estado, vigencia y precio — sin necesitar que Cobranza, Gestión Fiscal o Reportes estén implementados.

**Acceptance Scenarios**:

1. **Given** la pestaña Servicios del detalle de un cliente, **When** se agrega un servicio del catálogo con un precio acordado y fecha de inicio, **Then** el servicio aparece en el listado de ese cliente con estado Activo, el precio capturado y sin fecha de fin.
2. **Given** un cliente que ya tiene un servicio del catálogo asignado (en cualquier estado — Activo, Suspendido o Finalizado), **When** se intenta agregar ese mismo servicio del catálogo nuevamente a ese cliente, **Then** el sistema lo impide y explica que ese servicio ya está asignado a ese cliente, dirigiendo a la acción de reactivar en vez de crear uno nuevo.
3. **Given** un servicio ya contratado por un cliente, **When** se consulta el listado de servicios de ese cliente, **Then** se muestran el servicio, el precio acordado, el estado, la fecha de inicio, la fecha de fin (si aplica) y las observaciones.

---

### User Story 3 - Cambiar el precio de un servicio contratado (Priority: P2)

Como persona del despacho con permiso de gestión de clientes, quiero actualizar el precio acordado de un servicio que un cliente ya tiene contratado, para reflejar renegociaciones sin perder el precio que se usó en el pasado.

**Why this priority**: Depende de que ya exista un servicio contratado (Historia 2); es una operación frecuente pero no bloquea el valor central de tener el catálogo y las asignaciones ya funcionando.

**Independent Test**: Puede probarse cambiando el precio de un servicio ya contratado y confirmando, en el historial de ese servicio, que queda registrado el precio anterior, el precio nuevo y la fecha del cambio.

**Acceptance Scenarios**:

1. **Given** un servicio contratado por un cliente con un precio acordado, **When** se actualiza su precio, **Then** el nuevo precio queda vigente de inmediato para ese servicio contratado, y el precio anterior junto con la fecha del cambio quedan visibles en el historial de ese servicio.
2. **Given** un cambio de precio ya registrado, **When** se consulta cualquier información ya generada antes del cambio (por ejemplo, en otro módulo que haya tomado el precio anterior), **Then** esa información no se modifica retroactivamente — el nuevo precio aplica únicamente hacia adelante.

---

### User Story 4 - Suspender, reactivar y finalizar un servicio contratado (Priority: P2)

Como persona del despacho con permiso de gestión de clientes, quiero suspender temporalmente un servicio contratado, reactivarlo, o darlo por finalizado cuando el cliente deja de requerirlo — y volver a activarlo si el cliente lo solicita de nuevo más adelante —, para reflejar la realidad de la relación comercial sin perder el registro de lo que pasó ni crear información duplicada.

**Why this priority**: Depende de que ya exista un servicio contratado (Historia 2); completa el ciclo de vida del servicio contratado pero el valor principal (catálogo + asignación + precio) ya existe sin esta historia.

**Independent Test**: Puede probarse suspendiendo un servicio contratado (confirmando que sigue registrado pero deja de contar como activo), finalizándolo (confirmando que queda marcado como concluido, con fecha de fin), y reactivándolo directamente desde Finalizado (confirmando que vuelve a Activo sobre el mismo registro, sin crear uno nuevo, y que el catálogo y los demás clientes no se ven afectados).

**Acceptance Scenarios**:

1. **Given** un servicio contratado en estado Activo, **When** se suspende, **Then** su estado cambia a Suspendido, permanece visible en el listado del cliente, y queda excluido de cualquier proceso que solo considere servicios Activos (por ejemplo, la generación de nuevas cobranzas en el módulo de Cobranza).
2. **Given** un servicio contratado en estado Suspendido o Finalizado, **When** se reactiva, **Then** su estado vuelve a Activo, se limpia su fecha de fin (si tenía una), y conserva el mismo registro e historial — reactivar nunca crea un servicio contratado nuevo (Clarifications).
3. **Given** un servicio contratado Activo o Suspendido, **When** se finaliza, **Then** su estado cambia a Finalizado y se registra su fecha de fin, permaneciendo disponible para reactivarse más adelante sobre el mismo registro.
4. **Given** una suspensión, reactivación o finalización sobre el servicio contratado de un cliente, **When** se revisa el catálogo de servicios o los servicios contratados de otros clientes, **Then** ninguno de los dos se ve afectado.

---

### User Story 5 - Consultar el historial y la auditoría de un servicio contratado (Priority: P3)

Como persona del despacho, quiero ver la línea de tiempo de cambios de un servicio contratado (creación, cambios de precio, suspensiones, reactivaciones, finalización), para entender rápidamente qué ha pasado con ese servicio sin tener que preguntar a otra persona.

**Why this priority**: Es una capacidad de consulta que depende de que ya existan eventos que registrar (Historias 2, 3 y 4); mejora la trazabilidad pero no bloquea la operación diaria del módulo.

**Independent Test**: Puede probarse realizando varios cambios sobre un servicio contratado (cambio de precio, suspensión, finalización, reactivación) y confirmando que la acción "Ver historial" de ese servicio muestra cada evento en orden cronológico con su fecha.

**Acceptance Scenarios**:

1. **Given** un servicio contratado con varios cambios registrados, **When** se abre su historial, **Then** se listan en orden cronológico los eventos (alta, cambios de precio con el valor anterior y nuevo, suspensión, finalización, reactivación), cada uno con su fecha — incluidos ciclos completos de finalización y reactivación posterior sobre el mismo servicio contratado.
2. **Given** cualquier evento de alta, edición, cambio de precio, suspensión, reactivación o finalización sobre un servicio del catálogo o un servicio contratado, **When** ocurre, **Then** queda registrado en la auditoría del sistema con quién lo realizó y cuándo.

---

### Edge Cases

- ¿Qué pasa si se intenta desactivar un servicio del catálogo que algún cliente tiene actualmente contratado (Activo o Suspendido)? La desactivación en el catálogo procede igual — únicamente impide que ese servicio se use para **nuevas** asignaciones; no cambia el estado de los servicios ya contratados con ese servicio del catálogo.
- ¿Qué pasa si se intenta reactivar un servicio del catálogo que está Inactivo, para asignárselo de nuevo a un cliente? Debe reactivarse el servicio del catálogo primero (misma acción "Activar" del catálogo) antes de poder asignarlo a un cliente.
- ¿Qué pasa si se intenta "Agregar servicio" para un cliente y un servicio del catálogo que ya tienen un servicio contratado existente (en cualquier estado, incluido Finalizado)? El sistema lo impide y ofrece "Reactivar" el servicio contratado existente en su lugar — nunca crea un segundo registro para la misma combinación cliente + servicio del catálogo (Clarifications).
- ¿Qué pasa con la fecha de inicio de un servicio contratado cuando se reactiva tras estar Finalizado? La fecha de inicio original no cambia (representa cuándo el cliente contrató ese servicio por primera vez); el historial muestra el ciclo completo de suspensión/finalización y reactivación con sus propias fechas.
- ¿Qué pasa con un servicio contratado que nunca tuvo fecha de fin y se finaliza? La fecha de fin se registra en el momento de la finalización, y se limpia si el servicio se reactiva después.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema DEBE mantener un catálogo de servicios con nombre, descripción, categoría (texto libre, Clarifications), estado (Activo/Inactivo) y observaciones internas opcionales.
- **FR-002**: El sistema DEBE permitir crear, editar, activar y desactivar servicios del catálogo, y filtrar el catálogo por nombre, categoría y estado.
- **FR-003**: El catálogo de servicios NO DEBE almacenar precios — el precio pertenece exclusivamente al servicio contratado por cada cliente.
- **FR-004**: El sistema DEBE permitir asignar un servicio del catálogo (en estado Activo) a un cliente, capturando precio acordado, fecha de inicio y observaciones opcionales, creando un único servicio contratado para esa combinación de cliente y servicio.
- **FR-005**: El sistema NO DEBE permitir que exista más de un servicio contratado para la misma combinación de cliente y servicio del catálogo, sin importar su estado (Activo, Suspendido o Finalizado) — reactivar reutiliza el registro existente en vez de crear uno nuevo (Clarifications).
- **FR-006**: El sistema DEBE permitir modificar el precio acordado de un servicio ya contratado; el cambio aplica de inmediato hacia adelante y NO DEBE alterar información generada antes del cambio.
- **FR-007**: El sistema DEBE registrar cada cambio de precio con su valor anterior, su valor nuevo y la fecha del cambio.
- **FR-008**: El sistema DEBE permitir que un servicio contratado tenga los estados Activo, Suspendido o Finalizado. Estos estados son principalmente informativos y de control (indican si ese servicio contratado debe considerarse al generar nuevas cobranzas en otros módulos) — cualquiera de los tres estados puede transicionar a cualquier otro sobre el mismo registro, sin un ciclo de vida rígido ni estados terminales (Clarifications).
- **FR-009**: El sistema DEBE permitir suspender, finalizar y reactivar un servicio contratado desde cualquiera de sus otros dos estados, conservando siempre el mismo registro e historial.
- **FR-010**: El sistema DEBE registrar la fecha de fin al finalizar un servicio contratado, y limpiar esa fecha de fin al reactivarlo.
- **FR-011**: El sistema DEBE conservar la fecha de inicio original de un servicio contratado a través de sus suspensiones, finalizaciones y reactivaciones — no se restablece al reactivar.
- **FR-012**: Una suspensión, reactivación o finalización sobre el servicio contratado de un cliente NO DEBE afectar el catálogo de servicios ni los servicios contratados de otros clientes.
- **FR-013**: El sistema DEBE mostrar, dentro del detalle de cada cliente (Cliente 360, pestaña Servicios), el listado de sus servicios contratados con servicio, precio, estado, fecha de inicio, fecha de fin y observaciones, con acciones para agregar servicio, cambiar precio, suspender, reactivar, finalizar y ver historial.
- **FR-014**: El sistema DEBE conservar y mostrar, para cada servicio contratado, un historial cronológico completo de sus eventos (alta, cambios de precio con valores anterior/nuevo, suspensión, finalización, reactivación) a lo largo de toda la vida del registro, incluyendo ciclos repetidos de finalización y reactivación.
- **FR-015**: El sistema DEBE registrar en la auditoría del sistema cada alta, edición, cambio de precio, suspensión, reactivación y finalización, tanto de servicios del catálogo como de servicios contratados, con quién lo realizó y cuándo.
- **FR-016**: El módulo NO DEBE administrar cobranza, pagos, obligaciones fiscales, documentos ni notificaciones — únicamente proporciona la información de catálogo y servicios contratados que esos módulos puedan consultar, cada uno con sus propias reglas.

### Key Entities

- **Servicio (catálogo)**: Representa un servicio que el despacho puede ofrecer (ej. Contabilidad mensual, Nómina, Asesoría fiscal). Atributos: nombre, descripción, categoría (texto libre), estado (Activo/Inactivo), observaciones internas opcionales. No almacena precio.
- **Servicio Contratado**: Representa la relación entre un Cliente y un Servicio del catálogo — como máximo uno por cada combinación de cliente + servicio del catálogo, sin importar su estado (FR-005). Atributos: cliente, servicio del catálogo, precio acordado, fecha de inicio (fija, no cambia al reactivar), fecha de fin (presente solo mientras está Finalizado), estado (Activo/Suspendido/Finalizado, libremente transicionable entre sí — Clarifications), observaciones.
- **Cambio de Precio**: Evento histórico asociado a un Servicio Contratado — precio anterior, precio nuevo, fecha del cambio.
- **Evento de Historial/Auditoría**: Registro de un evento sobre un Servicio (catálogo) o un Servicio Contratado — tipo de evento (alta, edición, cambio de precio, suspensión, reactivación, finalización), quién lo realizó, cuándo.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Una persona con permiso de gestión puede crear un servicio en el catálogo y asignarlo a un cliente en menos de 2 minutos en total.
- **SC-002**: El 100% de los cambios de precio, suspensiones, reactivaciones y finalizaciones quedan reflejados en el historial del servicio contratado correspondiente, visibles de inmediato tras realizarse.
- **SC-003**: El 100% de los intentos de agregar a un cliente un servicio del catálogo que ya tiene asignado (en cualquier estado) son rechazados con una explicación clara que dirige a reactivar, sin necesidad de que la persona usuaria adivine la causa.
- **SC-004**: El 100% de los eventos de alta, edición, cambio de precio, suspensión, reactivación y finalización quedan registrados en la auditoría del sistema.
- **SC-005**: Desactivar un servicio del catálogo, o suspender/finalizar/reactivar el servicio contratado de un cliente, nunca modifica el catálogo ni los servicios contratados de otros clientes — verificable en el 100% de los casos.

## Assumptions

- El catálogo de servicios y los servicios contratados por cliente son administrados por personas con el mismo permiso ya usado para gestionar el catálogo de datos operativos del sistema (patrón ya establecido para Régimen Fiscal/Categorías de Documento) y para gestionar clientes (patrón ya establecido para Contactos en `008-contactos-y-detalle-cliente`), respectivamente — no se introduce un permiso nuevo específico para Servicios.
- "Historial" (la línea de tiempo por servicio contratado) y "Auditoría" (el registro formal de eventos del sistema) se alimentan de la misma fuente de auditoría de negocio ya establecida (`business_audit_log`, ya usada por `005`-`008`); "Ver historial" es una vista filtrada de esos mismos eventos para un servicio contratado específico, no un mecanismo de registro separado.
- La pantalla "Servicios del Cliente" vive dentro de Cliente 360, como ya lo anticipa `docs/ux/design-system.md` §9 (pestaña "Servicios") — no se crea una pantalla independiente fuera del detalle de cliente.
- La moneda de los precios es pesos mexicanos (MXN), consistente con el resto del sistema (cargos y recibos de `005-clientes-cobranza-expedientes`).
- Este módulo no calcula ni genera cargos de cobranza — solo expone la información (servicio, precio vigente, estado) que Cobranza, Gestión Fiscal y Reportes puedan consultar cada uno bajo sus propias reglas, tal como ya lo anticipó `001-business-domain-model` (Actualización Pendiente #1). La regla de que "Activo" habilita nuevas cobranzas mientras "Suspendido"/"Finalizado" no, es una convención informativa que este módulo expone; la aplicación real de esa regla al generar cargos es responsabilidad exclusiva del futuro módulo de Cobranza.
- Un servicio contratado nunca se elimina físicamente ni se duplica — el estado (Activo/Suspendido/Finalizado) y el historial son el único mecanismo para reflejar su ciclo de vida, consistente con el principio de la Constitución de nunca eliminar físicamente información de negocio.
