# Feature Specification: Modelo de Dominios de Negocio

**Feature Branch**: `001-business-domain-model`

**Created**: 2026-07-17

**Status**: Draft

**Input**: User description: "Definir los dominios funcionales principales del sistema (Clientes, Servicios, Cobranza, Pagos, Gestión Fiscal/Obligaciones, Periodos Fiscales, Gestión Documental, Notificaciones, Auditoría, Reportes), sus responsabilidades, límites y relaciones, como lenguaje común para los specs funcionales futuros — conservando las decisiones de dominio ya establecidas en specs previos y registrando como actualización pendiente cualquier ajuste que se identifique en ellos, sin reemplazarlos."

## Clarifications

### Session 2026-07-17

- Q: El orden de dependencias del dominio incluye un "Portal del Cliente" como módulo futuro. El proyecto ya tiene una aplicación llamada `apps/portal`, pero es de uso interno del personal del despacho (Contador/Auxiliar), no de los clientes finales. ¿Qué es el "Portal del Cliente" de este modelo? → A: Es un concepto distinto y futuro — una futura superficie de autoservicio para clientes externos (fuera del alcance de `apps/portal` actual), cuyo alcance exacto se definirá en su propio spec cuando llegue ese punto del orden de implementación. Se documenta como Assumption para evitar confusión de nombres.

## User Scenarios & Testing _(mandatory)_

Este documento no describe una funcionalidad de usuario final — es un modelo de referencia conceptual. Sus "usuarios" son quienes especifican, planifican y desarrollan los módulos del sistema. Las historias siguientes describen cómo se usa este documento en ese proceso.

### User Story 1 - Ubicar la responsabilidad correcta al especificar un módulo nuevo (Priority: P1) 🎯 MVP

Como responsable de escribir el spec funcional de un módulo nuevo, quiero consultar este modelo de dominios para identificar sin ambigüedad en qué dominio vive cada responsabilidad, de modo que no duplique lógica que ya pertenece a otro dominio ni la disperse entre varios módulos.

**Why this priority**: Es el propósito central de este documento — sin esto, cada spec futuro corre el riesgo de redefinir límites de forma inconsistente.

**Independent Test**: Dada una idea de funcionalidad nueva (por ejemplo, "enviar un recordatorio de pago vencido" o "saber qué servicios tiene contratados un cliente"), un lector que solo tenga este documento puede nombrar sin ambigüedad el dominio dueño de esa responsabilidad y sus dependencias.

**Acceptance Scenarios**:

1. **Given** una propuesta para "avisar a un cliente que un pago está por vencer", **When** se consulta este documento, **Then** se identifica que la responsabilidad de generar el aviso pertenece a Gestión de Notificaciones, y que depende de información que produce Gestión de Cobranza (no que Cobranza deba enviar el aviso directamente).
2. **Given** una propuesta para "mostrar qué servicios tiene contratados un cliente", **When** se consulta este documento, **Then** se identifica que esa información pertenece a Gestión de Servicios (servicios activos por cliente), y que Gestión de Clientes solo referencia esa relación sin administrar los datos del servicio en sí.
3. **Given** una propuesta para "generar automáticamente las declaraciones que debe presentar un cliente cada mes", **When** se consulta este documento, **Then** se identifica que pertenece a Gestión Fiscal (obligaciones y periodos fiscales), distinta de Gestión Documental (que administra los archivos asociados) y de Gestión de Cobranza (que administra los cargos, no las obligaciones).

---

### User Story 2 - Secuenciar el desarrollo de los módulos futuros (Priority: P2)

Como responsable de planear el trabajo del equipo, quiero un orden de dependencias recomendado entre dominios, de modo que cada módulo se construya sobre información que sus dependencias ya proveen, evitando retrabajo.

**Why this priority**: Reduce el riesgo de construir un módulo que dependa de datos que otro módulo, planeado después, todavía no existe.

**Independent Test**: Dado el orden de dependencias documentado, se puede verificar que ningún dominio de la lista depende de un dominio que aparece después que él en el orden recomendado.

**Acceptance Scenarios**:

