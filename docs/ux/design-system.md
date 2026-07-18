# Reglas de Diseño del Sistema

**Fuente**: `docs/ux/design.md`, `docs/ux/design_dark.md`, `docs/ux/screenshots/*` (5 pantallas de referencia: Dashboard Operativo, Módulo de Clientes, Módulo de Cobranza, Gestión Documental Fiscal, Portal del Cliente — cada una en claro y oscuro).

**Alcance**: Estas reglas aplican a `apps/admin` y `apps/portal` (ambas apps de uso interno del despacho). El "Portal del Cliente" de las referencias es una app futura y distinta (ver `specs/001-business-domain-model/spec.md`, Clarifications) — se documenta aquí únicamente como fuente de inspiración a futuro, no como requisito de esta pasada.

**Fuente de color decidida**: De las dos paletas presentes en `design.md`/`design_dark.md` (los tokens YAML de rol Material Design 3 en el front-matter, y la paleta Tailwind-slate descrita en la prosa), estas reglas usan la **paleta de la prosa** como autoridad — es la que efectivamente describe cómo se ven los componentes en las capturas, y mapea directo sobre `theme.palette` de Material UI sin una capa de traducción adicional.

**Nota**: `docs/ux/components.md` es un duplicado exacto de `docs/ux/design.md` (mismo contenido, byte a byte) — se ignora como fuente independiente; todo lo que hubiera aportado ya está cubierto por `design.md`.

---

## 1. Fundamentos visuales

### 1.1 Color — Modo claro

| Rol (MUI `theme.palette`) | Valor                                         | Uso                                                                                                                                   |
| ------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `primary.main`            | `#1e293b` (navy)                              | Botones primarios, icono/marca en la barra lateral, texto de alta autoridad                                                           |
| `primary.contrastText`    | `#ffffff`                                     | Texto sobre `primary.main`                                                                                                            |
| `secondary.main`          | `#3b82f6` (azul)                              | Enlaces, indicador de navegación activa, foco de campos, badges "positivos" (activo/pagado), barras de progreso por encima del umbral |
| `background.default`      | `#f8fafc`                                     | Fondo de página (Nivel 0)                                                                                                             |
| `background.paper`        | `#ffffff`                                     | Tarjetas, sidebar, tablas, modales (Nivel 1)                                                                                          |
| `divider`                 | `#e2e8f0`                                     | Bordes de 1px entre tarjetas, tablas, inputs                                                                                          |
| Hover de fila/lista       | `#f1f5f9`                                     | Fondo al pasar el cursor sobre una fila o ítem de lista                                                                               |
| Tinte de selección/activo | `#eff6ff`                                     | Fondo de fila seleccionada o ítem activo en listas                                                                                    |
| `error.main`              | Rojo semántico (tono "vencido/atención")      | Exclusivo para estados negativos: vencido, error, saldo en riesgo — nunca para "activo" o "positivo"                                  |
| Texto secundario          | Gris medio (variante de `on-surface-variant`) | Metadatos, etiquetas en mayúsculas, texto de apoyo                                                                                    |

**Regla explícita de estados (no es semáforo clásico) — CONFIRMADA**: el sistema NO usa verde para "bien" — usa **azul** para todo estado positivo/activo/completado (ej. pagado, activo, vigente), **rojo** exclusivamente para errores/vencidos/situaciones que requieren atención, y **gris** para estados neutrales/inactivos/sin acción requerida. Confirmado en las 5 capturas: "ACTIVE", "PAID", barras de cumplimiento altas y "% de cumplimiento" saludable son azules; "OVERDUE" y cumplimiento bajo son rojos; "INACTIVE"/"SETTLED" son gris neutro. Ningún componente usa verde como color de estado en ningún módulo del sistema.

**Barras/indicadores de progreso con umbral**: los indicadores de porcentaje (ej. cumplimiento fiscal) DEBEN cambiar de azul a rojo por debajo de un umbral definido por el módulo que los usa (las referencias usan ~70% como corte visual) — no un degradado continuo, un cambio binario de color.

