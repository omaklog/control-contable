# Feature Specification: Expediente Fiscal

**Feature Branch**: `016-expediente-fiscal`

**Created**: 2026-07-21

**Status**: Draft

**Input**: User description: "Expediente Fiscal — repositorio documental digital por cliente, organizado por documentos generales y por año/periodo, con catálogo de Tipos de Documento, Documentos Esperados por obligación fiscal (informativos, no bloqueantes), documentos adicionales libres, asociación opcional con cumplimientos y obligaciones fiscales, eliminación lógica con permisos por antigüedad, vista global de expedientes entre clientes, y seguridad de almacenamiento con acceso temporal."

## Clarifications

### Session 2026-07-21

- Q: ¿La asociación directa de un documento con una Obligación Fiscal (sin pasar por un Cumplimiento Fiscal) crea una tercera agrupación visual en el expediente, o es solo un dato de contexto/filtro? → A: Es únicamente una relación contextual/metadato del documento, independiente de la organización visual del expediente. El documento permanece en "Documentos Generales" (sin periodo) o en "Documentos por Periodo" (con periodo, heredado de un cumplimiento asociado); la relación con la obligación queda disponible para búsqueda, filtrado y consulta de contexto. La estructura física/visual del expediente y las relaciones de negocio del documento son conceptos independientes.
- Q: ¿Cómo se representa "Sin clasificar" para un documento sin Tipo de Documento asignado? → A: El Tipo de Documento es un dato opcional del documento (puede quedar sin valor); "Sin clasificar" es la ausencia de ese valor, no una fila especial reservada dentro del catálogo de Tipos de Documento.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Consultar y cargar documentos en el expediente del cliente (Priority: P1)

Un miembro del despacho abre el detalle de un cliente, ve su expediente fiscal organizado en "Documentos Generales" y "Documentos por Periodo" (agrupados por año), y sube un nuevo documento PDF clasificándolo con un Tipo de Documento (o dejándolo "Sin clasificar").

**Why this priority**: Es la funcionalidad base de todo el módulo — sin poder ver y cargar documentos, ninguna otra historia tiene sentido.

**Independent Test**: Puede probarse completamente subiendo un PDF al expediente de un cliente, verificando que aparece clasificado en la sección correcta (general o por periodo) y que sus metadatos (nombre, tipo, tamaño, fecha, usuario) son correctos.

**Acceptance Scenarios**:

1. **Given** un cliente sin documentos previos, **When** el usuario sube un PDF sin indicar periodo, **Then** el documento aparece en "Documentos Generales".
2. **Given** un cumplimiento fiscal de un cliente para un periodo específico, **When** el usuario sube un documento y lo asocia a ese cumplimiento, **Then** el documento aparece agrupado bajo el año y periodo de ese cumplimiento.
3. **Given** un documento cargado sin Tipo de Documento seleccionado, **When** el usuario lo consulta después, **Then** el documento se muestra como "Sin clasificar" y puede clasificarse posteriormente sin que esto haya bloqueado su carga inicial.
4. **Given** un archivo que no es PDF, **When** el usuario intenta subirlo, **Then** el sistema rechaza la carga con un mensaje claro antes de almacenar nada.
5. **Given** un documento del expediente, **When** un usuario autorizado lo abre o lo descarga, **Then** el sistema genera un acceso temporal seguro y el archivo se visualiza o descarga correctamente.

---

### User Story 2 - Ver Documentos Esperados de un cumplimiento y cargar documentos adicionales (Priority: P1)

Desde el detalle de un Cumplimiento Fiscal (015), el usuario ve qué Documentos Esperados ya están disponibles y cuáles faltan, y puede cargar libremente documentos adicionales no contemplados en la configuración, sin que la ausencia de un esperado bloquee ninguna acción sobre el cumplimiento.

**Why this priority**: Es el valor de negocio central del módulo — dar visibilidad de la documentación pendiente sin generar bloqueos operativos, tal como lo exige el objetivo del feature.

**Independent Test**: Puede probarse abriendo un cumplimiento cuya obligación tiene Documentos Esperados configurados, verificando que se listan con su estado (disponible/faltante), y confirmando que el cumplimiento puede marcarse como presentado aunque falten esperados.

**Acceptance Scenarios**:

