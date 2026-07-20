# Feature Specification: Módulo de Administración de Catálogos

**Feature Branch**: `012-administracion-catalogos`

**Created**: 2026-07-20

**Status**: Draft

**Input**: User description: "Administracion de catálogos - MÓDULO DE ADMINISTRACIÓN DE CATÁLOGOS. Objetivo: permitir la administración centralizada de los catálogos utilizados por el sistema, garantizando consistencia, reutilización de información y reglas comunes de operación, sin limitar la capacidad de cada catálogo para definir atributos propios. Este módulo define el comportamiento común de todos los catálogos administrables del sistema (alta, edición, activación, inactivación; estado activo/inactivo; nunca eliminación física; nombre obligatorio y único dentro del catálogo; descripción opcional; auditoría de creación/actualización; búsqueda, orden alfabético y selección rápida; paginación solo con más de diez registros; los inactivos no se seleccionan en nuevos procesos pero sí se muestran en información histórica; cada catálogo tiene su propia entidad/tabla, sin modelo genérico/polimórfico; sin datos maestros obligatorios salvo excepciones como Regímenes Fiscales; un único punto de entrada Administración > Catálogos con pantalla propia por catálogo y experiencia consistente; solo Administrador administra). Excluye definir los campos específicos de Servicios, Tipos de Documento, Regímenes Fiscales, Periodicidades y Obligaciones Fiscales — cada uno con su propia especificación. Permite declarar catálogos protegidos (solo consulta, sin alta/edición/activación/inactivación); en la primera versión, el catálogo de Periodicidades será protegido."

## Clarifications

### Session 2026-07-20

- Q: Este módulo define el comportamiento común que cualquier catálogo debe seguir, pero excluye explícitamente definir los campos de Servicios, Tipos de Documento, Regímenes Fiscales, Periodicidades y Obligaciones Fiscales (cada uno con su propia especificación futura). Sin un catálogo concreto construido, las reglas de alta/edición/activación no tendrían dónde demostrarse de punta a punta en este spec. ¿Este módulo debe incluir un catálogo de referencia real además de las reglas comunes y el punto de entrada, o debe limitarse a documentar las reglas y dejar todo catálogo concreto para specs futuros? → A: Sí (Opción A) — este módulo es principalmente el contrato de reglas comunes (cada catálogo editable, presente o futuro, define sus propios atributos en su propia especificación — Servicios ya lo hizo en `011-gestion-servicios`, Tipos de Documento/Régimen Fiscal/Obligaciones Fiscales lo harán en la suya), pero incluye como excepción explícita el punto de entrada "Administración > Catálogos" y el catálogo de Periodicidades, protegido (solo consulta), como la única referencia concreta construida en esta feature — tal como la propia descripción ya lo adelanta para la primera versión.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Un único punto de entrada para administrar catálogos (Priority: P1) 🎯 MVP

Como Administrador, quiero encontrar todos los catálogos del sistema desde un mismo lugar ("Administración > Catálogos"), para no tener que recordar rutas distintas o adivinar dónde se administra cada lista de valores que usa el sistema.

**Why this priority**: Es la puerta de entrada de todo el módulo — sin ella, ningún catálogo (presente o futuro) tiene un lugar consistente donde vivir.

**Independent Test**: Puede probarse entrando a "Administración > Catálogos" como Administrador y confirmando que ahí aparece listado el catálogo de Periodicidades (Clarifications), con acceso a su propia pantalla.

**Acceptance Scenarios**:

1. **Given** una sesión de Administrador, **When** entra a "Administración > Catálogos", **Then** ve una lista de los catálogos disponibles en el sistema, cada uno con acceso a su propia pantalla.
2. **Given** la lista de catálogos disponibles, **When** un usuario sin rol Administrador intenta acceder a "Administración > Catálogos", **Then** el sistema le niega el acceso, igual que al resto de las pantallas exclusivas de Administrador.

---

### User Story 2 - Ciclo de vida consistente de cualquier catálogo (Priority: P1)

Como Administrador, quiero dar de alta, editar, activar e inactivar elementos de un catálogo siguiendo siempre el mismo patrón, para no tener que aprender una forma distinta de trabajar por cada catálogo del sistema.

**Why this priority**: Es la regla de negocio central de todo el módulo — sin este ciclo de vida común, cada catálogo futuro reinventaría su propio comportamiento, exactamente lo que este módulo busca evitar.

