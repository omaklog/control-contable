# Feature Specification: Rediseño de la Pantalla de Inicio de Sesión

**Feature Branch**: `010-login-screen-redesign`

**Created**: 2026-07-18

**Status**: Draft

**Input**: User description: "Rediseñar la pantalla de inicio de sesión (login) de ambas aplicaciones (apps/admin, apps/portal) para acercarla a las referencias visuales agregadas en docs/ux/screenshots/login_reference/ (screen.png modo claro, login_screen_dark.png modo oscuro): un layout de panel dividido — un panel angosto a la izquierda con el formulario de acceso (logo, título de bienvenida, campos de correo y contraseña con iconos, opción \"recordarme\", enlace \"olvidé mi contraseña\", botón de acceso con icono, aviso breve de seguridad/MFA si aplica, y texto legal de pie de página) y un panel ancho a la derecha con una imagen/fondo institucional y contenido destacado (mensaje de valor, indicadores o métricas relevantes al despacho contable, no a un banco genérico). Debe usar exclusivamente el Theme compartido de 009-migrate-design-system (colores, tipografía, radios) y soportar modo claro/oscuro igual que el resto de la aplicación ya migrada. Esta especificación es independiente y no debe cambiar el flujo de autenticación existente (Supabase Auth, mensajes de error genéricos, redirecciones tras iniciar sesión) — es exclusivamente un rediseño visual/estructural de la pantalla ya construida."

## Clarifications

### Session 2026-07-18

- Q: El panel derecho de la referencia usa una fotografía de fondo (skyline urbano) con una superposición oscura. ¿Debe replicarse con una imagen fotográfica real, o mantenerse dentro del lenguaje visual ya establecido (capas tonales + bordes de 1px, sin fotografía) documentado en `docs/ux/design-system.md` §1.5? → A: Panel plano/tonal usando exclusivamente los colores del Theme compartido (sin fotografía ni imágenes externas), consistente con el resto de la aplicación.
- Q: El panel derecho de la referencia muestra cifras de marketing inventadas ("Managing $4.2B in institutional assets", "242+ Global Nodes"). ¿Qué contenido debe mostrar el panel derecho de este sistema? → A: Un mensaje de valor institucional (nombre del despacho/producto + una frase corta sobre su propósito), sin cifras ni estadísticas — ni inventadas ni en vivo.
- Q: La referencia incluye "Remember me for 30 days" y un aviso de "Multi-factor authentication may be required". ¿Deben incluirse en este rediseño? → A: Ninguno de los dos: no existe hoy una sesión extendida configurable ni autenticación multifactor en el sistema, y mostrar cualquiera de los dos sería indicarle al usuario una capacidad que no existe.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Pantalla de acceso en dos paneles, alineada al sistema de diseño (Priority: P1) 🎯 MVP

Como persona del despacho que inicia sesión en el Panel Administrativo o en el Portal, quiero ver una pantalla de acceso con una identidad visual cuidada (un panel de formulario a un lado y un panel de marca/valor institucional al otro), en vez del formulario centrado y desnudo actual, para que la primera impresión del sistema sea coherente con el resto de la aplicación ya migrada al nuevo Theme.

**Why this priority**: Es el cambio central de esta especificación — sin el layout de dos paneles no hay nada que las demás historias puedan refinar.

**Independent Test**: Puede probarse abriendo `/login` en cualquiera de las dos aplicaciones y confirmando visualmente que la pantalla ya no es un formulario centrado sobre fondo vacío, sino un layout de dos paneles, con colores/tipografía/radios que coinciden con el Theme compartido de `009-migrate-design-system`.

**Acceptance Scenarios**:

1. **Given** un usuario no autenticado que abre `/login` en `apps/admin` o `apps/portal` en una pantalla de escritorio, **When** la página carga, **Then** ve un panel angosto con el formulario de acceso (logo, título, campos de correo/contraseña, botón de acceso) y, junto a él, un panel más ancho con la identidad de marca y un mensaje de valor institucional.
2. **Given** la misma pantalla, **When** se compara contra cualquier otra pantalla ya migrada de la aplicación, **Then** los colores, la tipografía, los radios de esquina y los estilos de campo/botón son exactamente los mismos (mismo Theme, sin valores propios de esta pantalla).
3. **Given** un usuario en un dispositivo móvil o una ventana angosta, **When** abre `/login`, **Then** el panel de marca/valor se oculta o se apila de forma que el formulario de acceso siga siendo la primera y principal información visible, sin necesidad de desplazamiento horizontal.

