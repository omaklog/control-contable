# Feature Specification: Migración al Sistema de Diseño Compartido (Theme MUI)

**Feature Branch**: `009-migrate-design-system`

**Created**: 2026-07-18

**Status**: Draft

**Input**: User description: "Migrar sistema de diseño ui - Objetivo: Migrar toda la aplicación para utilizar un único Design System. Incluye: Theme MUI, Tipografía, Colores, Spacing, Border Radius, Elevations, Componentes compartidos, Dark Mode, Estados, Badges. Comienza construyendo un theme de mui para consumirlo en la adaptación packages/ui/theme/ (colors.ts, typography.ts, spacing.ts, shadows.ts, radius.ts, light.ts, dark.ts, index.ts)"

## Clarifications

### Session 2026-07-18

- Q: ¿Cómo se decide el modo inicial (claro/oscuro) y dónde se guarda la preferencia del usuario? → A: Sigue la preferencia del sistema operativo/navegador por defecto; un toggle manual la sobreescribe; se guarda por navegador/dispositivo (no asociada a la cuenta ni sincronizada entre dispositivos).
- Q: ¿Qué estándar de contraste de color debe cumplir el Theme (texto, iconos, insignias de estado) en ambos modos? → A: WCAG 2.1 nivel AA (contraste mínimo 4.5:1 para texto normal, 3:1 para texto grande e iconos) en modo claro y modo oscuro.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Un Theme MUI compartido y verificable (Priority: P1) 🎯 MVP

Como persona responsable de mantener la interfaz del sistema, quiero que exista un único Theme de Material UI, centralizado en `packages/ui`, que traduzca a valores concretos las reglas ya documentadas del sistema de diseño (colores, tipografía, espaciado, radios de esquina, elevaciones, y sus variantes clara/oscura), para que cualquier componente de cualquiera de las dos aplicaciones pueda consumirlo sin duplicar valores.

**Why this priority**: Es la base de la que dependen todas las demás historias — sin el Theme construido no hay nada que las aplicaciones puedan consumir ni contra qué migrar los componentes existentes.

**Independent Test**: Puede probarse de forma aislada envolviendo componentes de Material UI ya conocidos (botón, campo de texto, tarjeta, insignia de estado) con el Theme nuevo y confirmando visualmente que sus colores, tipografía, espaciado y radios coinciden con las reglas documentadas — sin necesidad de que ninguna pantalla de negocio existente haya sido migrada todavía.

**Acceptance Scenarios**:

1. **Given** el Theme compartido ya construido, **When** se envuelve un componente estándar de Material UI (botón, campo de texto, tarjeta) con él, **Then** ese componente refleja los colores, la tipografía y los radios de esquina documentados, en vez de los valores por defecto de Material UI o de cualquier tema anterior.
2. **Given** el Theme, **When** se activa su variante oscura, **Then** los mismos componentes cambian de superficie, color y contraste, pero conservan exactamente la misma forma (radios de esquina), tipografía y espaciado que en la variante clara.
3. **Given** una cifra o dato tabular mostrado con la tipografía del Theme, **When** se renderiza, **Then** usa la fuente monoespaciada definida para columnas numéricas y montos.
4. **Given** dos componentes iguales en `apps/admin` y en `apps/portal`, **When** ambos usan el Theme compartido, **Then** se ven visualmente idénticos entre sí (mismo color, tipografía, espaciado y forma) — hoy no es el caso, porque cada aplicación tiene su propio tema con colores distintos.

---

### User Story 2 - Ambas aplicaciones consumen el mismo Theme (Priority: P1)

Como usuario del Panel Administrativo o del Portal, quiero que toda la interfaz de la aplicación que uso se vea consistente con el sistema de diseño y sea visualmente idéntica a la de la otra aplicación, para percibir ambas como un mismo producto y no como dos aplicaciones con identidades visuales distintas.

**Why this priority**: Construir el Theme (Historia 1) no cambia nada que el usuario perciba hasta que cada aplicación deje de usar su propio tema local y consuma el compartido.

**Independent Test**: Puede probarse iniciando sesión en cada aplicación y confirmando visualmente que toda la interfaz ya construida (menú lateral, avatar, tablas, formularios, botones) usa los mismos colores/tipografía/radios en ambas, sin que ninguna pantalla existente se vea "a medias" entre el tema anterior y el nuevo.

**Acceptance Scenarios**:

1. **Given** una sesión iniciada en `apps/admin` o en `apps/portal`, **When** el usuario navega por cualquier pantalla ya construida, **Then** todos los componentes visibles reflejan el Theme compartido, sin colores ni tipografías que provengan del tema local anterior de esa aplicación.
2. **Given** las dos aplicaciones abiertas una junto a la otra, **When** se comparan pantallas equivalentes (por ejemplo, un listado paginado en cada una), **Then** se ven con la misma identidad visual — mismo color primario, mismos radios, misma tipografía.

