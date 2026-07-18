# Feature Specification: Autenticación y Roles con Supabase

**Feature Branch**: `003-supabase-auth-roles`

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Authenticacion implementada mediante supabase, Objetivo: Implementar el sistema de authenticacion con las herramientas de supabase, generando roles y permisos necesarios"

## Clarifications

### Session 2026-07-15

- Q: ¿El nuevo flujo de contraseña temporal administrada por un Administrador reemplaza SOLO el restablecimiento de contraseña de cuentas existentes, o también el alta de cuentas nuevas (invitación, Historia 3)? → A: Solo el restablecimiento de cuentas existentes; el alta de cuentas nuevas (invitación) sigue usando el envío de correo nativo de Supabase Auth, sin cambios. **Superada más abajo en esta misma sesión**: el alta de cuentas nuevas también dejó de usar invitación por correo (ver la clarificación sobre "creación manual sin invitación").
- Q: ¿Cómo debe el sistema obligar el cambio de contraseña tras iniciar sesión con la contraseña temporal? → A: Columna `must_change_password` (booleana) en `public.profiles`, protegida por RLS (solo un Administrador/el propio flujo de cambio la modifica), verificada por un guard de sesión que redirige obligatoriamente a la pantalla de cambio de contraseña antes de cualquier otra página mientras siga en `true`.
- Q: ¿Cómo se define la contraseña temporal que el Administrador entrega al usuario? → A: Generada por el sistema (aleatoria, con buena entropía) y mostrada una sola vez en pantalla al Administrador para que la comunique al usuario por el medio que prefiera (no por correo).
- Q: ¿Cómo debe funcionar la "creación manual sin invitación" de una cuenta nueva? → A: El Administrador captura correo y rol; el sistema genera una contraseña temporal aleatoria (mismo mecanismo que FR-008/FR-013), se muestra una sola vez en pantalla, y el usuario debe establecer una nueva contraseña en su primer inicio de sesión. Sin invitación ni correo electrónico de por medio.
- Q: Al eliminar la invitación por correo, ¿qué pasa con la entidad "Invitación de cuenta" (tabla `account_invitations`, con expiración/estado pendiente-aceptada)? → A: Se elimina el concepto por completo: la cuenta queda activa de inmediato al crearse, sin estado "pendiente"/"expira".
- Q: Al quitar el rol Cliente, ¿qué pasa con la Historia 2 (portal de clientes) y `apps/portal`? → A: `apps/portal` se repropone de inmediato como una segunda aplicación para el personal del despacho (mismos 3 roles que admin), consistente con la Constitución del proyecto ("Portal: aplicación... utilizada por el personal del despacho"). Ya no existe el concepto de cuenta "cliente" ni de `account_type` (personal/cliente): todas las cuentas son de personal.
- Q: ¿Cómo se restringe el acceso entre `apps/admin` y `apps/portal` para los 3 roles de personal? → A: `apps/admin` es exclusiva del rol Administrador; `apps/portal` es accesible para Administrador, Contador y Auxiliar. El sistema de permisos (más allá de esta regla de acceso por app) se gestiona por usuario individual desde `apps/admin`.
- Q: ¿Qué tan granular debe ser la gestión de permisos por usuario? → A: Cada rol sigue definiendo una plantilla de capacidades por defecto; un Administrador puede activar/desactivar capacidades individuales para un usuario específico por encima de esa plantilla (ajuste por excepción, no reemplazo total del modelo por rol).

### Session 2026-07-16

