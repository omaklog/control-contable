# Feature Specification: Infraestructura Base del Monorepo

**Feature Branch**: `001-monorepo-base-setup`

**Created**: 2026-07-13

**Status**: Draft

**Input**: User description: "inicializar infraestructura base del proyecto - monorepo para el sistema contable con apps/portal, apps/admin, paquetes compartidos, herramientas de calidad, contenedores, variables de entorno y CI básica"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Configuración del Entorno Local (Priority: P1)

Un desarrollador nuevo puede configurar su entorno local de desarrollo completo con un número mínimo de pasos, teniendo ambas aplicaciones (portal y panel administrativo) corriendo localmente en minutos.

**Why this priority**: Sin un entorno local funcional, ningún trabajo de desarrollo puede comenzar. Es el prerrequisito absoluto de todo lo demás y determina la velocidad de incorporación de nuevos colaboradores.

**Independent Test**: Se puede verificar de forma independiente clonando el repositorio en una máquina limpia y ejecutando los comandos de inicialización. Si ambas aplicaciones inician correctamente y los paquetes compartidos están disponibles, el criterio se cumple.

**Acceptance Scenarios**:

1. **Given** un desarrollador con las herramientas base instaladas (gestor de paquetes, contenedores), **When** clona el repositorio y ejecuta el comando de instalación de dependencias, **Then** todas las dependencias se instalan sin errores en un solo comando desde la raíz del proyecto.
2. **Given** las dependencias instaladas y variables de entorno configuradas, **When** ejecuta el comando de inicio del entorno, **Then** ambas aplicaciones (portal y admin) quedan disponibles en puertos locales distintos y la base de datos local está corriendo.
3. **Given** el entorno corriendo, **When** se modifica un componente del paquete compartido, **Then** los cambios se reflejan automáticamente en ambas aplicaciones sin reiniciar el servidor.

---

### User Story 2 - Calidad de Código Automatizada (Priority: P2)

Un desarrollador que intenta registrar cambios con código que no cumple los estándares del proyecto es automáticamente notificado y el registro es bloqueado hasta corregir los problemas.

**Why this priority**: La consistencia del código desde el primer día evita deuda técnica acumulada. La automatización elimina la dependencia de revisiones manuales para este aspecto y garantiza un estándar uniforme independientemente del desarrollador.

**Independent Test**: Se puede verificar intentando registrar cambios con código que viola las reglas de formato o análisis estático. El sistema debe bloquear el registro y mostrar los errores específicos.

**Acceptance Scenarios**:

1. **Given** un archivo con errores de formato, **When** el desarrollador intenta registrar los cambios, **Then** la operación es rechazada con un mensaje claro indicando qué archivos tienen problemas y cómo corregirlos.
2. **Given** un archivo con errores de análisis estático de código, **When** el desarrollador intenta registrar los cambios, **Then** la operación es rechazada y se muestran los errores específicos con su ubicación.
3. **Given** código que cumple todos los estándares del proyecto, **When** el desarrollador registra los cambios, **Then** la operación se completa exitosamente.

---

### User Story 3 - Variables de Entorno Gestionadas de Forma Segura (Priority: P2)

Un desarrollador puede configurar las credenciales y variables de entorno del sistema mediante archivos de ejemplo documentados, sin riesgo de exponer información sensible al repositorio.

**Why this priority**: La gestión inadecuada de credenciales representa un riesgo de seguridad crítico para un sistema que maneja información fiscal confidencial. El mecanismo debe hacer imposible commitear secretos por accidente.

**Independent Test**: Se puede verificar revisando que el repositorio contiene archivos de ejemplo documentados pero no valores reales, y que intentar incluir un archivo con credenciales reales es bloqueado automáticamente.

**Acceptance Scenarios**:

1. **Given** el repositorio recién clonado, **When** un desarrollador revisa la documentación de configuración, **Then** encuentra archivos de ejemplo con todas las variables necesarias documentadas y descritas.
2. **Given** un archivo de configuración local con credenciales reales, **When** el desarrollador intenta incluirlo en el repositorio, **Then** el sistema bloquea la operación automáticamente.
3. **Given** las variables configuradas localmente, **When** la aplicación inicia, **Then** se establece correctamente la conexión con la base de datos y los servicios requeridos; si faltan variables obligatorias, la aplicación falla con un mensaje descriptivo indicando cuáles.

---

### User Story 4 - Integración Continua Básica (Priority: P3)

Al integrar cambios al repositorio remoto, el sistema ejecuta automáticamente verificaciones de calidad para garantizar que el código integrado cumple los estándares del proyecto antes de ser aceptado.

**Why this priority**: La integración continua protege al equipo de introducir código defectuoso en la rama principal, especialmente relevante cuando múltiples desarrolladores colaboran simultáneamente.

**Independent Test**: Se puede verificar abriendo una solicitud de integración con código válido y confirmando que el pipeline ejecuta y reporta el resultado de las verificaciones.

**Acceptance Scenarios**:

1. **Given** una solicitud de integración abierta, **When** el sistema de CI ejecuta, **Then** se verifican formato, análisis estático y compilación del código, reportando el resultado claramente.
2. **Given** una solicitud con errores de compilación, **When** el sistema de CI ejecuta, **Then** el pipeline falla y reporta los errores específicos con suficiente contexto para corregirlos.
3. **Given** una solicitud que pasa todas las verificaciones, **When** el sistema de CI termina, **Then** se marca como lista para revisión humana.

---

### Edge Cases