---

### User Story 2 - Campos de acceso con iconos y mejor jerarquía visual (Priority: P2)

Como usuario que inicia sesión, quiero que los campos de correo y contraseña incluyan un icono identificador y que el botón de acceso incluya un icono de acción, para reconocer más rápido cada campo y la acción principal, igual que ya ocurre con los iconos de acciones en las tablas ya migradas.

**Why this priority**: Es una mejora de claridad visual que depende de que el layout de dos paneles (Historia 1) ya exista, pero no bloquea el valor central del rediseño.

**Independent Test**: Puede probarse mirando el formulario de acceso ya migrado y confirmando que el campo de correo tiene un icono de sobre, el de contraseña un icono de candado (además del icono ya existente para mostrar/ocultar contraseña), y el botón de acceso un icono de flecha/entrada.

**Acceptance Scenarios**:

1. **Given** el formulario de acceso, **When** se muestra el campo de correo, **Then** incluye un icono identificador al inicio del campo.
2. **Given** el formulario de acceso, **When** se muestra el campo de contraseña, **Then** incluye un icono identificador al inicio del campo, sin remover el icono de mostrar/ocultar contraseña que ya existe al final del campo.
3. **Given** el formulario de acceso, **When** se muestra el botón principal, **Then** incluye un icono de acción junto al texto "Iniciar sesión".

---

### User Story 3 - Modo claro y modo oscuro en la pantalla de acceso (Priority: P2)

Como usuario que ya alternó su preferencia de modo claro/oscuro en el sistema, quiero que la pantalla de acceso respete esa misma preferencia (o la del sistema operativo si aún no ha iniciado sesión antes), para no tener una experiencia visual inconsistente entre el login y el resto de la aplicación.

**Why this priority**: El soporte de modo claro/oscuro ya existe a nivel de Theme (`009-migrate-design-system`); esta historia asegura que el nuevo layout de dos paneles lo herede correctamente, sin introducir valores de color fijos.

**Independent Test**: Puede probarse alternando el modo oscuro en cualquier pantalla ya autenticada, cerrando la sesión, y confirmando que `/login` seguirá mostrando el modo elegido (mismo comportamiento ya definido en `009` para la preferencia por navegador/dispositivo).

**Acceptance Scenarios**:

1. **Given** un usuario cuyo navegador ya tiene guardada una preferencia de modo oscuro, **When** abre `/login` sin haber iniciado sesión todavía, **Then** ve la pantalla de acceso en modo oscuro, con ambos paneles (formulario y marca/valor) usando la paleta oscura del Theme compartido.
2. **Given** la pantalla de acceso en modo oscuro, **When** se compara el panel de marca/valor contra el panel de formulario, **Then** ambos usan superficies y textos coherentes con la paleta oscura documentada (nunca un panel "atrapado" en modo claro mientras el otro está en oscuro).

---

### Edge Cases