- Q: ¿El campo "Nombre completo" en el formulario de alta de cuenta (Crear cuenta) debe ser obligatorio u opcional? → A: Obligatorio — el Administrador no puede crear la cuenta sin capturarlo, para que la tabla de usuarios nunca muestre el identificador interno como respaldo.
- Q: ¿El botón de mostrar/ocultar contraseña debe aplicarse solo al inicio de sesión, o también al formulario de establecer nueva contraseña? → A: A ambos formularios (inicio de sesión y establecer nueva contraseña) — misma mejora de UX aplicada de forma consistente a cualquier campo de contraseña del sistema.
- Q: ¿Dónde debe vivir el espacio para el logo — solo en el formulario de login, o también en el layout principal del portal? → A: En ambos: el formulario de inicio de sesión (`LoginForm`, compartido por ambas apps) y el `AppBar` del layout principal de `apps/portal` (feature 004-portal-main-layout), junto al título "Portal de Control Contable".
- Q: Para las cuentas ya existentes (creadas antes de que el nombre fuera obligatorio), ¿cómo debe un Administrador editar su "Nombre completo"? → A: Mediante un diálogo dedicado por fila (mismo patrón que "Permisos"/"Contraseña temporal"), no edición en línea.
- Q: ¿Cómo debe obtenerse el correo electrónico para la nueva columna de la tabla de Cuentas, dado que `profiles` no lo almacena? → A: Consulta server-side con `service_role` en la página (Server Component), combinando por `id` con `auth.users` — sin duplicar el dato en `profiles`.

### Session 2026-07-17 (alineación con `001-business-domain-model` y `docs/ux/design-system.md`)

- Contexto: `001-business-domain-model` corrigió la Constitución a 8 módulos de negocio (Clientes, Servicios, Cobranza, Gestión Fiscal, Gestión Documental Fiscal, Notificaciones, Reportes y Analítica, más Usuarios/Auditoría/Configuración) y su reporte de impacto (`specs/001-business-domain-model/impact-report.md`) detectó varios puntos de esta feature que nunca se actualizaron tras esa corrección ni tras la publicación de `docs/ux/design-system.md`: la descripción de alcance por rol (FR-003) sigue usando nomenclatura de módulos previa a `001`; `packages/auth/src/roles.ts` ya expone capacidades (`manage_billing`/`view_billing`, `manage_documents`/`view_documents`) para Cobranza y Gestión Documental Fiscal antes de que esos módulos existan, sin que ningún documento de esta feature lo mencione (impact-report, hallazgo F1); y `manage_catalogs` existe en código y en la UI de Permisos sin ningún consumidor (hallazgo F3).
- Q: ¿Se actualiza FR-003 a la nomenclatura de módulos de `001`, o se deja como estaba? → A: Se actualiza la redacción a los nombres canónicos vigentes (ver FR-003), sin agregar permisos nuevos ni cambiar el detalle fino por rol — sigue siendo ilustrativo/diferido a especificación técnica futura, como ya establecían las Assumptions originales.
- Q: La pantalla/capacidad "Auditoría" (`view_auth_audit_log`) nace en esta feature — ¿se documenta aquí su distinción respecto a la futura "Auditoría de negocio" de Cliente 360 (`docs/ux/design-system.md` §9.1, ya usada por `business_audit_log` en `005`)? → A: Sí — se agrega una nota explícita en FR-009 aclarando que ambos conceptos coexisten con el mismo nombre corto pero orígenes y datos distintos; misma resolución ya adoptada del lado de `004-portal-main-layout` (sin renombrar la pantalla existente).
- Q: `manage_catalogs` no tiene ningún consumidor — ¿a qué módulo se asigna? → A: Se deja explícitamente sin dueño/diferido en Assumptions (ambigua entre Configuración y un futuro catálogo de Servicios) — quien especifique cualquiera de los dos deberá reclamarla antes de reutilizarla; no es una decisión de esta sesión.
- Q: El Edge Case sobre múltiples intentos fallidos de inicio de sesión (posible fuerza bruta) nunca tuvo respuesta desde la redacción original — ¿cómo lo maneja el sistema? → A: Se apoya en el rate-limiting/throttling ya incorporado en Supabase Auth (GoTrue) para los endpoints de autenticación — sin lógica de bloqueo de cuenta propia, sin campo de datos nuevo (contador de intentos) y sin FR nuevo; resuelve el Edge Case dentro del alcance ya existente.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Acceso del personal del despacho por rol y aplicación (Priority: P1)

