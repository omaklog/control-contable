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

Un Administrador crea nuevas cuentas de personal de forma manual (captura correo y rol; sin proceso de invitación por correo electrónico), les asigna un rol, y puede modificar o revocar ese rol (o desactivar la cuenta) cuando cambian las responsabilidades de esa persona. También puede asignarle una contraseña temporal a una cuenta existente cuando el usuario la haya olvidado, sin depender de un proveedor de correo electrónico para ello.

**Why this priority**: Es necesaria para operar el sistema en el día a día (alta de nuevos empleados, bajas, cambios de rol), pero el sistema puede lanzarse con un primer conjunto de usuarios creado manualmente mientras esta gestión se completa, por lo que tiene menor prioridad que el acceso seguro en sí.

**Independent Test**: Puede probarse con un usuario Administrador realizando altas, cambios de rol y bajas de otras cuentas, y verificando que los cambios se reflejan inmediatamente en los permisos efectivos de esas cuentas.

**Acceptance Scenarios**:

1. **Given** un Administrador autenticado, **When** crea manualmente una cuenta nueva (correo y rol, sin invitación por correo) para un miembro del personal, **Then** el sistema genera una contraseña temporal que se muestra una sola vez en pantalla al Administrador; la nueva cuenta puede iniciar sesión con ella, es obligada a establecer una nueva contraseña antes de continuar (mismo mecanismo que Acceptance Scenario 5), y su acceso corresponde exactamente al rol asignado.
2. **Given** un Administrador autenticado, **When** cambia el rol de un usuario existente, **Then** los permisos efectivos de ese usuario cambian de inmediato (a más tardar en su siguiente acción o al refrescar su sesión).
3. **Given** un Administrador autenticado, **When** desactiva la cuenta de un usuario, **Then** ese usuario no puede iniciar sesión y cualquier sesión activa que tuviera deja de tener acceso.
4. **Given** un usuario que no es Administrador, **When** intenta acceder a las funciones de gestión de usuarios/roles, **Then** el sistema le deniega el acceso.
5. **Given** un Administrador autenticado, **When** genera y asigna una contraseña temporal a un usuario existente, **Then** el sistema la genera automáticamente (sin enviar ningún correo), la muestra una sola vez en pantalla, y ese usuario puede iniciar sesión con ella pero es obligado de inmediato a establecer una nueva contraseña antes de poder acceder a cualquier otra función.

---

### Edge Cases

- ¿Qué sucede si a un usuario se le revoca o cambia el rol mientras tiene una sesión activa? El acceso a las funciones ya no permitidas debe bloquearse en la siguiente solicitud, sin esperar a que la sesión expire por completo.
- ¿Qué sucede si un usuario con rol Contador o Auxiliar intenta iniciar sesión en el Panel Administrativo (admin)? El sistema le deniega el acceso, ya que esa aplicación es exclusiva del rol Administrador.
- ¿Qué sucede con los ajustes individuales de permisos de un usuario cuando su rol cambia? Se descartan; el usuario adopta la plantilla de capacidades por defecto de su nuevo rol, sin conservar ajustes heredados del rol anterior.
- ¿Cómo maneja el sistema múltiples intentos fallidos de inicio de sesión consecutivos (posible ataque de fuerza bruta)?
- ¿Qué sucede si un Administrador desactiva o elimina su propia cuenta, o la de todos los demás Administradores, dejando al sistema sin ningún usuario con ese rol?
- ¿Qué sucede si un usuario olvida su contraseña? Un Administrador le asigna una contraseña temporal generada por el sistema (sin depender de correo electrónico); al iniciar sesión con ella, el usuario debe establecer una nueva contraseña antes de poder usar cualquier otra función.
- ¿Qué sucede si un usuario con una contraseña temporal pendiente de cambio intenta navegar directamente a cualquier otra sección (por URL)? El sistema debe redirigirlo obligatoriamente a la pantalla de cambio de contraseña hasta que la complete.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema DEBE permitir a los usuarios autenticarse (iniciar y cerrar sesión) mediante correo electrónico y contraseña.
- **FR-002**: El sistema DEBE restringir el acceso a la aplicación admin (Panel Administrativo) exclusivamente al rol Administrador; la aplicación portal (operación diaria) DEBE ser accesible para los roles Administrador, Contador y Auxiliar.
- **FR-003**: El sistema DEBE soportar los siguientes roles de personal con sus permisos asociados: **Administrador** (acceso total, incluida la gestión de usuarios, roles y permisos individuales), **Contador** (gestión operativa de clientes, cobranza y expedientes, sin gestión de usuarios/roles) y **Auxiliar** (consulta y captura de información operativa, sin capacidad de eliminar registros ni gestionar usuarios). No existe un rol "Cliente": todas las cuentas del sistema son de personal del despacho.
- **FR-005**: El sistema DEBE impedir que un usuario ejecute o visualice cualquier acción/función no permitida para su rol, tanto en la interfaz como en el acceso directo a datos.
- **FR-006**: El sistema DEBE permitir que únicamente los usuarios con rol Administrador creen cuentas nuevas, asignen o cambien roles, y activen o desactiven cuentas de otros usuarios.
- **FR-007**: El sistema DEBE revocar de forma inmediata (en la siguiente solicitud del usuario) el acceso a funciones cuando su rol cambia o su cuenta se desactiva.
- **FR-008**: El sistema DEBE permitir que un Administrador asigne, en cualquier momento, una contraseña temporal generada por el propio sistema a una cuenta de personal existente, sin depender de un proveedor de correo electrónico (SMTP) para esta operación.
- **FR-009**: El sistema DEBE registrar los eventos de autenticación relevantes (inicios de sesión exitosos y fallidos, cierres de sesión, cambios de rol, activación/desactivación de cuentas) con fines de auditoría.
- **FR-010**: El sistema DEBE impedir el autoregistro público de cuentas; toda cuenta de personal se crea exclusivamente mediante alta manual realizada por un Administrador (captura de correo y rol), sin proceso de invitación por correo electrónico. El sistema genera una contraseña temporal para la cuenta nueva, que el Administrador entrega al usuario y que este debe cambiar en su primer inicio de sesión (mismo mecanismo que FR-008/FR-013).
- **FR-011**: El sistema DEBE garantizar que exista siempre al menos una cuenta activa con rol Administrador, impidiendo que se desactive o degrade la última cuenta con ese rol.
- **FR-012**: El sistema DEBE mostrar mensajes de error genéricos ante intentos de inicio de sesión fallidos, sin revelar si el correo ingresado corresponde a una cuenta existente.
- **FR-013**: El sistema DEBE obligar a todo usuario que inicie sesión con una contraseña temporal asignada por un Administrador a establecer una nueva contraseña antes de permitirle acceder a cualquier otra función o página del sistema.
- **FR-014**: El sistema DEBE permitir que un Administrador active o desactive capacidades específicas para un usuario individual, por encima de la plantilla de capacidades por defecto de su rol, sin afectar a otros usuarios con el mismo rol.

