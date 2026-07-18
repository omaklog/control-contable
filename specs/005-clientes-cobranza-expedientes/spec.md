# Feature Specification: Modelado de Datos — Clientes, Cobranza y Expedientes

**Feature Branch**: `005-clientes-cobranza-expedientes`

**Created**: 2026-07-16

**Status**: Draft

**Input**: User description: "Modelado de datos: Objetivo: definir las entidades principales y sus relaciones así como los campos y tipos que debemos definir para almacenar los datos, las principales entidades identificadas clientes, cobranza, expediente"

## Clarifications

### Session 2026-07-16

- Q: ¿Cómo debe asociarse un Cliente con el personal responsable de atenderlo? → A: Se le puede asignar un responsable único, pero solo como dato informativo — no limita que otra persona lo atienda o consulte sus datos.
- Q: ¿Cuándo se debe generar el Recibo por un Pago recibido? → A: Automático al registrar el pago.

### Session 2026-07-16 (segunda sesión, mismo día)

- Q: Un Recibo puede derivarse de un Pago que cubre uno o varios Cargos con distinto concepto — ¿cómo debe mostrar el Recibo ese concepto? → A: El Recibo guarda un snapshot propio e inmutable del/los concepto(s) cubiertos al momento de generarse; no cambia aunque después se edite el concepto del Cargo original. (El usuario confirmó además que un mismo recibo puede incluir varios conceptos, y sugirió como idea futura, fuera de alcance de esta especificación, un módulo de recibos personalizados para conceptos no ligados a un Cargo.)
- Q: El catálogo SAT de Regímenes Fiscales indica, por cada régimen, si aplica a personas físicas, morales o ambas — ¿debe el sistema impedir asignar a un Cliente un régimen fiscal no aplicable a su tipo de persona? → A: Sí, validar compatibilidad usando las columnas `fisica`/`moral` del catálogo.
- Q: Algunos regímenes del catálogo ya no están vigentes (tienen fecha de fin de vigencia) — ¿debe el sistema impedir seleccionar un régimen no vigente al asignarlo a un Cliente? → A: Sí, solo se puede asignar un régimen vigente; los regímenes históricos permanecen visibles únicamente en los clientes que ya los tenían asignados antes de vencer.

### Session 2026-07-18 (alineación con `001-business-domain-model` y `docs/ux/design-system.md`)

- Contexto: `008-contactos-y-detalle-cliente` extendió `contactos` (soft-delete vía `estado`, y `es_principal` para marcar el contacto principal de un cliente) sin que este spec — dueño formal de la entidad Contacto — se actualizara. El reporte de impacto de `001-business-domain-model` (`specs/001-business-domain-model/impact-report.md`) también registró tres hallazgos sobre entidades de esta feature que nunca se incorporaron aquí: `cargos_cobranza.concepto` como candidato a FK futura hacia un catálogo de Servicios (E1), `documentos`/`categorias_documento` como candidatos a relación futura con Periodo Fiscal (E2), y que `business_audit_log.entidad` es texto libre sin `enum` (facilitador para auditar entidades futuras, F4).
- Q: ¿Se actualiza FR-023/Key Entities de Contacto para reflejar `estado`/`es_principal` ya construidos por `008`? → A: Sí — ver FR-023 (actualizado) y el nuevo FR-026, consistentes con `008-contactos-y-detalle-cliente` FR-006/FR-007. No es una decisión nueva, es corregir el spec para que refleje lo ya construido.
- Q: ¿Se agregan los hallazgos E1/E2/F4 del impact-report de `001` a este spec? → A: Sí, como notas de Assumptions — documentan intención futura sin implementarla ahora (ningún módulo de Servicios ni Gestión Fiscal existe todavía); evita que un futuro spec de esos dominios tenga que re-descubrir estos hallazgos.
- Q: `docs/ux/design-system.md` define reglas de color semántico (azul=positivo, rojo=negativo, gris=neutro) pero nunca mapea los 4 estados de `cargo_estado` (pendiente/pagado/vencido/cancelado) — ¿se resuelve ese mapeo en esta sesión? → A: No — 005 declara explícitamente que no define pantallas; se deja anotado como una decisión pendiente para quien especifique la UI de Cobranza, en vez de decidirlo sin ese contexto.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Registrar y consultar la ficha de un cliente (Priority: P1)

Un miembro del personal del despacho (Administrador o Contador) da de alta a un nuevo cliente del despacho con sus datos fiscales y de contacto, y puede consultar y actualizar esa información en cualquier momento. Un cliente que deja de trabajar con el despacho se da de baja sin perder su historial.