Un miembro del personal del despacho inicia sesión con su correo y contraseña. Si es Administrador, puede entrar tanto al Panel Administrativo (admin) como al Portal (operación diaria); si es Contador o Auxiliar, solo puede entrar al Portal. Dentro de cada aplicación, ve únicamente las secciones y acciones que su rol (y los ajustes individuales que un Administrador le haya configurado) le permiten.

**Why this priority**: Sin autenticación funcional y control de acceso por rol y por aplicación, ninguna otra funcionalidad del sistema (clientes, cobranza, expedientes) puede protegerse. Es la base de seguridad de todo el producto.

**Independent Test**: Puede probarse creando usuarios con distintos roles, iniciando sesión con cada uno en admin y en portal, y verificando que solo Administrador entra a admin, los 3 roles entran a portal, y cada uno ve/usa solo las funciones permitidas para su rol, sin necesidad de que existan aún los módulos de clientes o cobranza.

**Acceptance Scenarios**:

1. **Given** un usuario con rol "Administrador" y credenciales válidas, **When** inicia sesión en admin, **Then** accede exitosamente y tiene visibilidad de todas las funciones administrativas, incluida la gestión de usuarios, roles y permisos.
2. **Given** un usuario con rol "Administrador" y credenciales válidas, **When** inicia sesión en portal, **Then** accede exitosamente (Administrador también puede usar la aplicación operativa).
3. **Given** un usuario con rol "Contador" o "Auxiliar" y credenciales válidas, **When** intenta iniciar sesión en admin, **Then** el sistema le deniega el acceso, ya que esa aplicación es exclusiva del rol Administrador.
4. **Given** un usuario con rol "Contador" o "Auxiliar" y credenciales válidas, **When** inicia sesión en portal, **Then** accede exitosamente y ve/usa únicamente las funciones que corresponden a su rol (y a los ajustes individuales de permisos que le haya configurado un Administrador).
5. **Given** un usuario autenticado, **When** intenta acceder directamente (por URL) a una función no permitida para su rol, **Then** el sistema le deniega el acceso y muestra un mensaje de "no autorizado".
6. **Given** un usuario con credenciales inválidas, **When** intenta iniciar sesión, **Then** el sistema rechaza el acceso y muestra un mensaje de error genérico sin revelar si el correo existe.
7. **Given** un usuario capturando su contraseña en el formulario de inicio de sesión, **When** activa el control de mostrar/ocultar contraseña, **Then** puede ver u ocultar el texto que escribió, sin que eso afecte el resultado del envío del formulario.

---

### User Story 2 - Ajuste de permisos individuales por usuario (Priority: P2)

Un Administrador, desde el Panel Administrativo, ajusta las capacidades específicas de un usuario de personal (Contador o Auxiliar) por encima de la plantilla por defecto de su rol — por ejemplo, otorgarle a un Auxiliar en particular una capacidad que normalmente no tiene, sin cambiar el rol de ese usuario ni afectar a los demás usuarios con el mismo rol.

**Why this priority**: Depende de que ya exista el modelo de roles y capacidades (Historia 1), pero es independiente en cuanto a su propia lógica (excepciones por usuario) y puede verificarse por separado.

**Independent Test**: Puede probarse creando dos usuarios con el mismo rol, ajustando una capacidad individual solo para uno de ellos, e iniciando sesión con ambos para confirmar que el ajuste aplica únicamente al usuario modificado.

**Acceptance Scenarios**:

1. **Given** un Administrador autenticado, **When** activa o desactiva una capacidad específica para un usuario Contador o Auxiliar, **Then** ese ajuste aplica de inmediato para ese usuario en portal, sin afectar a otros usuarios con el mismo rol.
2. **Given** un usuario con un ajuste individual de permisos vigente, **When** su rol cambia, **Then** el ajuste individual anterior se descarta y el usuario adopta la plantilla de capacidades por defecto de su nuevo rol.
3. **Given** un usuario que no es Administrador, **When** intenta ajustar permisos (los propios o los de otro usuario), **Then** el sistema le deniega el acceso.

---