1. **Given** el orden recomendado de implementación, **When** se revisan las dependencias declaradas de cada dominio, **Then** ninguna dependencia apunta a un dominio que aparezca más adelante en el orden.
2. **Given** que Gestión de Cobranza depende de Clientes y Servicios, **When** se planea su desarrollo, **Then** ambos dominios de los que depende ya deben estar disponibles (implementados o al menos especificados) antes de comenzar Cobranza.

---

### User Story 3 - Registrar un ajuste pendiente sin reemplazar decisiones existentes (Priority: P2)

Como responsable de mantener la coherencia entre este modelo y los specs ya construidos, quiero que cualquier contradicción o vacío detectado entre este modelo y un spec existente quede registrado como una actualización pendiente de ese spec, en vez de modificarlo directamente o ignorar la inconsistencia.

**Why this priority**: Preserva las decisiones ya tomadas (y ya implementadas) mientras deja constancia explícita de lo que debe alinearse a futuro, evitando cambios no planeados sobre código que ya funciona.

**Independent Test**: Dada una inconsistencia identificada entre este modelo y un spec existente, se puede verificar que quedó documentada con el spec afectado señalado por su nombre, sin que el spec original haya sido modificado como efecto de este documento.

**Acceptance Scenarios**:

1. **Given** que este modelo introduce "Servicios" como catálogo, y que hoy los cargos de cobranza usan un concepto de texto libre sin catálogo, **When** se detecta la diferencia, **Then** queda registrada como una actualización pendiente del spec/módulo de Cobranza (o del futuro spec de Servicios), sin alterar el esquema ya construido en esta sesión.
2. **Given** que este modelo introduce "Obligaciones Fiscales" y "Periodos Fiscales" como entidades propias, y que hoy los documentos solo se relacionan con el cliente, **When** se detecta la diferencia, **Then** queda registrada como actualización pendiente del módulo de Gestión Documental/Fiscal, sin modificar el expediente ya construido.

---

### Edge Cases

- ¿Qué pasa si dos dominios parecen responsables de la misma información? Prevalece el límite declarado en este documento; toda implementación previa que lo contradiga se registra como actualización pendiente del spec correspondiente, no se resuelve modificando este modelo para ajustarse a la implementación existente.
- ¿Qué pasa si un spec futuro necesita una responsabilidad que hoy no encaja claramente en ningún dominio? Se asigna al dominio existente más cercano por afinidad de responsabilidad, o se documenta como una ampliación de este modelo antes de escribir el spec del módulo.
- ¿Qué pasa si la implementación ya construida de un dominio (por ejemplo, Cobranza) no coincide exactamente con la responsabilidad aquí descrita? No se modifica la implementación como efecto de este documento; la diferencia se registra en la sección de actualizaciones pendientes para resolverse cuando se especifique o revise ese módulo.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: Este documento DEBE declarar los dominios funcionales principales del sistema, la responsabilidad de cada uno y lo que explícitamente NO administra, para servir como referencia a los specs funcionales futuros.
- **FR-002**: Cada responsabilidad del sistema DEBE poder ubicarse en un único dominio dueño; ningún dominio DEBE administrar información que la responsabilidad de otro dominio ya cubre.
- **FR-003**: La información que represente hechos de negocio ya ocurridos (cobranzas generadas, pagos registrados, documentos enviados, cambios realizados) DEBE conservarse como historial, sin eliminar información previa al modificarla.
- **FR-004**: Gestión de Clientes DEBE administrar los datos generales, información de contacto y estado del cliente, y su relación con los servicios contratados y las obligaciones fiscales que le correspondan — sin administrar documentos, pagos ni facturación.
- **FR-005**: Gestión de Servicios DEBE administrar el catálogo de servicios ofrecidos, su precio vigente, su estado y los servicios activos por cliente; DEBE ser la fuente de información que Gestión de Cobranza utiliza para generar cargos.
- **FR-006**: Gestión de Cobranza DEBE administrar los cargos generados a partir de los servicios contratados y los pagos asociados a esos cargos (generación periódica, estados, saldos pendientes), dependiendo de Clientes y Servicios — sin administrar documentos fiscales ni la comunicación con el cliente.
- **FR-007**: Gestión Fiscal DEBE administrar el catálogo de obligaciones fiscales, su frecuencia de cumplimiento, y su asignación a cada cliente según su régimen y características, así como la generación de los periodos fiscales correspondientes.
- **FR-008**: Gestión Documental Fiscal DEBE administrar los expedientes, periodos fiscales asociados, tipos de documento, archivos, metadatos y el estado de cumplimiento documental — incluyendo la validación de qué documentos son requeridos.
- **FR-009**: Gestión de Notificaciones DEBE administrar la comunicación automática hacia los clientes (avisos de cobranza, solicitudes de documentos, recordatorios, confirmaciones), generada a partir de eventos producidos por los demás dominios.
- **FR-010**: Auditoría DEBE mantener trazabilidad de las acciones relevantes de todos los dominios (usuario responsable, acción, fecha y hora, entidad afectada e información relacionada), sin que cada dominio necesite su propio esquema de auditoría independiente.
- **FR-011**: Reportes y Analítica DEBE consolidar información producida por los demás dominios para consulta y toma de decisiones, sin administrar ni modificar los datos de origen.
- **FR-012**: Este documento DEBE declarar un orden de dependencias recomendado entre dominios, de forma que ningún dominio dependa de otro que se implemente después que él en ese orden.
- **FR-013**: Toda diferencia detectada entre este modelo y un spec o implementación ya existente DEBE registrarse como una actualización pendiente del spec correspondiente, identificándolo por nombre, en vez de modificarlo o descartar la decisión ya tomada.
- **FR-014**: Este documento NO DEBE definir diseño de base de datos, diseño de interfaces, endpoints, flujos de pantalla ni reglas detalladas de un módulo — cada dominio tendrá su propio spec funcional para esos aspectos.