**Independent Test**: Puede probarse usando el catálogo de Periodicidades (Clarifications) como referencia visible del patrón de estado (activo/inactivo) y de que ningún registro se elimina físicamente — aunque, al ser protegido en esta primera versión, sus propias acciones de alta/edición/activación/inactivación no están expuestas ahí (Historia 3); el contrato para catálogos editables queda documentado en los Requisitos Funcionales para que los specs futuros de Tipos de Documento, Régimen Fiscal y Obligaciones Fiscales lo implementen (Servicios ya lo implementó de forma independiente en `011-gestion-servicios`, antes de que este contrato existiera formalmente).

**Acceptance Scenarios**:

1. **Given** un catálogo editable (definido por su propia especificación futura conforme a este contrato), **When** se da de alta un elemento nuevo, **Then** el nombre es obligatorio, se acepta con acentos y caracteres especiales, y el elemento queda en estado Activo por defecto.
2. **Given** un elemento ya existente en un catálogo editable, **When** se intenta dar de alta otro elemento con el mismo nombre entre los elementos activos de ese mismo catálogo, **Then** el sistema lo impide.
3. **Given** un elemento Activo de un catálogo editable, **When** se inactiva, **Then** dejará de estar disponible para seleccionarse en información nueva, pero su registro no se elimina y permanece consultable.
4. **Given** un elemento Inactivo de un catálogo editable, **When** se reactiva, **Then** vuelve a estar disponible para seleccionarse en información nueva.

---

### User Story 3 - Catálogos protegidos, de solo consulta (Priority: P2)

Como Administrador, quiero que ciertos catálogos (como Periodicidades en esta primera versión) solo puedan consultarse, sin que nadie pueda darlos de alta, editarlos, activarlos ni inactivarlos, para proteger información que no debe modificarse desde la interfaz todavía.

**Why this priority**: Depende de que exista el punto de entrada (Historia 1); es una variante del comportamiento común que aplica a un catálogo real y concreto (Periodicidades), pero no bloquea el valor de tener el ciclo de vida editable documentado para catálogos futuros.

**Independent Test**: Puede probarse entrando al catálogo de Periodicidades y confirmando que solo se puede consultar (buscar, ordenar, ver el detalle de cada elemento), sin ningún botón o acción de alta, edición, activación o inactivación disponible.

**Acceptance Scenarios**:

1. **Given** el catálogo de Periodicidades, **When** un Administrador lo consulta, **Then** puede buscar y ver sus elementos, pero no encuentra ninguna acción para crear, editar, activar o inactivar.
2. **Given** un catálogo declarado como protegido, **When** se compara contra uno editable, **Then** ambos comparten la misma experiencia de consulta (búsqueda, orden alfabético, selección rápida), difiriendo únicamente en que el protegido no ofrece ninguna acción de escritura.

---

### User Story 4 - Buscar y seleccionar valores de catálogo de forma consistente (Priority: P2)

Como cualquier persona del despacho que necesita elegir un valor de un catálogo al llenar información de un cliente u otro registro, quiero poder buscarlo escribiendo y elegirlo de una lista corta, para no tener que revisar listas largas manualmente.

**Why this priority**: Es la experiencia de consulta que todo catálogo (editable o protegido) debe ofrecer; depende de que exista al menos un catálogo real (Periodicidades) para poder probarse de punta a punta, pero es independiente del ciclo de vida editable (Historia 2).

**Independent Test**: Puede probarse buscando un valor del catálogo de Periodicidades escribiendo parte de su nombre y confirmando que aparece como sugerencia seleccionable, y que el listado completo se ordena alfabéticamente.

**Acceptance Scenarios**:

1. **Given** cualquier catálogo, **When** se busca escribiendo parte del nombre de un elemento, **Then** aparece entre las sugerencias seleccionables sin necesidad de escribir el nombre completo.
2. **Given** el listado completo de un catálogo, **When** se consulta, **Then** aparece ordenado alfabéticamente por nombre.
3. **Given** un catálogo con diez elementos o menos, **When** se consulta su listado, **Then** se muestran todos sin necesidad de paginación.
4. **Given** un catálogo con más de diez elementos, **When** se consulta su listado, **Then** se presenta paginado.

---

