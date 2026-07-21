# Feature Specification: Control de Cumplimiento Fiscal

**Feature Branch**: `015-control-cumplimiento-fiscal`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "Permitir al despacho controlar y dar seguimiento al cumplimiento de las obligaciones fiscales de sus clientes durante los periodos correspondientes, registrando el estado de cada obligación, sus fechas límite, responsables, evidencias documentales y el historial de cambios. El módulo utilizará como base las obligaciones fiscales configuradas para cada cliente en Gestión Fiscal del Cliente y generará automáticamente los registros de cumplimiento correspondientes según la periodicidad configurada. Incluye generación automática (primer día de cada mes, idempotente) y manual de periodos, control de estado (Pendiente/En proceso/Presentada/No aplica/Vencida), administración de fechas límite y responsables, registro de obligaciones extraordinarias, asociación de documentos del Expediente Fiscal (incluyendo acuse de presentación), historial de cambios, auditoría, vista principal en tabla (con vista Grid alternativa opcional), filtros por cliente/RFC/obligación/periodo/estado/responsable, y priorización visual de obligaciones vencidas y próximas a vencer. No incluye configuración de obligaciones fiscales, administración de plantillas ni del catálogo de obligaciones (pertenecen a Gestión Fiscal del Cliente y Gestión de Obligaciones Fiscales), presentación o envío automático de declaraciones, ni envío de correos a clientes (futuro módulo de Comunicación con Clientes). Consume Clientes, Gestión Fiscal del Cliente, Catálogo de Obligaciones Fiscales, Catálogo de Periodicidades y Expediente Fiscal."

## Clarifications

### Session 2026-07-21

- Q: El documento describe "Vencida" como uno de cinco estados posibles de un cumplimiento, y dice que un cumplimiento "pasará automáticamente a estado Vencida" cuando se cumplan ciertas condiciones. ¿Este cambio de estado se calcula dinámicamente cada vez que se consulta o filtra el cumplimiento (sin que el valor almacenado cambie nunca a "Vencida"), o el sistema debe ejecutar algún proceso que efectivamente actualice el estado almacenado de los registros vencidos? → A: Cálculo dinámico (derivado) — el estado almacenado permanece Pendiente/En proceso; "Vencida" es una condición calculada al consultar (`estado in (pendiente, en_proceso) AND fecha_límite < hoy`), sin ningún proceso batch adicional a la generación mensual/manual.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Ver y priorizar las obligaciones pendientes de atención (Priority: P1) 🎯 MVP

Como persona del despacho, quiero ver en una sola bandeja todos los cumplimientos fiscales de los clientes, con las obligaciones vencidas y próximas a vencer resaltadas primero, para saber de inmediato qué necesita atención hoy.

**Why this priority**: Es el valor central del módulo — sin una vista operativa que priorice lo vencido, no hay forma de dar seguimiento diario al cumplimiento de ningún cliente.

**Independent Test**: Puede probarse generando cumplimientos para uno o más clientes (manual o automáticamente) y confirmando que la vista principal los lista, filtra por cliente/RFC/obligación/periodo/estado/responsable, y muestra primero los vencidos.

**Acceptance Scenarios**:

1. **Given** clientes con obligaciones fiscales activas configuradas, **When** se ejecuta la generación de cumplimientos, **Then** se crea un registro de cumplimiento por cada obligación activa y periodo correspondiente, respetando la periodicidad de cada una.
2. **Given** cumplimientos ya generados para un periodo, **When** se ejecuta la generación nuevamente (automática o manual), **Then** no se crean registros duplicados — solo se generan los que faltan.
3. **Given** la vista principal con cumplimientos en distintos estados, **When** se consulta sin filtros, **Then** los vencidos aparecen primero, seguidos de los próximos a vencer.
4. **Given** la vista principal, **When** se filtra por cliente, RFC, obligación, periodo, estado o responsable, **Then** el listado se acota según el filtro aplicado.

---

### User Story 2 - Dar seguimiento al estado de un cumplimiento (Priority: P1)

Como persona del despacho, quiero cambiar el estado de un cumplimiento conforme avanza (de Pendiente a En proceso y finalmente a Presentada, o marcarlo como No aplica), para reflejar el progreso real de cada obligación.

**Why this priority**: Es la acción operativa diaria más frecuente del módulo — sin poder actualizar el estado, la bandeja de la Historia 1 nunca refleja el trabajo realizado.

