# Feature Specification: Alta de Cliente desde el Portal

**Feature Branch**: `007-alta-cliente-portal`

**Created**: 2026-07-16

**Status**: Draft

**Input**: User description: "Alta de cliente desde el portal: los roles Contador y Administrador pueden dar de alta nuevos clientes desde apps/portal; Auxiliar solo puede consultar, no crear. Continúa lo acordado en 006-crud-clientes-admin (que dejó la alta fuera de su alcance, a construirse aquí) y en 004-portal-main-layout (la entrada 'Clientes' del menú del portal, hoy marcada 'Próximamente', debe habilitarse con esta pantalla)."

## Clarifications

### Session 2026-07-17

- Q: Al agregar la tabla de clientes en el portal, ¿esa tabla debe incluir acciones de editar/eliminar por fila, o es solo de consulta + el botón de agregar? → A: Solo consulta + agregar — editar y dar de baja siguen siendo exclusivos del Panel Administrativo (`006-crud-clientes-admin`); la tabla del portal no tiene columna de acciones.
- Q: ¿La tabla del portal debe mostrar solo clientes activos por defecto (con un filtro para ver también los inactivos, igual que en `apps/admin`), o mostrar siempre todos sin distinción de estado? → A: Solo activos por defecto, con un filtro para mostrar también los inactivos — mismo patrón ya usado en el listado de `apps/admin`.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Consultar y filtrar el listado de clientes en el portal (Priority: P1)

Un Contador, Administrador o Auxiliar abre la sección "Clientes" del portal y ve una tabla paginada con todos los clientes registrados, con un encabezado que permite filtrar por nombre o RFC.

**Why this priority**: Es la vista base de esta sección — sin ella no hay forma de ubicar un cliente existente, y el botón de alta (Historia 2) vive precisamente en el encabezado de esta tabla.

**Independent Test**: Puede probarse sembrando clientes directamente en la base de datos y verificando que aparecen correctamente listados, paginados, y que el filtro por nombre o RFC reduce los resultados como se espera — sin necesitar el formulario de alta.

**Acceptance Scenarios**:

1. **Given** existen clientes registrados, **When** cualquier usuario con acceso a la sección abre "Clientes", **Then** ve una tabla con todos los clientes activos, paginada si excede el tamaño de una página.
2. **Given** la tabla de clientes, **When** el usuario escribe en el filtro de nombre o RFC, **Then** la tabla muestra únicamente los clientes cuyo nombre o RFC coincide con lo escrito.
3. **Given** existen clientes activos e inactivos, **When** el usuario abre la tabla sin aplicar ningún filtro adicional, **Then** solo ve los clientes activos; al activar el filtro de "mostrar inactivos", también ve los dados de baja.
4. **Given** un filtro que no coincide con ningún cliente, **When** se aplica, **Then** la tabla muestra un estado vacío claro, sin error.

---

### User Story 2 - Dar de alta un nuevo cliente desde el portal (Priority: P1)

Un Contador o Administrador hace clic en "Agregar cliente" desde el encabezado de la tabla; se abre un modal con el formulario, captura los datos de un cliente nuevo, y al guardar el cliente queda registrado, visible de inmediato en la tabla (incluido en el Panel Administrativo, para su edición o baja futura).

**Why this priority**: Es la función central de esta feature — sin ella, no existe ninguna forma de dar de alta clientes en todo el sistema (006 dejó la alta fuera de su alcance, a propósito, para construirse aquí).

**Independent Test**: Puede probarse haciendo clic en "Agregar cliente", capturando datos válidos en el modal, guardando, y confirmando tanto que el modal se cierra como que el cliente aparece en la tabla del portal y en el listado de `apps/admin` (006-crud-clientes-admin).

**Acceptance Scenarios**:

1. **Given** un Contador o Administrador ve la tabla de clientes, **When** hace clic en "Agregar cliente", **Then** se abre un modal con el formulario de alta, vacío.
2. **Given** el modal de alta abierto, **When** captura datos válidos (nombre, tipo de persona, RFC, régimen fiscal, correo) y guarda, **Then** el cliente se crea, el modal se cierra, y el cliente nuevo aparece de inmediato en la tabla.
3. **Given** el modal de alta, **When** el usuario intenta guardar con un RFC que ya usa otro cliente activo, **Then** el sistema rechaza el guardado y muestra un mensaje de error claro dentro del modal, sin perder los datos ya capturados ni cerrar el modal.
4. **Given** el modal de alta, **When** el usuario selecciona un tipo de persona y un régimen fiscal incompatibles entre sí (o un régimen ya no vigente), **Then** el sistema rechaza el guardado y muestra un mensaje de error claro dentro del modal.
5. **Given** el modal de alta abierto con datos capturados, **When** el usuario lo cierra sin guardar, **Then** no se crea ningún cliente y la tabla queda sin cambios.
6. **Given** un cliente recién creado desde el portal, **When** un Administrador lo busca en el listado de `apps/admin`, **Then** lo encuentra de inmediato, con los mismos datos capturados.