### User Story 3 - Gestión de usuarios, roles y permisos (Priority: P3)

Un Administrador crea nuevas cuentas de personal de forma manual (captura nombre completo, correo y rol; sin proceso de invitación por correo electrónico), les asigna un rol, y puede modificar o revocar ese rol (o desactivar la cuenta) cuando cambian las responsabilidades de esa persona. También puede asignarle una contraseña temporal a una cuenta existente cuando el usuario la haya olvidado, sin depender de un proveedor de correo electrónico para ello.

**Why this priority**: Es necesaria para operar el sistema en el día a día (alta de nuevos empleados, bajas, cambios de rol), pero el sistema puede lanzarse con un primer conjunto de usuarios creado manualmente mientras esta gestión se completa, por lo que tiene menor prioridad que el acceso seguro en sí.

**Independent Test**: Puede probarse con un usuario Administrador realizando altas, cambios de rol y bajas de otras cuentas, y verificando que los cambios se reflejan inmediatamente en los permisos efectivos de esas cuentas.

**Acceptance Scenarios**:

1. **Given** un Administrador autenticado, **When** crea manualmente una cuenta nueva (nombre completo, correo y rol, sin invitación por correo) para un miembro del personal, **Then** el sistema genera una contraseña temporal que se muestra una sola vez en pantalla al Administrador; la nueva cuenta puede iniciar sesión con ella, es obligada a establecer una nueva contraseña antes de continuar (mismo mecanismo que Acceptance Scenario 5), y su acceso corresponde exactamente al rol asignado.
2. **Given** un Administrador autenticado, **When** intenta crear una cuenta nueva sin capturar el nombre completo, **Then** el sistema rechaza el formulario y no crea la cuenta hasta que ese campo se complete.
3. **Given** un Administrador autenticado, **When** cambia el rol de un usuario existente, **Then** los permisos efectivos de ese usuario cambian de inmediato (a más tardar en su siguiente acción o al refrescar su sesión).
4. **Given** un Administrador autenticado, **When** desactiva la cuenta de un usuario, **Then** ese usuario no puede iniciar sesión y cualquier sesión activa que tuviera deja de tener acceso.
5. **Given** un usuario que no es Administrador, **When** intenta acceder a las funciones de gestión de usuarios/roles, **Then** el sistema le deniega el acceso.
6. **Given** un Administrador autenticado, **When** genera y asigna una contraseña temporal a un usuario existente, **Then** el sistema la genera automáticamente (sin enviar ningún correo), la muestra una sola vez en pantalla, y ese usuario puede iniciar sesión con ella pero es obligado de inmediato a establecer una nueva contraseña antes de poder acceder a cualquier otra función.
7. **Given** un Administrador autenticado, **When** edita el nombre completo de una cuenta existente (incluida una creada antes de que este campo fuera obligatorio) mediante el diálogo dedicado, **Then** la tabla de gestión de usuarios muestra el nuevo nombre para esa cuenta en vez de su identificador interno.
8. **Given** un Administrador autenticado, **When** consulta la tabla de gestión de usuarios, **Then** ve el correo electrónico de cada cuenta en una columna dedicada.
9. **Given** un Administrador autenticado, **When** consulta el registro de auditoría de autenticación, **Then** ve la bitácora de eventos registrados por FR-009 (inicios/cierres de sesión, fallos de inicio de sesión, cambios de rol y de estado activo/inactivo), consistente con SC-006 — esta bitácora es de acceso/autenticación, distinta de cualquier futuro registro de auditoría de negocio por cliente (ver FR-009).

---

### Edge Cases

