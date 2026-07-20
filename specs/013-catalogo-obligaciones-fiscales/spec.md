# Feature Specification: Catálogo de Obligaciones Fiscales

**Feature Branch**: `013-catalogo-obligaciones-fiscales`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "Definir el catálogo de obligaciones fiscales reutilizables que servirán como base para la construcción de plantillas de obligaciones y la configuración de obligaciones fiscales de los clientes. Las obligaciones fiscales representan conceptos reutilizables y no están asociadas directamente a ningún cliente. Permite al Administrador crear, editar, consultar, activar e inactivar las obligaciones fiscales disponibles dentro del sistema; no administra el cumplimiento de las obligaciones ni su asignación a clientes. Cada obligación tiene nombre, descripción (opcional), periodicidad (del catálogo de Periodicidades), prioridad y estado (Activo/Inactivo). No podrán existir dos obligaciones con el mismo nombre. Las obligaciones no incluyen la periodicidad en su nombre — la periodicidad se almacena como un atributo independiente. La prioridad reemplaza al concepto de orden sugerido: determina el orden inicial sugerido cuando la obligación es agregada a una plantilla, modificable después dentro de cada plantilla sin afectar el catálogo. Las obligaciones inactivas no podrán agregarse a nuevas plantillas pero permanecerán visibles en las plantillas donde ya fueron utilizadas. El catálogo reutiliza las reglas comunes definidas por Administración de Catálogos. Excluye: Plantillas, Clientes, Cumplimiento, Presentación de declaraciones, Vencimientos, Documentos. Utiliza Administración de Catálogos y el catálogo de Periodicidades; será utilizado posteriormente por Plantillas de Obligaciones y Obligaciones Fiscales del Cliente."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Mantener el catálogo de obligaciones fiscales del despacho (Priority: P1) 🎯 MVP

Como Administrador, quiero dar de alta, editar, activar e inactivar obligaciones fiscales del catálogo, para tener listas las obligaciones reutilizables que luego servirán de base para las plantillas de obligaciones y las obligaciones fiscales de cada cliente.

**Why this priority**: Es el catálogo base de todo el módulo — sin él, ningún consumidor futuro (Plantillas de Obligaciones, Obligaciones Fiscales del Cliente) tiene de dónde partir.

**Independent Test**: Puede probarse creando, editando, activando y desactivando obligaciones del catálogo, y filtrando el listado por nombre/periodicidad/estado, sin que exista todavía ninguna plantilla ni obligación fiscal de cliente.

**Acceptance Scenarios**:

1. **Given** una sesión de Administrador, **When** da de alta una obligación con nombre, periodicidad y prioridad, **Then** queda creada en estado Activo con esos datos.
2. **Given** una obligación ya existente y activa, **When** se intenta dar de alta otra con el mismo nombre entre las obligaciones activas, **Then** el sistema lo impide.
3. **Given** una obligación Activa, **When** se inactiva, **Then** deja de estar disponible para agregarse a información nueva, pero su registro no se elimina y permanece consultable.
4. **Given** una obligación Inactiva, **When** se reactiva, **Then** vuelve a estar disponible para agregarse a información nueva.

---

### User Story 2 - Asignar periodicidad y prioridad como valores sugeridos (Priority: P2)

Como Administrador, quiero asignar a cada obligación una periodicidad (tomada del catálogo de Periodicidades) y una prioridad, para que los módulos futuros que construyan plantillas tengan un valor inicial sugerido sin tener que definirlo manualmente cada vez.

**Why this priority**: Es el atributo que distingue a una obligación de otra dentro del catálogo y el que los consumidores futuros usarán como valor por defecto; depende de que el catálogo de Periodicidades (`012-administracion-catalogos`) ya exista, pero no bloquea el valor central del catálogo (Historia 1).

**Independent Test**: Puede probarse creando una obligación, seleccionando una periodicidad del catálogo de Periodicidades y asignándole una prioridad, y confirmando que ambos valores quedan guardados y son consultables, sin que exista todavía ninguna plantilla que los consuma.

**Acceptance Scenarios**:

1. **Given** el formulario de alta o edición, **When** se selecciona la periodicidad, **Then** solo aparecen periodicidades activas del catálogo de Periodicidades disponibles para elegir.
2. **Given** una obligación con una prioridad asignada, **When** se consulta el catálogo, **Then** el valor de prioridad se muestra junto con el resto de sus datos.
3. **Given** una obligación existente, **When** se cambia su periodicidad o su prioridad, **Then** el cambio se guarda sin afectar su nombre ni su estado.

---

### User Story 3 - Buscar obligaciones y conservar su historial (Priority: P3)

Como Administrador, quiero buscar obligaciones por nombre y seguir viendo las que ya están inactivas cuando corresponda, para encontrar rápidamente lo que necesito y confiar en que ninguna obligación desaparece de la información histórica solo por dejar de usarse.

**Why this priority**: Hereda el contrato de "Administración de Catálogos" (`012`) — mejora la usabilidad diaria del catálogo, pero no bloquea el valor central de mantenerlo (Historia 1).

**Independent Test**: Puede probarse buscando una obligación escribiendo parte de su nombre y confirmando que aparece entre las sugerencias seleccionables; inactivando una obligación y confirmando que sigue siendo consultable en el listado del catálogo, marcada como Inactiva, aunque ya no se ofrezca para nuevas selecciones.

**Acceptance Scenarios**:

1. **Given** el listado del catálogo, **When** se busca escribiendo parte del nombre de una obligación, **Then** aparece entre las sugerencias seleccionables.
2. **Given** una obligación inactiva, **When** se consulta el catálogo, **Then** sigue visible, marcada con estado Inactivo.

---

### Edge Cases