- ¿Qué pasa en pantallas angostas (móvil)? El panel de marca/valor se oculta o se apila debajo del formulario — el formulario de acceso nunca debe quedar oculto, recortado o requerir scroll horizontal (Historia 1, AS3).
- ¿Qué pasa con el enlace "olvidé mi contraseña" de la referencia? No se incluye — hoy no existe un flujo de autoservicio de recuperación de contraseña (la única vía existente es que un Administrador asigne una contraseña temporal desde la gestión de Usuarios). Agregarlo sin un flujo real detrás induciría a error; queda fuera de alcance de este rediseño.
- ¿Qué pasa si el mensaje de error de autenticación (correo/contraseña incorrectos) aparece? Debe seguir mostrándose dentro del panel de formulario, en el mismo punto y con el mismo texto genérico ya definido (`003-supabase-auth-roles`), sin cambiar su lógica ni su redacción.
- ¿Qué pasa con el logo y el nombre de la aplicación ("Panel Administrativo" / "Portal") ya usados hoy? Se conservan — el panel de marca/valor es una extensión visual, no un reemplazo del título ya existente por app.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: La pantalla de acceso de ambas aplicaciones (`apps/admin`, `apps/portal`) DEBE presentar un layout de dos paneles en pantallas de escritorio: un panel con el formulario de acceso y un panel con la identidad de marca y un mensaje de valor institucional.
- **FR-002**: El panel de marca/valor DEBE construirse únicamente con los colores, tipografía y radios ya definidos en el Theme compartido (`009-migrate-design-system`) — sin imágenes fotográficas, sin colores ni fuentes propias de esta pantalla.
- **FR-003**: El panel de marca/valor DEBE mostrar el nombre del producto/despacho y un mensaje de valor institucional breve, sin cifras, estadísticas ni indicadores (ni inventados ni en vivo).
- **FR-004**: En pantallas angostas (móvil), el sistema DEBE ocultar o apilar el panel de marca/valor de forma que el formulario de acceso permanezca como el contenido principal, completo y sin scroll horizontal.
- **FR-005**: El campo de correo electrónico DEBE mostrar un icono identificador; el campo de contraseña DEBE mostrar un icono identificador además de conservar el control ya existente para mostrar/ocultar la contraseña.
- **FR-006**: El botón principal de acceso DEBE incluir un icono de acción junto a su texto, conservando su comportamiento y estados ya existentes ("Iniciar sesión" / "Ingresando…").
- **FR-007**: La pantalla de acceso DEBE heredar el modo claro/oscuro activo exactamente igual que el resto de la aplicación (misma preferencia por navegador/dispositivo ya definida en `009-migrate-design-system`), sin un interruptor de modo propio ni un valor de modo fijo.
- **FR-008**: La pantalla de acceso NO DEBE incluir la opción "recordarme"/sesión extendida ni ningún aviso de autenticación multifactor, dado que ninguna de las dos capacidades existe hoy en el sistema.
- **FR-009**: La pantalla de acceso NO DEBE incluir un enlace de recuperación de contraseña de autoservicio, dado que ese flujo no existe hoy.
- **FR-010**: El rediseño NO DEBE cambiar el flujo de autenticación existente: mismos campos (correo, contraseña), misma validación, mismos mensajes de error genéricos (`003-supabase-auth-roles`, FR-012), y misma redirección tras iniciar sesión.
- **FR-011**: El texto legal/de pie de página, si se incluye, DEBE limitarse a información ya verídica del sistema (por ejemplo, el nombre del despacho/producto) — no debe inventar datos de cumplimiento, versión de protocolo u otra información no verificable.

### Key Entities

_No aplica — esta especificación no introduce ni modifica entidades de datos; es exclusivamente un cambio de presentación sobre la pantalla de acceso ya existente (FR-010)._

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: El 100% de los elementos visuales de la nueva pantalla de acceso (colores, tipografía, radios, espaciado) provienen del Theme compartido — cero valores de color/tipografía/radio definidos localmente en esta pantalla.
- **SC-002**: Un usuario en una pantalla de escritorio ve el panel de formulario y el panel de marca/valor simultáneamente, sin necesidad de desplazamiento, en el 100% de los casos.
- **SC-003**: Un usuario en una pantalla angosta (móvil) puede completar el inicio de sesión viendo el formulario completo sin scroll horizontal, en el 100% de los casos.
- **SC-004**: El tiempo para iniciar sesión (desde que carga la pantalla hasta el envío del formulario) no aumenta respecto a la implementación actual — el rediseño es puramente visual, no agrega pasos.
- **SC-005**: Alternar entre modo claro y oscuro en cualquier otra pantalla y luego cerrar sesión produce la misma apariencia de modo en `/login` en el 100% de los casos.

## Assumptions

- El logo, la marca y el nombre por aplicación ("Panel Administrativo", "Portal") ya existentes (`packages/ui/src/Logo.tsx`, prop `title` de `LoginForm`) se conservan; el panel de marca/valor los complementa, no los reemplaza.
- No existe hoy autoservicio de recuperación de contraseña ni autenticación multifactor — ambos quedan explícitamente fuera de alcance (ver Edge Cases, FR-008, FR-009); si en el futuro se agregan, será mediante su propia especificación.
- El panel de marca/valor no muestra fotografías ni imágenes externas — se construye enteramente con los tokens del Theme (color, tipografía, formas), consistente con el lenguaje visual "tonal, con bordes de 1px" ya documentado en `docs/ux/design-system.md` §1.5, y evita además la dependencia de activos de imagen no versionados en el repositorio.
- El mensaje de valor institucional del panel de marca es contenido estático de producto (no dinámico, no calculado desde datos del sistema) — su redacción exacta se define durante la planeación/implementación, no en este spec.
- Esta especificación cubre únicamente `apps/admin` y `apps/portal`; no introduce una pantalla de registro ni de recuperación de contraseña nuevas.
- El flujo de autenticación (Supabase Auth, validaciones, mensajes de error, redirecciones) permanece exactamente igual (FR-010) — ningún cambio de lógica de negocio ni de seguridad.