1. **Given** un cumplimiento cuya obligación tiene dos Documentos Esperados configurados y solo uno fue cargado, **When** el usuario abre el detalle del cumplimiento, **Then** ve ambos esperados listados, uno marcado como disponible y otro como faltante.
2. **Given** un cumplimiento con Documentos Esperados faltantes, **When** el usuario cambia el estado del cumplimiento a "Presentada", **Then** el cambio se guarda sin ninguna advertencia bloqueante.
3. **Given** el detalle de un cumplimiento, **When** el usuario carga un documento que no corresponde a ningún Documento Esperado configurado, **Then** el documento se guarda y se muestra en una sección de "Documentos Adicionales" del mismo cumplimiento.
4. **Given** una obligación sin Documentos Esperados configurados, **When** el usuario abre el detalle de un cumplimiento de esa obligación, **Then** no se muestra ninguna sección de esperados y el usuario puede seguir cargando documentos con normalidad.

---

### User Story 3 - Buscar documentos desde la vista global de Expedientes (Priority: P2)

Un miembro del despacho abre la sección global de Expedientes (fuera del detalle de un cliente específico) y busca documentos de cualquier cliente filtrando por cliente, RFC, tipo de documento, año, periodo, obligación, cumplimiento, fecha de alta o usuario que cargó el documento.

**Why this priority**: Da al despacho una vista operativa transversal, pero depende de que ya existan documentos cargados (US1), por lo que es valiosa una vez que la base documental existe.

**Independent Test**: Puede probarse cargando documentos para al menos dos clientes distintos y verificando que la vista global permite localizar cada uno usando distintos criterios de filtro, y que seleccionar un resultado lleva al expediente del cliente correspondiente.

**Acceptance Scenarios**:

1. **Given** documentos cargados para varios clientes, **When** el usuario filtra por Tipo de Documento, **Then** solo se muestran documentos de ese tipo, sin importar a qué cliente pertenezcan.
2. **Given** un resultado de búsqueda en la vista global, **When** el usuario lo selecciona, **Then** es llevado al expediente del cliente correspondiente, con el documento visible.
3. **Given** un usuario sin autorización para ver documentos de cierto cliente, **When** realiza una búsqueda global, **Then** los documentos de ese cliente no aparecen en los resultados.

---

### User Story 4 - Eliminar un documento respetando permisos por antigüedad (Priority: P2)

Un usuario intenta eliminar (lógicamente) un documento del expediente. El sistema permite la eliminación si el usuario es Administrador, o si es Contador/Auxiliar y el documento tiene tres meses o menos desde su fecha de alta; en caso contrario, informa que se requiere un Administrador.

**Why this priority**: Es una operación de mantenimiento importante para mantener el expediente ordenado, pero no bloquea el valor central de consulta/carga (US1/US2), por lo que puede llegar después.

**Independent Test**: Puede probarse creando documentos con distinta antigüedad y verificando, por rol, cuáles pueden eliminarse y cuáles requieren un Administrador.

**Acceptance Scenarios**:

1. **Given** un documento cargado hace una semana, **When** un Auxiliar intenta eliminarlo, **Then** la eliminación se realiza y el documento deja de aparecer en las vistas operativas normales.
2. **Given** un documento cargado hace cuatro meses, **When** un Contador intenta eliminarlo, **Then** el sistema rechaza la acción indicando que se requiere un Administrador.
3. **Given** un documento cargado hace cuatro meses, **When** un Administrador lo elimina, **Then** la eliminación se realiza sin restricción de antigüedad.
4. **Given** un documento cuyos metadatos (por ejemplo su Tipo de Documento) fueron modificados hace una semana pero cuya fecha de alta original es de hace cuatro meses, **When** un Auxiliar intenta eliminarlo, **Then** el sistema lo rechaza porque la antigüedad se calcula desde la fecha de alta original, no desde la última modificación.
5. **Given** un documento eliminado lógicamente, **When** cualquier usuario consulta el expediente, **Then** el documento no aparece en las vistas operativas normales pero su información permanece disponible en auditoría.

---

### User Story 5 - Definir Documentos Esperados para una obligación fiscal (Priority: P3)

Un Administrador, desde la administración de una obligación fiscal del catálogo, agrega, modifica o elimina los Documentos Esperados configurados para esa obligación, sabiendo que los cumplimientos ya generados conservarán la configuración vigente al momento de su generación.

