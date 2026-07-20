# Feature Specification: Obligaciones Fiscales del Cliente

**Feature Branch**: `014-obligaciones-fiscales-cliente`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "Permitir administrar las obligaciones fiscales de un cliente utilizando plantillas predefinidas como mecanismo de carga inicial, permitiendo posteriormente su personalización de forma independiente sin afectar a otros clientes. Las plantillas serán utilizadas únicamente como apoyo para agilizar la configuración inicial y no mantendrán una relación permanente con el cliente. Flujo: seleccionar régimen fiscal, seleccionar plantilla (opcional), copiar obligaciones al cliente, el Administrador revisa, agrega obligaciones adicionales, elimina obligaciones, marca obligaciones como 'No aplica', guarda. Una plantilla podrá utilizarse múltiples veces; después de copiarla no existirá ninguna relación entre la plantilla y el cliente. Una vez configuradas las obligaciones, podrán agregarse, eliminarse, modificarse o marcarse como 'No aplica' sin afectar la plantilla original ni a otros clientes. Cada obligación del cliente deberá almacenar al menos: Obligación Fiscal, Periodicidad, Orden, Estado (Activa/No aplica), Observaciones (opcional); el estado indica si la obligación forma parte de la configuración del cliente, no si ya fue presentada o cumplida — el seguimiento operativo se aborda en un módulo posterior. Las obligaciones podrán ordenarse manualmente; el orden es único por cliente, no por usuario. Cada obligación conserva la periodicidad definida al momento de su asignación, modificable si existe una excepción específica para ese cliente. Utiliza los catálogos de Regímenes Fiscales, Obligaciones Fiscales y Periodicidades. No podrán existir obligaciones duplicadas para un mismo cliente; una obligación marcada como 'No aplica' permanece registrada por motivos históricos; solo usuarios autorizados podrán modificar la configuración. Excluye: cumplimiento de obligaciones, presentación de declaraciones, vencimientos, recordatorios, carga de documentos, historial de cumplimiento — todo eso pertenece al futuro módulo Control de Cumplimiento Fiscal. La interfaz propuesta reutiliza la vista de Detalle del Cliente, agregando una sección/pestaña 'Obligaciones Fiscales' con un selector de plantilla opcional, un listado de obligaciones con checkbox/estado y periodicidad, y un formulario para agregar una obligación (Autocomplete de obligación, periodicidad, orden, No aplica, observaciones)."

## Clarifications

### Session 2026-07-20

- Q: La descripción de origen muestra "Seleccionar Plantilla (opcional) → Copiar obligaciones al cliente" como parte del flujo principal, pero el catálogo de Obligaciones Fiscales (`013`) documentó "Plantillas de Obligaciones" como un módulo futuro, aún no construido. ¿Esta especificación debe construir también un concepto mínimo de plantilla, o debe excluirlo por completo del alcance hasta que exista su propia especificación futura? → A: Las plantillas se definen ya, como parte del flujo de esta misma especificación — no quedan para una especificación futura. `013-catalogo-obligaciones-fiscales` se actualiza para reflejar que Plantillas de Obligaciones y Obligaciones Fiscales del Cliente se definen aquí, no en un módulo futuro indefinido.
- Q: La descripción de origen termina el flujo principal con un paso "Guardar" explícito tras agregar/eliminar/marcar varias obligaciones. ¿Cada acción se persiste de inmediato de forma independiente, o el Administrador edita una configuración en borrador que se confirma junto al presionar "Guardar"? → A: Acción instantánea — cada alta, baja, cambio de estado, de orden o aplicación de plantilla se guarda de inmediato mediante su propia operación, sin un paso de "Guardar" separado ni un estado de borrador; "Guardar" en la descripción original se interpreta como lenguaje informal para "la configuración queda lista".

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Configurar manualmente las obligaciones fiscales de un cliente (Priority: P1) 🎯 MVP

Como Administrador, quiero agregar, editar, reordenar, marcar como "No aplica" y eliminar las obligaciones fiscales de un cliente específico, para dejar reflejada la configuración fiscal real de ese cliente.

**Why this priority**: Es el valor central del módulo — sin la configuración manual, no hay forma de registrar las obligaciones de un cliente en absoluto.

**Independent Test**: Puede probarse entrando al detalle de un cliente, agregando una obligación del catálogo con su periodicidad y orden, editándola, marcándola como "No aplica", y eliminando otra, sin que exista ninguna plantilla ni ningún otro cliente involucrado.

**Acceptance Scenarios**:

