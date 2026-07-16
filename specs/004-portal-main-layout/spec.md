# Feature Specification: Layout Principal del Portal

**Feature Branch**: `004-portal-main-layout`

**Created**: 2026-07-15

**Status**: Draft

**Input**: User description: "Layout principal de el portal: Objetivo crear el layout principal con el menu, avatar de perfil botones de cierre de sesion"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Navegación y perfil visibles en todo el portal (Priority: P1)

Un miembro del personal del despacho (Administrador, Contador o Auxiliar) que ya inició sesión en el portal navega entre distintas secciones y, en todo momento, ve el mismo menú de navegación y su propio avatar de perfil (nombre y rol), sin importar en qué página se encuentre.

**Why this priority**: Es la base visual y de navegación de toda la aplicación operativa diaria del despacho; sin ella, cada página quedaría aislada y el usuario no tendría una forma consistente de moverse por el sistema ni de confirmar con qué cuenta inició sesión.

**Independent Test**: Puede probarse iniciando sesión con cualquiera de los 3 roles de personal y verificando que el menú y el avatar aparecen de forma idéntica y consistente en cada página autenticada del portal.

**Acceptance Scenarios**:

1. **Given** un usuario de personal autenticado, **When** navega a cualquier página del portal, **Then** ve el menú de navegación y su avatar de perfil en un lugar consistente de la pantalla.
2. **Given** un usuario autenticado sin nombre configurado en su perfil, **When** el layout muestra su avatar, **Then** se ve un valor de reemplazo razonable (por ejemplo, iniciales derivadas de su correo) en vez de un espacio vacío o roto.
3. **Given** un usuario autenticado en un dispositivo de pantalla pequeña, **When** carga cualquier página del portal, **Then** el menú y el avatar se adaptan a un formato utilizable en esa pantalla (constitución, sección "UI: Responsive").

---

### User Story 2 - Cerrar sesión desde cualquier página (Priority: P1)

Un usuario autenticado en el portal cierra su sesión desde el layout principal, sin importar en qué página se encuentre, y queda sin acceso a las páginas protegidas hasta volver a iniciar sesión.

**Why this priority**: Es una acción de seguridad básica esperada por cualquier usuario de una aplicación con sesión — sin un punto de cierre de sesión accesible, el usuario no tiene forma de finalizar su sesión de forma segura desde la interfaz.

**Independent Test**: Puede probarse iniciando sesión, cerrando sesión desde el layout, y verificando que un intento posterior de acceder a una página protegida redirige a la pantalla de inicio de sesión.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado en cualquier página del portal, **When** utiliza el control de cierre de sesión del layout principal, **Then** su sesión termina de inmediato.
2. **Given** una sesión recién cerrada, **When** el usuario intenta acceder de nuevo a una página protegida del portal (por ejemplo, usando el botón "atrás" del navegador), **Then** el sistema lo redirige a la pantalla de inicio de sesión.

---

### User Story 3 - El menú refleja lo que el usuario puede usar (Priority: P3)

Un Administrador que también usa el portal ve, además de las secciones disponibles para todo el personal, cualquier entrada de menú reservada a capacidades que solo su rol tiene, mientras que Contador y Auxiliar solo ven las entradas que sus capacidades permiten.

**Why this priority**: Evita confundir al usuario con enlaces a funciones que no puede usar, y sienta las bases de navegación para cuando existan más módulos de negocio con reglas de permiso propias — pero no bloquea el uso básico del layout (Historias 1 y 2), por lo que tiene menor prioridad.

**Independent Test**: Puede probarse iniciando sesión con distintos roles y verificando que las entradas de menú visibles corresponden exactamente a las capacidades de cada rol.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado con un rol que no tiene una capacidad determinada, **When** ve el menú de navegación, **Then** no aparece ninguna entrada asociada exclusivamente a esa capacidad.

---

### Edge Cases