- ¿Qué sucede si a un usuario se le revoca o cambia el rol mientras tiene una sesión activa? El acceso a las funciones ya no permitidas debe bloquearse en la siguiente solicitud, sin esperar a que la sesión expire por completo.
- ¿Qué sucede si un usuario con rol Contador o Auxiliar intenta iniciar sesión en el Panel Administrativo (admin)? El sistema le deniega el acceso, ya que esa aplicación es exclusiva del rol Administrador.
- ¿Qué sucede con los ajustes individuales de permisos de un usuario cuando su rol cambia? Se descartan; el usuario adopta la plantilla de capacidades por defecto de su nuevo rol, sin conservar ajustes heredados del rol anterior.
- ¿Cómo maneja el sistema múltiples intentos fallidos de inicio de sesión consecutivos (posible ataque de fuerza bruta)? El sistema se apoya en el rate-limiting/throttling ya incorporado en Supabase Auth (GoTrue) para los endpoints de autenticación — no implementa bloqueo de cuenta propio ni contador de intentos fallidos adicional (ver Clarifications, sesión 2026-07-17).
- ¿Qué sucede si un Administrador desactiva o elimina su propia cuenta, o la de todos los demás Administradores, dejando al sistema sin ningún usuario con ese rol?
- ¿Qué sucede si un usuario olvida su contraseña? Un Administrador le asigna una contraseña temporal generada por el sistema (sin depender de correo electrónico); al iniciar sesión con ella, el usuario debe establecer una nueva contraseña antes de poder usar cualquier otra función.
- ¿Qué sucede si un usuario con una contraseña temporal pendiente de cambio intenta navegar directamente a cualquier otra sección (por URL)? El sistema debe redirigirlo obligatoriamente a la pantalla de cambio de contraseña hasta que la complete.
- ¿Qué sucede con las cuentas creadas antes de que el nombre completo fuera obligatorio? Un Administrador puede completarlo en cualquier momento mediante el diálogo "Editar nombre" (FR-018); hasta que lo haga, la tabla de usuarios sigue mostrando el identificador interno como respaldo para esa cuenta.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema DEBE permitir a los usuarios autenticarse (iniciar y cerrar sesión) mediante correo electrónico y contraseña.
- **FR-002**: El sistema DEBE restringir el acceso a la aplicación admin (Panel Administrativo) exclusivamente al rol Administrador; la aplicación portal (operación diaria) DEBE ser accesible para los roles Administrador, Contador y Auxiliar.
- **FR-003**: El sistema DEBE soportar los siguientes roles de personal con sus permisos asociados: **Administrador** (acceso total, incluida la gestión de usuarios, roles y permisos individuales), **Contador** (gestión operativa de los módulos de negocio del despacho — Clientes, Servicios, Cobranza, Gestión Fiscal, Gestión Documental Fiscal, según la Constitución del proyecto y `001-business-domain-model` — sin gestión de usuarios/roles) y **Auxiliar** (consulta y captura de información operativa en esos mismos módulos, sin capacidad de eliminar registros ni gestionar usuarios). No existe un rol "Cliente": todas las cuentas del sistema son de personal del despacho. El detalle fino de qué capacidad exacta corresponde a cada módulo de negocio queda diferido a la especificación de cada módulo (ver Assumptions) — esta feature solo expone las primitivas (`Capability`, plantilla por rol, ajustes individuales) que esos módulos futuros consumen.
- **FR-005**: El sistema DEBE impedir que un usuario ejecute o visualice cualquier acción/función no permitida para su rol, tanto en la interfaz como en el acceso directo a datos.
- **FR-006**: El sistema DEBE permitir que únicamente los usuarios con rol Administrador creen cuentas nuevas, asignen o cambien roles, y activen o desactiven cuentas de otros usuarios.
- **FR-007**: El sistema DEBE revocar de forma inmediata (en la siguiente solicitud del usuario) el acceso a funciones cuando su rol cambia o su cuenta se desactiva.
- **FR-008**: El sistema DEBE permitir que un Administrador asigne, en cualquier momento, una contraseña temporal generada por el propio sistema a una cuenta de personal existente, sin depender de un proveedor de correo electrónico (SMTP) para esta operación.
- **FR-009**: El sistema DEBE registrar los eventos de autenticación relevantes (inicios de sesión exitosos y fallidos, cierres de sesión, cambios de rol, activación/desactivación de cuentas) con fines de auditoría, y DEBE permitir a un Administrador consultar esa bitácora (capacidad `view_auth_audit_log`, ver Acceptance Scenario 9 de la Historia 3). Esta es una **auditoría de acceso/autenticación** — un concepto distinto de cualquier futura "auditoría de negocio" por cliente (altas, pagos, documentos; `docs/ux/design-system.md` §9.1 la ubica como pestaña de Cliente 360, ya con datos reales en `business_audit_log` desde `005-clientes-cobranza-expedientes`). Ambos conceptos pueden coexistir con el mismo nombre corto ("Auditoría") en la interfaz sin ser el mismo registro ni la misma pantalla.
- **FR-010**: El sistema DEBE impedir el autoregistro público de cuentas; toda cuenta de personal se crea exclusivamente mediante alta manual realizada por un Administrador (captura de correo y rol), sin proceso de invitación por correo electrónico. El sistema genera una contraseña temporal para la cuenta nueva, que el Administrador entrega al usuario y que este debe cambiar en su primer inicio de sesión (mismo mecanismo que FR-008/FR-013).
- **FR-011**: El sistema DEBE garantizar que exista siempre al menos una cuenta activa con rol Administrador, impidiendo que se desactive o degrade la última cuenta con ese rol.
- **FR-012**: El sistema DEBE mostrar mensajes de error genéricos ante intentos de inicio de sesión fallidos, sin revelar si el correo ingresado corresponde a una cuenta existente.
- **FR-013**: El sistema DEBE obligar a todo usuario que inicie sesión con una contraseña temporal asignada por un Administrador a establecer una nueva contraseña antes de permitirle acceder a cualquier otra función o página del sistema.
- **FR-014**: El sistema DEBE permitir que un Administrador active o desactive capacidades específicas para un usuario individual, por encima de la plantilla de capacidades por defecto de su rol, sin afectar a otros usuarios con el mismo rol.
- **FR-015**: El sistema DEBE requerir que un Administrador capture el nombre completo del usuario al crear una cuenta nueva; este campo es obligatorio y el alta no puede completarse sin él.
- **FR-016**: El sistema DEBE permitir a los usuarios alternar la visibilidad del texto que escriben en cualquier campo de contraseña (mostrar/ocultar), tanto en el formulario de inicio de sesión como en el de establecer una nueva contraseña.
- **FR-017**: El sistema DEBE reservar un espacio visual para el logotipo del despacho en el formulario de inicio de sesión y en el encabezado del layout principal de `apps/portal`; mientras no exista un logotipo real, DEBE mostrarse un marcador de posición sin bloquear el uso de la aplicación.
- **FR-018**: El sistema DEBE permitir que un Administrador edite el nombre completo de una cuenta existente (mediante un diálogo dedicado, por fila), incluidas las cuentas creadas antes de que este campo fuera obligatorio.
- **FR-019**: El sistema DEBE mostrar el correo electrónico de cada cuenta como una columna en la tabla de gestión de usuarios.