---

### User Story 3 - Alternar entre modo claro y modo oscuro (Priority: P2)

Como usuario de cualquiera de las dos aplicaciones, quiero poder ver la interfaz en modo oscuro además del modo claro actual, para adaptar la aplicación a mis condiciones de trabajo (por ejemplo, poca luz ambiental).

**Why this priority**: Depende de que el Theme (Historia 1) ya tenga definida su variante oscura; es una mejora de experiencia significativa pero no bloquea el valor principal de unificar la identidad visual (Historias 1 y 2).

**Independent Test**: Puede probarse cambiando el modo desde cualquiera de las dos aplicaciones y confirmando que toda la pantalla actual cambia de modo de forma consistente y que, al volver a abrir la aplicación, el modo elegido se mantiene.

**Acceptance Scenarios**:

1. **Given** una sesión iniciada en cualquiera de las dos aplicaciones, **When** el usuario activa el modo oscuro, **Then** toda la interfaz visible cambia a la variante oscura del Theme de inmediato, sin recargar la página.
2. **Given** el modo oscuro ya activado, **When** el usuario cierra y vuelve a abrir la aplicación (o navega a la otra aplicación), **Then** el modo elegido se conserva, sin volver al modo claro por defecto.
3. **Given** un usuario que nunca ha elegido un modo explícitamente, **When** abre la aplicación por primera vez, **Then** el sistema inicia en el modo (claro u oscuro) que coincida con la preferencia configurada en su sistema operativo/navegador; si esa preferencia no puede detectarse, inicia en modo claro.
4. **Given** un usuario que ya activó manualmente un modo (sobreescribiendo la detección automática), **When** vuelve a abrir cualquiera de las dos aplicaciones en el mismo navegador, **Then** se respeta su elección manual por encima de la preferencia del sistema operativo, hasta que la cambie de nuevo.

---

### User Story 4 - Estados mostrados con el mismo lenguaje visual en toda la aplicación (Priority: P2)

Como usuario que consulta listados de Clientes, Usuarios o Contactos, quiero que el estado de cada registro (activo/inactivo, activo/obsoleto) se muestre siempre de la misma forma — una insignia de color, nunca texto plano — para identificar el estado de un vistazo sin importar en qué pantalla esté.

**Why this priority**: Ya existe una pantalla (gestión de Usuarios) que sigue esta regla; las demás pantallas de listado ya construidas (Clientes en ambas aplicaciones, detalle de Cliente) todavía no, lo que hace que la aplicación se sienta inconsistente hoy.

**Independent Test**: Puede probarse abriendo el listado de Clientes en cada aplicación y la página de detalle de un Cliente, y confirmando que su columna de "Estado" ya usa una insignia semántica igual a la que ya usa la gestión de Usuarios.

**Acceptance Scenarios**:

1. **Given** cualquier listado o ficha que muestre un estado binario ya definido (activo/inactivo de Cliente, activo/obsoleto de Contacto), **When** se consulta, **Then** el estado se muestra como una insignia con el color semántico correspondiente del Theme (positivo, neutro o de atención), nunca como texto plano.
2. **Given** el mismo tipo de estado mostrado en dos pantallas distintas, **When** se comparan, **Then** usan exactamente el mismo color e insignia — no hay dos representaciones distintas para el mismo significado.

---

### User Story 5 - Acciones por fila consistentes en toda la aplicación (Priority: P3)

Como usuario que gestiona registros en una tabla (Clientes, Contactos), quiero que las acciones disponibles por fila se vean y comporten igual que ya lo hacen en la tabla de gestión de Usuarios, para no tener una experiencia distinta según en qué pantalla esté.

**Why this priority**: Es una mejora de consistencia visual adicional que depende de que el Theme y el patrón de estados (Historias 1 y 4) ya existan; no bloquea el valor central de unificar colores/tipografía.

**Independent Test**: Puede probarse comparando la tabla de gestión de Usuarios (ya construida con este patrón) contra los listados de Clientes y la lista de Contactos tras esta historia, confirmando que las tres se comportan y se ven igual.

**Acceptance Scenarios**:

1. **Given** una tabla con acciones por fila en cualquiera de las dos aplicaciones, **When** se consulta, **Then** esas acciones se muestran como iconos con texto de ayuda al pasar el cursor (no botones de texto), siempre visibles, igual que ya ocurre en la gestión de Usuarios.
2. **Given** la fila actualmente bajo el cursor o con el foco del teclado, **When** el usuario interactúa con la tabla, **Then** esa fila muestra una señal visual de que es la fila activa, consistente con el resto de la aplicación.