1. **Given** el detalle de un cliente sin obligaciones configuradas, **When** el Administrador agrega una obligación del catálogo con periodicidad, orden y observaciones opcionales, **Then** queda registrada como Activa para ese cliente.
2. **Given** una obligación ya configurada para un cliente, **When** se intenta agregar la misma obligación fiscal otra vez para ese mismo cliente, **Then** el sistema lo impide.
3. **Given** una obligación Activa de un cliente, **When** se marca como "No aplica", **Then** deja de contar como obligación vigente del cliente pero su registro permanece consultable.
4. **Given** una obligación de un cliente, **When** el Administrador la elimina, **Then** deja de aparecer en la configuración de ese cliente sin afectar a otros clientes ni al catálogo de Obligaciones Fiscales.
5. **Given** varias obligaciones de un cliente, **When** el Administrador cambia su orden manualmente, **Then** el nuevo orden se conserva y es único dentro de ese cliente.

---

### User Story 2 - Administrar plantillas de obligaciones (Priority: P2)

Como Administrador, quiero crear y mantener plantillas de obligaciones fiscales (cada una con su propio conjunto ordenado de obligaciones y periodicidades sugeridas), para tener listos los casos estándar que luego se aplicarán a los clientes que encajen en ellos.

**Why this priority**: Es el prerrequisito de la Historia 3 (aplicar una plantilla) — sin plantillas administradas, no hay nada que aplicar; pero un cliente puede configurarse por completo de forma manual (Historia 1) sin que existan plantillas.

**Independent Test**: Puede probarse creando una plantilla, agregándole obligaciones del catálogo con su periodicidad y orden sugeridos, editándola, activándola e inactivándola, sin que exista todavía ningún cliente que la use.

**Acceptance Scenarios**:

1. **Given** una sesión de Administrador, **When** crea una plantilla con nombre y le agrega obligaciones del catálogo (cada una con periodicidad y orden sugeridos), **Then** la plantilla queda disponible para aplicarse a clientes.
2. **Given** una plantilla existente, **When** se intenta agregar dos veces la misma obligación fiscal dentro de esa plantilla, **Then** el sistema lo impide.
3. **Given** una plantilla ya usada por algún cliente, **When** se inactiva, **Then** deja de estar disponible para aplicarse a nuevos clientes, pero las obligaciones ya copiadas a clientes que la usaron no se ven afectadas.

---

### User Story 3 - Aplicar una plantilla para agilizar la carga inicial (Priority: P2)

Como Administrador, quiero aplicar una plantilla predefinida a un cliente para copiar de una sola vez un conjunto típico de obligaciones fiscales, para no tener que agregarlas una por una cuando el cliente encaja en un caso estándar.

**Why this priority**: Agiliza la configuración inicial y depende de que ya existan plantillas administradas (Historia 2), pero no es indispensable — un cliente puede configurarse por completo de forma manual (Historia 1) sin usar nunca una plantilla.

**Independent Test**: Puede probarse seleccionando una plantilla y aplicándola a un cliente sin obligaciones previas, confirmando que las obligaciones de la plantilla quedan copiadas al cliente, y que aplicar la misma plantilla a otro cliente o modificar las obligaciones ya copiadas no afecta a la plantilla original ni a otros clientes.

**Acceptance Scenarios**:

1. **Given** una plantilla con un conjunto de obligaciones, **When** se aplica a un cliente sin obligaciones configuradas, **Then** esas obligaciones quedan copiadas a la configuración del cliente, sin conservar ninguna relación con la plantilla.
2. **Given** una plantilla ya aplicada a un cliente, **When** se modifica una obligación copiada (periodicidad, orden, estado), **Then** el cambio no afecta la plantilla original ni a ningún otro cliente.
3. **Given** una misma plantilla, **When** se aplica a dos clientes distintos, **Then** ambos clientes reciben copias independientes de las mismas obligaciones.
4. **Given** una plantilla que incluye una obligación que el cliente ya tiene configurada, **When** se aplica esa plantilla al cliente, **Then** esa obligación específica se omite de la copia y el resto de la plantilla se copia con normalidad.

---

### User Story 4 - Conservar el historial de obligaciones marcadas "No aplica" (Priority: P3)

Como Administrador, quiero que una obligación marcada como "No aplica" siga siendo consultable en la configuración del cliente, para conservar el motivo por el que un cliente dejó de tener esa obligación vigente.

**Why this priority**: Es una garantía de integridad histórica que depende de que ya existan obligaciones marcadas "No aplica" (Historia 1); no bloquea la operación diaria.

**Independent Test**: Puede probarse marcando una obligación de un cliente como "No aplica" y confirmando que sigue visible en la configuración de ese cliente, distinguida de las obligaciones Activas.

**Acceptance Scenarios**:

