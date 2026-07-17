# Research: Contactos y Página de Detalle de Cliente

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Decisión 1: Componentes compartidos desde el día uno, no promovidos después

**Decisión**: `ContactoForm` (en `packages/ui`) y `contactoFormSchema`/`mapearErrorContactoAMensaje` (en `packages/utils`) se construyen directamente como código compartido, y `ClienteDetalleClient` (en `packages/ui`) también, en vez de construirlos primero dentro de una sola app y promoverlos cuando aparezca un segundo consumidor.

**Rationale**: El criterio usado hasta ahora en este proyecto ("promover cuando aparece un segundo consumidor real": `MainLayoutClient` en `004`, `ClienteForm` en `006`→`007`) asume que no se sabe de antemano si habrá un segundo consumidor. Aquí sí se sabe: el spec (FR-001, FR-008) exige que la página de detalle y la gestión de Contactos sean funcionalmente idénticas en `apps/admin` y `apps/portal` desde el primer día. Construir primero en una sola app garantizaría tener que repetir el trabajo de "promoción" inmediatamente después, sin ningún beneficio.

**Alternatives considered**: Construir primero en `apps/admin` y promover después (como se hizo con `ClienteForm`) — rechazado porque duplicaría el esfuerzo sin necesidad; aquí ambos consumidores son conocidos desde el inicio, a diferencia de `006` donde solo existía `apps/admin` cuando se construyó el primer `ClienteForm`.

## Decisión 2: "Eliminar" un Contacto = marcarlo como obsoleto (sin borrado físico)

**Decisión**: Se agrega una columna `estado` (`public.contacto_estado`: `'activo' | 'obsoleto'`, default `'activo'`) a `contactos`. La UI nunca ejecuta un `DELETE`; "eliminar" en la interfaz se traduce a una Server Action que cambia `estado` a `'obsoleto'`, con una acción simétrica de reactivar. La política RLS de `contactos` no gana un permiso de `DELETE`.

**Rationale**: Confirmado explícitamente por el usuario en la aclaración de `/speckit-specify` (spec.md, Clarifications) y coherente con la Constitución ("Preferir soft delete", "Evitar eliminaciones físicas"). Mismo patrón ya usado para Cliente (`estado: activo/inactivo`), aunque con nombre de estado distinto ("obsoleto" en vez de "inactivo") porque así lo pidió el usuario y porque comunica mejor la semántica de un contacto que ya no es válido (vs. un cliente dado de baja).

**Alternatives considered**: Borrado físico con permiso de `DELETE` nuevo en RLS — rechazado explícitamente por el usuario y por la Constitución. Una tabla de auditoría/historial aparte — descartado por ser una complejidad no pedida; el propio registro con `estado = 'obsoleto'` ya conserva el historial sin necesitar una tabla adicional.

## Decisión 3: Un contacto principal por Cliente, garantizado con un índice único parcial

**Decisión**: Se agrega `es_principal boolean not null default false` a `contactos`, más el índice `create unique index contactos_principal_unico on public.contactos (cliente_id) where es_principal;`. La Server Action `setContactoPrincipal(contactoId)` hace dos `update` secuenciales dentro del mismo request: primero `estado`-independientemente pone `es_principal = false` en cualquier otro contacto del mismo cliente que lo tuviera en `true`, luego pone `es_principal = true` en el contacto indicado.

**Rationale**: FR-007/SC-005 exigen que nunca haya dos contactos principales simultáneos para el mismo Cliente, incluso ante escrituras concurrentes. Un índice único parcial es la forma más simple de que la base de datos (autoridad real, no el cliente) haga cumplir esa invariante: si dos solicitudes concurrentes intentan poner a dos contactos distintos como principal del mismo cliente, como máximo una de las dos operaciones de "poner en true" tendrá éxito — la otra falla con una violación de unicidad, que la Server Action traduce a un mensaje claro ("Otro contacto ya fue marcado como principal, actualiza la página e intenta de nuevo"). No se necesita una función `security definer` ni una transacción explícita adicional: las dos actualizaciones secuenciales alcanzan, dado el volumen y la concurrencia esperados (oficina pequeña, pocos usuarios simultáneos).

**Alternatives considered**: Función Postgres `security definer` que envuelva ambos `update` en una sola llamada RPC — más robusta ante condiciones de carrera extremadamente improbables en este contexto, pero es complejidad adicional no justificada por el volumen de uso esperado; se documenta aquí como posible mejora futura si el volumen de escritura concurrente creciera. Una columna `principal_contacto_id` en `clientes` en vez de un flag en `contactos` — rechazada porque requeriría tocar la tabla `clientes` y su RLS existente sin necesidad, cuando el flag en `contactos` ya resuelve el requisito de forma más local.

## Decisión 4: Nueva ruta dinámica `/clientes/[clienteId]`, primera en el monorepo

**Decisión**: Tanto `apps/admin` como `apps/portal` agregan `src/app/(app)/clientes/[clienteId]/page.tsx` (Server Component) y `.../[clienteId]/actions.ts` (Server Actions), dentro del mismo grupo de rutas `(app)` ya usado por el resto de cada app.

**Rationale**: Es la forma estándar de Next.js App Router para una página de detalle por id, coherente con el patrón ya usado para las páginas de listado (`page.tsx` + `actions.ts` + Client Component). Al ser la primera ruta dinámica del proyecto, no hay convención previa que romper.

**Alternatives considered**: Modelar el detalle como un modal/Dialog sobre el listado (como se hizo para el alta de Cliente en `007`) en vez de una página propia — rechazado porque el propio spec pide explícitamente "una página de detalle" (FR-001), y porque el contenido (datos generales + lista de contactos + pagos pendientes a futuro) es demasiado extenso para un modal.

## Decisión 5: Enlace "Ver detalle" se agrega a los listados existentes, sin reemplazar nada

**Decisión**: `ClientesClient.tsx` (admin) y `ClientesPortalClient.tsx` (portal) agregan una columna/enlace "Ver detalle" por fila hacia `/clientes/[id]`. Ninguna acción existente (Editar/Dar de baja en admin) se remueve ni se mueve dentro del detalle.

**Rationale**: Confirmado explícitamente por el usuario en la aclaración de `/speckit-specify` (spec.md, Clarifications, FR-012) — es el cambio de menor riesgo sobre el trabajo ya construido y validado en `006`/`007`.

**Alternatives considered**: Mover "Editar" al detalle (dejando la fila solo con "Ver detalle" y "Dar de baja") — explícitamente descartado por el usuario.

## Decisión 6: La sección de "Pagos pendientes" es un placeholder visual, sin datos reales

**Decisión**: `ClienteDetalleClient` incluye una sección "Pagos pendientes" claramente rotulada (p. ej. un `Card`/`Alert` "Próximamente"), sin consultar `cargos_cobranza` ni ninguna tabla de cobranza.

**Rationale**: Confirmado explícitamente por el usuario — la funcionalidad de cobranza se especificará como una feature aparte; esta feature solo reserva el espacio en el layout para no tener que rediseñar la página cuando esa funcionalidad se construya (FR-011, User Story 3).

**Alternatives considered**: Mostrar ya datos reales de `cargos_cobranza` (tabla que ya existe desde `005`) — rechazado explícitamente por el usuario para mantener acotado el alcance de esta feature.