---

### Edge Cases

- ¿Qué pasa si el navegador o dispositivo del usuario no permite detectar ninguna preferencia de modo claro/oscuro? El sistema debe usar el modo claro como respaldo.
- ¿Qué pasa con un documento exportado (por ejemplo, un recibo en PDF)? Los documentos exportados no siguen el Theme de la interfaz — su formato es independiente y queda fuera de alcance de esta migración.
- ¿Qué pasa si una pantalla o componente nuevo se construye después de esta migración sin usar el Theme compartido? Debe tratarse como una desviación a corregir, no como una excepción válida — el Theme es la única fuente de verdad para cualquier componente nuevo o existente.
- ¿Qué pasa con los dos temas locales que existen hoy en `apps/admin` y `apps/portal` (con colores distintos entre sí y distintos de los documentados)? Se retiran por completo al finalizar esta migración — no quedan como una alternativa ni como valores de respaldo.
- ¿Qué pasa si un color ya documentado en `docs/ux/design-system.md` no cumple el contraste mínimo WCAG 2.1 AA en alguno de los dos modos? Debe ajustarse el tono manteniendo su intención semántica (por ejemplo, oscurecer o aclarar ligeramente), priorizando el cumplimiento del contraste sobre conservar el valor exacto ya documentado.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema DEBE definir un único Theme de Material UI, ubicado en `packages/ui`, que sea la única fuente de colores, tipografía, espaciado, radios de esquina y elevaciones para ambas aplicaciones (`apps/admin`, `apps/portal`).
- **FR-002**: El Theme DEBE implementar los valores de color ya documentados para modo claro y modo oscuro (roles de color primario, secundario, de fondo, de superficie, semánticos de estado y de texto), incluida la regla de que ningún componente use verde como color de estado, y cumpliendo un contraste mínimo WCAG 2.1 nivel AA (4.5:1 para texto normal, 3:1 para texto grande e iconos) en ambos modos.
- **FR-003**: El Theme DEBE implementar la tipografía documentada: una fuente de texto general para el contenido en general, y una fuente monoespaciada exclusiva para cifras y datos tabulares (columnas numéricas, montos, KPIs).
- **FR-004**: El Theme DEBE implementar la escala de espaciado documentada (unidad base y sus incrementos) de forma consistente en ambos modos.
- **FR-005**: El Theme DEBE implementar la escala única de radios de esquina documentada (componentes estándar, contenedores grandes, insignias/chips en forma de píldora), idéntica en modo claro y modo oscuro.
- **FR-006**: El Theme DEBE implementar el criterio de elevación documentado (capas tonales y bordes de 1px como mecanismo principal, en vez de sombras pesadas), con una escala de sombra ligera reservada para modales/popovers.
- **FR-007**: El Theme DEBE exponer una variante clara y una variante oscura que compartan exactamente la misma forma (radios), tipografía y espaciado — solo deben diferir en color, contraste y superficie.
- **FR-008**: Ambas aplicaciones (`apps/admin`, `apps/portal`) DEBEN consumir el mismo Theme compartido, reemplazando por completo cualquier tema local propio que existiera antes de esta migración.
- **FR-009**: El sistema DEBE permitir a un usuario alternar entre modo claro y modo oscuro desde cualquiera de las dos aplicaciones, aplicando el cambio de inmediato a toda la interfaz visible sin recargar la página.
- **FR-010**: El sistema DEBE recordar la preferencia de modo (claro/oscuro) de un usuario entre sesiones: por defecto, DEBE seguir la preferencia de modo claro/oscuro del sistema operativo o navegador del usuario; si el usuario alterna el modo manualmente, esa elección manual DEBE prevalecer sobre la preferencia del sistema operativo en ese mismo navegador hasta que el usuario la cambie de nuevo. Esta preferencia se guarda por navegador/dispositivo (no asociada a la cuenta del usuario ni sincronizada entre dispositivos).
- **FR-011**: Todos los componentes compartidos ya existentes en `packages/ui` (layout principal, formularios, insignias, tarjetas, diálogos de confirmación) DEBEN migrarse para leer sus colores, tipografía, espaciado y radios exclusivamente del Theme compartido.
- **FR-012**: Todas las columnas o campos de "Estado" ya construidos en pantallas existentes (listado de Clientes en ambas aplicaciones, detalle de Cliente, listado de Contactos) DEBEN mostrarse como una insignia con el color semántico del Theme, nunca como texto plano.
- **FR-013**: Todas las acciones por fila ya construidas en tablas existentes que todavía usan botones de texto siempre visibles (listado de Clientes en ambas aplicaciones, lista de Contactos en el detalle de Cliente) DEBEN migrarse al mismo patrón ya usado en la gestión de Usuarios (iconos con texto de ayuda, siempre visibles, con una señal clara de fila activa).
- **FR-014**: La migración NO DEBE cambiar ninguna regla de negocio, flujo de trabajo, permiso o dato existente de las pantallas que se migran visualmente — únicamente su presentación.