1. **Given** una obligación marcada como "No aplica" para un cliente, **When** se consulta la configuración de obligaciones de ese cliente, **Then** sigue mostrándose, distinguida de las Activas.
2. **Given** una obligación marcada como "No aplica", **When** se intenta eliminarla, **Then** el sistema lo impide — solo las obligaciones Activas pueden eliminarse.

---

### Edge Cases

- ¿Qué pasa si se intenta agregar una obligación fiscal que está inactiva en el catálogo de Obligaciones Fiscales? El sistema lo impide — solo obligaciones activas del catálogo pueden agregarse a un cliente o a una plantilla.
- ¿Qué pasa si dos clientes distintos tienen la misma obligación fiscal asignada? No hay conflicto — la restricción de "no duplicados" aplica dentro de cada cliente, nunca entre clientes distintos.
- ¿Qué pasa si se intenta eliminar una obligación ya marcada como "No aplica"? Se impide — permanece registrada indefinidamente mientras conserve ese estado.
- ¿Qué pasa si se agrega una nueva obligación sin especificar un orden? El sistema le asigna el siguiente orden disponible para ese cliente (o para esa plantilla), editable después.
- ¿Qué pasa si se aplica una plantilla que incluye una obligación que el cliente ya tiene configurada? Esa obligación específica se omite de la copia; el resto de la plantilla se copia con normalidad (no se rechaza la aplicación completa).
- ¿Qué pasa si se intenta crear una plantilla con el mismo nombre que otra plantilla activa? Se impide — mismo criterio de unicidad ya usado por el resto de catálogos del sistema.
- ¿Qué pasa si se inactiva una plantilla que ya fue aplicada a uno o más clientes? Las obligaciones ya copiadas a esos clientes no se ven afectadas; la plantilla solo deja de estar disponible para aplicarse de nuevo.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema DEBE permitir agregar una obligación fiscal a un cliente, tomándola del catálogo de Obligaciones Fiscales (`013`) y asignándole una periodicidad, un orden y observaciones opcionales.
- **FR-002**: El sistema NO DEBE permitir agregar una obligación fiscal cuyo estado en el catálogo sea Inactivo.
- **FR-003**: El sistema NO DEBE permitir que un mismo cliente tenga más de una configuración para la misma obligación fiscal del catálogo.
- **FR-004**: Toda obligación fiscal de un cliente DEBE tener un estado: Activa o No aplica; los registros nuevos se crean Activos.
- **FR-005**: Una obligación fiscal de un cliente marcada como No aplica DEBE permanecer registrada — no se elimina físicamente — y NO DEBE poder eliminarse mientras conserve ese estado.
- **FR-006**: Una obligación fiscal Activa de un cliente SÍ DEBE poder eliminarse por completo de su configuración.
- **FR-007**: La periodicidad de una obligación fiscal de un cliente se DEBE copiar de la periodicidad vigente en el catálogo al momento de asignarla, y DEBE poder modificarse después de forma independiente para ese cliente, sin afectar el catálogo ni a otros clientes.
- **FR-008**: El orden de las obligaciones fiscales de un cliente DEBE poder modificarse manualmente, y DEBE ser único dentro de las obligaciones de ese mismo cliente (no existe un orden global ni por usuario).
- **FR-009**: El sistema DEBE restringir el alta, edición, reordenamiento, marcado como No aplica y eliminación de obligaciones fiscales de un cliente a usuarios autorizados, consistente con el mecanismo de permisos ya usado para la administración de otros datos del cliente.
- **FR-010**: Este módulo NO DEBE administrar el cumplimiento de las obligaciones, la presentación de declaraciones, vencimientos, recordatorios, carga de documentos ni el historial de cumplimiento — todo ello corresponde al futuro módulo Control de Cumplimiento Fiscal.
- **FR-011**: El sistema DEBE permitir a un Administrador crear, editar, activar e inactivar plantillas de obligaciones, cada una con un nombre obligatorio (único entre plantillas activas) y una descripción opcional.
- **FR-012**: Toda plantilla DEBE tener un estado (Activo/Inactivo); una plantilla Inactiva NO DEBE poder aplicarse a nuevos clientes, pero las obligaciones ya copiadas a clientes que la usaron previamente no se ven afectadas.
- **FR-013**: Una plantilla DEBE contener una lista ordenada de obligaciones fiscales del catálogo (`013`), cada una con una periodicidad sugerida y un orden sugerido; una misma obligación fiscal NO DEBE poder repetirse dentro de la misma plantilla.
- **FR-014**: El sistema DEBE permitir aplicar una plantilla a un cliente para copiar de una sola vez su lista de obligaciones (con la periodicidad y el orden sugeridos) como nuevas Obligaciones Fiscales del Cliente, sin conservar ninguna relación entre la plantilla y el cliente después de la copia.
- **FR-015**: Al aplicar una plantilla a un cliente, cualquier obligación de la plantilla que el cliente ya tenga configurada DEBE omitirse de la copia, sin impedir que el resto de la plantilla se copie con normalidad.
- **FR-016**: Una misma plantilla DEBE poder aplicarse a múltiples clientes de forma independiente, y modificar las obligaciones ya copiadas a un cliente NO DEBE afectar la plantilla original ni a ningún otro cliente.
- **FR-017**: Cada acción sobre la configuración de obligaciones fiscales de un cliente o sobre una plantilla (agregar, eliminar, marcar No aplica, reordenar, cambiar periodicidad, aplicar una plantilla) DEBE persistirse de inmediato mediante su propia operación, sin depender de un paso de confirmación adicional (Clarifications).