**Why this priority**: Es la funcionalidad de configuración que alimenta US2; es necesaria para que el seguimiento informativo tenga contenido, pero el despacho puede operar temporalmente sin ella (sin esperados configurados, US2 simplemente no muestra la sección).

**Independent Test**: Puede probarse configurando Documentos Esperados en una obligación, generando un cumplimiento, modificando después la configuración, y verificando que el cumplimiento ya generado conserva la lista original mientras que uno nuevo usa la lista actualizada.

**Acceptance Scenarios**:

1. **Given** una obligación fiscal sin Documentos Esperados, **When** el Administrador agrega dos, **Then** quedan disponibles para futuros cumplimientos de esa obligación.
2. **Given** un cumplimiento ya generado con una configuración de esperados, **When** el Administrador modifica la configuración de la obligación (agrega o elimina un esperado), **Then** el cumplimiento ya generado conserva la lista de esperados que tenía al momento de su generación.
3. **Given** una configuración de Documentos Esperados modificada, **When** se genera un nuevo cumplimiento de esa obligación, **Then** el nuevo cumplimiento usa la configuración vigente en ese momento.

---

### Edge Cases

- ¿Qué pasa si un usuario intenta asociar un documento de un cliente a un cumplimiento u obligación de otro cliente? El sistema debe rechazar la asociación.
- ¿Qué pasa si se sube un archivo que excede el tamaño máximo permitido? El sistema debe rechazar la carga antes de almacenar el archivo.
- ¿Qué pasa si un cliente no tiene ningún documento cargado? El expediente se muestra vacío, sin bloquear ninguna otra funcionalidad del cliente.
- ¿Qué pasa si el mismo Tipo de Documento se usa para varios archivos del mismo periodo (por ejemplo, un acuse original y uno corregido)? Ambos se conservan como documentos independientes, sin restricción de unicidad por tipo.
- ¿Qué pasa si un documento se desasocia de un cumplimiento? El documento permanece en el expediente del cliente y la desasociación queda registrada en el historial de auditoría.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema MUST mantener un expediente fiscal propio por cada cliente, accesible desde el detalle de ese cliente.
- **FR-002**: El sistema MUST garantizar que cada documento pertenezca exclusivamente a un único cliente durante todo su ciclo de vida, y MUST rechazar cualquier intento de asociar un documento, cumplimiento u obligación de un cliente distinto.
- **FR-003**: El sistema MUST permitir cargar documentos exclusivamente en formato PDF, validando el tipo de archivo antes de almacenarlo y rechazando cualquier otro formato con un mensaje claro.
- **FR-004**: El sistema MUST organizar automáticamente los documentos de un cliente en "Documentos Generales" (sin periodo fiscal) y "Documentos por Periodo" (agrupados por año y periodo), sin depender de carpetas creadas manualmente por los usuarios.
- **FR-005**: El sistema MUST usar un catálogo de Tipos de Documento (administrable por el Administrador: crear, editar, activar/desactivar) para clasificar los documentos cargados.
- **FR-006**: El sistema MUST permitir cargar un documento sin clasificación definitiva ("Sin clasificar") sin bloquear el flujo de carga, permitiendo clasificarlo posteriormente.
- **FR-007**: El sistema MUST permitir asociar opcionalmente un documento con un registro de Cumplimiento Fiscal existente, y ese documento MUST poder estar asociado como máximo a un único cumplimiento a la vez.
- **FR-008**: Cuando un documento esté asociado a un cumplimiento, el periodo mostrado del documento MUST corresponder al periodo definido en ese cumplimiento.
- **FR-009**: El sistema MUST permitir desasociar un documento de un cumplimiento sin eliminar el documento del expediente, y esa desasociación MUST quedar registrada en el historial de auditoría.
- **FR-010**: Una obligación fiscal del catálogo MUST poder tener cero, uno o varios Documentos Esperados configurados, administrables por el Administrador (agregar, modificar, eliminar), conservando el historial de esos cambios.
- **FR-011**: Al generarse un nuevo registro de Cumplimiento Fiscal, el sistema MUST fijar en ese registro la configuración de Documentos Esperados vigente en ese momento; cambios posteriores en la configuración de la obligación no MUST modificar retroactivamente cumplimientos ya generados.
- **FR-012**: El sistema MUST mostrar, para cada cumplimiento, el estado de cada Documento Esperado configurado (disponible o faltante), de forma exclusivamente informativa.
- **FR-013**: La ausencia de uno o más Documentos Esperados no MUST impedir cambiar el estado de un cumplimiento, marcarlo como presentado, ni cargar cualquier otro documento sobre ese cumplimiento.
- **FR-014**: El sistema MUST permitir cargar libremente documentos adicionales no definidos como Documentos Esperados, sin requerir cambios previos al catálogo ni a la configuración de la obligación.
- **FR-015**: El sistema MUST permitir múltiples documentos del mismo Tipo de Documento para un mismo cliente y periodo, sin restricción de unicidad basada únicamente en el tipo.
- **FR-016**: Cada archivo cargado MUST constituir un documento independiente; el sistema no MUST determinar automáticamente que un documento sustituye o corrige a otro, ni MUST establecer relaciones automáticas de versión entre documentos.
- **FR-017**: El sistema MUST proveer una vista global de Expedientes, distinta del expediente individual del cliente, que permita consultar documentos de distintos clientes desde una sola interfaz, respetando los permisos del usuario.
- **FR-018**: La vista global y el expediente individual MUST permitir buscar y filtrar documentos como mínimo por: cliente, RFC, nombre del cliente, Tipo de Documento, año, periodo, obligación fiscal, cumplimiento fiscal, fecha de alta y usuario que cargó el documento.
- **FR-019**: Al seleccionar un documento desde la vista global, el sistema MUST llevar al usuario al expediente del cliente correspondiente.
- **FR-020**: El sistema MUST permitir visualizar y descargar un documento únicamente mediante acceso temporal, autenticado y autorizado; los documentos no MUST estar disponibles mediante URLs públicas permanentes, y un usuario no MUST poder acceder a documentos de clientes para los cuales no tiene autorización.
- **FR-021**: El sistema MUST implementar la eliminación de documentos como eliminación lógica (nunca física inmediata); un documento eliminado MUST dejar de aparecer en las vistas operativas normales pero MUST conservar su información para auditoría, historial, usuario que eliminó y fecha de eliminación.
- **FR-022**: El sistema MUST permitir eliminar documentos sin restricción de antigüedad a los usuarios con rol Administrador, y MUST restringir a los usuarios con rol Contador o Auxiliar a eliminar únicamente documentos cuya fecha de alta original no supere los tres meses; documentos con mayor antigüedad MUST requerir un Administrador.
- **FR-023**: La antigüedad de un documento para efectos de permisos de eliminación MUST calcularse siempre a partir de su fecha de alta original, y la modificación posterior de sus metadatos no MUST reiniciar ese conteo.
- **FR-024**: El sistema MUST registrar en el sistema de auditoría existente, como mínimo: carga de documento, modificación de metadatos, cambio de Tipo de Documento, asociación y desasociación con cumplimiento, asociación y desasociación con obligación fiscal, y eliminación lógica — cada evento con usuario, fecha y hora, acción, documento afectado, e información anterior/nueva cuando aplique.
- **FR-025**: El sistema MUST conservar, para cada documento, como mínimo: cliente, nombre original, Tipo de Documento (o "Sin clasificar"), año y periodo (cuando aplique), cumplimiento asociado (cuando aplique), obligación asociada (cuando aplique), tamaño, tipo de archivo, usuario que realizó la carga, fecha de alta, fecha de modificación y estado.
- **FR-026**: El modelo de datos MUST quedar preparado para incorporar en el futuro, sin rediseño, un mecanismo de papelera (consulta, restauración y eliminación definitiva de documentos eliminados, exclusivos de un Administrador) y el envío de documentos al cliente por correo electrónico, sin que ninguna de esas dos capacidades se implemente en este feature.
- **FR-027**: Cuando un documento se asocie de forma directa e informativa con una obligación fiscal (sin pasar por un cumplimiento específico), esa asociación MUST tratarse como una relación de negocio independiente de la organización visual del expediente: el documento MUST seguir mostrándose en "Documentos Generales" (sin periodo) o en "Documentos por Periodo" (con periodo, heredado de un cumplimiento asociado), y la obligación asociada MUST estar disponible únicamente como dato de búsqueda, filtrado y contexto del documento.
- **FR-028**: El Tipo de Documento de un documento MUST ser un dato opcional; cuando no se asigne ninguno, el documento MUST mostrarse como "Sin clasificar" por ausencia de valor, sin requerir una entrada especial o protegida dentro del catálogo de Tipos de Documento.