**Why this priority**: Es la entidad base de la que dependen tanto la cobranza como el expediente digital — ninguna de las otras dos historias puede probarse sin que exista primero un cliente registrado.

**Independent Test**: Puede probarse dando de alta un cliente nuevo, consultando su ficha, editando sus datos, y dándolo de baja — sin necesitar que existan todavía registros de cobranza o documentos de expediente.

**Acceptance Scenarios**:

1. **Given** un miembro del personal autenticado con permiso para gestionar clientes, **When** registra un cliente nuevo con sus datos fiscales y de contacto, incluido su régimen fiscal, **Then** el cliente queda disponible para consulta con estado "activo".
2. **Given** un cliente ya registrado, **When** el personal intenta registrar otro cliente con el mismo identificador fiscal (RFC), **Then** el sistema rechaza el alta duplicada.
3. **Given** un cliente activo, **When** el personal lo da de baja, **Then** el cliente pasa a estado "inactivo" pero su información y su historial (cobranza, expediente) permanecen consultables, sin eliminarse físicamente.
4. **Given** un cliente existente, **When** el personal actualiza sus datos de contacto o fiscales, **Then** la ficha refleja los cambios de inmediato y queda registro de quién hizo el cambio y cuándo.
5. **Given** un cliente de tipo persona física, **When** el personal intenta asignarle un régimen fiscal exclusivo de personas morales (o viceversa), **Then** el sistema rechaza la asignación.
6. **Given** un régimen fiscal cuya vigencia ya terminó, **When** el personal intenta asignarlo a un cliente, **Then** el sistema rechaza la asignación, salvo que el cliente ya lo tuviera asignado desde antes de que venciera.
7. **Given** un cliente registrado, **When** el personal agrega uno o más Contactos (nombre, teléfono y, opcionalmente, correo) a su ficha, **Then** todos los contactos quedan asociados a ese cliente y son consultables desde su ficha.
8. **Given** un cliente con varios Contactos, **When** el personal marca uno de ellos como "principal", **Then** ese Contacto queda identificado como el principal del cliente y cualquier otro que tuviera esa marca la pierde (a lo sumo un Contacto principal por cliente); si un Contacto deja de ser vigente, el personal lo marca como "obsoleto" en vez de eliminarlo, y su historial permanece consultable (`008-contactos-y-detalle-cliente`, FR-006/FR-007).

---

### User Story 2 - Dar seguimiento a la cobranza de un cliente (Priority: P2)

Un Contador registra los cargos mensuales de cada cliente y los pagos que va recibiendo, y puede consultar en cualquier momento qué clientes están al corriente, cuáles tienen adeudos pendientes, y el historial completo de pagos y recibos emitidos.

**Why this priority**: Es una funcionalidad principal del despacho (constitución del proyecto, sección "Cobranza"), pero depende de que el cliente ya exista (Historia 1); es independiente de que el expediente digital esté implementado.

**Independent Test**: Puede probarse registrando cargos de cobranza para un cliente ya existente, registrando pagos contra esos cargos, y verificando que el estado de cobranza (al corriente / con adeudo) se calcula correctamente sin necesitar el expediente digital.

**Acceptance Scenarios**:

1. **Given** un cliente activo, **When** el personal registra el cargo de cobranza correspondiente a un periodo, **Then** ese cargo aparece como "pendiente" hasta que se registre un pago que lo cubra.
2. **Given** un cargo de cobranza pendiente, **When** el personal registra un pago, **Then** el sistema genera automáticamente el recibo correspondiente, y si el pago cubre el cargo por completo, este cambia a estado "pagado".
3. **Given** varios clientes con distintos estados de cobranza, **When** el personal consulta el listado de cobranza, **Then** puede distinguir de inmediato cuáles clientes están al corriente y cuáles tienen adeudos, y ver el historial de pagos y recibos de cada uno.
4. **Given** un cargo de cobranza cuya fecha de vencimiento ya pasó sin haberse pagado, **When** el sistema evalúa su estado, **Then** el cargo se refleja como "vencido" en los listados de cobranza.
5. **Given** un pago que cubre uno o varios cargos de cobranza con distinto concepto, **When** se genera el recibo, **Then** el recibo muestra el/los concepto(s) cubiertos, y ese texto ya no cambia aunque después se edite el concepto del cargo original.
6. **Given** un pago por registrar, **When** el personal selecciona el método de pago, **Then** debe elegirlo de un catálogo administrado (no un valor fijo en el código), inicialmente poblado con efectivo, cheque, saldo, depósito, transferencia y banco.