### 1.2 Color — Modo oscuro

| Rol (MUI `theme.palette`) | Valor                                               | Uso                                                                       |
| ------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------- |
| `background.default`      | `#0f172a`                                           | Fondo base de la aplicación                                               |
| `background.paper`        | `#1e293b`                                           | Tarjetas, tablas, modales, sidebar                                        |
| `primary.main` (acento)   | `#38bdf8` (celeste)                                 | Acciones primarias, estados activos — visibilidad alta sobre fondo oscuro |
| `divider`                 | `#334155`                                           | Bordes de 1px sobre superficies Nivel 1                                   |
| Hover/activo              | `#334155`                                           | Fondo al pasar cursor o modal elevado                                     |
| Texto de encabezados      | `#f8fafc`                                           | Máximo contraste                                                          |
| Texto secundario          | `#94a3b8`                                           | Jerarquía secundaria                                                      |
| Semánticos (error, etc.)  | Mismo hue que en claro, desplazado al rango 400–500 | Evita que "vibren" sobre el fondo oscuro                                  |

**Regla de paridad**: cada rol semántico (positivo=azul, negativo=rojo, neutro=gris) DEBE existir en ambos modos con el mismo significado — solo cambia el tono exacto, nunca el mapeo semántico (ej. "activo" nunca deja de ser azul al cambiar a modo oscuro).

### 1.3 Tipografía

- Fuente de texto general: **Inter** (legibilidad en contextos densos de datos).
- Fuente para cifras/datos tabulares: **JetBrains Mono** (o su equivalente monoespaciado) — obligatoria en columnas numéricas de tablas, KPIs y montos, para que las cifras alineen verticalmente y no "salten" al actualizarse.
- Jerarquía por **peso**, no por saltos de tamaño agresivos: etiquetas pequeñas en mayúsculas para metadatos; semi-bold para componentes interactivos clave.
- En móvil, los tamaños de titulares grandes (`display-lg`/`headline-lg`) DEBEN reducirse (ej. de 36px a 28px) para evitar wrapping excesivo en dashboards.

### 1.4 Espaciado

- Unidad base: **4px**.
- Escritorio: 24px de margen exterior, 16px de gutter entre columnas.
- Tablet: 16px de margen exterior, 12px de gutter.
- Móvil: 16px de margen exterior, una sola columna (todo se apila verticalmente).
- Celdas de tabla: 12px×16px por defecto; 8px en vistas de alta densidad ("modo ledger") cuando el módulo lo requiera explícitamente.

### 1.5 Elevación, bordes y formas

- La jerarquía visual se logra con **capas tonales y bordes de 1px**, no con sombras pesadas. Nivel 0 = fondo de página; Nivel 1 = tarjetas/sidebar/tablas (borde 1px + sombra suave opcional); Nivel 2 = modales/popovers (sombra difusa mayor para indicar foco).
- Radio de esquina — **escala única, CONFIRMADA para ambos modos** (el modo oscuro no tiene su propia escala de radios; solo cambia color, contraste y superficies, nunca la forma): **8px en componentes estándar** (botones, inputs, tarjetas), **12px en contenedores grandes** (dashboard, modales), **pill (100%) en badges/status/chips** para distinguirlos de botones interactivos. La escala más angular (4px/8px) descrita en `design_dark.md` para el modo oscuro NO se adopta — el modo oscuro conserva la misma identidad de forma que el modo claro.

---

## 2. Navegación principal

**Decisión adoptada**: la navegación de nivel superior sigue la IA (arquitectura de información) más ligera de las referencias, no el listado plano de los 8 dominios de `001-business-domain-model`. Servicios y Auditoría se exponen como **pestañas dentro de Cliente 360** (sección 9), Reportes y Analítica se pliega dentro del Dashboard, y Notificaciones se expone como **acciones contextuales** (botones tipo "Solicitar", "Enviar recordatorio") en vez de una sección propia — nunca como ítem de navegación de primer nivel.

