# Research: Alta de Cliente desde el Portal

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

No quedaron `NEEDS CLARIFICATION` en el Technical Context del plan. Este documento registra las decisiones de diseño que sí requerían una elección explícita — las Decisiones 1 y 2 se implementaron en la primera iteración de esta feature (formulario sin listado) y se conservan sin cambios; las Decisiones 3, 4 y 5 se revisan o agregan en esta segunda iteración (tabla + filtros + modal).

## Decisión 1: Promover el formulario de Cliente a `packages/*` en vez de duplicarlo _(sin cambios, primera iteración)_

- **Decision**: `ClienteFormValues`, `RegimenFiscalOption`, `clienteFormSchema` (Yup), `filtrarRegimenesPorTipoPersona()` y `mapearErrorClienteAMensaje()` viven en `packages/utils/src/clienteForm.ts`. El componente `ClienteForm.tsx` vive en `packages/ui/src/ClienteForm.tsx`.
- **Rationale**: Segundo consumidor real (edición en `apps/admin`, alta en `apps/portal`) — mismo criterio que llevó a promover `MainLayoutClient` en `004-portal-main-layout`.
- **Estado**: Ya implementado; esta segunda iteración no lo modifica.

## Decisión 2: `ClienteForm` con modo alta opcional _(sin cambios, primera iteración)_

- **Decision**: `cliente?: ClienteFormValues` — `undefined` = alta (vacío), definido = edición (prellenado).
- **Estado**: Ya implementado; en esta iteración, el modo alta se invoca ahora desde un `Dialog` propio de `apps/portal` en vez de ser la única vista de la página.

## Decisión 3: Confirmación tras el alta — cerrar el modal y refrescar la tabla _(revisada)_

- **Decision**: Al completarse un alta exitosa, `ClientesPortalClient` cierra el modal (en vez de limpiar el formulario in-place, que era la decisión de la primera iteración) y llama `router.refresh()` para que la tabla muestre el cliente nuevo de inmediato, junto con una confirmación visual breve (por ejemplo, un `Snackbar` o `Alert` temporal). Este es el mismo patrón ya usado por `apps/admin` para su modal de edición (`ClientesClient.tsx`: cierra el diálogo + `router.refresh()`).
- **Rationale**: La primera iteración limpiaba el formulario in-place porque no existía ningún listado al que redirigir o que refrescar — era la opción más simple posible. Ahora que sí existe una tabla en la misma pantalla, cerrar el modal y ver el cliente aparecer en la tabla es una confirmación más clara y directa que un formulario vacío, y es exactamente el patrón que `apps/admin` ya usa para su propio modal (consistencia entre ambas apps).
- **Alternatives considered**: Mantener el modal abierto y limpio tras guardar, como en la primera iteración (rechazada: ya no tiene sentido con una tabla visible detrás — el usuario esperaría ver el resultado reflejado ahí, no un formulario vacío repetido).

## Decisión 4: Gate de la página — `view_clients` (lectura) + `manage_clients` (botón de alta) _(revisada)_

- **Decision**: `apps/portal/.../clientes/page.tsx` ahora requiere `requireCapability('view_clients')` (no `manage_clients` como en la primera iteración). El botón "Agregar cliente" y la posibilidad real de invocar `createCliente` siguen requiriendo `manage_clients` — el Client Component decide si mostrar el botón según `canManage` (capacidad del perfil actual), y la Server Action revalida `manage_clients` de forma independiente.
- **Rationale**: La primera iteración exigía `manage_clients` para toda la página porque, sin listado, no había nada que un usuario con solo `view_clients` (Auxiliar) pudiera consultar — un gate más permisivo habría llevado a una página vacía. Ahora que existe una tabla real de solo lectura, `view_clients` es exactamente la capacidad correcta para verla (US3: Auxiliar "puede consultar la tabla... pero no ve el botón Agregar") — mismo patrón ya usado en `apps/admin/.../clientes/page.tsx` (`006-crud-clientes-admin`).
- **Alternatives considered**: Mantener el gate único en `manage_clients` para toda la página (rechazada: contradice directamente la Historia 3 de la spec actualizada, que exige que Auxiliar sí pueda consultar la tabla).

## Decisión 5: La tabla de `apps/portal` es un componente propio, no compartido con `apps/admin`

- **Decision**: `ClientesPortalClient.tsx` es un componente independiente de `ClientesClient.tsx` (`apps/admin`) — no se promueve una "tabla de Clientes" genérica a `packages/ui`. Sí se promueve la función pura `calcularTotalPaginas()` a `packages/utils` (research.md Decisión de la Foundational de esta iteración), pero no el componente de tabla completo.
- **Rationale**: Las dos tablas difieren en aspectos reales de interacción, no solo de estilo: la de `apps/admin` tiene columna de acciones (editar/eliminar) y ningún filtro de texto; la de `apps/portal` tiene filtro de nombre/RFC y botón de alta, pero ninguna acción por fila (FR-004). Forzar un solo componente compartido exigiría una API con varios props condicionales (`showActions?`, `onEdit?`, `onDelete?`, `showSearchFilter?`, `onCreate?`) solo para dos consumidores cuyo comportamiento diverge en lo esencial — el tipo de abstracción prematura que el proyecto pide evitar. La única pieza realmente idéntica (el cálculo de `totalPaginas`) sí se comparte.
- **Alternatives considered**: Un componente `ClientesTable` genérico parametrizado por slots/props de acciones (rechazada: complejidad de una abstracción a la medida de dos casos, cuando la duplicación real restante — el layout de la tabla, unas 30-40 líneas de JSX — es menor que el costo de generalizarla correctamente).

## Decisión 6: Filtro por nombre o RFC — un único campo de búsqueda, resuelto en el servidor

- **Decision**: Un solo campo de texto (`q` en `searchParams`) se aplica en la consulta del Server Component con `supabase.from('clientes').select(...).or(\`nombre.ilike.%${q}%,rfc.ilike.%${q}%\`)` — coincidencia parcial contra cualquiera de los dos campos, sin distinguir cuál. Cambiar el filtro reinicia la página a 1 (edge case de spec.md).
- **Rationale**: FR-002 pide "filtrar por nombre o RFC" como una sola operación, no dos campos separados — un único campo de búsqueda combinado es la interpretación más simple y es la que se confirmó en Assumptions de spec.md. Resolverlo en el servidor (no en el cliente con los datos ya cargados) es necesario porque la tabla está paginada — filtrar solo la página actual en el cliente daría resultados incompletos/incorrectos.
- **Alternatives considered**: Dos campos de filtro separados (nombre y RFC) (rechazada: no es lo que se pidió, y añade complejidad de UI sin necesidad); filtrar en el cliente sobre los datos ya paginados (rechazada: dado que la tabla pagina server-side, filtrar solo la página visible produciría resultados incompletos).