### User Story 5 - Conservar la integridad de la información histórica (Priority: P3)

Como persona del despacho que consulta información ya registrada (por ejemplo, un cliente o un documento que usa un valor de catálogo ya inactivo), quiero seguir viendo ese valor tal como se registró en su momento, para que la información histórica no pierda sentido solo porque ese valor ya no está disponible para casos nuevos.

**Why this priority**: Es una garantía de integridad que depende de que ya existan elementos inactivos (Historia 2); no bloquea la operación diaria, pero es esencial para la confianza en los datos históricos del sistema.

**Independent Test**: Puede probarse inactivando un elemento de un catálogo ya referenciado por un registro existente y confirmando que ese registro sigue mostrando el valor sin cambios, aunque el elemento ya no aparezca como opción para registros nuevos.

**Acceptance Scenarios**:

1. **Given** un elemento de catálogo inactivo que ya fue usado en información existente, **When** se consulta esa información, **Then** el valor se sigue mostrando con normalidad.
2. **Given** ese mismo elemento inactivo, **When** se intenta seleccionar para información nueva, **Then** no aparece disponible entre las opciones.

---

### Edge Cases

- ¿Qué pasa si se intenta reutilizar el nombre de un elemento que ya está inactivo en el mismo catálogo? Se permite — la unicidad de nombre aplica solo entre los elementos actualmente activos del catálogo (consistente con el mecanismo de baja/reactivación ya usado para el RFC de Clientes).
- ¿Qué pasa si alguien intenta forzar una acción de alta, edición, activación o inactivación sobre un catálogo protegido (por ejemplo, manipulando la URL)? El sistema la rechaza igual que rechazaría cualquier acción fuera del permiso del usuario — un catálogo protegido no expone esas operaciones a nadie, ni siquiera a Administrador.
- ¿Qué pasa con un catálogo que todavía no tiene ningún elemento registrado? Su pantalla muestra un estado vacío explicativo, no un error.
- ¿Qué pasa si dos catálogos distintos tienen, cada uno por su cuenta, un elemento con el mismo nombre? No hay conflicto — la unicidad de nombre aplica dentro de cada catálogo, nunca entre catálogos distintos.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema DEBE restringir la administración de catálogos (alta, edición, activación, inactivación) exclusivamente a personas con rol Administrador.
- **FR-002**: Todo elemento de catálogo DEBE tener un estado, Activo o Inactivo; los elementos nuevos DEBEN crearse como Activos.
- **FR-003**: Ningún elemento de catálogo DEBE eliminarse físicamente — inactivarlo es el único mecanismo para retirarlo de uso.
- **FR-004**: Todo catálogo DEBE requerir un nombre obligatorio, único entre los elementos actualmente activos de ese mismo catálogo, aceptando acentos y caracteres especiales.
- **FR-005**: Todo catálogo PUEDE incluir una descripción opcional.
- **FR-006**: Todo elemento de catálogo DEBE registrar su fecha de creación y su fecha de última actualización; el sistema DEBE identificar además quién lo creó y quién lo modificó por última vez, consistente con el mecanismo general de auditoría ya usado en el resto del sistema.
- **FR-007**: Todo catálogo DEBE ofrecer búsqueda por nombre, orden alfabético, y selección rápida por escritura anticipada para su uso en otras partes del sistema.
- **FR-008**: El listado de un catálogo DEBE paginarse únicamente cuando tenga más de diez elementos.
- **FR-009**: Los elementos Inactivos de un catálogo NO DEBEN estar disponibles para seleccionarse en información nueva, pero SÍ DEBEN seguir mostrándose sin cambios en la información ya registrada que los referencia.
- **FR-010**: Cada catálogo DEBE implementarse como su propia entidad independiente, con sus propios atributos y reglas particulares — el sistema NO DEBE usar un mecanismo genérico o compartido (tablas dinámicas, entidades polimórficas) para almacenar distintos catálogos.
- **FR-011**: El sistema NO DEBE requerir información maestra obligatoria para los catálogos en general; cada catálogo se llena conforme a la operación del despacho, salvo que la especificación propia de un catálogo en particular indique lo contrario (por ejemplo, un catálogo sembrado desde una fuente oficial).
- **FR-012**: Todos los catálogos DEBEN ser accesibles desde un único punto de entrada ("Administración > Catálogos"), y cada catálogo DEBE conservar su propia pantalla y formulario de administración accesible desde ahí.
- **FR-013**: La experiencia de administración (diseño, acciones disponibles, manejo de estados, mensajes) DEBE ser consistente entre todos los catálogos.
- **FR-014**: El sistema DEBE permitir declarar un catálogo como protegido: un catálogo protegido solo permite consulta (búsqueda, orden, selección) y no expone ninguna acción de alta, edición, activación ni inactivación, para ningún usuario.
- **FR-015**: El sistema DEBE incluir el catálogo de Periodicidades como catálogo protegido desde la primera versión, sirviendo como referencia concreta y funcional del comportamiento de consulta común a todos los catálogos (Clarifications).
- **FR-016**: Este módulo NO DEBE definir los atributos ni las reglas particulares de Servicios, Tipos de Documento, Regímenes Fiscales, ni Obligaciones Fiscales — cada uno se rige por su propia especificación funcional, ya construida (Servicios) o futura.