### Key Entities _(include if feature involves data)_

- **Cliente**: Ya definido (`005-clientes-cobranza-expedientes`, extendido por `006`/`007`/`008`). Este modelo no lo redefine; documenta su límite de responsabilidad dentro de Gestión de Clientes.
- **Contacto**: Ya definido (`005`, extendido por `008`). Pertenece a Gestión de Clientes.
- **Servicio**: Concepto nuevo — catálogo de servicios ofrecidos y contratados por cliente, con precio vigente y estado. No implementado todavía (ver Actualizaciones Pendientes).
- **Cargo de Cobranza / Pago / Recibo**: Ya definidos (`005`). Pertenecen a Gestión de Cobranza; el recibo se conserva como parte de ese mismo dominio, no como un dominio propio (ver Actualizaciones Pendientes sobre la lista de módulos de la Constitución).
- **Obligación Fiscal**: Concepto nuevo — catálogo de obligaciones fiscales, su frecuencia y su asignación por cliente. No implementado todavía.
- **Periodo Fiscal**: Concepto nuevo — instancia periódica de una obligación fiscal para un cliente, punto de enlace entre Gestión Fiscal y Gestión Documental. No implementado todavía.
- **Documento / Expediente**: Ya definidos (`005`, como `documentos`/`categorias_documento`), hoy vinculados solo al cliente. Este modelo los reubica dentro de Gestión Documental Fiscal y anticipa su relación futura con Periodo Fiscal (ver Actualizaciones Pendientes).
- **Notificación**: Concepto nuevo — comunicación generada a partir de un evento de otro dominio. No implementado todavía; no existe infraestructura de envío de correo en el proyecto aún.
- **Registro de Auditoría**: Ya definido (`005`, `business_audit_log`), genérico y reutilizado por todos los dominios.
- **Reporte**: Concepto nuevo a nivel de dominio — vista consolidada de información de otros dominios; no implementado todavía.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Un miembro del equipo puede identificar, usando únicamente este documento, el dominio dueño de una responsabilidad nueva en menos de 5 minutos.
- **SC-002**: El 100% de los specs de módulos funcionales que se escriban a partir de este documento referencian el dominio al que pertenecen y no duplican una responsabilidad ya asignada a otro dominio.
- **SC-003**: El 100% de las diferencias detectadas entre este modelo y un spec o implementación existente quedan registradas como actualización pendiente, identificando el spec afectado, antes de dar por completo este documento.
- **SC-004**: Los dominios nuevos (Servicios, Gestión Fiscal, Gestión Documental Fiscal ampliada, Notificaciones, Reportes) pueden especificarse e implementarse sin requerir cambios estructurales no documentados sobre los dominios ya construidos (Clientes, Cobranza, Auditoría).
- **SC-005**: El orden de dependencias declarado no contiene ningún ciclo ni una dependencia hacia un dominio posterior en la secuencia recomendada.

