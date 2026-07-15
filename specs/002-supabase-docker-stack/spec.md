# Feature Specification: Infraestructura Docker Autoalojada de Supabase

**Feature Branch**: `002-supabase-docker-stack`

**Created**: 2026-07-14

**Status**: Draft

**Input**: User description: "Creacion y configuracion de docker container para supabase, montar herramientas de base de datos, api, storage, volumenes, etc"

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Levantar el entorno de backend en el servidor del despacho (Priority: P1)

La persona responsable de infraestructura del despacho ejecuta un único procedimiento para levantar, en el servidor local del despacho, todo el backend necesario (base de datos, API, autenticación, almacenamiento de archivos) de forma autoalojada, sin depender de servicios en la nube, y con los datos persistidos de forma duradera en ese servidor.

**Why this priority**: Sin un entorno de backend autoalojado, funcional y persistente, ninguna aplicación (`admin`, `portal`) puede operar de forma independiente de servicios externos, lo cual es un requisito explícito del proyecto (control de la infraestructura y de los datos sensibles del despacho).

**Independent Test**: Puede probarse levantando el entorno desde cero en el servidor (o en una máquina equivalente), verificando que los servicios de base de datos, API, autenticación y almacenamiento quedan disponibles y responden correctamente, sin necesidad de que existan aún datos reales de clientes.

**Acceptance Scenarios**:

1. **Given** el servidor del despacho sin el entorno previamente levantado, **When** la persona de infraestructura ejecuta el procedimiento de arranque, **Then** los servicios de base de datos, API, autenticación y almacenamiento de archivos quedan corriendo y accesibles desde la red interna del despacho.
2. **Given** el entorno ya levantado con datos guardados, **When** el servidor se reinicia o los servicios se detienen y se vuelven a iniciar, **Then** los datos previamente almacenados (registros de base de datos y archivos) siguen disponibles sin pérdida.
3. **Given** el entorno levantado, **When** las aplicaciones `admin` y `portal` se configuran para apuntar a él, **Then** ambas aplicaciones pueden autenticar usuarios, leer/escribir datos y subir/descargar archivos correctamente.

---

### User Story 2 - Detener, reiniciar y actualizar el entorno sin pérdida de datos (Priority: P2)

La persona responsable de infraestructura puede detener y reiniciar el entorno completo (por mantenimiento, actualización de versión o reinicio del servidor) sin perder información ya almacenada, y puede verificar el estado de cada componente del backend.

**Why this priority**: Es una necesidad operativa recurrente una vez que el entorno ya existe (Historia 1), pero no bloquea la puesta en marcha inicial del sistema.

**Independent Test**: Puede probarse deteniendo el entorno, reiniciando el servidor o los contenedores, y verificando que los datos y archivos previamente guardados permanecen intactos y los servicios vuelven a estar disponibles.

**Acceptance Scenarios**:

1. **Given** el entorno corriendo con datos almacenados, **When** la persona de infraestructura detiene todos los servicios de forma controlada, **Then** ningún dato ni archivo almacenado se pierde.
2. **Given** el entorno detenido, **When** la persona de infraestructura lo vuelve a iniciar, **Then** todos los componentes (base de datos, API, autenticación, almacenamiento) recuperan su estado previo y quedan disponibles nuevamente.
3. **Given** el entorno corriendo, **When** la persona de infraestructura consulta el estado de los componentes, **Then** puede identificar claramente cuáles están funcionando correctamente y cuáles presentan fallas.

---

### User Story 3 - Respaldo y restauración de la información del despacho (Priority: P3)

La persona responsable de infraestructura puede generar una copia de respaldo completa de la información almacenada (base de datos y archivos) y restaurarla en caso de falla, pérdida de datos o necesidad de migrar a otro servidor.

**Why this priority**: Es crítico para la continuidad del negocio a mediano plazo, pero el entorno puede ponerse en operación inicial (Historias 1 y 2) antes de contar con un procedimiento de respaldo completamente probado, siempre que se resuelva antes de manejar datos reales de clientes en producción.

**Independent Test**: Puede probarse generando un respaldo del entorno con datos de prueba, provocando una pérdida simulada (por ejemplo, en un entorno separado) y restaurando el respaldo, verificando que la información se recupera completamente.

**Acceptance Scenarios**:

1. **Given** el entorno corriendo con datos almacenados, **When** la persona de infraestructura ejecuta el procedimiento de respaldo, **Then** se genera una copia que incluye tanto los datos de base de datos como los archivos almacenados.
2. **Given** una copia de respaldo previamente generada, **When** la persona de infraestructura ejecuta el procedimiento de restauración sobre un entorno nuevo o vacío, **Then** los datos y archivos quedan disponibles tal como estaban al momento del respaldo.

---

### Edge Cases