### Key Entities _(include if feature involves data)_

- **Usuario**: Cuenta de autenticación individual (nombre completo obligatorio y editable por un Administrador, correo, estado activo/inactivo, indicador de "debe cambiar su contraseña" pendiente). Representa a un miembro del personal del despacho — ya no existe una distinción de tipo de cuenta "cliente"/"personal": todas las cuentas son de personal.
- **Rol**: Conjunto de permisos por defecto con nombre (Administrador, Contador, Auxiliar) que determina qué acciones puede realizar un usuario.
- **Permiso**: Acción concreta sobre un recurso del sistema (por ejemplo, "ver expediente", "editar cobranza", "gestionar usuarios") que se agrupa dentro de un rol.
- **Asignación Usuario-Rol**: Relación entre un Usuario y el Rol que tiene vigente en un momento dado, incluyendo historial de cambios de rol.
- **Ajuste de permisos por usuario**: Excepción puntual (activar/desactivar) de una capacidad específica para un Usuario determinado, por encima de la plantilla de su Rol; solo la crea/modifica un Administrador, y se descarta cuando el rol del usuario cambia.
- **Registro de auditoría de autenticación**: Bitácora de eventos de acceso (inicio/cierre de sesión, fallos, cambios de rol/estado) asociada a un Usuario.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Un usuario con credenciales válidas puede iniciar sesión y llegar a la pantalla principal de su aplicación (admin o portal) en menos de 10 segundos.
- **SC-002**: El 100% de los intentos de acceso a funciones no autorizadas para un rol son bloqueados en pruebas de control de acceso, incluido el 100% de los intentos de Contador/Auxiliar de acceder a la aplicación admin.
- **SC-003**: Un Administrador puede dar de alta manualmente una nueva cuenta de personal (sin invitación por correo) y asignarle un rol en menos de 3 minutos, sin soporte técnico.
- **SC-004**: Un cambio de rol o desactivación de cuenta realizado por un Administrador surte efecto en el acceso del usuario afectado en menos de 1 minuto.
- **SC-005**: Un Administrador puede generar y entregar una contraseña temporal a un usuario en menos de 1 minuto, sin depender de ningún proceso de correo electrónico; el 100% de los inicios de sesión realizados con una contraseña temporal resultan en que el usuario deba establecer una nueva contraseña antes de acceder a cualquier otra función.
- **SC-006**: El 100% de los eventos de autenticación relevantes (login, logout, fallos, cambios de rol/estado) quedan registrados y son consultables para auditoría.
- **SC-007**: Un Administrador puede ajustar una capacidad específica para un usuario individual en menos de 1 minuto, y ese ajuste aplica de inmediato para ese usuario sin afectar a otros usuarios con el mismo rol.
- **SC-008**: El 100% de las cuentas creadas a partir de esta actualización muestran su nombre completo en la tabla de gestión de usuarios — ninguna cuenta nueva vuelve a mostrar el identificador interno como respaldo.
- **SC-009**: Un Administrador puede editar el nombre completo de una cuenta existente en menos de 1 minuto, y el cambio se refleja de inmediato en la tabla de gestión de usuarios.