**Independent Test**: Puede probarse tomando un cumplimiento Pendiente, marcándolo En proceso, y finalmente Presentada, adjuntando al menos un documento del Expediente Fiscal del mismo cliente como evidencia.

**Acceptance Scenarios**:

1. **Given** un cumplimiento Pendiente, **When** un usuario autorizado lo marca En proceso, **Then** el cambio queda registrado y auditado.
2. **Given** un cumplimiento En proceso, **When** se marca como Presentada, **Then** el sistema permite asociar uno o varios documentos del Expediente Fiscal del mismo cliente como evidencia, identificando cuál corresponde al acuse.
3. **Given** un cumplimiento cuya fecha límite ya pasó y sigue Pendiente o En proceso, **When** se consulta, **Then** se muestra como Vencida.
4. **Given** un cumplimiento ya marcado Presentada, **When** su fecha límite transcurre, **Then** el cumplimiento nunca pasa automáticamente a Vencida.
5. **Given** un cumplimiento de un periodo que no corresponde al cliente, **When** se marca como No aplica, **Then** la obligación permanente del cliente en Gestión Fiscal del Cliente no se ve afectada — el No aplica es exclusivo de ese periodo.
6. **Given** un intento de asociar un documento de un cliente distinto al del cumplimiento, **When** se intenta la asociación, **Then** el sistema lo rechaza.

---

### User Story 3 - Ajustar fecha límite y responsable de un cumplimiento (Priority: P2)

Como persona del despacho, quiero poder modificar la fecha límite o el responsable de un cumplimiento específico, para reflejar excepciones sin afectar a otros periodos ni a otros clientes.

**Why this priority**: Cubre casos de excepción reales (prórrogas, reasignación de cartera) pero no bloquea el seguimiento diario básico (Historias 1 y 2).

**Independent Test**: Puede probarse cambiando la fecha límite de un cumplimiento y confirmando que ningún otro cumplimiento del mismo cliente o de otros clientes se ve afectado.

**Acceptance Scenarios**:

1. **Given** un cumplimiento ya generado, **When** se modifica su fecha límite, **Then** el cambio se aplica únicamente a ese registro y queda auditado.
2. **Given** un cliente cuyo responsable asignado cambia, **When** se generan nuevos cumplimientos después del cambio, **Then** usan el nuevo responsable.
3. **Given** cumplimientos ya generados antes de un cambio de responsable del cliente, **When** se consultan, **Then** conservan el responsable que tenían al momento de generarse, sin actualizarse automáticamente.

---

### User Story 4 - Registrar una obligación fiscal extraordinaria (Priority: P2)

Como persona del despacho, quiero registrar un cumplimiento que no forma parte de la configuración fiscal habitual de un cliente (por ejemplo, una declaración complementaria), para darle seguimiento igual que a cualquier otra obligación.

**Why this priority**: Cubre un caso real pero menos frecuente que el seguimiento de obligaciones ya configuradas (Historias 1 y 2).

**Independent Test**: Puede probarse registrando un cumplimiento extraordinario para un cliente, con y sin seleccionar una obligación del catálogo, y confirmando que puede darle seguimiento igual que a un cumplimiento generado automáticamente.

**Acceptance Scenarios**:

1. **Given** un cliente, **When** se registra un cumplimiento extraordinario seleccionando una obligación del catálogo y una descripción, **Then** queda creado con periodo, fecha límite, estado, responsable y espacio para documentos, igual que uno ordinario.
2. **Given** un cliente, **When** se registra un cumplimiento extraordinario sin seleccionar ninguna obligación del catálogo, **Then** la descripción capturada es el elemento principal para identificarlo.

---

### User Story 5 - Consultar el historial de cambios de un cumplimiento (Priority: P3)

Como persona del despacho, quiero ver el historial completo de cambios de un cumplimiento (quién cambió qué, cuándo, y los valores anterior/nuevo), para poder auditar su seguimiento.

**Why this priority**: Es una garantía de trazabilidad que depende de que ya existan cambios registrados (Historias 2-4); no bloquea la operación diaria.

**Independent Test**: Puede probarse realizando varios cambios sobre un mismo cumplimiento (estado, fecha límite, documentos) y confirmando que su historial los lista en orden, con usuario, fecha/hora y valores anterior/nuevo.

**Acceptance Scenarios**:

1. **Given** un cumplimiento con varios cambios realizados, **When** se consulta su detalle, **Then** el historial muestra cada cambio de estado, de fecha límite, de responsable, y cada asociación o desasociación de documentos, en orden cronológico.

---

### Edge Cases

