# Quickstart: Obligaciones Fiscales del Cliente

## Prerrequisitos

- Supabase local corriendo, con la migración de esta feature aplicada.
- `packages/types/src/database.ts` regenerado.
- Catálogos de Periodicidades (`012`) y Obligaciones Fiscales (`013`) ya sembrados con al menos algunos registros activos.
- Al menos un cliente existente (`005`/`006`).
- `apps/admin` y `apps/portal` corriendo, con un usuario con capability `manage_clients` (para configurar obligaciones de cliente) y otro con `manage_catalogs` (para administrar plantillas).

## Escenario 1 — Configuración manual (Historia 1, FR-001 a FR-009)

1. Entrar al detalle de un cliente sin obligaciones configuradas.
2. Agregar una obligación del catálogo con periodicidad, orden y observaciones.
3. Confirmar que queda Activa.
4. Intentar agregar la misma obligación otra vez — confirmar que se rechaza.
5. Marcar la obligación como "No aplica" — confirmar que sigue visible, distinguida de las Activas.
6. Intentar eliminarla estando "No aplica" — confirmar que se rechaza.
7. Agregar una segunda obligación y cambiar su orden manualmente — confirmar que ambos órdenes son válidos y únicos para ese cliente.
8. Eliminar una obligación Activa — confirmar que desaparece de la configuración del cliente sin afectar el catálogo ni a otros clientes.

## Escenario 2 — Administrar plantillas (Historia 2, FR-011 a FR-013)

1. Como Administrador, entrar a "Administración > Catálogos > Plantillas de Obligaciones".
2. Crear una plantilla con nombre y agregarle 2-3 obligaciones del catálogo, cada una con periodicidad y orden sugeridos.
3. Intentar agregar la misma obligación fiscal dos veces dentro de la misma plantilla — confirmar que se rechaza.
4. Inactivar la plantilla — confirmar que ya no aparece como opción al aplicar una plantilla a un nuevo cliente.

## Escenario 3 — Aplicar una plantilla (Historia 3, FR-014 a FR-016)

1. Reactivar (o crear una nueva) plantilla con obligaciones.
2. Entrar al detalle de un cliente sin obligaciones configuradas y aplicar esa plantilla.
3. Confirmar que las obligaciones de la plantilla quedan copiadas al cliente.
4. Modificar una obligación copiada (periodicidad, orden) y confirmar que la plantilla original no cambia.
5. Aplicar la misma plantilla a un segundo cliente y confirmar que recibe una copia independiente.
6. Con un cliente que ya tiene una de las obligaciones de la plantilla configurada, aplicar la plantilla y confirmar que esa obligación específica se omite mientras el resto se copia con normalidad.

## Escenario 4 — Integridad histórica (Historia 4, FR-005)

1. Marcar una obligación de un cliente como "No aplica".
2. Confirmar que sigue apareciendo en el listado del cliente, distinguida de las Activas.
3. Confirmar que no hay ninguna acción de eliminar disponible para ella mientras esté "No aplica".