## Assumptions

- Las aplicaciones `admin` y `portal` del monorepo sirven ambas al personal interno del despacho: `admin` (Panel Administrativo) es exclusiva del rol Administrador, para administración del sistema (usuarios, roles, permisos individuales, auditoría); `portal` es la aplicación operativa diaria (clientes, cobranza, expedientes — módulos futuros), accesible para los 3 roles de personal (Administrador, Contador, Auxiliar), consistente con la Constitución del proyecto. Ya no existe el concepto de cuenta "cliente" como usuario del sistema: los clientes del despacho (personas/empresas atendidas) seguirán existiendo como datos de negocio gestionados por el personal dentro de `portal`, no como cuentas con acceso propio — su modelado queda fuera del alcance de esta feature de autenticación.
- Los roles de personal (Administrador, Contador, Auxiliar) siguen la estructura jerárquica típica de un despacho contable descrita en la visión del proyecto (administración de clientes, cobranza y expedientes fiscales); el detalle fino de permisos por rol podrá refinarse en la fase de planeación técnica.
- No se requiere autenticación multifactor (MFA) obligatoria para el alcance inicial de esta funcionalidad; puede añadirse como mejora futura si un análisis de riesgo posterior lo requiere.
- El autoregistro público está deshabilitado: todas las cuentas de personal se crean por alta manual directa de un Administrador (sin invitación por correo electrónico).
- Cuando el rol de un usuario cambia, cualquier ajuste individual de permisos que tuviera previamente se descarta; el usuario adopta el conjunto de capacidades por defecto de su nuevo rol.
- Las políticas de contraseña (longitud mínima, complejidad) siguen las prácticas estándar de la industria para aplicaciones web con datos sensibles, sin requisitos adicionales especificados.
- La duración y renovación de sesión sigue el comportamiento estándar de una aplicación web (sesión persistente con renovación automática, invalidada al cerrar sesión o al revocar/cambiar el rol del usuario).
- El restablecimiento de contraseña (FR-008/FR-013) y el alta de cuentas nuevas (FR-010) ya no dependen de un proveedor de correo (SMTP): ambos son flujos administrados exclusivamente por un Administrador, con contraseña temporal generada por el sistema y cambio obligatorio en el siguiente inicio de sesión. Ya no existe el concepto de invitación con expiración/estado pendiente-aceptada.
- El nombre completo (FR-015) es obligatorio al crear cuentas nuevas; para las cuentas ya existentes sin nombre, un Administrador puede completarlo en cualquier momento mediante el diálogo de edición (FR-018) — no hay una migración automática de datos (ver Edge Cases).
- El correo electrónico (FR-019) se obtiene en el momento de renderizar la tabla de gestión de usuarios mediante una consulta server-side con `service_role` (nunca expuesta al navegador), sin duplicar el dato en `profiles` — consistente con que `profiles` nunca ha almacenado credenciales ni datos que ya viven en `auth.users`.
- El logotipo real del despacho todavía no existe (FR-017): el espacio reservado en el formulario de login y en el `AppBar` de `apps/portal` usa un marcador de posición (un SVG simple o una referencia de imagen que no resuelve) hasta que se proporcione el archivo definitivo; sustituirlo no debería requerir cambios de layout.
- El cambio del `AppBar` de `apps/portal` (FR-017) es un ajuste puntual sobre un componente ya construido por la feature `004-portal-main-layout` (`MainLayoutClient`), no una reapertura completa de esa feature.
- **(2026-07-17)** `packages/auth/src/roles.ts` ya expone `manage_billing`/`view_billing` y `manage_documents`/`view_documents`, asignadas por rol (Contador: gestión + consulta; Auxiliar: solo consulta) desde esta misma feature, antes de que existan los módulos Cobranza y Gestión Documental Fiscal — un adelanto intencional de las primitivas de capacidad, no un error. Cuando esos módulos se especifiquen (o al construir sus placeholders de navegación, como ya hizo `004-portal-main-layout` Rework #2), DEBEN reusar estas capacidades en vez de crear nombres nuevos.
- **(2026-07-17)** Servicios, Gestión Fiscal y Notificaciones (`001-business-domain-model`) no tienen ninguna capacidad definida todavía (ni `manage_services`/`view_services` ni equivalente) — quien especifique cualquiera de esos dominios deberá nombrar y agregar sus propias capacidades de forma aditiva a `Capability`, sin remover las ya existentes.
- **(2026-07-17)** `manage_catalogs` existe en `Capability` y ya es ajustable desde la UI de Permisos (`apps/admin/usuarios`), pero ningún módulo la consume todavía — es ambigua entre un futuro módulo de **Configuración** (catálogos ya existentes: régimen fiscal, categorías de documento) y un futuro catálogo de **Servicios**. Queda explícitamente sin dueño: quien especifique cualquiera de los dos deberá reclamarla antes de reutilizarla, para no terminar con dos dominios gateados por la misma capacidad sin relación real entre sí.
- **(2026-07-17)** `docs/ux/design-system.md` es la fuente de verdad de reglas UX del proyecto (publicada después de que esta feature construyera `apps/admin/usuarios`) y aplica sin excepción a esa pantalla. Dos reglas generales quedan pendientes de aplicar ahí (sin cambio de alcance funcional, solo presentación) — ya registradas en `docs/ux/design-system.md` §10 junto con los gaps análogos de Clientes: acciones de fila visibles solo al hover (§5) y la columna "Estado" como Chip semántico en vez de texto plano (§4).
- **(2026-07-17)** La protección contra intentos fallidos de inicio de sesión repetidos (fuerza bruta) no se implementa como lógica propia de esta feature — se confía en el rate-limiting/throttling ya incorporado en Supabase Auth (GoTrue) para sus endpoints de autenticación. Si un análisis de riesgo posterior determina que no es suficiente, un bloqueo de cuenta propio (con contador de intentos y ventana de tiempo) quedaría como mejora futura, análoga a la MFA ya diferida más arriba.
