# Quickstart: Validación del Alta de Cliente desde el Portal (con listado y filtros)

**Feature**: [spec.md](./spec.md) | **Data Model**: [data-model.md](./data-model.md) | **Contracts**: [contracts/server-actions.md](./contracts/server-actions.md)

Esta guía valida, contra `apps/portal` corriendo con Supabase local, la versión ampliada de esta feature (tabla + filtros + modal). Requiere un usuario Contador o Administrador (capacidad `manage_clients`) y un usuario Auxiliar (capacidad `view_clients`) — reutilizar el seed de `003-supabase-auth-roles`.

## Prerrequisitos

1. Stack local levantado (`supabase start`) con las migraciones de `005-clientes-cobranza-expedientes` aplicadas.
2. `apps/portal` corriendo (`pnpm --filter @control-contable/portal dev`).
3. Sembrar más clientes de los que caben en una página directamente vía SQL, para poder validar paginación y filtro (ver `006-crud-clientes-admin/quickstart.md` para el formato de inserción).

## Escenario 1 — Consultar y filtrar el listado (US1)

1. Iniciar sesión como Contador, Administrador o Auxiliar; abrir "Clientes" desde el menú del portal.
2. **Esperado**: se ve una tabla con los clientes activos, paginada si hay más de los que caben en una página (FR-001).
3. Escribir en el filtro de nombre/RFC un texto que coincida con un cliente conocido. **Esperado**: la tabla se reduce a los clientes cuyo nombre o RFC coincide (FR-002).
4. Escribir un texto que no coincida con ningún cliente. **Esperado**: estado vacío claro, sin error.
5. Activar el filtro "Mostrar inactivos". **Esperado**: también aparecen los clientes dados de baja (FR-003).
6. Con un filtro de texto activo, navegar a la página 2 (si existe) y luego cambiar el texto del filtro. **Esperado**: la tabla vuelve a la página 1 de los nuevos resultados filtrados.

## Escenario 2 — Dar de alta un cliente nuevo vía modal (US2)

1. Como Contador o Administrador, hacer clic en "Agregar cliente" desde el encabezado de la tabla. **Esperado**: se abre un modal con el formulario, vacío (FR-005).
2. Capturar nombre, tipo de persona, RFC, régimen fiscal (compatible y vigente), correo. Guardar. **Esperado**: el modal se cierra, aparece una confirmación visual, y el cliente nuevo aparece de inmediato en la tabla (FR-011, SC-001).
3. Repetir el alta con el mismo RFC. **Esperado**: error claro de RFC duplicado dentro del modal, que permanece abierto con los datos capturados (FR-007, SC-002).
4. Elegir tipo de persona "moral" y un régimen fiscal exclusivo de persona física. **Esperado**: error claro; el selector de régimen fiscal ya no ofrece esa opción tras elegir "moral".
5. Abrir el modal, capturar datos, y cerrarlo sin guardar. **Esperado**: no se crea ningún cliente y la tabla no cambia.
6. Abrir sesión en `apps/admin` como Administrador y confirmar que el cliente del paso 2 aparece en su listado (FR-009, SC-003).

## Escenario 3 — El acceso respeta las capacidades del usuario (US3)

1. Iniciar sesión como Auxiliar; abrir "Clientes". **Esperado**: ve la tabla y puede usar los filtros de nombre/RFC y de inactivos, pero NO ve el botón "Agregar cliente" (SC-004).
2. Iniciar sesión como Contador o Administrador. **Esperado**: sí ve el botón "Agregar cliente", y el alta funciona igual que en el Escenario 2.

## Limpieza

Los clientes de prueba sembrados o creados en este quickstart pueden desactivarse (soft-delete) desde `apps/admin`, o eliminarse directamente con `supabase db reset` en un entorno completamente local y descartable.
