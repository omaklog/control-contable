# Feature Specification: Layout Principal (Portal y Panel Administrativo)

**Feature Branch**: `004-portal-main-layout`

**Created**: 2026-07-15

**Status**: Draft

**Input**: User description: "Layout principal de el portal: Objetivo crear el layout principal con el menu, avatar de perfil botones de cierre de sesion"

## Clarifications

### Session 2026-07-16

- Q: El layout principal (Drawer/AppBar + menú + avatar + cierre de sesión) hoy vive solo dentro de `apps/portal` — si ahora también lo necesita `apps/admin`, ¿cómo se construye? → A: Se promueve a un paquete compartido (`packages/ui`), parametrizado por `title` y por la lista de items de menú de cada app; ambas apps consumen el mismo componente, cada una define su propio `navigation.ts`.
- Q: El menú de `apps/portal` lista de entrada todos los módulos de negocio de la constitución, aunque no estén construidos (marcados "Próximamente"). ¿El menú de `apps/admin` debe hacer lo mismo con sus propios módulos futuros (Catálogos, Configuración)? → A: No — el menú de `apps/admin` solo lista lo ya implementado (Inicio, Usuarios, Clientes, Auditoría); no se agregan marcadores "Próximamente" para módulos administrativos aún no especificados.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Navegación y perfil visibles en toda la app (Priority: P1)

Un miembro del personal del despacho que ya inició sesión, tanto en `apps/portal` (Administrador, Contador o Auxiliar) como en `apps/admin` (Administrador), navega entre distintas secciones de esa app y, en todo momento, ve el mismo menú de navegación y su propio avatar de perfil (nombre y rol), sin importar en qué página se encuentre.

**Why this priority**: Es la base visual y de navegación de ambas aplicaciones; sin ella, cada página quedaría aislada y el usuario no tendría una forma consistente de moverse por el sistema ni de confirmar con qué cuenta inició sesión.

**Independent Test**: Puede probarse iniciando sesión en cada app (los 3 roles en `apps/portal`, Administrador en `apps/admin`) y verificando que el menú y el avatar aparecen de forma idéntica y consistente en cada página autenticada de esa app.

**Acceptance Scenarios**:

1. **Given** un usuario de personal autenticado en `apps/portal` o `apps/admin`, **When** navega a cualquier página autenticada de esa app, **Then** ve el menú de navegación y su avatar de perfil en un lugar consistente de la pantalla.
2. **Given** un usuario autenticado sin nombre configurado en su perfil, **When** el layout muestra su avatar, **Then** se ve un valor de reemplazo razonable (por ejemplo, iniciales derivadas de su correo) en vez de un espacio vacío o roto.
3. **Given** un usuario autenticado en un dispositivo de pantalla pequeña, **When** carga cualquier página autenticada de `apps/portal` o `apps/admin`, **Then** el menú y el avatar se adaptan a un formato utilizable en esa pantalla (constitución, sección "UI: Responsive").
4. **Given** el menú de `apps/admin`, **When** el Administrador lo consulta, **Then** ve únicamente las entradas de los módulos ya implementados ahí (Inicio, Usuarios, Clientes, Auditoría) — sin marcadores "Próximamente" para módulos administrativos futuros aún no especificados.

---

### User Story 2 - Cerrar sesión desde cualquier página (Priority: P1)

Un usuario autenticado en `apps/portal` o `apps/admin` cierra su sesión desde el layout principal de esa app, sin importar en qué página se encuentre, y queda sin acceso a las páginas protegidas hasta volver a iniciar sesión.

**Why this priority**: Es una acción de seguridad básica esperada por cualquier usuario de una aplicación con sesión — sin un punto de cierre de sesión accesible, el usuario no tiene forma de finalizar su sesión de forma segura desde la interfaz.

