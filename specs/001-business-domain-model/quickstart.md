# Quickstart: Modelo de Dominios de Negocio — Seguimiento de Ajustes Pendientes

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Data Model**: [data-model.md](./data-model.md)

**Prerequisitos**: Ninguno de infraestructura — esta validación es documental, no requiere Supabase local ni las apps corriendo.

## Escenario 1 — La lista de módulos de la Constitución queda alineada (una vez confirmada y aplicada)

1. Abre `.specify/memory/constitution.md`, sección "Arquitectura de la Aplicación".
2. Confirma que la lista de módulos coincide con la redacción propuesta en `research.md` Decisión 1 (incluye Servicios, Gestión Fiscal, Notificaciones; conserva Usuarios/Configuración; pliega Expedientes Digitales y Recibos de Honorarios dentro de sus dominios).
3. Confirma que ningún otro archivo del repositorio (specs, comentarios de migraciones, documentación) referenciaba "Expedientes Digitales" o "Recibos de Honorarios" como módulos independientes de forma que la nueva redacción los contradiga.

## Escenario 2 — El disparador de Servicios y Gestión Fiscal queda documentado

1. Abre `specs/001-business-domain-model/spec.md`, sección "Actualizaciones Pendientes en Specs Existentes".
2. Confirma que los puntos #1 (Servicios) y #2 (Gestión Fiscal/Documental) siguen presentes y sin aplicar — ningún esquema de `cargos_cobranza` o `documentos` fue modificado por este plan.
3. Cuando llegue el momento de escribir `/speckit-specify` para Gestión de Servicios o Gestión Fiscal (siguiendo el orden de `spec.md`), confirma que ese spec referencia explícitamente el punto correspondiente de esta lista antes de diseñar su esquema.

## Escenario 3 — Notificaciones no arrastra ningún ajuste falso

1. Confirma que no se creó ninguna tarea, tabla ni archivo relacionado con Notificaciones como parte de este plan (research.md Decisión 3).