---

### User Story 3 - El acceso respeta las capacidades del usuario (Priority: P2)

Un Auxiliar que usa el portal puede consultar la tabla de clientes y usar sus filtros, pero no ve el botón "Agregar cliente" — consistente con que Auxiliar nunca puede crear, editar ni eliminar clientes en ningún módulo (006-crud-clientes-admin, Clarifications).

**Why this priority**: Es una restricción de seguridad/consistencia importante, pero no bloquea la función central (Historias 1 y 2) — se prueba y garantiza en paralelo.

**Independent Test**: Puede probarse iniciando sesión como Auxiliar y confirmando que ve la tabla y sus filtros pero no el botón de alta ni puede invocar la acción de creación, mientras que Contador y Administrador sí pueden.

**Acceptance Scenarios**:

1. **Given** un usuario con el rol Auxiliar, **When** navega a la sección "Clientes" del portal, **Then** ve la tabla de clientes y sus filtros, pero no ve el botón "Agregar cliente".
2. **Given** un Contador o un Administrador, **When** navegan a la sección "Clientes" del portal, **Then** sí ven el botón "Agregar cliente".

---

### Edge Cases

- ¿Qué pasa si se intenta dar de alta un cliente con el mismo RFC que uno ya dado de baja (inactivo)? El sistema debe evitar la ambigüedad de tener dos fichas con el mismo identificador fiscal, igual que ya se definió en `005-clientes-cobranza-expedientes` (edge case ya resuelto a nivel de datos: único índice entre clientes activos).
- ¿Qué pasa si el usuario cierra o abandona el modal de alta sin guardar? No se crea ningún cliente, y la tabla permanece sin cambios.
- ¿Qué pasa si dos personas intentan dar de alta, al mismo tiempo, un cliente con el mismo RFC? La base de datos rechaza la segunda inserción (unicidad ya garantizada a nivel de datos); el sistema debe mostrar el mismo mensaje de error claro que en cualquier otro conflicto de RFC duplicado.
- ¿Qué pasa si se cambia el filtro de nombre/RFC mientras se está en una página distinta a la primera? La tabla debe volver a la primera página de los resultados filtrados, para no mostrar una página vacía por error.
- ¿Qué pasa si no existe ningún cliente registrado todavía? La tabla muestra un estado vacío que invita a agregar el primero mediante el botón "Agregar cliente" (para quien tenga esa capacidad).

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar, dentro de `apps/portal`, una tabla paginada con todos los Clientes registrados, habilitando la entrada "Clientes" del menú de navegación (hoy marcada "Próximamente", ver `004-portal-main-layout`).
- **FR-002**: La tabla DEBE incluir, en su encabezado, un filtro por nombre o RFC (coincidencia parcial contra cualquiera de los dos campos) que reduce los resultados mostrados sin necesidad de recargar la página completa.
- **FR-003**: La tabla DEBE ocultar por defecto los clientes dados de baja (inactivos), y DEBE ofrecer un filtro que permita mostrarlos también, consistente con el mismo patrón ya usado en el listado de `apps/admin` (`006-crud-clientes-admin`).
- **FR-004**: La tabla NO DEBE incluir acciones de editar ni dar de baja por fila — esas operaciones siguen siendo exclusivas de `apps/admin` (`006-crud-clientes-admin`, Clarifications).
- **FR-005**: El encabezado de la tabla DEBE incluir un botón "Agregar cliente" que abre un modal con el formulario de alta.
- **FR-006**: El formulario del modal DEBE capturar, como mínimo, los campos ya definidos para Cliente: nombre o razón social, tipo de persona, RFC, régimen fiscal, correo, teléfono y dirección fiscal.
- **FR-007**: El sistema DEBE validar en el formulario las mismas reglas de negocio ya establecidas a nivel de datos (`005-clientes-cobranza-expedientes`): RFC único entre clientes activos, y régimen fiscal compatible con el tipo de persona y vigente; DEBE mostrar el mensaje de error dentro del modal, sin cerrarlo ni perder los datos capturados.
- **FR-008**: El acceso al botón "Agregar cliente" (y a la creación en sí) DEBE requerir la capacidad `manage_clients` (Administrador y Contador la tienen por defecto; Auxiliar no, y por lo tanto no debe ver ese botón ni poder crear clientes, consistente con `006-crud-clientes-admin`); el acceso de solo consulta a la tabla y sus filtros DEBE requerir únicamente `view_clients` o `manage_clients`.
- **FR-009**: Un cliente dado de alta desde el portal DEBE quedar disponible de inmediato tanto en la propia tabla del portal como en el listado de `apps/admin` (`006-crud-clientes-admin`), sin pasos adicionales de sincronización.
- **FR-010**: El formulario de alta NO DEBE incluir la gestión de Contactos del cliente ni el campo de responsable asignado, consistente con el mismo alcance ya acotado para el formulario de edición en `006-crud-clientes-admin` — ambos quedan para una feature posterior dedicada.
- **FR-011**: Tras un alta exitosa, el sistema DEBE cerrar el modal, confirmar visualmente el éxito, y reflejar el cliente nuevo en la tabla sin que el usuario tenga que refrescar manualmente la página.

