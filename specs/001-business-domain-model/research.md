# Research: Modelo de Dominios de Negocio — Seguimiento de Ajustes Pendientes

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Decisión 1: Redacción propuesta para la lista de módulos de la Constitución

**Decisión**: Proponer el siguiente reemplazo de la lista de módulos bajo "Arquitectura de la Aplicación" → "Los módulos principales serán" en `.specify/memory/constitution.md`:

Redacción actual:

```text
Clientes
Cobranza
Expedientes Digitales
Recibos de Honorarios
Reportes
Usuarios
Auditoría
Configuración
```

Redacción propuesta:

```text
Clientes
Servicios
Cobranza (incluye Recibos de Honorarios)
Gestión Fiscal (Obligaciones y Periodos Fiscales)
Gestión Documental Fiscal (Expedientes Digitales)
Notificaciones
Reportes y Analítica
Usuarios
Auditoría
Configuración
```

**Rationale**: Alinea la lista con los 8 dominios de `001-business-domain-model` sin perder ningún módulo existente: "Expedientes Digitales" pasa a ser el nombre entre paréntesis de "Gestión Documental Fiscal" (mismo módulo, nombre de dominio más amplio); "Recibos de Honorarios" se declara explícitamente dentro de "Cobranza" (ya se generan automáticamente a partir de los pagos — `005` research.md Decisión 3 — sin lógica de negocio propia separada, ver spec.md Actualizaciones Pendientes #3); "Reportes" se renombra a "Reportes y Analítica" para igualar el nombre del dominio. "Usuarios" y "Configuración" se conservan sin cambios — son módulos de administración del sistema, no dominios de negocio, y `001-business-domain-model` (Assumptions) ya declara que reutiliza el modelo de roles/capacidades existente sin introducir uno nuevo por dominio.

**Alternatives considered**: Reemplazar la lista completa por los 8 nombres exactos de dominio (sin "Usuarios"/"Configuración") — rechazado porque esos dos módulos existen y se usan (`003-supabase-auth-roles`, panel de usuarios de `apps/admin`) y no tienen equivalente entre los 8 dominios de negocio; quitarlos de la Constitución sería una pérdida de información, no una alineación. Dejar la lista sin cambios — rechazado porque es precisamente la desalineación que `001` pidió registrar como actualización pendiente.

**Estado**: Aplicada el 2026-07-17 en `.specify/memory/constitution.md`, tras confirmación explícita del equipo (gate de Constitution Check en plan.md satisfecho).

## Decisión 2: Los ajustes de Servicios y Gestión Fiscal quedan diferidos, no se diseñan aquí

**Decisión**: Los puntos 1 y 2 de "Actualizaciones Pendientes en Specs Existentes" (catálogo de Servicios detrás de `cargos_cobranza.concepto`; relación de `documentos` con un futuro Periodo Fiscal) no se resuelven ni se diseñan en este plan. Se registra únicamente el disparador: deben abordarse cuando se escriba `/speckit-specify` para Gestión de Servicios y para Gestión Fiscal, respectivamente, siguiendo el orden de dependencias ya declarado en `spec.md` (Clientes → Servicios → Gestión Fiscal → Gestión Documental → Cobranza → Notificaciones → Portal del Cliente → Reportes).

**Rationale**: Diseñar el esquema de Servicios o de Periodos Fiscales ahora violaría el límite que el propio `001-business-domain-model` se puso (FR-014: no define esquema de base de datos) y adelantaría decisiones que le corresponden al spec funcional de cada dominio, antes de que ese spec exista. Mantiene el principio de FR-013 (no reemplazar decisiones existentes sin justificar) al no tocar el esquema ya construido de `cargos_cobranza`/`documentos`.

**Alternatives considered**: Diseñar ya el esquema de Servicios como parte de este plan, ya que es información que probablemente se necesitará pronto — rechazado porque este spec es explícitamente de alcance conceptual, y adelantar el diseño sin su propio spec funcional (con sus propias historias de usuario, edge cases y criterios de éxito) se saltaría el proceso que el propio proyecto sigue para cada módulo.

## Decisión 3: Notificaciones no requiere ninguna acción de seguimiento

**Decisión**: No se registra ninguna tarea de seguimiento para el dominio de Notificaciones en este plan.

**Rationale**: Confirmado en la encuesta de specs existentes (ver spec.md, Actualizaciones Pendientes #4) que no existe spec, tabla, ni código de envío de notificaciones/correo en el proyecto — es un dominio enteramente nuevo sin una decisión previa que ajustar. Su primera decisión de diseño le corresponde a su propio spec funcional futuro.