**Aclaración de nomenclatura (2026-07-18, impact-report de `001-business-domain-model`, hallazgo C2/R3)**: la "Auditoría" de esta sección y de Cliente 360 (§9.1) es **auditoría de negocio** (`business_audit_log` — altas/bajas de cliente, pagos, documentos, recibos), **distinta** de "Auditoría de acceso" (`003-supabase-auth-roles`, capacidad `view_auth_audit_log` — inicios/cierres de sesión, cambios de rol/estado de cuenta), que ya existe como pantalla propia en `apps/admin` y se agrega como ítem 7 de la lista de `§2.1` más abajo (mismo criterio que "Usuarios": función de seguridad exclusiva de Administrador, no vinculada a un cliente puntual, por lo que no encaja dentro de Cliente 360). Ambas coexisten hoy con el mismo nombre corto en la interfaz sin fusionarse ni reemplazarse entre sí — ver `004-portal-main-layout/spec.md` FR-006 para el mismo deslinde del lado de esa feature.

### 2.1 `apps/admin` (Administrador — acceso completo)

1. **Dashboard** — resumen operativo + analítica (Reportes y Analítica).
2. **Clientes** — listado + Cliente 360 (Servicios, Obligaciones Fiscales, Documentos, Cobranza y Auditoría **de negocio** viven como pestañas del detalle del cliente — distinta de "Auditoría de acceso", punto 7 más abajo).
3. **Cobranza** — cargos, pagos, cobros pendientes (vista cruzada de todos los clientes).
4. **Documentos Fiscales** — expedientes/documentos (vista cruzada de todos los clientes).
5. **Obligaciones Fiscales** — catálogo de obligaciones y periodos (vista cruzada de todos los clientes).
6. **Usuarios** — administración de cuentas/roles (no es un dominio de negocio; se mantiene como ítem propio por ser una función sensible de seguridad exclusiva de Administrador — no encaja dentro de Cliente 360 al no estar vinculada a un cliente).
7. **Auditoría de acceso** — inicios/cierres de sesión, cambios de rol y de estado de cuenta (`003-supabase-auth-roles`, capacidad `view_auth_audit_log`) — **agregado 2026-07-18**, no estaba en la lista original de esta sección a pesar de ya existir como pantalla propia en `apps/admin`; mismo criterio que "Usuarios" (función de seguridad, no vinculada a un cliente puntual, no encaja en Cliente 360). Distinta de la "Auditoría" de negocio del punto 2.
8. **Configuración** — catálogos globales (regímenes fiscales, categorías de documento, etc.).

### 2.2 `apps/portal` (Contador/Auxiliar — operación diaria)

Mismo esquema que admin, **sin** "Usuarios", "Auditoría de acceso" ni "Configuración" (exclusivos de `apps/admin`, ya establecido desde `003-supabase-auth-roles`):

1. Dashboard
2. Clientes (con Cliente 360; Auxiliar ve las mismas pestañas en solo lectura, sin acciones de gestión — mismo patrón de capacidades `view_clients`/`manage_clients` ya usado en `006`/`007`/`008`)
3. Cobranza
4. Documentos Fiscales
5. Obligaciones Fiscales

### 2.3 Reglas del componente de navegación

- Sidebar fija, ancho **240px**, fondo `background.paper`, con logo + nombre de la app + subtítulo de rol (ej. "B2B Admin Portal") en la parte superior.
- Cada ítem: icono + etiqueta, `body-md`.
- Ítem activo: acento de color (`secondary.main`) en texto e icono + **borde izquierdo de 3–4px** del mismo color + fondo con tinte sutil (`background.default` o el tinte de selección). Nunca solo color de texto sin el borde — el borde es la señal primaria de "activo".
- En móvil, la sidebar colapsa a barra inferior o menú hamburguesa (no se apila como contenido).
- Barra superior (header): buscador global a la izquierda ("Buscar clientes, RFC o documentos…"), notificaciones + ayuda + selector de cuenta a la derecha — consistente en las 5 referencias.