---

### User Story 3 - Gestionar el expediente digital de un cliente (Priority: P3)

Un miembro del personal del despacho carga documentos fiscales de un cliente al expediente digital, clasificándolos por categoría, y puede consultar el historial completo de documentos cargados, incluidas versiones anteriores cuando un documento se reemplaza.

**Why this priority**: Depende de que el cliente ya exista (Historia 1); es independiente de la cobranza, por lo que puede construirse y probarse por separado.

**Independent Test**: Puede probarse cargando un documento PDF a una categoría del expediente de un cliente ya existente, reemplazándolo por una versión nueva, y verificando que la versión anterior sigue siendo consultable en el historial.

**Acceptance Scenarios**:

1. **Given** un cliente activo, **When** el personal carga un documento PDF a una categoría del expediente, **Then** el documento queda disponible para consulta, clasificado por esa categoría y por la fecha de carga, conservando su nombre original.
2. **Given** un documento ya cargado, **When** el personal intenta cargar un archivo que no es PDF, **Then** el sistema rechaza la carga.
3. **Given** un documento ya cargado en una categoría, **When** el personal carga una nueva versión de ese documento, **Then** la versión anterior permanece en el historial y no se elimina físicamente.
4. **Given** un documento del expediente, **When** alguien intenta eliminarlo físicamente sin la autorización explícita requerida, **Then** el sistema impide la eliminación.

---

### Edge Cases