- ¿Qué sucede si un usuario hace clic en una entrada de menú que corresponde a un módulo de negocio que todavía no existe? Esa entrada aparece marcada como "próximamente" y deshabilitada (no clickeable) — no lleva a ninguna página ni produce un error de navegación.
- ¿Qué sucede si la sesión expira mientras el usuario navega dentro del portal? El sistema debe redirigirlo a la pantalla de inicio de sesión en su siguiente solicitud, consistente con el comportamiento ya definido para el resto del portal.
- ¿Qué sucede si el usuario intenta cerrar sesión mientras la solicitud de cierre de sesión falla (por ejemplo, sin conexión)? El sistema debe mostrar un error y mantener la sesión activa hasta que el cierre de sesión se complete con éxito.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar un layout principal persistente (menú de navegación y avatar de perfil) en todas las páginas autenticadas de `apps/portal`.
- **FR-002**: El sistema DEBE mostrar en el avatar el nombre del usuario autenticado y su rol; si el usuario no tiene un nombre configurado, DEBE mostrar un valor de reemplazo razonable en su lugar.
- **FR-003**: El sistema DEBE ofrecer un control de cierre de sesión accesible desde el layout principal en cualquier página autenticada del portal.
- **FR-004**: Al usar el control de cierre de sesión, el sistema DEBE finalizar la sesión activa y redirigir al usuario a la pantalla de inicio de sesión.
- **FR-005**: El sistema DEBE impedir el acceso a páginas protegidas del portal inmediatamente después de cerrar sesión, redirigiendo a la pantalla de inicio de sesión en cualquier intento posterior.
- **FR-006**: El menú de navegación DEBE incluir una entrada para cada módulo de negocio descrito en la constitución del proyecto (Clientes, Cobranza, Expedientes Digitales, Recibos de Honorarios, Reportes), visibles pero marcados como "próximamente" y deshabilitados mientras esos módulos no estén implementados — comunica el alcance completo de la aplicación desde el primer momento, sin requerir cambios de navegación cuando cada módulo se construya (solo se habilita su entrada).
- **FR-007**: El menú de navegación DEBE mostrar el mismo conjunto de entradas a los 3 roles de personal (Administrador, Contador, Auxiliar) mientras ningún módulo de negocio defina capacidades propias que distingan entre ellos; el mecanismo de visualización DEBE apoyarse en las capacidades efectivas del usuario (ya resueltas por la feature `003-supabase-auth-roles`) para que, en cuanto un módulo futuro agregue una capacidad restringida a un rol, el menú la oculte automáticamente para los roles sin esa capacidad, sin requerir un cambio adicional en el layout.
- **FR-008**: El layout principal NO DEBE aplicarse a la pantalla de inicio de sesión (`/login`), que permanece independiente, sin menú ni avatar.
- **FR-009**: El layout principal DEBE ser utilizable en pantallas pequeñas (responsive), consistente con el resto de la aplicación.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: El 100% de las páginas autenticadas del portal muestran el mismo menú de navegación y avatar de perfil, sin páginas "huérfanas" sin layout.
- **SC-002**: Un usuario puede identificar con qué cuenta inició sesión (nombre/rol visibles en el avatar) en menos de 5 segundos desde que carga cualquier página del portal.
- **SC-003**: Un usuario puede cerrar sesión desde cualquier página del portal en 2 interacciones o menos.
- **SC-004**: El 100% de los intentos de acceder a una página protegida del portal justo después de cerrar sesión son redirigidos a la pantalla de inicio de sesión.

## Assumptions

- Esta feature cubre únicamente `apps/portal`; el layout de `apps/admin` (si requiere cambios similares) queda fuera de alcance y se atendería en una feature aparte.
- El layout principal es una capa de presentación (menú + avatar + cierre de sesión) sobre la autenticación y los roles ya construidos en la feature `003-supabase-auth-roles` (`requireApp`, `requireCapability`, `CurrentProfile`); esta feature no modifica esas reglas de autorización, solo las refleja visualmente.
- No se requiere una pantalla de edición de perfil como parte de esta feature — el avatar muestra información de solo lectura (nombre/rol); la gestión del propio perfil (cambiar nombre, foto, etc.) queda fuera de alcance.
- El cierre de sesión no requiere una confirmación adicional (no se considera una operación crítica destructiva en el sentido de la constitución) — se ejecuta de inmediato al usarse el control correspondiente.
- Los módulos de negocio futuros (Clientes, Cobranza, Expedientes Digitales, Recibos de Honorarios, Reportes) todavía no están implementados; esta feature no construye esas páginas, solo el andamiaje de navegación que eventualmente las alojará.