- ¿Qué pasa si se intenta reutilizar el nombre de una obligación que ya está inactiva? Se permite — la unicidad de nombre aplica solo entre las obligaciones actualmente activas (regla heredada de Administración de Catálogos).
- ¿Qué pasa si dos obligaciones con distinta periodicidad tienen el mismo nombre? No se permite — la unicidad de nombre aplica a todo el catálogo, independientemente de la periodicidad (a diferencia de un esquema donde la periodicidad formara parte del nombre).
- ¿Qué pasa con una obligación inactiva que ya fue utilizada en información previamente registrada (por ejemplo, una plantilla)? Permanece visible en esa información histórica, aunque ya no pueda seleccionarse para información nueva.
- ¿Qué pasa si se intenta dar de alta una obligación sin periodicidad? El sistema lo impide — la periodicidad es un dato obligatorio de toda obligación.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema DEBE restringir la administración de obligaciones fiscales (alta, edición, activación, inactivación) exclusivamente a personas con rol Administrador.
- **FR-002**: Toda obligación fiscal DEBE tener: nombre (obligatorio, único entre las obligaciones actualmente activas, sin incluir la periodicidad como parte del nombre), descripción (opcional), periodicidad (obligatoria), prioridad (obligatoria) y estado (Activo/Inactivo, Activo por defecto).
- **FR-003**: Ninguna obligación fiscal DEBE eliminarse físicamente — inactivarla es el único mecanismo para retirarla de uso.
- **FR-004**: La periodicidad de una obligación DEBE seleccionarse únicamente entre las periodicidades actualmente activas del catálogo de Periodicidades.
- **FR-005**: Las obligaciones Inactivas NO DEBEN estar disponibles para agregarse a información nueva (por ejemplo, una futura plantilla), pero SÍ DEBEN seguir mostrándose sin cambios en la información ya registrada que las referencia.
- **FR-006**: El catálogo DEBE ofrecer búsqueda por nombre, orden alfabético y selección rápida por escritura anticipada, y paginarse únicamente cuando existan más de diez obligaciones — mismo contrato común definido por Administración de Catálogos.
- **FR-007**: El sistema DEBE registrar la fecha de creación y de última actualización de cada obligación, e identificar a la persona que la creó y a la que la modificó por última vez, consistente con el mecanismo general de auditoría del sistema.
- **FR-008**: La prioridad de una obligación es un valor informativo que sirve como orden inicial sugerido para quien la agregue a una plantilla; el sistema NO DEBE exigir que sea un valor único entre obligaciones, y quien la use podrá modificarla libremente sin que eso afecte el catálogo.
- **FR-009**: Este módulo NO DEBE administrar plantillas de obligaciones, la relación de una obligación con clientes específicos, el cumplimiento de la obligación, la presentación de declaraciones, vencimientos, ni documentos — cada uno de esos aspectos corresponde a su propio módulo futuro.
- **FR-010**: El catálogo de Obligaciones Fiscales DEBE ser su propia entidad, independiente del catálogo de Servicios y de cualquier otro catálogo del sistema, y NO DEBE ser un catálogo protegido — a diferencia de Periodicidades, sí admite alta, edición, activación e inactivación.

### Key Entities

- **Obligación Fiscal**: catálogo reutilizable de conceptos fiscales (ej. "Declaración Mensual ISR", "Declaración Mensual IVA", "DIOT") — nombre (único entre activas), descripción (opcional), periodicidad (tomada del catálogo de Periodicidades), prioridad (orden sugerido), estado (Activo/Inactivo), fecha de creación, fecha de última actualización, usuario creador y usuario que modificó por última vez. No está asociada directamente a ningún cliente — es reutilizada por múltiples plantillas.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Un Administrador puede dar de alta una obligación fiscal completa (nombre, periodicidad, prioridad) en menos de 1 minuto.
- **SC-002**: El 100% de los intentos de crear una obligación con un nombre ya usado por otra obligación activa son rechazados.
- **SC-003**: El 100% de las obligaciones inactivadas dejan de aparecer como opción para información nueva, sin perder su visibilidad en información histórica ya registrada.
- **SC-004**: El 100% de las obligaciones del catálogo pueden encontrarse escribiendo parte de su nombre, sin desplazarse manualmente por una lista completa.
- **SC-005**: Una persona sin rol Administrador nunca logra crear, editar, activar ni inactivar una obligación fiscal.

## Assumptions

- "Obligación Fiscal", mencionado en la descripción original junto con Nombre/Descripción/Periodicidad/Prioridad/Estado, se interpreta como el nombre de la propia entidad (el encabezado de la lista de atributos), no como un atributo adicional a capturar.
- La periodicidad y la prioridad definidas aquí son solo el valor sugerido inicial para consumidores futuros (Plantillas de Obligaciones); este módulo únicamente los almacena — no implementa ese consumo, que queda para su propia especificación futura.
- El catálogo se incorpora como una nueva entrada dentro del punto único de navegación "Administración > Catálogos" (`012-administracion-catalogos`), igual que Periodicidades — a diferencia de Servicios (`011-gestion-servicios`), que ya existía antes de que ese contrato existiera y por eso conserva su propia pantalla independiente.
- Cualquier persona del despacho con sesión activa puede consultar el catálogo; solo Administrador puede darlo de alta, editarlo, activarlo o inactivarlo — mismo patrón de permisos ya usado por Servicios (`011`) y Periodicidades (`012`).
- La prioridad es un valor numérico que no necesita ser único entre obligaciones; si no se indica uno al crear la obligación, el sistema sugiere un valor por defecto razonable, modificable en cualquier momento.
- Plantillas de Obligaciones y Obligaciones Fiscales del Cliente, mencionados como consumidores futuros de este catálogo, no se construyen como parte de este módulo.