### Key Entities _(include if feature involves data)_

- **Usuario**: Cuenta de autenticación individual (correo, estado activo/inactivo, indicador de "debe cambiar su contraseña" pendiente). Representa a un miembro del personal del despacho — ya no existe una distinción de tipo de cuenta "cliente"/"personal": todas las cuentas son de personal.
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

## Assumptions

- Las aplicaciones `admin` y `portal` del monorepo sirven ambas al personal interno del despacho: `admin` (Panel Administrativo) es exclusiva del rol Administrador, para administración del sistema (usuarios, roles, permisos individuales, auditoría); `portal` es la aplicación operativa diaria (clientes, cobranza, expedientes — módulos futuros), accesible para los 3 roles de personal (Administrador, Contador, Auxiliar), consistente con la Constitución del proyecto. Ya no existe el concepto de cuenta "cliente" como usuario del sistema: los clientes del despacho (personas/empresas atendidas) seguirán existiendo como datos de negocio gestionados por el personal dentro de `portal`, no como cuentas con acceso propio — su modelado queda fuera del alcance de esta feature de autenticación.
- Los roles de personal (Administrador, Contador, Auxiliar) siguen la estructura jerárquica típica de un despacho contable descrita en la visión del proyecto (administración de clientes, cobranza y expedientes fiscales); el detalle fino de permisos por rol podrá refinarse en la fase de planeación técnica.
- No se requiere autenticación multifactor (MFA) obligatoria para el alcance inicial de esta funcionalidad; puede añadirse como mejora futura si un análisis de riesgo posterior lo requiere.
- El autoregistro público está deshabilitado: todas las cuentas de personal se crean por alta manual directa de un Administrador (sin invitación por correo electrónico).
- Cuando el rol de un usuario cambia, cualquier ajuste individual de permisos que tuviera previamente se descarta; el usuario adopta el conjunto de capacidades por defecto de su nuevo rol.
- Las políticas de contraseña (longitud mínima, complejidad) siguen las prácticas estándar de la industria para aplicaciones web con datos sensibles, sin requisitos adicionales especificados.
- La duración y renovación de sesión sigue el comportamiento estándar de una aplicación web (sesión persistente con renovación automática, invalidada al cerrar sesión o al revocar/cambiar el rol del usuario).
- El restablecimiento de contraseña (FR-008/FR-013) y el alta de cuentas nuevas (FR-010) ya no dependen de un proveedor de correo (SMTP): ambos son flujos administrados exclusivamente por un Administrador, con contraseña temporal generada por el sistema y cambio obligatorio en el siguiente inicio de sesión. Ya no existe el concepto de invitación con expiración/estado pendiente-aceptada.