### Key Entities _(include if feature involves data)_

- **Theme**: Definición centralizada y sin datos persistentes (vive en código, en `packages/ui`) de los valores visuales del sistema: paleta de color (clara y oscura), tipografía, espaciado, radios de esquina y elevaciones. No representa una entidad de negocio ni se almacena en base de datos.
- **Preferencia de modo (claro/oscuro)**: Elección del usuario sobre qué variante del Theme prefiere ver. Por defecto sigue la preferencia del sistema operativo/navegador; si el usuario la sobreescribe manualmente, esa elección prevalece. Se guarda por navegador/dispositivo, no asociada a la cuenta del usuario ni sincronizada entre dispositivos.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: El 100% de los componentes de Material UI usados en pantallas ya construidas (botones, campos, tablas, tarjetas, chips, diálogos) obtienen sus colores, tipografía, espaciado y radios del Theme compartido, sin valores de color/tipografía/radio definidos de forma local en una pantalla o componente específico.
- **SC-002**: Un usuario puede alternar entre modo claro y oscuro en menos de 2 segundos, viendo el cambio reflejado de inmediato en toda la pantalla actual.
- **SC-003**: El 100% de las columnas o campos de "Estado" en las pantallas ya construidas (Usuarios, Clientes en ambas aplicaciones, Contactos) muestran una insignia semántica, no texto plano.
- **SC-004**: El 100% de las tablas con acciones por fila ya construidas usan el mismo patrón visual (iconos con texto de ayuda), sin que ninguna tabla existente conserve botones de texto siempre visibles.
- **SC-005**: Al comparar una pantalla equivalente entre `apps/admin` y `apps/portal` (por ejemplo, un listado paginado), un observador no puede distinguir a cuál de las dos aplicaciones pertenece basándose únicamente en su identidad visual (color, tipografía, forma).
- **SC-006**: La preferencia de modo (claro/oscuro) de un usuario se mantiene sin cambios en el 100% de sus sesiones posteriores, en ambas aplicaciones.
- **SC-007**: El 100% de las combinaciones de color texto/fondo e icono/fondo definidas por el Theme, en modo claro y en modo oscuro, cumplen un contraste mínimo WCAG 2.1 nivel AA (4.5:1 texto normal, 3:1 texto grande/iconos), verificable con una herramienta de contraste automatizada.

## Assumptions

- El sistema de diseño ya documentado en `docs/ux/design-system.md` (fundamentos visuales, patrones de tabla/formulario, estados y modo claro/oscuro) es la fuente de verdad de todos los valores concretos que este Theme debe implementar; esta especificación no redefine esas reglas, solo exige construir el Theme que las materialice y migrar la aplicación existente para consumirlo.
- Hoy existen dos temas de Material UI distintos y definidos de forma local, uno por aplicación, con paletas de color que no coinciden entre sí ni con la ya documentada — de ahí que las dos aplicaciones se vean visualmente distintas entre sí en este momento. Ambos se retiran por completo al finalizar esta migración (ver Edge Cases).
- Esta migración cubre las pantallas y componentes compartidos ya construidos hasta la fecha (layout principal, gestión de Usuarios, listados de Clientes en ambas aplicaciones, detalle de Cliente con sus Contactos, pantallas de autenticación). No incluye construir pantallas o funcionalidades de negocio nuevas — solo su presentación visual.
- Las fuentes tipográficas (texto general y monoespaciada) se incluyen como parte de la aplicación (sin depender de un servicio externo en tiempo de ejecución), consistente con operar en un servidor local sin exponer dependencias innecesarias a Internet.
- Los documentos exportables (por ejemplo, recibos en PDF) no forman parte de esta migración — su formato ya está desacoplado de la interfaz según la constitución del proyecto, y sigue siéndolo.
- No se introduce personalización de marca por cliente/tenant (por ejemplo, un color de acento configurable) — el Theme define una única identidad visual para todo el sistema, tal como ya lo documenta el sistema de diseño.
- El control de acceso, los permisos por rol y cualquier regla de negocio de las pantallas migradas no cambian — esta migración es exclusivamente de presentación (ver FR-014).