**Independent Test**: Puede probarse iniciando sesión, cerrando sesión desde el layout, y verificando que un intento posterior de acceder a una página protegida redirige a la pantalla de inicio de sesión — en cualquiera de las dos apps.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado en cualquier página de `apps/portal` o `apps/admin`, **When** utiliza el control de cierre de sesión del layout principal, **Then** su sesión termina de inmediato.
2. **Given** una sesión recién cerrada, **When** el usuario intenta acceder de nuevo a una página protegida de esa app (por ejemplo, usando el botón "atrás" del navegador), **Then** el sistema lo redirige a la pantalla de inicio de sesión.

---

### User Story 3 - El menú refleja lo que el usuario puede usar (Priority: P3)

Un Administrador que también usa el portal ve, además de las secciones disponibles para todo el personal, cualquier entrada de menú reservada a capacidades que solo su rol tiene, mientras que Contador y Auxiliar solo ven las entradas que sus capacidades permiten. En `apps/admin`, cada entrada del menú (Usuarios, Clientes, Auditoría) también se oculta si el Administrador no tiene la capacidad correspondiente (por ejemplo, tras un ajuste individual de permisos).

**Why this priority**: Evita confundir al usuario con enlaces a funciones que no puede usar, y sienta las bases de navegación para cuando existan más módulos de negocio con reglas de permiso propias — pero no bloquea el uso básico del layout (Historias 1 y 2), por lo que tiene menor prioridad.

**Independent Test**: Puede probarse iniciando sesión con distintos roles/capacidades y verificando que las entradas de menú visibles corresponden exactamente a las capacidades efectivas del usuario, en cada app.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado con un rol que no tiene una capacidad determinada, **When** ve el menú de navegación, **Then** no aparece ninguna entrada asociada exclusivamente a esa capacidad.

---

### Edge Cases

- ¿Qué sucede si un usuario hace clic en una entrada de menú que corresponde a un módulo de negocio que todavía no existe? Esa entrada aparece marcada como "próximamente" y deshabilitada (no clickeable) — no lleva a ninguna página ni produce un error de navegación.
- ¿Qué sucede si la sesión expira mientras el usuario navega dentro del portal? El sistema debe redirigirlo a la pantalla de inicio de sesión en su siguiente solicitud, consistente con el comportamiento ya definido para el resto del portal.
- ¿Qué sucede si el usuario intenta cerrar sesión mientras la solicitud de cierre de sesión falla (por ejemplo, sin conexión)? El sistema debe mostrar un error y mantener la sesión activa hasta que el cierre de sesión se complete con éxito.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar un layout principal persistente (menú de navegación y avatar de perfil) en todas las páginas autenticadas de `apps/portal` **y de `apps/admin`**.
- **FR-002**: El sistema DEBE mostrar en el avatar el nombre del usuario autenticado y su rol; si el usuario no tiene un nombre configurado, DEBE mostrar un valor de reemplazo razonable en su lugar.
- **FR-003**: El sistema DEBE ofrecer un control de cierre de sesión accesible desde el layout principal en cualquier página autenticada de cada app.
- **FR-004**: Al usar el control de cierre de sesión, el sistema DEBE finalizar la sesión activa y redirigir al usuario a la pantalla de inicio de sesión de esa misma app.
- **FR-005**: El sistema DEBE impedir el acceso a páginas protegidas de cada app inmediatamente después de cerrar sesión, redirigiendo a la pantalla de inicio de sesión en cualquier intento posterior.
- **FR-006**: El menú de navegación de `apps/portal` DEBE incluir una entrada para cada módulo de negocio descrito en la constitución del proyecto (Clientes, Cobranza, Expedientes Digitales, Recibos de Honorarios, Reportes), visibles pero marcados como "próximamente" y deshabilitados mientras esos módulos no estén implementados — comunica el alcance completo de la aplicación desde el primer momento, sin requerir cambios de navegación cuando cada módulo se construya (solo se habilita su entrada). El menú de `apps/admin` NO sigue esta regla: solo lista los módulos ya implementados (Inicio, Usuarios, Clientes, Auditoría), sin marcadores "Próximamente" (ver Clarifications).
- **FR-007**: El menú de navegación de `apps/portal` DEBE mostrar el mismo conjunto de entradas a los 3 roles de personal (Administrador, Contador, Auxiliar) mientras ningún módulo de negocio defina capacidades propias que distingan entre ellos; el de `apps/admin` DEBE mostrar solo las entradas para las que el usuario tiene la capacidad correspondiente. En ambas apps, el mecanismo de visualización DEBE apoyarse en las capacidades efectivas del usuario (ya resueltas por la feature `003-supabase-auth-roles`) para que un módulo futuro con una capacidad restringida oculte automáticamente su entrada a quien no la tenga, sin requerir un cambio adicional en el layout.
- **FR-008**: El layout principal NO DEBE aplicarse a las pantallas de inicio de sesión (`/login`), "no autorizado" y cambio de contraseña obligatorio de ninguna de las dos apps, que permanecen independientes, sin menú ni avatar.
- **FR-009**: El layout principal DEBE ser utilizable en pantallas pequeñas (responsive), consistente con el resto de la aplicación.
- **FR-010**: El componente de layout principal (menú, avatar, cierre de sesión) DEBE implementarse una sola vez como código compartido (`packages/ui`), parametrizado por el título de la app y su propia lista de entradas de menú; `apps/portal` y `apps/admin` NO DEBEN mantener implementaciones duplicadas de este componente (ver Clarifications).

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: El 100% de las páginas autenticadas de `apps/portal` y de `apps/admin` muestran el mismo menú de navegación (propio de cada app) y avatar de perfil, sin páginas "huérfanas" sin layout.
- **SC-002**: Un usuario puede identificar con qué cuenta inició sesión (nombre/rol visibles en el avatar) en menos de 5 segundos desde que carga cualquier página autenticada de cualquiera de las dos apps.
- **SC-003**: Un usuario puede cerrar sesión desde cualquier página autenticada de cualquiera de las dos apps en 2 interacciones o menos.
- **SC-004**: El 100% de los intentos de acceder a una página protegida justo después de cerrar sesión son redirigidos a la pantalla de inicio de sesión de esa app.

