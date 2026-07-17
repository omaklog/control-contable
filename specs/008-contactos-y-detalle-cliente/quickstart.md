# Quickstart: Contactos y Página de Detalle de Cliente

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Contracts**: [contracts/server-actions.md](./contracts/server-actions.md)

**Prerequisitos**: Supabase local corriendo con la migración de esta feature aplicada; `apps/admin` en `:3001` y `apps/portal` en `:3000`; al menos un Cliente activo ya sembrado; cuentas de prueba con roles Administrador/Contador (capacidad `manage_clients`) y Auxiliar (solo `view_clients`).

## Escenario 1 — Ver el detalle de un Cliente (User Story 1)

1. Como Contador o Administrador, abre el listado de Clientes (admin o portal) y haz clic en "Ver detalle" de un Cliente sin Contactos.
2. Confirma que se muestran sus datos generales (nombre, RFC, régimen fiscal, correo, teléfono, dirección fiscal, estado).
3. Confirma que la sección de Contactos muestra un estado vacío.
4. Confirma que existe una sección "Pagos pendientes" visualmente diferenciada, sin necesidad de datos reales (User Story 3).
5. Agrega dos Contactos (ver Escenario 2) y vuelve a abrir el detalle: confirma que ambos aparecen listados con nombre, teléfono y correo.
6. Inicia sesión como Auxiliar, abre el mismo detalle: confirma que ve los datos y la lista de Contactos, pero no ve el botón "Agregar contacto" ni acciones de edición/obsoleto/principal sobre ningún Contacto.

## Escenario 2 — Gestionar los Contactos de un Cliente (User Story 2)

1. Desde la página de detalle, haz clic en "Agregar contacto"; intenta guardar sin nombre o sin teléfono y confirma que se muestra un error de validación sin cerrar el formulario.
2. Completa nombre y teléfono (correo opcional) y guarda: confirma que el Contacto aparece de inmediato en la lista, marcado como activo.
3. Edita el Contacto (cambia teléfono o correo) y guarda: confirma que la lista refleja los datos actualizados.
4. Marca el Contacto como "contacto principal": confirma que queda identificado como principal.
5. Agrega un segundo Contacto y márcalo también como principal: confirma que el primero deja de estar marcado como principal (solo uno a la vez).
6. Marca un Contacto como obsoleto (con la confirmación correspondiente): confirma que desaparece de la lista por defecto, y que aparece de nuevo al activar "Mostrar obsoletos". Reactívalo y confirma que vuelve a la lista por defecto.
7. Abre el detalle del mismo Cliente en la otra app (si empezaste en admin, ve a portal, y viceversa): confirma que todos los cambios anteriores son visibles ahí también.

## Escenario 3 — Enlace al detalle desde los listados existentes (research.md Decisión 5)

1. En `apps/admin`, abre el listado de Clientes: confirma que cada fila conserva "Editar" y "Dar de baja" (o "Reactivar") y que además tiene un enlace "Ver detalle".
2. En `apps/portal`, abre el listado de Clientes: confirma que cada fila tiene un enlace "Ver detalle" (sin acciones de edición, como ya era el caso).