---

## 3. Estructura de layouts

- Modelo **Fixed-Fluid Hybrid**: sidebar fija de 240px + área de contenido en grid fluido de 12 columnas, con ancho máximo de 1440px (evita líneas de texto/tablas excesivamente anchas en monitores grandes).
- Cada página de listado (Clientes, Cobranza, Documentos, Obligaciones) sigue el mismo patrón de tres bloques verticales:
  1. **Encabezado de página**: título + descripción corta + acciones primarias a la derecha (ej. "+ Agregar Cliente", "Exportar").
  2. **Barra de filtros**: fila horizontal de selectores/segmentos (Estado, Cumplimiento, Facturación, etc.) + "Limpiar filtros" alineado a la derecha.
  3. **Tabla o lista principal** + paginación al pie.
- El Dashboard usa un layout tipo **bento grid**: fila de tarjetas KPI (4 columnas) arriba, seguida de un área de dos columnas (contenido principal ancho + panel lateral angosto de atención prioritaria/estado del sistema), y una fila final de actividad reciente.
- Cliente 360 (detalle) reemplaza el layout de listado por: tarjeta de perfil (header) + navegación por pestañas + contenido de la pestaña activa en un grid de 12 columnas tipo "bento" (ver sección 9).

---

## 4. Componentes reutilizables

Mapeados a lo que ya existe en `packages/ui` donde aplica, para que la reconciliación futura sea directa:

| Componente                     | Regla                                                                                                       | Relación con lo ya construido                                                                                                         |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Botón primario**             | Relleno sólido `primary.main`, texto blanco, radio 8px                                                      | `Button variant="contained"` ya usado en `ClienteForm`/`ContactoForm`                                                                 |
| **Botón secundario**           | Contorno (`variant="outlined"`), mismo radio                                                                | Ya usado (ej. "Cancelar")                                                                                                             |
| **Campo de texto**             | Borde 1px `divider`; foco cambia el borde a `secondary.main` + resplandor de 2px                            | `ClienteForm`/`ContactoForm` (Formik + `TextField`) sin cambios de comportamiento, solo de color                                      |
| **Badge/Chip de estado**       | Relleno al 10% de opacidad del color semántico + texto de alto contraste + forma pill                       | Ya existe parcialmente (`Chip label="Principal"` en `ClienteDetalleClient`) — extender el mismo patrón a Activo/Obsoleto/Vencido/etc. |
| **Tarjeta KPI**                | Borde 1px, ícono en esquina superior, cifra grande en `display`/`headline`, indicador de tendencia opcional | Nuevo — no existe todavía en el sistema construido                                                                                    |
| **Tarjeta de sección** (Paper) | Borde 1px + radio 12px, título `headline-md`                                                                | Ya usado en `ClienteDetalleClient` (`Paper sx={{p:3}}`)                                                                               |
| **Diálogo de confirmación**    | Modal Nivel 2, título + cuerpo corto + acciones (Cancelar / Confirmar en color de riesgo si aplica)         | Ya establecido (`ClientesClient` confirmar baja, `ClienteDetalleClient` confirmar obsoleto)                                           |
| **Avatar**                     | Circular, borde 1px `divider`                                                                               | Ya usado en headers                                                                                                                   |
| **Panel lateral de atención**  | Tarjeta con lista de alertas, cada una con severidad (color del borde izquierdo) + acciones inline          | Nuevo — patrón del Dashboard, reutilizable para cualquier módulo con pendientes urgentes                                              |

---

## 5. Patrones de tablas