### Key Entities

- **Obligación Fiscal del Cliente**: relación entre un cliente y una obligación fiscal del catálogo (`013`) — obligación fiscal (referencia al catálogo), periodicidad (copiada de la plantilla o del catálogo al asignarse, editable después para ese cliente), orden (único por cliente), estado (Activa/No aplica), observaciones (opcional), fecha de creación, fecha de última actualización, usuario creador y usuario que modificó por última vez. Nunca hay dos registros para el mismo cliente y la misma obligación fiscal del catálogo.
- **Plantilla de Obligaciones**: conjunto reutilizable y con nombre de obligaciones fiscales del catálogo (`013`), pensado para agilizar la configuración inicial de un cliente — nombre (único entre plantillas activas), descripción (opcional), estado (Activo/Inactivo), lista ordenada de obligaciones (cada una con periodicidad y orden sugeridos). No mantiene ninguna relación con los clientes a los que ya se aplicó.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Un Administrador puede agregar una obligación fiscal completa a un cliente (obligación, periodicidad, orden) en menos de 1 minuto.
- **SC-002**: El 100% de los intentos de asignar a un cliente una obligación fiscal que ya tiene configurada son rechazados.
- **SC-003**: El 100% de las obligaciones fiscales de un cliente marcadas como No aplica permanecen consultables y no pueden eliminarse mientras conserven ese estado.
- **SC-004**: El 100% de los cambios de periodicidad realizados para un cliente específico no alteran la periodicidad del catálogo ni la de ningún otro cliente.
- **SC-005**: Una persona sin autorización nunca logra modificar la configuración de obligaciones fiscales de un cliente, ni la administración de plantillas.
- **SC-006**: Un Administrador puede aplicar una plantilla completa a un cliente sin obligaciones previas en menos de 10 segundos, copiando todas sus obligaciones en una sola acción.
- **SC-007**: El 100% de las plantillas aplicadas a dos o más clientes distintos producen configuraciones independientes — modificar la de un cliente nunca afecta la de otro ni la plantilla original.

## Assumptions

- El régimen fiscal mencionado en el flujo de origen ya existe como un dato del cliente (asignado desde su alta, especificación `005`) — este módulo lo usa solo como contexto informativo, sin introducir un nuevo campo ni un paso de selección adicional.
- La interfaz se agrega como una nueva sección dentro de la vista de Detalle del Cliente ya existente, siguiendo el mismo patrón visual que las secciones "Contactos" y "Servicios" ya construidas (`008`, `011`) — no se introduce una navegación por pestañas nueva para toda la pantalla, aunque la descripción de origen la mencione como "pestaña".
- Solo obligaciones fiscales con estado Activo en el catálogo (`013`) pueden agregarse a un cliente — mismo criterio de integridad de selección ya establecido por Administración de Catálogos (`012`) y heredado por el catálogo de Obligaciones Fiscales.
- Los permisos para modificar la configuración de obligaciones fiscales de un cliente reutilizan las mismas capacidades ya usadas para gestionar otros datos del cliente (consulta y edición), consistente con el patrón ya aplicado a Servicios Contratados (`011`) dentro de la misma vista de Detalle del Cliente.
- Las plantillas de obligaciones se administran como un catálogo más, exclusivo de Administrador, accesible desde el mismo punto único de navegación "Administración > Catálogos" (`012`) donde ya viven Periodicidades y Obligaciones Fiscales — consulta abierta a cualquier staff activo, escritura restringida a Administrador, mismo patrón ya usado por esos dos catálogos.
- El catálogo de Obligaciones Fiscales (`013`) se actualiza para reflejar que Plantillas de Obligaciones y Obligaciones Fiscales del Cliente ya no son consumidores futuros indefinidos, sino que se definen aquí, en esta misma especificación.