## Assumptions

- **(Actualizado, ver Clarifications)** Esta feature cubre tanto `apps/portal` como `apps/admin`. El componente de layout se comparte vía `packages/ui`; cada app mantiene su propia lista de entradas de menú (`apps/portal/src/components/layout/navigation.ts` y `apps/admin/src/components/layout/navigation.ts`) y su propio título.
- El layout principal es una capa de presentación (menú + avatar + cierre de sesión) sobre la autenticación y los roles ya construidos en la feature `003-supabase-auth-roles` (`requireApp`, `requireCapability`, `CurrentProfile`); esta feature no modifica esas reglas de autorización, solo las refleja visualmente. Al centralizar `requireApp('admin')` en un layout de `apps/admin` (mismo patrón ya usado en `apps/portal`, research.md #2), se corrige además una inconsistencia existente: las páginas de `apps/admin` llamaban `requireCapability(...)` directamente sin verificar primero el acceso a la app, dejando abierta la posibilidad teórica de que un `permission_override` le diera a un Contador/Auxiliar una capacidad administrativa sin que `canAccessApp` lo bloqueara.
- No se requiere una pantalla de edición de perfil como parte de esta feature — el avatar muestra información de solo lectura (nombre/rol); la gestión del propio perfil (cambiar nombre, foto, etc.) queda fuera de alcance.
- El cierre de sesión no requiere una confirmación adicional (no se considera una operación crítica destructiva en el sentido de la constitución) — se ejecuta de inmediato al usarse el control correspondiente.
- Los módulos de negocio futuros de `apps/portal` (Clientes, Cobranza, Expedientes Digitales, Recibos de Honorarios, Reportes) todavía no están implementados ahí; esta feature no construye esas páginas, solo el andamiaje de navegación que eventualmente las alojará. `apps/admin` no lista módulos futuros en su menú (ver Clarifications) porque, a diferencia del portal, sus módulos futuros (Catálogos, Configuración) aún no están ni siquiera especificados.