- **Encabezado**: texto en mayúsculas, `label-sm`, color de texto secundario; fondo con tinte sutil respecto al cuerpo de la tabla.
- **Filas**: separadas por borde de 1px (`divider`), NO zebra-striping por defecto (el modo oscuro lo permite "con moderación" pero no es el patrón principal en ninguna referencia).
- **Hover de fila**: fondo `#f1f5f9` (claro) / `#334155` (oscuro).
- **Acciones por fila**: **REVISADO 2026-07-18** (`003-supabase-auth-roles`, research.md #14) — la versión anterior de esta regla pedía ocultarlas por defecto (`opacity: 0`) y revelarlas solo con `:hover`/`:focus-within`; se probó así en `UsuariosClient.tsx` y el usuario reportó la interacción como confusa (no quedaba claro que hubiera algo que descubrir). **Regla vigente**: cuando las acciones se presentan como `IconButton` compactos (no botones de texto), se muestran **siempre visibles** — el formato icono ya reduce el ruido visual lo suficiente, sin necesitar ocultarlas. El hide/reveal por hover queda reservado, si acaso, para acciones representadas como botones de texto (más grandes) en tablas muy densas. **Implementación recomendada**: la fila usa el prop `hover` nativo de MUI (fondo `action.hover` sobre toda la fila, señal de que la fila completa es interactiva) + las acciones son `IconButton` envueltos en `Tooltip` con el texto informativo de la acción (el mismo texto como `aria-label`); cada `IconButton` va envuelto en un `<span>` para que el `Tooltip` funcione aunque el botón esté `disabled`. (Nota: divergencia pendiente respecto a `ClientesClient`/`ClienteDetalleClient`, que siguen usando botones de texto siempre visibles; ver sección 10 — al refactorizarlas, migrar a este mismo patrón de iconos siempre visibles, no al hide/reveal ya descartado.)
- **Encabezados pegajosos ("sticky")** en tablas largas que exceden el alto de la ventana.
- **Columnas numéricas/monetarias**: fuente monoespaciada, alineación a la derecha.
- **Barras de progreso inline** (ej. cumplimiento): ancho fijo pequeño (~64px) + porcentaje a la derecha en texto, color según el umbral (sección 1.1).
- **Paginación**: pie de tabla con "Mostrando X–Y de Z" a la izquierda + controles anterior/siguiente a la derecha — mismo patrón ya implementado (`calcularTotalPaginas`, componente `Pagination` de MUI).
- **Estado vacío de tabla**: ver sección 7.

---

## 6. Patrones de formularios

- Los formularios de alta/edición viven en un **Dialog modal** (Nivel 2), nunca como página de pantalla completa — patrón ya establecido en `ClienteForm`/`ContactoForm` y que se mantiene.
- Un único componente de formulario compartido cubre alta y edición mediante una prop opcional (`undefined` = alta, valor definido = edición) — patrón ya establecido, se conserva.
- **Validación**: Formik + Yup (ya establecido por la Constitución); errores se muestran bajo el campo correspondiente (`helperText`), nunca solo con un color de borde sin texto.
- **Errores de servidor** (ej. RFC duplicado): se muestran como un `Alert severity="error"` dentro del propio modal, sin cerrarlo y sin perder los datos capturados — patrón ya establecido en `007`/`008`.
- **Campos obligatorios**: marcados con `required` nativo de MUI (asterisco), nunca solo mencionados en el texto de ayuda.
- **Selects dependientes** (ej. régimen fiscal filtrado por tipo de persona): la opción actualmente seleccionada se conserva visible aunque ya no sea válida, marcada explícitamente como "ya no vigente/incompatible" — patrón ya establecido en `ClienteForm`, se conserva como regla general para cualquier select dependiente futuro.
- **Botones de acción del formulario**: "Cancelar" (texto/ghost) a la izquierda, acción primaria ("Guardar"/"Guardando…") a la derecha, siempre en ese orden.

---

## 7. Estados visuales

| Estado                            | Regla                                                                                                                                                                                                                                                                                 |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vacío** (tabla/lista sin datos) | Mensaje corto en texto secundario explicando por qué está vacío (ej. "No hay contactos activos registrados todavía"), nunca una tabla con solo el encabezado y nada más.                                                                                                              |
| **Cargando**                      | Para transiciones cortas (Server Actions), el botón que disparó la acción cambia su texto a un gerundio ("Guardando…") y se deshabilita — patrón ya establecido. Para cargas de página, usar un esqueleto o indicador simple, no un layout que salte de tamaño al terminar de cargar. |
| **Error**                         | `Alert severity="error"` con mensaje claro y accionable; nunca un mensaje técnico crudo (ej. mensajes de Postgres) sin traducir — patrón ya establecido (`mapearErrorClienteAMensaje`, `mapearErrorContactoAMensaje`).                                                                |
| **Éxito**                         | Confirmación breve y no bloqueante (`Alert severity="success"` o snackbar), no un modal que requiera un clic adicional para cerrarse.                                                                                                                                                 |
| **Deshabilitado**                 | Opacidad reducida + cursor no permitido; nunca ocultar el control por completo si el usuario podría esperar verlo (ej. "Marcar como principal" deshabilitado, no oculto, cuando ya es principal).                                                                                     |
| **Hover**                         | Cambio de fondo sutil (fila de tabla, ítem de lista, ítem de nav) — nunca cambio de color de texto únicamente.                                                                                                                                                                        |
| **Foco** (accesibilidad)          | Contorno de 2px en `secondary.main`/acento, visible con navegación por teclado — obligatorio en todos los campos interactivos.                                                                                                                                                        |
| **Seleccionado/Activo**           | Tinte de fondo + (en nav) borde lateral de acento — mismo lenguaje visual en toda la aplicación, no un patrón distinto por módulo.                                                                                                                                                    |
| **Atención/Prioridad**            | Borde izquierdo de color semántico + fondo con tinte del mismo color, usado para tarjetas de alerta (ej. panel "Atención Prioritaria" del Dashboard) — reservado para severidad Alta; severidad media/baja usa el mismo patrón sin el tinte de fondo.                                 |

---

## 8. Modo claro y modo oscuro

- **CONFIRMADO**: el modo oscuro DEBE mantener la misma identidad visual que el modo claro — únicamente cambian variables de color, contraste y superficies (fondo, bordes, tinte de hover/selección). Forma (radios), tipografía, espaciado y estructura de layout son idénticos entre modos; ningún componente cambia de tamaño, posición o radio de esquina al alternar el tema.
- **Ambos modos son ciudadanos de primera clase** — cada componente nuevo debe diseñarse y probarse en los dos, no solo en claro con un "ajuste" posterior. Mismo patrón que ya sigue el resto del proyecto (artefactos publicados de este sistema soportan ambos temas).
- El mapeo semántico de estado (azul=positivo, rojo=negativo, gris=neutro) es **idéntico** en ambos modos (sección 1.2, regla de paridad) — confirmado, sin excepciones.
- Los bordes reemplazan a las sombras como mecanismo principal de separación visual en modo oscuro (las sombras "se ven sucias" sobre fondos oscuros) — se mantienen bordes de 1px en ambos modos, cambiando solo su color.
- Radios de esquina: escala única confirmada (sección 1.5) — el modo oscuro no introduce su propia escala.

---

## 9. Experiencia Cliente 360

Ninguna de las 5 capturas está nombrada "Cliente 360", pero el panel de detalle oculto por defecto dentro de "Módulo de Clientes" (`docs/ux/screenshots/m_dulo_de_clientes/code.html`, sección `#client-detail-view`) es exactamente ese concepto — se adopta como el patrón oficial de detalle de Cliente, reemplazando/extendiendo el `ClienteDetalleClient` ya construido en `008-contactos-y-detalle-cliente`.

### 9.1 Estructura

1. **Acción de regreso**: enlace "← Volver al directorio" en la parte superior — el detalle de cliente reemplaza la vista de listado en el mismo espacio, no abre una ruta completamente distinta visualmente (aunque en `apps/admin`/`apps/portal` sí vive en su propia ruta `/clientes/[id]`, ya construida en `008`).
2. **Tarjeta de perfil (header)**: iniciales/avatar del cliente + nombre + badge de verificación/estado + datos de contacto rápidos (RFC, correo, teléfono) a la izquierda; indicador destacado (ej. "Salud de Cumplimiento") + acción primaria contextual (ej. "Actualizar Auditoría") a la derecha.
3. **Navegación por pestañas**, con la pestaña activa indicada por una línea/indicador bajo el texto (no un cambio de fondo): **Información General · Servicios · Obligaciones Fiscales · Documentos · Cobranza · Auditoría**.
4. **Contenido de "Información General"** en grid bento de 12 columnas:
   - Tarjeta de **Contacto Principal** (4 columnas): foto/avatar, nombre, cargo, extensión directa, "autorizado para" (chips de permisos, ej. Facturación/Auditoría) — mapea directo al Contacto marcado como principal de `008-contactos-y-detalle-cliente`.
   - Tarjeta de **Domicilio y Registro Legal** (8 columnas): dirección fiscal, representante legal, fecha de constitución, folio/registro.
   - Fila de **resumen financiero** (12 columnas, 4 tarjetas): facturación acumulada, obligaciones abiertas, última declaración presentada, servicios activos — cada una como mini-KPI con su propia tendencia/estado.
5. Las demás pestañas (Servicios, Obligaciones Fiscales, Documentos, Cobranza) muestran, dentro del mismo panel, la información de ESE dominio filtrada por el cliente actual — reutilizando los mismos patrones de tabla/lista de la sección 5, no una tabla distinta por pestaña.
6. La pestaña **Auditoría** muestra el registro histórico (`business_audit_log`, ya existente) filtrado por ese cliente — es la superficie principal para consultar auditoría por cliente; una vista global cruzada entre clientes (si se necesita) vive fuera de Cliente 360, bajo Configuración o un módulo propio, sin duplicar esta pestaña.

### 9.2 Reglas

- Cliente 360 es la **única puerta de entrada** para gestionar Contactos, Servicios contratados, Obligaciones Fiscales y Documentos de un cliente específico — ningún otro módulo debe duplicar formularios de edición para datos que pertenecen a un cliente puntual (consistente con `001-business-domain-model`, principio de separación de responsabilidades).
- Las acciones de gestión (agregar contacto, marcar obsoleto, etc.) respetan el mismo gate de capacidades ya usado (`manage_clients` habilita, `view_clients` solo consulta) — Auxiliar ve las 6 pestañas pero sin ningún botón de creación/edición, mismo patrón que `008`.
- El indicador de "Salud de Cumplimiento" (o cualquier métrica destacada del header) usa la regla de umbral de color de la sección 1.1 — nunca un color fijo independiente del valor.

---

## 10. Notas de alineación con lo ya construido (no se aplica en este documento)

**CONFIRMADO 2026-07-17**: estos gaps quedan registrados como pendientes de actualización — no se aplica ningún cambio de código todavía. Se resolverán cuando se refactoricen los módulos correspondientes:

1. ~~**Row-actions: migrar a iconos siempre visibles**~~ — **RESUELTO 2026-07-18** (`009-migrate-design-system`, FR-013): `ClientesClient.tsx` (ambas apps) y la tabla de Contactos de `ClienteDetalleClient.tsx` migraron sus botones de acción de texto a `IconButton` + `Tooltip` (siempre visibles) + `TableRow hover`, igual que el patrón ya resuelto en `UsuariosClient.tsx` (punto 5 más abajo).
2. ~~**Tema MUI compartido basado en este design system**~~ — **RESUELTO 2026-07-18** (`009-migrate-design-system`, FR-001/FR-008): se creó `packages/ui/src/theme` (tokens de color/tipografía/espaciado/radios/elevación de las secciones 1–8, con variantes clara y oscura, más `ColorModeProvider`/`useColorMode` para la alternancia FR-009/FR-010) y ambas apps retiraron sus temas locales divergentes (`apps/{admin,portal}/src/lib/mui/theme.ts`, ya eliminados) para consumir exclusivamente este Theme compartido vía `ThemeRegistry.tsx`.
3. **Actualizar la navegación cuando existan los módulos Cobranza, Documentos y Obligaciones**: **actualización 2026-07-17** — `apps/portal` ya tiene placeholders "próximamente" para Cobranza, Documentos Fiscales y Obligaciones Fiscales en su navegación (`004-portal-main-layout`, Rework #2), alineados a la lista de esta sección; sigue pendiente solo cuando esos módulos tengan sus propios specs y pantallas reales (hoy son ítems deshabilitados, sin página detrás). `apps/admin` no lista módulos futuros (ver `004-portal-main-layout/spec.md`, Clarifications) — actualizar su barra lateral real cuando esos módulos existan ahí también.
4. **Transformar `ClienteDetalleClient` a una experiencia tabulada (Cliente 360)**: la versión actual (`008`) es de una sola columna (datos generales + tabla de Contactos + placeholder de Pagos Pendientes), sin pestañas. Migrarlo a la estructura de pestañas de la sección 9 (Información General · Servicios · Obligaciones Fiscales · Documentos · Cobranza · Auditoría) cuando esos dominios existan y tengan datos que mostrar.
5. ~~**Row-actions en `UsuariosClient.tsx`**~~ — **RESUELTO 2026-07-18** (`003-supabase-auth-roles`, research.md #14): los 4 botones de texto se reemplazaron por `IconButton`/`Tooltip` (`EditIcon`, `ToggleOnIcon`/`ToggleOffIcon`, `LockResetIcon`, `TuneIcon`) + `TableRow hover` (fondo de hover nativo sobre toda la fila). **Iteración 2026-07-18**: la primera versión los ocultaba por defecto y los revelaba con `:hover`/`:focus-within` — el usuario probó esa versión en el navegador y la reportó confusa ("los botones siguen viéndose solo cuando hacemos hover"); se cambió a **siempre visibles** (sin ocultar/revelar), conservando el `Tooltip` y el `hover` nativo de la fila. Este patrón final (icono + tooltip siempre visibles + hover nativo de fila) queda como la implementación de referencia para el punto 1 (Clientes) cuando se refactorice.
6. ~~**Badge/Chip de estado en `UsuariosClient.tsx`**~~ — **RESUELTO 2026-07-17** (`003-supabase-auth-roles`, research.md #14): la columna "Estado" ya usa un `Chip` (relleno 10% de opacidad de `secondary.main` para "Activa", `text.secondary` para "Desactivada") en vez de texto plano.
7. ~~**Badge/Chip de estado en `ClientesClient.tsx`**~~ (`006-crud-clientes-admin`) — **RESUELTO 2026-07-18** (`009-migrate-design-system`, FR-012): la columna "Estado" ahora usa el componente compartido `StatusChip` (`packages/ui`), mismo patrón visual que `UsuariosClient.tsx`.
8. ~~**Badge/Chip de estado en `ClientesPortalClient.tsx`**~~ (`007-alta-cliente-portal`) — **RESUELTO 2026-07-18** (`009-migrate-design-system`, FR-012): mismo componente `StatusChip` aplicado en la tabla de clientes de `apps/portal`.
9. ~~**Badge/Chip de estado en `ClienteDetalleClient.tsx`**~~ (`008-contactos-y-detalle-cliente`) — **RESUELTO 2026-07-18** (`009-migrate-design-system`, FR-012): tanto el "Estado" del Cliente (sección "Datos generales") como el de cada Contacto en su tabla usan ahora `StatusChip`. La migración a la estructura tabulada de Cliente 360 (punto 4) sigue pendiente y fuera del alcance de `009` (que fue exclusivamente de presentación, sin tocar la estructura de la pantalla).

**Referencia para specs futuros**: esta documentación UX (`docs/ux/design.md`, `design_dark.md`, `docs/ux/design-system.md`) es la fuente de verdad de diseño a consultar al escribir el plan de cualquier módulo nuevo (Servicios, Gestión Fiscal, Cobranza, Notificaciones, etc.), igual que `001-business-domain-model` lo es para límites de responsabilidad.