- ¿Qué ocurre si un paquete compartido tiene un error de compilación? Ambas aplicaciones deben fallar con un mensaje claro apuntando al paquete origen, no con un error genérico.
- ¿Qué pasa si la base de datos local no inicia? La aplicación debe mostrar un error descriptivo en lugar de simplemente no cargar o fallar silenciosamente.
- ¿Qué sucede si las variables de entorno obligatorias no están configuradas al iniciar la aplicación? El sistema debe fallar explícitamente con la lista de variables faltantes.
- ¿Qué pasa si dos aplicaciones requieren versiones distintas de un paquete compartido? El sistema de gestión del monorepo debe resolver este conflicto sin intervención manual.
- ¿Qué ocurre si el pipeline de CI falla por un error de infraestructura (no del código)? El sistema debe diferenciar entre fallo del código y fallo del entorno de CI.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El entorno de desarrollo DEBE poder iniciarse con el mínimo de comandos posibles desde un repositorio recién clonado, sin requerir configuración manual de rutas o dependencias internas.
- **FR-002**: El sistema DEBE organizar el código en dos aplicaciones independientes (portal y panel administrativo) que comparten paquetes comunes sin duplicar código.
- **FR-003**: Los paquetes compartidos (componentes de interfaz, tipos, utilidades, configuración) DEBEN estar disponibles para ambas aplicaciones sin pasos de publicación adicionales.
- **FR-004**: El sistema DEBE ejecutar verificaciones automáticas de formato y análisis estático de código antes de registrar cada cambio en el repositorio local.
- **FR-005**: El sistema DEBE impedir que archivos de configuración con credenciales o variables de entorno reales sean incluidos en el repositorio de forma inadvertida.
- **FR-006**: El entorno local DEBE incluir la base de datos y servicios de infraestructura corriendo de forma aislada, reproducible e independiente del sistema operativo anfitrión.
- **FR-007**: El pipeline de integración continua DEBE ejecutar verificaciones de calidad automáticamente al integrar cambios al repositorio remoto.
- **FR-008**: Los archivos de ejemplo de variables de entorno DEBEN documentar todas las variables requeridas por cada aplicación con su propósito y formato esperado.
- **FR-009**: Los cambios en paquetes compartidos DEBEN reflejarse en ambas aplicaciones durante el desarrollo sin pasos manuales adicionales.
- **FR-010**: El sistema DEBE detectar y reportar errores de tipos en el código antes de que puedan integrarse al repositorio, tanto localmente como en el pipeline de CI.
- **FR-011**: La estructura del monorepo DEBE facilitar la incorporación de nuevas aplicaciones o paquetes sin modificar la configuración global existente.

### Key Entities

- **Aplicación Portal**: Aplicación web principal para uso del personal del despacho en operaciones diarias (clientes, expedientes, cobranza, reportes).
- **Panel Administrativo**: Aplicación web independiente para configuración del sistema, gestión de usuarios, roles, permisos, catálogos y auditoría.
- **Paquetes Compartidos**: Colección de módulos reutilizables (componentes de interfaz, tipos de datos, utilidades, configuración base) accesibles por ambas aplicaciones.
- **Entorno de Infraestructura Local**: Conjunto de servicios (base de datos, almacenamiento) necesarios para el funcionamiento del sistema en desarrollo.
- **Pipeline de CI**: Proceso automatizado que verifica la calidad del código al integrar cambios al repositorio remoto.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Un desarrollador nuevo puede tener el entorno completamente funcional en menos de 15 minutos desde la primera vez que clona el repositorio, sin asistencia adicional.
- **SC-002**: El 100% de los registros de cambios en el repositorio local pasan por verificaciones automáticas de calidad antes de ser aceptados.
- **SC-003**: Los cambios en un paquete compartido se reflejan en ambas aplicaciones en menos de 5 segundos durante el desarrollo, sin reiniciar el servidor.
- **SC-004**: El pipeline de integración continua completa su ejecución en menos de 10 minutos para verificar la calidad del código.
- **SC-005**: No es posible incluir archivos de credenciales o variables de entorno reales en el repositorio de forma inadvertida (bloqueo 100% efectivo).
- **SC-006**: El 100% de los errores de tipos son detectados antes de integrar cambios, tanto en el entorno local como en el pipeline de CI.
- **SC-007**: Agregar una nueva aplicación o paquete al monorepo requiere menos de 30 minutos de configuración inicial por parte de un desarrollador familiarizado con el proyecto.

## Assumptions

- Los desarrolladores tienen instaladas previamente las herramientas base requeridas (gestor de paquetes de Node.js, motor de contenedores compatible con Docker Compose) antes de iniciar la configuración.
- El sistema operativo principal de desarrollo es macOS o Linux; el soporte para Windows queda fuera del alcance de esta versión inicial.
- La tecnología de base de datos y servicios backend es Supabase (PostgreSQL), según lo definido en la Constitución del proyecto.
- El monorepo contendrá únicamente dos aplicaciones en esta versión inicial: portal y panel administrativo.
- El pipeline de CI básico cubre verificaciones de calidad (formato, análisis estático, compilación y tipos); las pruebas automatizadas son responsabilidad de features posteriores específicas de cada módulo.
- El despliegue automático (CD) no forma parte del alcance de esta infraestructura inicial.
- La plataforma de control de versiones remota (para CI) es responsabilidad del equipo seleccionar; la infraestructura de CI debe ser compatible con las plataformas más comunes.
- Los paquetes compartidos no requieren publicación en un registro externo; se consumen directamente dentro del monorepo.