## Assumptions

- El modelo de roles y capacidades (Administrador, Contador, Auxiliar) ya definido en la Constitución y en `003-supabase-auth-roles` se reutiliza sin cambios; este documento no introduce un modelo de permisos por dominio.
- El principio de "preferir soft delete, evitar eliminaciones físicas" ya establecido en la Constitución aplica a todos los dominios de este modelo, no solo a Clientes y Documentos.
- Auditoría reutiliza el esquema genérico ya existente (`business_audit_log`, `005` research.md Decisión 5) para los dominios nuevos, en vez de que cada dominio construya su propio esquema de auditoría.
- "Servicios" es un concepto nuevo, no implementado todavía: hoy Gestión de Cobranza genera cargos con un concepto de texto libre, sin catálogo. Ver Actualizaciones Pendientes.
- "Obligaciones Fiscales" y "Periodos Fiscales" son conceptos nuevos, no implementados todavía: hoy los documentos se relacionan solo con el cliente, no con un periodo u obligación. Ver Actualizaciones Pendientes.
- "Notificaciones" es un dominio enteramente nuevo; el proyecto no tiene hoy infraestructura de envío de correo ni tablas relacionadas.
- El "Portal del Cliente" mencionado en el orden de dependencias es un concepto distinto de la aplicación interna `apps/portal` ya construida (de uso del personal del despacho); se refiere a una futura superficie de autoservicio para clientes externos, cuyo alcance se definirá en su propio spec (Clarifications, Sesión 2026-07-17).
- Este documento no reemplaza ni invalida ningún spec existente; donde hay diferencia, se documenta como actualización pendiente (ver siguiente sección) en vez de forzar consistencia inmediata.

## Actualizaciones Pendientes en Specs Existentes

Estas son las diferencias concretas detectadas entre este modelo y lo ya especificado/implementado. No se aplican en este spec — quedan registradas para resolverse cuando se especifique o revise el módulo correspondiente.

1. **Gestión de Servicios vs. `005-clientes-cobranza-expedientes` (cobranza)**: hoy `cargos_cobranza` usa un campo de concepto en texto libre, sin catálogo de servicios detrás. Al especificar Gestión de Servicios, evaluar cómo vincular los cargos a un servicio del catálogo, preservando el patrón ya usado en `recibos` de conservar el concepto como una copia inmutable en el momento de generar el cargo (mismo principio que `005` research.md Decisión 9), para no romper cargos/recibos ya emitidos.
2. **Gestión Fiscal / Gestión Documental vs. `005-clientes-cobranza-expedientes` (expedientes)**: hoy `documentos`/`categorias_documento` se relacionan únicamente con el cliente, sin un concepto de periodo u obligación fiscal. Al especificar Gestión Fiscal, evaluar si `documentos` requiere una relación opcional hacia un futuro periodo fiscal, sin alterar el expediente ya construido ni los documentos ya cargados.
3. ~~**Lista de módulos de la Constitución**~~ — **RESUELTO 2026-07-17**: la lista bajo "Arquitectura de la Aplicación" en `.specify/memory/constitution.md` se actualizó (plan.md/research.md Decisión 1, confirmada explícitamente por el equipo) para incluir Servicios, Gestión Fiscal y Notificaciones, y para declarar "Recibos de Honorarios" y "Expedientes Digitales" como parte de Cobranza y de Gestión Documental Fiscal respectivamente, en vez de módulos independientes.
4. **Notificaciones**: no existe ningún spec ni infraestructura previa — dominio enteramente nuevo, sin conflicto que resolver, solo un módulo pendiente de especificar en su momento del orden recomendado.
