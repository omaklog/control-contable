# Quickstart: Validar el Módulo de Servicios

Guía de validación una vez implementado el módulo. Asume que la migración `servicios_schema.sql` ya está aplicada y que las pantallas descritas en `plan.md` ya existen.

## Prerrequisitos

- Supabase local corriendo (`supabase start`), migración aplicada (`supabase migration up`).
- Dependencias instaladas (`pnpm install`).
- Sin un servidor `next dev` corriendo sobre la misma app antes de ejecutar `pnpm build` (ver nota de entorno ya conocida en specs anteriores).

## 1. Verificar la migración y las políticas RLS

```bash
docker exec supabase_db_control-contable psql -U postgres -d postgres -c "\d servicios"
docker exec supabase_db_control-contable psql -U postgres -d postgres -c "\d servicios_contratados"
docker exec supabase_db_control-contable psql -U postgres -d postgres -c "select conname from pg_constraint where conrelid = 'servicios_contratados'::regclass;"
```

**Resultado esperado**: ambas tablas existen con las columnas de `data-model.md`; la restricción `UNIQUE (cliente_id, servicio_id)` aparece en la lista de constraints.

## 2. Pruebas unitarias y de integración

```bash
pnpm --filter @control-contable/utils test
pnpm --filter @control-contable/utils test -- servicio.integration
```

**Resultado esperado**: pasan las pruebas de mapeo de errores (`mapearErrorServicioAMensaje`) y las de integración que verifican: (a) un segundo `INSERT` para el mismo `cliente_id`+`servicio_id` falla con la violación de unicidad esperada, sin importar el `estado` del existente; (b) `has_capability('manage_catalogs')`/`manage_clients` bloquean correctamente las escrituras a usuarios sin esa capacidad.

## 3. Lint y type-check

```bash
pnpm --filter admin lint && pnpm --filter admin type-check
pnpm --filter portal type-check
pnpm --filter @control-contable/ui lint && pnpm --filter @control-contable/ui type-check
pnpm --filter @control-contable/utils type-check
```

**Resultado esperado**: sin errores en ningún paquete.

## 4. Validación visual manual (navegador)

> Nota de entorno: no ejecutar `pnpm build` mientras un servidor `next dev` de la misma app esté activo.

1. Iniciar sesión como Administrador en `apps/admin`, ir a "Servicios" (nuevo ítem de navegación): crear un servicio, editarlo, filtrarlo por nombre/categoría/estado, y desactivarlo — confirmar que sigue existiendo pero ya no puede asignarse a un cliente nuevo.
2. Ir al detalle de un cliente (Cliente 360), sección "Servicios": agregar el servicio recién creado (mientras estaba Activo) con un precio acordado, confirmar que aparece en el listado con estado Activo.
3. Intentar agregar el mismo servicio del catálogo otra vez al mismo cliente: confirmar que el sistema lo impide y sugiere "Reactivar" en su lugar.
4. Cambiar el precio del servicio contratado: confirmar que el nuevo precio se refleja de inmediato y que "Ver historial" muestra el precio anterior y el nuevo con su fecha.
5. Suspender el servicio contratado, luego finalizarlo, luego reactivarlo: confirmar en cada paso que es el mismo registro (mismo historial acumulado, sin duplicados), que la fecha de fin se limpia al reactivar, y que la fecha de inicio original no cambió.
6. Repetir el flujo de agregar/cambiar precio/suspender en `apps/portal` con un usuario Contador: confirmar el mismo comportamiento que en `apps/admin`.
7. Con un usuario Auxiliar (`view_clients` sin `manage_clients`): confirmar que puede ver la sección Servicios del cliente pero no ve ninguna acción de gestión (agregar, cambiar precio, suspender, reactivar, finalizar) — mismo patrón ya usado por Contactos.
8. Confirmar en la pantalla de Auditoría (`apps/admin`) que cada una de las acciones anteriores generó un evento de auditoría distinguible por tipo (alta, cambio de precio, suspensión, reactivación, finalización).

## 5. Regresión (sin cambios a lo ya construido)

Confirmar que el listado de Clientes, el detalle de Cliente (Contactos, Estado del Cliente) y la gestión de Usuarios siguen funcionando exactamente igual que antes de este módulo — este spec solo agrega, no modifica lógica existente.