- ¿Qué sucede si se intenta dar de alta un cliente con el mismo RFC que uno ya dado de baja? El sistema debe evitar la ambigüedad de tener dos fichas con el mismo identificador fiscal, ya sea impidiendo el alta o reactivando la ficha existente.
- ¿Qué sucede si un pago no cubre por completo el monto de un cargo de cobranza (pago parcial)? El cargo debe reflejar el saldo pendiente en vez de marcarse como pagado por completo.
- ¿Qué sucede si un pago cubre más de un cargo de cobranza a la vez? El sistema debe poder asociar un mismo pago a varios cargos.
- ¿Qué sucede si se intenta cargar un documento que excede el tamaño máximo configurado? El sistema debe rechazar la carga con un mensaje claro.
- ¿Qué sucede con los cargos de cobranza pendientes de un cliente que se da de baja? Permanecen en su estado e historial; darse de baja no los cancela ni los elimina automáticamente.
- ¿Qué sucede si se intenta registrar un cargo de cobranza para un cliente inactivo? El sistema debe impedirlo, ya que un cliente dado de baja no debería generar cobranza nueva.
- ¿Qué sucede si se intenta asignar a un cliente un régimen fiscal no aplicable a su tipo de persona, o uno cuya vigencia ya terminó? El sistema debe rechazar la asignación (ver Clarifications).
- ¿Qué sucede con los clientes que ya tenían asignado un régimen fiscal que después perdió vigencia? El régimen asignado permanece visible en su ficha; solo se restringe la selección de regímenes no vigentes para asignaciones nuevas.
- ¿Qué sucede si se desactiva un método de pago del catálogo que ya fue usado en pagos existentes? Los pagos históricos conservan el método de pago con el que se registraron; el método desactivado deja de estar disponible para pagos nuevos.
- ¿Qué sucede si se marca un Contacto como "obsoleto"? No se elimina físicamente; su historial permanece consultable. Si era el único Contacto principal del cliente, el cliente queda temporalmente sin Contacto principal marcado, hasta que el personal designe uno nuevo (`008-contactos-y-detalle-cliente`, Edge Cases).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema DEBE permitir registrar un Cliente con, al menos: nombre o razón social, tipo de persona (física o moral), identificador fiscal (RFC), correo, teléfono, dirección fiscal, y estado (activo/inactivo).
- **FR-002**: El sistema DEBE impedir que existan dos Clientes activos con el mismo identificador fiscal (RFC).
- **FR-003**: El sistema DEBE permitir dar de baja (desactivar) a un Cliente sin eliminar físicamente su información ni su historial de cobranza o expediente (soft-delete).
- **FR-004**: El sistema DEBE permitir asociar cada Cliente con un responsable único del personal, a modo de dato informativo; esta asignación NO DEBE limitar el acceso ni la atención del Cliente, ya que cualquier miembro del personal con el permiso correspondiente puede consultarlo o atenderlo independientemente de quién sea su responsable asignado.
- **FR-005**: El sistema DEBE registrar, para cada Cliente, un Cargo de cobranza por periodo, con monto, concepto, fecha de vencimiento, y estado (pendiente, pagado, vencido o cancelado).
- **FR-006**: El sistema DEBE registrar cada Pago recibido de un Cliente, pudiendo asociarse a uno o más Cargos de cobranza, con su monto, fecha y método de pago.
- **FR-007**: El sistema DEBE permitir calcular, en cualquier momento, qué Clientes están al corriente y cuáles tienen adeudos, con base en el estado de sus Cargos de cobranza.
- **FR-008**: El sistema DEBE generar automáticamente el Recibo correspondiente en cuanto se registra un Pago, sin requerir una acción manual adicional del personal.
- **FR-009**: El sistema DEBE impedir registrar un Cargo de cobranza nuevo para un Cliente inactivo.
- **FR-010**: El sistema DEBE permitir cargar Documentos al expediente de un Cliente, clasificados por una Categoría de documento (catálogo configurable por un Administrador) y por fecha de carga.
- **FR-011**: El sistema DEBE restringir los Documentos del expediente exclusivamente a archivos en formato PDF.
- **FR-012**: El sistema DEBE conservar el nombre original de cada Documento cargado.
- **FR-013**: El sistema DEBE permitir reemplazar un Documento por una nueva versión, conservando las versiones anteriores consultables en un historial, sin eliminarlas físicamente.
- **FR-014**: El sistema DEBE registrar quién cargó cada Documento y en qué fecha (historial de carga).
- **FR-015**: El sistema NUNCA DEBE eliminar físicamente un Documento del expediente sin una autorización explícita; la eliminación por defecto DEBE ser lógica.
- **FR-016**: El sistema DEBE definir un tamaño máximo configurable para los Documentos cargados, y DEBE rechazar cargas que lo excedan.
- **FR-017**: El sistema DEBE registrar fecha de creación, fecha de última modificación, usuario que creó y usuario que modificó por última vez, para cada Cliente, Cargo de cobranza, Pago, Recibo, Categoría de documento y Documento.
- **FR-018**: El sistema DEBE registrar como eventos de auditoría: altas y modificaciones de Clientes, cambios en Pagos, carga y eliminación de Documentos, y generación de Recibos.
- **FR-019**: El acceso a la información de Clientes, Cobranza y Expedientes DEBE respetar el modelo de roles y capacidades ya definido para el personal del despacho (Administrador, Contador, Auxiliar), sin introducir un sistema de permisos independiente.
- **FR-020**: El sistema DEBE mantener un catálogo de Regímenes Fiscales (sembrado inicialmente con el catálogo del SAT provisto), y cada Cliente DEBE tener asignado exactamente un régimen fiscal de ese catálogo.
- **FR-021**: El sistema DEBE impedir asignar a un Cliente un régimen fiscal no aplicable a su tipo de persona (física/moral), según lo indicado por el catálogo.
- **FR-022**: El sistema DEBE impedir asignar a un Cliente un régimen fiscal cuya vigencia ya haya terminado, excepto para clientes que ya lo tuvieran asignado desde antes de que venciera.
- **FR-023**: El sistema DEBE permitir registrar uno o más Contactos por Cliente, cada uno con nombre y teléfono obligatorios y correo electrónico opcional. Un Contacto NUNCA se elimina físicamente: cuando deja de ser vigente, se marca como "obsoleto" (estado), preservando su historial (`008-contactos-y-detalle-cliente`, FR-006).
- **FR-024**: El sistema DEBE ofrecer el método de pago de un Pago como una selección de un catálogo administrado exclusivamente por un Administrador (no un valor fijo), sembrado inicialmente con: efectivo, cheque, saldo, depósito, transferencia y banco.
- **FR-025**: El sistema DEBE generar y conservar, junto con cada Recibo, un registro inmutable del/los concepto(s) de los Cargos de cobranza que cubre, de forma que su contenido no cambie si el concepto del Cargo original se edita posteriormente.
- **FR-026**: El sistema DEBE permitir marcar, a lo sumo, un Contacto como "principal" por Cliente; marcar uno nuevo como principal retira esa marca del que la tuviera antes (`008-contactos-y-detalle-cliente`, FR-007).

### Key Entities _(include if feature involves data)_