- ¿Qué sucede si el servidor del despacho se apaga de forma abrupta (corte de energía) mientras el entorno está en uso? Los datos ya confirmados/guardados no deben corromperse ni perderse.
- ¿Qué sucede si uno de los componentes del backend (por ejemplo, el servicio de almacenamiento) falla pero los demás siguen funcionando? El resto de los servicios debe seguir operando y el fallo debe ser detectable.
- ¿Qué sucede si el espacio de almacenamiento del servidor se agota? El sistema debe permitir detectar esta condición antes de que cause pérdida de datos.
- ¿Qué sucede si dos personas de infraestructura intentan levantar o modificar el entorno al mismo tiempo?
- ¿Qué sucede si se intenta acceder a los servicios del backend desde fuera de la red interna del despacho sin pasar por el mecanismo de administración remota segura?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: El sistema DEBE proveer, mediante contenedores, un entorno de backend autoalojado en el servidor del despacho que incluya: base de datos, servicio de API para acceso a datos, servicio de autenticación y servicio de almacenamiento de archivos.
- **FR-002**: El sistema DEBE persistir de forma duradera, mediante volúmenes de almacenamiento, tanto los datos de la base de datos como los archivos gestionados por el servicio de almacenamiento, de manera que sobrevivan a reinicios o detenciones del entorno.
- **FR-003**: El sistema DEBE permitir iniciar, detener y reiniciar el entorno completo mediante un procedimiento único y repetible, sin requerir pasos manuales distintos cada vez.
- **FR-004**: El sistema DEBE permitir verificar el estado de cada componente del backend (en ejecución, detenido, con fallas) de forma clara.
- **FR-005**: El sistema DEBE mantener el acceso a los servicios del backend restringido a la red interna del despacho o a conexiones administradas mediante el mecanismo de acceso remoto seguro ya definido para el proyecto (VPN/Tailscale), sin exponer los servicios directamente a Internet.
- **FR-006**: El sistema DEBE permitir configurar credenciales y parámetros sensibles (contraseñas, llaves de acceso) del entorno sin dejarlos escritos de forma fija dentro de los archivos versionados en el repositorio.
- **FR-007**: El sistema DEBE ejecutar automáticamente, sin intervención manual diaria, una copia de respaldo completa (base de datos y archivos) al menos una vez al día, conservando un histórico de al menos 30 días, además de permitir generar copias de respaldo bajo demanda y restaurarlas sobre un entorno nuevo.
- **FR-008**: El sistema DEBE permitir que las aplicaciones `admin` y `portal` se conecten al entorno autoalojado únicamente mediante configuración (sin cambios de código), de forma equivalente a como se conectan hoy al entorno de desarrollo local.

### Key Entities _(include if feature involves data)_

- **Entorno de backend**: Conjunto de servicios (base de datos, API, autenticación, almacenamiento) que operan de forma coordinada como una sola unidad desplegable.
- **Volumen de datos**: Espacio de almacenamiento persistente asociado a la base de datos o al servicio de archivos, independiente del ciclo de vida de los contenedores.
- **Copia de respaldo**: Snapshot completo de los datos y archivos del entorno en un momento dado, utilizable para restaurar el sistema.
- **Configuración/credenciales del entorno**: Parámetros sensibles (contraseñas, llaves) necesarios para operar el entorno, gestionados fuera del control de versiones.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: El entorno completo de backend puede levantarse desde cero en el servidor del despacho en menos de 15 minutos siguiendo el procedimiento documentado.
- **SC-002**: El 100% de los datos y archivos almacenados antes de un reinicio o detención controlada del entorno están disponibles después de reiniciarlo.
- **SC-003**: Una copia de respaldo generada puede restaurarse completamente en un entorno nuevo en menos de 30 minutos, con el 100% de los datos y archivos recuperados.
- **SC-004**: El estado de cada componente del backend puede verificarse por la persona de infraestructura en menos de 1 minuto, sin necesidad de inspeccionar manualmente cada servicio.
- **SC-005**: Ningún servicio del backend queda accesible directamente desde Internet fuera del mecanismo de acceso remoto seguro definido, verificado mediante pruebas de exposición de red.
- **SC-006**: Tras 30 días de operación continua, existe un respaldo completo correspondiente a cada uno de esos días, sin huecos, generado sin intervención manual diaria.

## Assumptions

- El entorno descrito en esta especificación corresponde a la infraestructura autoalojada de producción/operación real en el servidor local del despacho, distinta y complementaria al flujo de desarrollo local ya existente basado en la CLI de Supabase (usado por el equipo de desarrollo en sus propias máquinas).
- Existe un único servidor del despacho como destino de este entorno para el alcance inicial; el soporte para múltiples entornos (por ejemplo, staging separado de producción) podrá evaluarse como una mejora futura si el despacho lo requiere.
- La estrategia de respaldo sigue la política ya definida a nivel de proyecto: respaldo automático diario de la base de datos y del almacenamiento de documentos, con una retención mínima de 30 días y capacidad de restaurar un respaldo completo (ver constitución del proyecto, sección "Backups automáticos"). El procedimiento de respaldo/restauración bajo demanda (Historia 3) complementa, pero no reemplaza, esta automatización diaria.
- El acceso remoto seguro (VPN o Tailscale) mencionado en la visión del proyecto ya existe o se gestiona fuera del alcance de esta especificación; aquí solo se asume como restricción de que el backend no debe exponerse directamente a Internet.
- El volumen de datos esperado (clientes, expedientes, archivos) corresponde a la escala de un despacho contable individual, sin requerimientos de alta disponibilidad multi-servidor.