- ¿Qué pasa si un cliente no tiene un responsable asignado al momento de generar un cumplimiento? El cumplimiento se genera sin responsable; puede asignarse después (Historia 3).
- ¿Qué pasa si una obligación de un cliente se marca "No aplica" en Gestión Fiscal del Cliente después de que ya existen cumplimientos generados para ella? Los cumplimientos ya generados no se modifican automáticamente — permanecen en su estado actual; si corresponde, un usuario puede marcarlos "No aplica" individualmente en este módulo.
- ¿Qué pasa si un cliente pasa a estado inactivo? La generación automática deja de crear nuevos cumplimientos para ese cliente, pero los ya generados permanecen consultables sin cambios.
- ¿Qué pasa si se intenta generar cumplimientos para un periodo que ya tiene registro? Ese periodo se omite — nunca se crean duplicados (misma obligación y periodo).
- ¿Qué pasa si se intenta eliminar un registro de cumplimiento? El sistema lo impide — solo puede cambiarse de estado; ningún registro histórico se elimina físicamente.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema DEBE generar automáticamente, el primer día de cada mes, un registro de cumplimiento por cada obligación fiscal Activa de cada cliente Activo, para cada periodo que corresponda según la periodicidad configurada de esa obligación (mensual, bimestral, trimestral, semestral o anual).
- **FR-002**: La generación automática DEBE ser idempotente — ejecutarla más de una vez nunca debe producir registros de cumplimiento duplicados para la misma obligación y el mismo periodo.
- **FR-003**: El sistema DEBE permitir a un usuario autorizado ejecutar manualmente el mismo proceso de generación, bajo las mismas reglas que la generación automática, creando únicamente los registros que no existan.
- **FR-004**: Todo registro de cumplimiento DEBE tener un estado almacenado: Pendiente, En proceso, Presentada o No aplica; "Vencida" NO es un estado almacenado, sino una condición derivada de un estado Pendiente/En proceso con fecha límite superada (FR-005) — para efectos de visualización, filtrado y priorización se trata como un quinto valor.
- **FR-005**: El sistema DEBE calcular el estado Vencida de forma dinámica (derivada) para todo cumplimiento Pendiente o En proceso cuya fecha límite haya pasado — el estado almacenado del registro permanece Pendiente o En proceso; "Vencida" es una condición evaluada al consultar o filtrar, sin que ningún proceso batch adicional deba actualizar el valor almacenado (Clarifications).
- **FR-006**: Un cumplimiento marcado como Presentada NO DEBE volver a marcarse automáticamente como Vencida, sin importar cuánto tiempo pase.
- **FR-007**: El sistema DEBE permitir marcar un cumplimiento como No aplica para un periodo específico, sin afectar la configuración fiscal permanente del cliente en Gestión Fiscal del Cliente.
- **FR-008**: El sistema DEBE permitir asociar uno o varios documentos del Expediente Fiscal del mismo cliente a un cumplimiento marcado como Presentada, identificando cuál de ellos corresponde al acuse de presentación.
- **FR-009**: El sistema NO DEBE permitir asociar a un cumplimiento documentos que pertenezcan a un cliente distinto.
- **FR-010**: Toda fecha límite DEBE poder modificarse de forma independiente para cada registro de cumplimiento, sin afectar las fechas límite de otros periodos o de otros clientes.
- **FR-011**: Cada cumplimiento generado DEBE tomar como responsable inicial al responsable vigente del cliente en ese momento, y DEBE conservar ese responsable aunque el responsable del cliente cambie después.
- **FR-012**: El sistema DEBE permitir registrar cumplimientos extraordinarios (no derivados de la configuración fiscal habitual del cliente), reutilizando el catálogo de Obligaciones Fiscales de forma opcional y permitiendo siempre una descripción libre para identificarlos.
- **FR-013**: Los cumplimientos extraordinarios DEBEN admitir la misma información y las mismas acciones que los cumplimientos ordinarios (periodo, fecha límite, estado, responsable, documentos, historial).
- **FR-014**: El sistema DEBE conservar un historial de cambios de cada cumplimiento, incluyendo como mínimo cambios de estado, de fecha límite, de responsable, y asociación/desasociación de documentos — cada uno con el usuario que lo realizó, la fecha/hora, y los valores anterior y nuevo cuando apliquen.
- **FR-015**: Ningún registro de cumplimiento DEBE eliminarse físicamente; el estado es el único mecanismo para indicar que un registro ya no debe considerarse vigente.
- **FR-016**: El sistema DEBE ofrecer una vista principal en tabla que permita filtrar por cliente, RFC, obligación, periodo, estado y responsable, priorizando automáticamente los cumplimientos vencidos.
- **FR-017**: El sistema NO DEBE permitir que exista más de un registro de cumplimiento para la misma obligación y el mismo periodo de un cliente.
- **FR-018**: Este módulo NO DEBE administrar la configuración de obligaciones fiscales de un cliente, el catálogo de obligaciones ni sus plantillas — esas responsabilidades pertenecen a Gestión Fiscal del Cliente y a Gestión de Obligaciones Fiscales.
- **FR-019**: Este módulo NO DEBE presentar ni enviar automáticamente declaraciones ante el SAT, ni enviar comunicaciones a clientes.

