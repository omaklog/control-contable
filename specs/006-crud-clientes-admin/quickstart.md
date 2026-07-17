# Quickstart: Validación de Editar y Eliminar Clientes (Panel Administrativo)

**Feature**: [spec.md](./spec.md) | **Data Model**: [data-model.md](./data-model.md) | **Contracts**: [contracts/server-actions.md](./contracts/server-actions.md)

Esta guía valida, contra el Panel Administrativo (`apps/admin`) corriendo con Supabase local, que las pantallas implementadas en la fase de tareas cumplen los requisitos de la especificación. Requiere un usuario Administrador ya existente (único rol con acceso a `apps/admin`, `003-supabase-auth-roles`) — reutilizar el seed de esa feature. La alta de clientes **no** se valida aquí — se sembrará directamente vía SQL, ya que esa pantalla vive en una feature futura de `apps/portal`.

## Prerrequisitos

1. Stack local levantado (`supabase start`) con las migraciones de `005-clientes-cobranza-expedientes` aplicadas.
2. `apps/admin` corriendo (`pnpm --filter @control-contable/admin dev`), sesión iniciada con un usuario `administrador`.

## Escenario 1 — Listado paginado y filtro de inactivos (US1)

1. Sembrar más clientes de los que caben en una página directamente vía SQL (`insert into public.clientes ...`, ver `005-clientes-cobranza-expedientes/quickstart.md` Escenario 1 para el formato).
2. Abrir `/clientes`. **Esperado**: se ve solo la primera página; hay controles para navegar a la página siguiente (FR-001, FR-011).
3. Confirmar que cada fila muestra nombre, RFC, correo y estado (FR-002), y que existe una columna de acciones (FR-003).
4. Sin activar ningún filtro, confirmar que ningún cliente inactivo aparece en el listado (FR-014).
5. Activar el filtro "Mostrar inactivos". **Esperado**: los clientes dados de baja ahora aparecen también.
6. Con la base de datos vacía de clientes (entorno de prueba aislado), confirmar que se muestra un estado vacío (US1, AS3).

## Escenario 2 — Edición de un cliente existente (US2)

1. Sobre un cliente ya existente (sembrado en el Escenario 1), elegir "Editar" desde la columna de acciones. **Esperado**: se abre el formulario, prellenado con sus datos actuales (FR-004).
2. Modificar el teléfono y guardar. **Esperado**: el listado refleja el cambio de inmediato (SC-001).
3. Intentar guardar un cambio de RFC a uno que ya usa otro cliente activo. **Esperado**: error claro de RFC duplicado, el formulario permanece abierto con los datos capturados (FR-006).
4. Elegir tipo de persona "moral" y un régimen fiscal exclusivo de persona física (p. ej. 605). **Esperado**: error claro; verificar además que el selector de régimen fiscal, tras elegir "moral", ya no ofrece esa opción entre las opciones filtradas (Decisión 3 de research.md).
5. Abrir el formulario de edición, modificar un campo, y cerrarlo sin guardar. **Esperado**: no se aplica ningún cambio.
6. Editar un cliente inactivo (dado de baja en el Escenario 3). **Esperado**: se puede modificar sus datos sin que el cliente se reactive automáticamente (FR-009).

## Escenario 3 — Baja con confirmación (US3)

1. Sobre un cliente activo, elegir "Eliminar" desde la columna de acciones. **Esperado**: aparece un diálogo de confirmación explícito, ningún cambio ocurre todavía (FR-007).
2. Cancelar el diálogo. **Esperado**: el cliente permanece activo, sin cambios.
3. Repetir y confirmar esta vez. **Esperado**: el cliente pasa a "inactivo" (deja de aparecer en el listado por defecto, ver Escenario 1); su información sigue intacta si se consulta con el filtro de inactivos activado (FR-008, SC-003).

## Limpieza

Los clientes de prueba sembrados en este quickstart pueden desactivarse (soft-delete) o, si el entorno es completamente local y descartable, eliminarse con `supabase db reset`.