- **Cliente**: Persona física o moral atendida por el despacho. Atributos: nombre o razón social (texto), tipo de persona (física | moral), RFC (texto corto, único mientras esté activo), régimen fiscal (relación obligatoria con Régimen Fiscal, compatible con el tipo de persona y vigente al momento de asignarse), correo (texto), teléfono (texto), dirección fiscal (texto largo), estado (activo | inactivo), responsable asignado (relación opcional con un usuario del personal, únicamente informativa — no restringe el acceso ni la atención del cliente), fecha de alta, fecha de baja (si aplica), además de los campos de trazabilidad (creado por/el, modificado por/el). Relación 1 a muchos con Cargo de cobranza, Documento de expediente y Contacto.
- **Régimen Fiscal**: Catálogo de regímenes fiscales reconocidos (basado en el catálogo del SAT). Atributos: código (texto, p. ej. "601"), descripción, aplica a persona física (sí/no), aplica a persona moral (sí/no), fecha de inicio de vigencia, fecha de fin de vigencia (vacía si sigue vigente). Sembrado inicialmente con los datos provistos; el mecanismo para administrar altas de nuevos regímenes se definirá en una fase posterior — por ahora basta con que el catálogo exista y cada Cliente lo referencie.
- **Contacto**: Persona de contacto de un Cliente. Atributos: cliente (relación), nombre, teléfono, correo (opcional), estado (activo | obsoleto — soft-delete, nunca eliminación física), es_principal (booleano, a lo sumo uno en `true` por cliente), trazabilidad. Relación N a 1 con Cliente (un Cliente puede tener varios Contactos). Campos `estado`/`es_principal` incorporados por `008-contactos-y-detalle-cliente` (FR-006/FR-007) — ver FR-023/FR-026.
- **Cargo de cobranza**: Monto que un Cliente debe cubrir en un periodo determinado (mensualidad). Atributos: cliente (relación), periodo (mes y año), concepto (texto), monto (número decimal), fecha de vencimiento, estado (pendiente | pagado | vencido | cancelado), trazabilidad. Relación muchos a muchos con Pago (un pago puede cubrir varios cargos; un cargo puede recibir varios pagos parciales).
- **Pago**: Registro de un cobro efectivamente recibido de un Cliente. Atributos: cliente (relación), cargo(s) de cobranza que cubre (relación), monto (número decimal), fecha de pago, método de pago (relación con el catálogo Método de Pago), referencia o folio bancario (texto, opcional), trazabilidad. Da origen a un Recibo.
- **Método de Pago**: Catálogo administrado exclusivamente por un Administrador (mismo patrón de gobernanza que Categoría de documento). Atributos: nombre, activo (sí/no), trazabilidad. Sembrado inicialmente con: efectivo, cheque, saldo, depósito, transferencia y banco.
- **Recibo**: Comprobante emitido al Cliente por uno o más Pagos recibidos. Atributos: pago(s) asociado(s) (relación), folio (texto, único), concepto (texto, snapshot inmutable del/los concepto(s) de los Cargos cubiertos al momento de emitirse — no cambia si el concepto del Cargo original se edita después), fecha de emisión, monto, cliente (derivado del pago), trazabilidad. Exportable a PDF (constitución, sección "Reportes").
- **Categoría de documento**: Clasificación configurable por un Administrador para organizar los Documentos del expediente. Atributos: nombre (texto), descripción (texto, opcional), activa (sí/no), trazabilidad.
- **Documento de expediente**: Archivo fiscal de un Cliente. Atributos: cliente (relación), categoría (relación), nombre original del archivo (texto), tamaño (número), formato (siempre PDF), número de versión (número entero), documento anterior (relación opcional, para formar el historial de versiones), estado (activo | reemplazado), fecha de carga, cargado por (relación con el usuario del personal), trazabilidad.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: El personal puede registrar un cliente nuevo con todos sus datos fiscales y de contacto en menos de 3 minutos.
- **SC-002**: El personal puede identificar, en menos de 10 segundos, qué clientes están al corriente y cuáles tienen adeudos, sin necesidad de calcular manualmente estados de cuenta.
- **SC-003**: El 100% de los documentos cargados al expediente quedan clasificados por categoría y fecha, y son de formato PDF.
- **SC-004**: El 100% de los reemplazos de documentos conservan consultable la versión anterior — ningún documento se elimina físicamente sin autorización explícita.
- **SC-005**: El 100% de las altas/modificaciones de clientes, cambios en pagos, cargas de documentos y generación de recibos quedan registrados para auditoría.
- **SC-006**: El personal puede consultar el historial completo de pagos y recibos de cualquier cliente en menos de 10 segundos desde su ficha.
- **SC-007**: El 100% de los clientes registrados tiene asignado un régimen fiscal compatible con su tipo de persona y vigente al momento de la asignación.
- **SC-008**: El 100% de los recibos generados conserva el concepto que mostraba al emitirse, incluso si el concepto del cargo original se edita después.