### Key Entities

- **Tipo de Documento**: Catálogo administrable (nombre, descripción, estado activo/inactivo) usado para clasificar documentos; no almacena archivos, solo información descriptiva.
- **Documento**: Archivo PDF cargado al expediente de un cliente. Pertenece a un único cliente; tiene un Tipo de Documento opcional; puede tener año/periodo (propio de un documento general sin periodo, o heredado de un cumplimiento asociado); puede estar asociado como máximo a un cumplimiento fiscal y, opcionalmente, a una obligación fiscal de forma informativa; conserva metadatos de carga, tamaño, tipo de archivo, usuario y fechas; puede estar eliminado lógicamente.
- **Documento Esperado (configuración)**: Definición, a nivel de una obligación fiscal del catálogo, de un tipo de documento que normalmente se espera para esa obligación. Es exclusivamente informativa y no bloquea ningún flujo.
- **Documentos Esperados de un Cumplimiento (snapshot)**: Copia de la configuración de Documentos Esperados vigente al momento en que se generó un cumplimiento específico, usada para mostrar el estado disponible/faltante sin verse afectada por cambios posteriores en la configuración.
- **Evento de Auditoría de Documento**: Registro de un evento relevante sobre un documento (carga, modificación, cambio de tipo, asociación/desasociación, eliminación), con usuario, fecha/hora, acción e información anterior/nueva.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: El personal del despacho puede localizar cualquier documento de cualquier cliente desde la vista global usando al menos un criterio de búsqueda, sin necesidad de conocer previamente en qué cliente se encuentra.
- **SC-002**: Cargar y clasificar un nuevo documento en el expediente de un cliente toma 3 pasos o menos (seleccionar archivo, opcionalmente elegir tipo/periodo, confirmar).
- **SC-003**: El 100% de los documentos permanecen asociados exclusivamente al cliente para el que fueron cargados durante todo su ciclo de vida — cero casos de un documento accesible o reasignable a otro cliente.
- **SC-004**: El personal del despacho puede identificar, sin abrir ningún documento, qué Documentos Esperados faltan para un cumplimiento específico con solo ver su detalle.
- **SC-005**: El 100% de las obligaciones fiscales pueden marcarse como presentadas o cambiar de estado independientemente de si tienen Documentos Esperados faltantes — cero bloqueos por documentación incompleta.
- **SC-006**: El 100% de los intentos de eliminación de documentos con más de tres meses de antigüedad realizados por Contador o Auxiliar son rechazados, sin excepciones.
- **SC-007**: Ningún documento eliminado lógicamente desaparece de forma permanente ni pierde su rastro de auditoría — el 100% de los eventos relevantes sobre documentos quedan registrados con usuario y fecha.