### Key Entities

- **Cumplimiento**: registro que representa la obligación de atender una obligación fiscal específica de un cliente durante un periodo determinado — cliente, obligación fiscal (o descripción libre si es extraordinario y no se seleccionó ninguna del catálogo), periodo, fecha límite, estado (Pendiente/En proceso/Presentada/No aplica/Vencida — calculado, no elegido libremente en el caso de Vencida), responsable (fijado al generarse, independiente de cambios posteriores del responsable del cliente), indicador de si es extraordinario, documentos asociados (referencias al Expediente Fiscal del mismo cliente, incluyendo cuál es el acuse), historial de cambios. Nunca existen dos cumplimientos para la misma obligación y el mismo periodo de un mismo cliente.
- **Evento de historial**: cambio relevante sobre un cumplimiento — tipo de cambio (estado, fecha límite, responsable, asociación/desasociación de documento, alta de obligación extraordinaria), usuario que lo realizó, fecha y hora, valor anterior y valor nuevo cuando aplique.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: El 100% de las obligaciones fiscales activas de los clientes activos tienen su cumplimiento generado para el periodo correspondiente dentro del primer día del mes, sin intervención manual.
- **SC-002**: El 100% de las ejecuciones repetidas del proceso de generación (automática o manual) producen cero registros duplicados.
- **SC-003**: Una persona del despacho puede identificar todas las obligaciones vencidas de todos los clientes en menos de 10 segundos desde la vista principal, sin aplicar ningún filtro.
- **SC-004**: El 100% de los cumplimientos marcados como Presentada permanecen así indefinidamente, sin revertirse nunca automáticamente a Vencida.
- **SC-005**: El 100% de los intentos de asociar un documento de un cliente distinto al del cumplimiento son rechazados.
- **SC-006**: El 100% de los cambios relevantes sobre un cumplimiento (estado, fecha límite, responsable, documentos) quedan reflejados en su historial, sin excepciones.

## Assumptions

- Los periodos de cada periodicidad se alinean al calendario estándar ya usado en el ámbito fiscal mexicano: mensual = cada mes calendario; bimestral = pares de meses iniciando en enero (ene-feb, mar-abr, ...); trimestral = trimestres calendario; semestral = semestres calendario; anual = ejercicio fiscal (año calendario). Este módulo no redefine el catálogo de Periodicidades (`012`), solo interpreta sus valores para calcular periodos.
- El "usuario autorizado" para operar este módulo (cambiar estados, fechas límite, responsables, asociar documentos, ejecutar la generación manual) reutiliza el mismo mecanismo de permisos ya usado para gestionar datos operativos de un cliente (consulta y edición), consistente con el patrón ya aplicado a Servicios Contratados (`011`) y Obligaciones Fiscales del Cliente (`014`) — no se introduce una capacidad nueva exclusiva de este módulo salvo que el diseño técnico lo requiera.
- El responsable de un cumplimiento reutiliza el responsable ya asignado al cliente (módulo Clientes); si el cliente no tiene responsable asignado, el cumplimiento se genera sin responsable y puede asignarse después.
- La reasignación individual de un cumplimiento a un responsable distinto del cliente es una capacidad de este módulo (Historia 3) — la descripción de origen la menciona como algo que "podrá incorporarse posteriormente", pero dado que ya existe como acción explícita en la sección "Fecha límite"/"Responsable" del documento, se incluye en el alcance de esta versión.
- El Expediente Fiscal (documentos de un cliente) ya existe como módulo construido (`005-clientes-cobranza-expedientes`) — este módulo únicamente referencia esos documentos, nunca los duplica ni los administra.
- Los cumplimientos extraordinarios no están sujetos a la generación automática/manual — se registran uno a la vez, a discreción de quien los da de alta.