### Key Entities _(include if feature involves data)_

- **Cliente** y **Régimen Fiscal**: entidades y reglas de negocio ya definidas en `005-clientes-cobranza-expedientes` (modelo de datos, migraciones y validaciones ya implementadas). Esta feature no modifica su esquema — construye la pantalla de alta en `apps/portal` sobre ese modelo ya existente, sin duplicar sus reglas de integridad (que siguen viviendo en la base de datos).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Un Contador o Administrador puede dar de alta un cliente nuevo, desde que abre el modal hasta la confirmación de éxito, en menos de 3 minutos.
- **SC-002**: El 100% de los intentos de alta que violan una regla de negocio (RFC duplicado, régimen fiscal incompatible o no vigente) muestran un mensaje de error claro dentro del modal, sin pérdida de los datos ya capturados.
- **SC-003**: El 100% de los clientes dados de alta desde el portal son consultables de inmediato tanto en la tabla del portal como desde `apps/admin`, sin retraso perceptible ni pasos manuales adicionales.
- **SC-004**: El 100% de los usuarios con rol Auxiliar no tienen, en ningún momento, una forma de dar de alta un cliente desde el portal.
- **SC-005**: El personal puede localizar un cliente específico filtrando por nombre o RFC en menos de 10 segundos desde que abre la sección "Clientes".

## Assumptions

- **(Actualizado, ver Clarifications)** Esta feature sí incluye un listado de clientes dentro de `apps/portal` (tabla paginada + filtro por nombre/RFC + filtro de inactivos), pero sin acciones de editar ni dar de baja — esas siguen siendo exclusivas de `apps/admin` (`006-crud-clientes-admin`). El filtro de nombre/RFC es un único campo de búsqueda que compara contra ambos atributos (coincidencia parcial en cualquiera de los dos), no dos campos separados — la forma más simple que cumple "filtrar por nombre o RFC" tal como se pidió.
- El tamaño de página y el orden por defecto de la tabla (por ejemplo, alfabético por nombre) son detalles de implementación que se definirán en la fase de planeación, no en esta especificación de negocio — mismo criterio ya usado en `006-crud-clientes-admin`.
- El formulario de alta reutiliza las mismas reglas de negocio ya implementadas a nivel de base de datos en `005-clientes-cobranza-expedientes` (RFC único entre activos, compatibilidad y vigencia de régimen fiscal); esta especificación no redefine esas reglas, solo exige que el formulario las respete y comunique sus violaciones con claridad.
- La lógica de validación de UX ya construida para el formulario de edición en `006-crud-clientes-admin` (esquema de validación, filtrado del selector de régimen fiscal por tipo de persona, traducción de errores de base de datos a mensajes claros) se comparte con este formulario de alta en la fase de planeación, en vez de duplicarse — ahora que existen dos consumidores reales (edición en `apps/admin`, alta en `apps/portal`), consistente con el principio de evitar duplicación de código ya aplicado al layout principal en `004-portal-main-layout`.
- El acceso a `apps/portal` en sí (para los 3 roles de personal) ya está resuelto por `003-supabase-auth-roles`; esta especificación solo agrega la restricción adicional de que, dentro del portal, la capacidad `manage_clients` (no solo el acceso a la app) sea necesaria para dar de alta.