### Key Entities

- **Catálogo administrable**: Concepto común a todo catálogo del sistema — no es una tabla única, sino el contrato que cada catálogo concreto implementa en su propia entidad: nombre (obligatorio, único entre activos), descripción (opcional), estado (Activo/Inactivo), fecha de creación, fecha de última actualización, usuario creador y usuario que modificó por última vez.
- **Periodicidad**: Catálogo protegido concreto de esta primera versión (Clarifications) — nombre y descripción de cada periodicidad que el sistema reconoce (por ejemplo, mensual, bimestral, anual); de solo consulta, sin operaciones de alta, edición, activación ni inactivación expuestas.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Una persona con rol Administrador encuentra y abre cualquier catálogo disponible desde "Administración > Catálogos" en menos de 10 segundos, sin necesitar instrucciones adicionales.
- **SC-002**: El 100% de los catálogos que ofrecen selección de valores permiten encontrar un elemento escribiendo parte de su nombre, sin desplazarse manualmente por una lista completa.
- **SC-003**: El 100% de los catálogos con diez elementos o menos se muestran sin controles de paginación; el 100% de los catálogos con más de diez elementos sí los muestran.
- **SC-004**: El 100% de los intentos de inactivar o reactivar un elemento de catálogo editable se reflejan de inmediato en su disponibilidad para selección en información nueva, sin afectar la información ya registrada que lo use.
- **SC-005**: El 100% de los intentos de alta, edición, activación o inactivación sobre el catálogo de Periodicidades (protegido) son rechazados, para cualquier usuario.
- **SC-006**: Una persona sin rol Administrador nunca logra acceder a "Administración > Catálogos" ni a ninguna pantalla de catálogo individual.

## Assumptions

- El catálogo de Servicios (ya construido en su propio spec) no se modifica ni se retroactiva para ajustarse a este módulo — sigue viviendo en su propia pantalla, fuera de "Administración > Catálogos", tal como ya lo excluye la descripción de esta feature.
- La identificación del usuario creador/modificador (FR-006) reutiliza el mismo mecanismo de trazabilidad ya presente en el resto del sistema (fecha y usuario de creación/última modificación) — no se introduce un mecanismo de auditoría nuevo.
- La unicidad de nombre (FR-004) aplica solo entre los elementos actualmente Activos de un mismo catálogo — un nombre usado por un elemento ya Inactivo puede reutilizarse, igual que ya ocurre con el RFC de Clientes.
- "Administración > Catálogos" es un único punto de entrada de navegación (una pantalla que lista los catálogos disponibles con acceso a cada uno) — no se asume una estructura de menú anidada de varios niveles.
- Los catálogos editables mencionados en la descripción (Tipos de Documento, Régimen Fiscal, Obligaciones Fiscales) no se construyen como parte de este módulo — sus specs futuros deberán cumplir el contrato aquí definido. Servicios ya existe, construido de forma independiente en `011-gestion-servicios` antes de que este contrato existiera formalmente, y no se retroactiva (ver más abajo).
- Periodicidades, al ser protegido en esta primera versión, no requiere un mecanismo de carga por Administrador — su contenido inicial se resuelve como parte de la implementación de este módulo, sin que este spec defina el listado exacto de valores (eso corresponde a la especificación funcional de Periodicidades/Gestión Fiscal cuando exista, si en el futuro deja de ser protegido).