## Assumptions

- El catálogo de Tipos de Documento y el registro de documentos ya existen en el modelo de datos actual del sistema (desde una base establecida en un feature previo) y este feature los extiende para cubrir clasificación opcional, organización por periodo, Documentos Esperados, eliminación lógica con permisos por antigüedad y la vista global — no se trata de construirlos desde cero.
- La asociación de un documento con un registro de Cumplimiento Fiscal ya cuenta con un mecanismo base (asociar/desasociar) construido en el feature de Control de Cumplimiento Fiscal; este feature amplía ese mecanismo para garantizar que un documento tenga como máximo un cumplimiento asociado a la vez y para incorporarlo a la organización general del expediente.
- El acceso a "ver" documentos y "administrar" (cargar, editar, asociar, eliminar) documentos reutiliza el modelo de permisos ya existente en el sistema (capacidades de solo consulta vs. de administración), en línea con el resto del sistema de catálogos y clientes.
- La configuración de Documentos Esperados y del catálogo de Tipos de Documento se administra con el mismo nivel de permiso ya usado para administrar el resto de los catálogos del sistema (obligaciones fiscales, periodicidades).
- El acceso temporal para visualizar/descargar documentos usa una ventana de expiración corta (minutos), suficiente para completar la operación sin exponer el archivo de forma permanente.
- La antigüedad de tres meses para efectos de permisos de eliminación se interpreta como tres meses calendario completos desde la fecha de alta original del documento.
- Este feature no incluye papelera, restauración, eliminación definitiva, ni envío de documentos por correo electrónico — solo prepara el modelo para que esas capacidades puedan incorporarse después sin rediseño.
