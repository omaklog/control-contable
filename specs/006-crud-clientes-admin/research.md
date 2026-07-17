# Research: Editar y Eliminar Clientes (Panel Administrativo)

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

No quedaron `NEEDS CLARIFICATION` en el Technical Context del plan (todas las decisiones técnicas usan defaults ya establecidos por el proyecto: Next.js/React/MUI/Formik+Yup, patrón Server Component + Server Actions + Client Component ya usado en `apps/admin/src/app/usuarios`). Este documento registra las decisiones de diseño de UI/flujo que sí requerían una elección explícita.

## Decisión 1: Paginación y filtro de inactivos vía `searchParams` de la URL, no estado local

- **Decision**: `apps/admin/src/app/clientes/page.tsx` lee `page` y `mostrarInactivos` de los `searchParams` de Next.js (Server Component), hace el fetch paginado (`.range()` + `count: 'exact'`) filtrando por `estado = 'activo'` salvo que `mostrarInactivos=true`, y pasa los datos ya resueltos al Client Component. La navegación entre páginas y el toggle del filtro actualizan la URL (`router.push`/`<Link>`), no un `useState` de cliente.
- **Rationale**: Mantiene el patrón ya establecido en este monorepo (Server Component hace el fetch, Client Component solo interactúa) y hace el listado bookmarkeable/compartible (SC-005: "sin recargar la página completa entre páginas" se cumple con navegación de Next.js, que no hace un full reload). Evita mantener en el cliente una copia del estado de paginación que pueda desincronizarse del servidor.
- **Alternatives considered**: Cargar todos los clientes una vez y paginar/filtrar en el cliente con `useState` (rechazada: no escala si el volumen de clientes crece, y contradice "Rendimiento" de la constitución — evitar cargas innecesarias); paginación vía una Server Action llamada desde el cliente en vez de vía `searchParams` (rechazada: pierde la capacidad de compartir/recargar una página específica con su filtro).

## Decisión 2: `ClienteForm.tsx` es un formulario de edición únicamente

- **Decision**: `ClienteForm.tsx` recibe un prop obligatorio `cliente` (los datos actuales del cliente a editar) — no soporta un "modo alta" en esta feature. La alta de clientes se construirá como una pantalla separada en `apps/portal` (feature futura), fuera de este componente.
- **Rationale**: Tras la clarificación de que la alta ocurre en `apps/portal` (accesible a Contador/Administrador, no solo a quien tenga acceso a `apps/admin`), ya no existe un único formulario compartido entre ambas apps — cada app tendrá su propio componente, aunque puedan compartir después el esquema Yup si conviene (ver `plan.md`, Structure Decision). Diseñar `ClienteForm.tsx` como "solo edición" desde ahora evita una rama de código (`cliente === undefined`) que nunca se ejercitaría en esta feature.
- **Alternatives considered**: Mantener el prop `cliente` como opcional para una futura reutilización cross-app (rechazada por ahora: es especulativo — si `apps/portal` termina necesitando una experiencia de formulario distinta para la alta, un prop opcional sin usar solo generaría código muerto en esta feature).

## Decisión 3: Filtrado del selector de Régimen Fiscal por tipo de persona, en el cliente

- **Decision**: El formulario obtiene el catálogo completo de `regimenes_fiscales` (ya cargado una vez por `page.tsx` o mediante una consulta ligera adicional) y filtra las opciones del selector según el `tipo_persona` elegido (`aplica_persona_fisica`/`aplica_persona_moral`), sin una consulta nueva por cada cambio de tipo de persona. La base de datos sigue siendo la autoridad final (trigger `trg_clientes_validar_regimen_fiscal` de `005`); este filtrado es solo una mejora de UX para evitar que el personal capture una combinación que sabemos de antemano que será rechazada.
- **Rationale**: FR-006 exige mostrar errores claros cuando la combinación sea inválida, pero una mejor experiencia es no ofrecer esa combinación inválida como opción desde el principio. Filtrar en el cliente (con el catálogo ya en memoria) no requiere una consulta nueva por cada interacción.
- **Alternatives considered**: Mostrar las 23 opciones del catálogo sin filtrar y depender enteramente del error del servidor tras guardar (rechazada: peor experiencia, contradice el espíritu de FR-006 de dar retroalimentación clara cuanto antes); no permitir cambiar `tipo_persona` en edición (rechazada: no está pedido por la especificación, y el modelo de datos sí permite cambiarlo).
- **Nota de vigencia**: el filtrado por vigencia (`fecha_fin_vigencia`) también se aplica en el cliente con el mismo catálogo ya cargado, ocultando regímenes vencidos de las opciones nuevas — un cliente que ya tuviera asignado un régimen vencido (caso ya cubierto en `005`) sigue mostrando ese valor seleccionado aunque ya no aparezca en la lista de opciones para un cambio nuevo.

## Decisión 4: Traducción de errores de base de datos a mensajes de UI

- **Decision**: La Server Action `updateCliente` captura el error devuelto por Supabase/Postgres y lo traduce a un mensaje en español mediante una función pequeña de mapeo (por código/patrón conocido: violación de unicidad de RFC → "Ya existe un cliente activo con este RFC"; excepción del trigger de régimen fiscal → se reutiliza el mensaje ya explícito que lanza el trigger, p. ej. "El régimen fiscal ... no aplica a personas físicas"). Cualquier error no reconocido cae a un mensaje genérico ("No se pudo guardar el cliente. Intenta de nuevo.").
- **Rationale**: FR-006 exige un mensaje de error claro sin perder los datos capturados. Los triggers de `005` ya lanzan mensajes descriptivos en español (`raise exception 'El régimen fiscal % no aplica a personas físicas'`, etc.) — basta con propagarlos tal cual en la mayoría de los casos, salvo el de unicidad de RFC (cuyo error de Postgres es el genérico `duplicate key value violates unique constraint`, que sí necesita traducción a un mensaje amigable).
- **Alternatives considered**: Validar unicidad de RFC con una consulta previa desde la Server Action antes de intentar el `update` (rechazada: duplica la regla que ya vive en la base de datos y abre una ventana de condición de carrera entre la consulta y el `update`; es más simple y correcto capturar el error real del `update`).

## Decisión 5: Confirmación de baja reutiliza el patrón de diálogo ya usado en Usuarios

- **Decision**: El diálogo de confirmación de baja (`FR-007`) sigue el mismo patrón ya usado en `apps/admin/src/app/usuarios/UsuariosClient.tsx` para confirmar activar/desactivar una cuenta: un estado `confirmTarget` en el Client Component que, al no ser `null`, muestra un `Dialog` de MUI con botones "Cancelar"/"Confirmar", y solo al confirmar se invoca la Server Action.
- **Rationale**: Consistencia de UX entre módulos del Panel Administrativo — el personal ya está familiarizado con este patrón de confirmación en la app.
- **Alternatives considered**: Un `window.confirm()` nativo del navegador (rechazada: no sigue el lenguaje visual de Material UI, ya descartado implícitamente por el patrón existente en Usuarios).