## Assumptions

- El despacho opera en México: se usa el RFC como identificador fiscal único de cada Cliente, y "recibo de honorarios"/"expediente fiscal" siguen la terminología ya usada en la constitución del proyecto.
- La cobranza es de periodicidad mensual (constitución, "control de cobranza mensual"); el monto de un Cargo de cobranza puede variar entre periodos, no es necesariamente fijo para un Cliente.
- Un Cliente puede tener múltiples Cargos de cobranza a lo largo del tiempo (uno por periodo) y múltiples Documentos en su expediente (uno o más por Categoría, más sus versiones históricas).
- Esta especificación define el modelo de datos y las reglas de negocio asociadas a Clientes, Cobranza y Expedientes; no define las pantallas ni los flujos de captura específicos de cada aplicación (`apps/admin`/`apps/portal`) — eso se abordará en una fase de planeación/implementación posterior, consistente con el alcance solicitado ("definir las entidades... campos y tipos").
- El almacenamiento físico de los archivos de los Documentos (por ejemplo, Storage de Supabase, según la constitución) es un detalle de implementación fuera del alcance de esta especificación a nivel de negocio.
- El acceso y las restricciones por rol (quién puede ver/editar qué) reutilizan el modelo de roles y capacidades ya definido en `003-supabase-auth-roles` (FR-019); esta especificación no redefine roles ni permisos, solo identifica que la información de Clientes/Cobranza/Expedientes debe quedar sujeta a ese mismo modelo.
- El catálogo de Regímenes Fiscales se siembra con los datos provistos por el usuario (`specs/005-clientes-cobranza-expedientes/assets/regimenes.json`, basado en el catálogo del SAT); el mecanismo para que un Administrador agregue nuevos regímenes desde la interfaz queda fuera de alcance de esta especificación y se definirá en una fase posterior — por ahora el catálogo solo necesita existir como entidad consultable por FK.
- Un futuro módulo de "recibos personalizados" (para generar un recibo con un concepto libre no ligado a un Cargo de cobranza, por ejemplo por un servicio no contemplado) queda fuera de alcance de esta especificación; el Recibo aquí definido siempre deriva de uno o más Pagos que cubren Cargos de cobranza existentes.
- El método de pago deja de ser un valor fijo del sistema y pasa a ser un catálogo administrado (mismo patrón de gobernanza que Categoría de documento), sembrado inicialmente con los valores provistos por el usuario: efectivo, cheque, saldo, depósito, transferencia y banco.
- **(2026-07-18)** `cargos_cobranza.concepto` es hoy texto libre. Se anticipa que, cuando se especifique el módulo Servicios (`001-business-domain-model`), un Cargo pueda derivar opcionalmente de un Servicio contratado (FK opcional, sin romper cargos ya existentes) — preservando el mismo patrón de snapshot inmutable que ya usa `recibos.concepto` (FR-025), para no alterar cargos/recibos históricos al hacerlo. No es una decisión de esta sesión, solo una nota para quien especifique Servicios.
- **(2026-07-18)** `documentos`/`categorias_documento` hoy solo se relacionan con `cliente_id`. Se anticipa que, cuando se especifique Gestión Fiscal (Obligaciones y Periodos Fiscales), un Documento pueda tener una relación opcional a un Periodo Fiscal — sin alterar el expediente ya construido. Tampoco es una decisión de esta sesión.
- **(2026-07-18)** `business_audit_log.entidad` es de tipo `text` sin `enum`/`check` (por diseño). Esto facilita el trabajo futuro: agregar auditoría de negocio para una entidad nueva (Servicio, Obligación Fiscal, Notificación) no requiere una migración de esquema, solo un nuevo trigger que inserte en esta misma tabla.
- **(2026-07-18)** `docs/ux/design-system.md` es la fuente de verdad de reglas UX del proyecto, incluida la regla de color semántico (azul=positivo, rojo=negativo/atención, gris=neutro; nunca verde). Esa regla todavía no mapea explícitamente los 4 valores de `cargo_estado` (`pendiente`, `pagado`, `vencido`, `cancelado`) a un color — queda como decisión pendiente para quien especifique la interfaz de Cobranza (fuera de alcance de esta feature de modelado de datos), no una omisión a corregir aquí.
