# Reporte de Impacto: `001-business-domain-model` vs. Specs Existentes

**Fecha**: 2026-07-17 | **Alcance**: `000`–`008`, `.specify/memory/constitution.md`, `docs/ux/design-system.md`, y el código ya implementado en `apps/admin`/`apps/portal`/`packages/auth` que esos specs produjeron.

**Nota**: Este documento es solo de análisis — **no se modificó ningún spec, código ni configuración** al generarlo. Todos los hallazgos quedan registrados para decidir cuándo y cómo resolverlos, siguiendo el mismo criterio ya usado en `001-business-domain-model` (sección "Actualizaciones Pendientes en Specs Existentes"), a la que este reporte extiende con más detalle y con los specs `000`–`004` que aquella sección no cubría.

---

## Resumen ejecutivo

- **0 contradicciones de negocio** entre `001` y las decisiones ya tomadas en `005`–`008` (Clientes/Contactos/Cobranza/Documentos) — esos specs son consistentes con los límites de dominio de `001`.
- **2 contradicciones concretas de navegación/nomenclatura**, una de ellas ya en código ejecutándose (`004-portal-main-layout` + `apps/portal/src/components/layout/navigation.ts`).
- **Buena noticia no documentada en `001`**: `003-supabase-auth-roles` ya construyó capacidades (`manage_billing`/`view_billing`, `manage_documents`/`view_documents`) que Cobranza y Gestión Documental Fiscal podrán reusar directamente — reduce el trabajo pendiente que `001` estimaba.
- Los dos vacíos de esquema que `001` ya había registrado (Servicios sin catálogo, Documentos sin Periodo Fiscal) siguen sin resolverse — correcto, siguen diferidos a sus propios specs.

---

## 1. Contradicciones

### C1 — Navegación de `apps/portal` usa nombres de módulo ya desactualizados (Alto impacto, código ya escrito)

`004-portal-main-layout/spec.md` FR-006 exige: _"una entrada para cada módulo de negocio descrito en la constitución del proyecto (Clientes, Cobranza, Expedientes Digitales, Recibos de Honorarios, Reportes)"_. Esa lista ya no coincide con la Constitución actualizada en `001` (`Clientes, Servicios, Cobranza (incluye Recibos de Honorarios), Gestión Fiscal, Gestión Documental Fiscal (Expedientes Digitales), Notificaciones, Reportes y Analítica`).

Esto no es solo un spec desactualizado — el código correspondiente ya existe y contiene literalmente los nombres viejos:

```ts
// apps/portal/src/components/layout/navigation.ts
{ label: 'Cobranza', href: '/cobranza', icon: PaymentsIcon, implemented: false },
{ label: 'Expedientes Digitales', href: '/expedientes', icon: FolderIcon, implemented: false },
{ label: 'Recibos de Honorarios', href: '/recibos', icon: ReceiptLongIcon, implemented: false },
{ label: 'Reportes', href: '/reportes', icon: AssessmentIcon, implemented: false },
```

Además, **ninguna entrada existe todavía ni siquiera como placeholder** para "Servicios" ni "Gestión Fiscal" — dos de los tres dominios nuevos de `001` no están representados en absoluto en la navegación ya construida.

### C2 — "Auditoría" significa dos cosas distintas en el sistema, y solo una tiene pantalla (Medio impacto)

`docs/ux/design-system.md` (sección 2) pliega "Auditoría" como pestaña de Cliente 360, asumiendo que se refiere al `business_audit_log` de negocio (`005`: altas/bajas de cliente, pagos, documentos, recibos). Pero **`apps/admin` ya tiene una pantalla "Auditoría" de primer nivel** (`apps/admin/src/components/layout/navigation.ts`, capacidad `view_auth_audit_log`), correspondiente a un concepto **distinto**: el log de eventos de autenticación de `003-supabase-auth-roles` (inicios/cierres de sesión, cambios de rol, activación/desactivación de cuentas — FR-009 de `003`).

El propio `design-system.md` (sección 10, punto 3) describe esto de forma imprecisa: dice que "Auditoría" está disponible "solo implícitamente... sin pantalla propia" — **es inexacto**: sí existe una pantalla propia, solo que es para el otro tipo de auditoría (acceso, no negocio). Esta ambigüedad de nombre debe resolverse (ver R3) antes de tocar la navegación real, para no terminar con dos secciones llamadas "Auditoría" con contenidos completamente distintos.

### Nota — la corrección de "Recibos de Honorarios" ya está resuelta, no es una contradicción pendiente

La Constitución ya declara "Cobranza (incluye Recibos de Honorarios)" desde la sesión de `001` — consistente con el esquema real de `005`, donde `recibos` ya vive junto a `cargos_cobranza`/`pagos` sin lógica de negocio propia separada. Se incluye aquí solo para dejar constancia de que **no** es un ajuste pendiente adicional, aunque C1 muestre que la navegación de `apps/portal` todavía no refleja esa corrección.

---

## 2. Información faltante

### F1 — `001` no documenta que ya existen capacidades listas para Cobranza y Gestión Documental Fiscal

`packages/auth/src/roles.ts` (de `003-supabase-auth-roles`) ya define `manage_billing`/`view_billing` y `manage_documents`/`view_documents`, ya asignadas por rol por defecto (Contador: ambas de gestión + lectura; Auxiliar: solo lectura) — **sin ningún módulo que las use todavía**. `001-business-domain-model` no menciona esto en absoluto; es información valiosa que reduce el trabajo pendiente estimado para esos dos dominios y debería incorporarse al `research.md` de sus futuros specs (evitar inventar nombres de capacidad nuevos).

### F2 — Falta la dimensión de "capacidades" en el análisis de gaps de `001`

`001` registra que Servicios, Gestión Fiscal y Notificaciones no tienen entidades de datos todavía, pero no señala explícitamente que **tampoco tienen capacidades** (`Capability` en `packages/auth/src/roles.ts`) — ni `manage_services`/`view_services`, ni un equivalente para Obligaciones/Periodos Fiscales, ni nada para Notificaciones. Cualquier spec futuro de esos dominios deberá decidir el nombre de sus capacidades nuevas desde cero.

### F3 — `manage_catalogs` existe pero no tiene dueño claro

Existe una capacidad `manage_catalogs` en `packages/auth/src/roles.ts` sin ningún consumidor todavía. Es ambigua entre **Configuración** (régimen fiscal, categorías de documento — catálogos ya existentes en `005`) y un futuro **catálogo de Servicios** (que por definición también es un catálogo). Quien especifique Servicios o el propio módulo de Configuración deberá decidir a cuál pertenece antes de reutilizarla, para no terminar con dos dominios gateados por la misma capacidad sin relación real entre sí.

### F4 — `business_audit_log.entidad` es texto libre, sin `enum`/`check`

Dato no mencionado en `001` que facilita el trabajo futuro: `entidad` en `business_audit_log` (`005`) es de tipo `text` sin restricción — agregar auditoría para una entidad nueva (Servicio, Obligación Fiscal, Notificación) no requiere una migración de esquema, solo un nuevo trigger que llame a `log_business_audit()`. Vale la pena documentarlo como facilitador para cuando se decida auditar esos dominios (o explícitamente no hacerlo, como ya se decidió para Contactos en `008`).

### F5 — Sin vacíos nuevos en "Portal del Cliente"

No se encontró información adicional faltante sobre el "Portal del Cliente" más allá de lo ya aclarado en `001` (Clarifications) — sigue siendo, correctamente, terreno enteramente sin especificar.

---

## 3. Entidades que cambiaron (o que se anticipa que cambiarán)

| Entidad                               | Estado                                | Detalle                                                                                                                                                                                                                                                                                             |
| ------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cargos_cobranza` (Cargo de Cobranza) | **Cambio anticipado, no aplicado**    | `concepto` es hoy texto libre (`005` FR-005); se anticipa un FK opcional a un futuro catálogo de Servicios, preservando el patrón de snapshot inmutable que ya usa `recibos.concepto` (`005` FR-025) para no alterar cargos/recibos históricos. Ya registrado en `001`, Actualización Pendiente #1. |
| `documentos` / `categorias_documento` | **Cambio anticipado, no aplicado**    | Hoy se relacionan solo con `cliente_id`; se anticipa una relación opcional a un futuro Periodo Fiscal cuando exista Gestión Fiscal. Ya registrado en `001`, Actualización Pendiente #2.                                                                                                             |
| `contactos`                           | **Ya cambió** (no por causa de `001`) | `008-contactos-y-detalle-cliente` agregó `estado` (activo/obsoleto) y `es_principal`. Es el precedente real más reciente del principio "nunca eliminar, marcar obsoleto" que `001` documenta como regla general — coherente, no contradictorio.                                                     |
| `clientes`                            | Sin cambios                           | Su límite de responsabilidad (no incluye Servicios/Pagos/Documentos) ya coincide exactamente con `001` FR-004.                                                                                                                                                                                      |
| `Capability` (tipo, `packages/auth`)  | **Cambio anticipado, no aplicado**    | No es una entidad de negocio, pero es el artefacto que más cambiará: cada dominio nuevo probablemente agregue 2 valores (`manage_X`/`view_X`) de forma aditiva. Ver F1/F2.                                                                                                                          |

---

## 4. Reglas que deben actualizarse

| #   | Regla / archivo                                         | Motivo                                                                                                                                                                                                                                                                               | Ligado a                                     |
| --- | ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| R1  | `apps/portal/src/components/layout/navigation.ts`       | Reemplazar labels "Cobranza"/"Expedientes Digitales"/"Recibos de Honorarios"/"Reportes" por nombres alineados a la Constitución/`001`; agregar placeholders para "Servicios" y "Obligaciones Fiscales" (hoy ausentes por completo).                                                  | C1                                           |
| R2  | `specs/004-portal-main-layout/spec.md` FR-006           | El texto literal de la lista de módulos quedó desactualizado frente a la Constitución ya corregida — actualizar la redacción o anotarla como superada por `001`.                                                                                                                     | C1                                           |
| R3  | `docs/ux/design-system.md` (secciones 2 y 10)           | Diferenciar explícitamente "Auditoría de acceso" (`003`, ya con pantalla en `apps/admin`) de "Auditoría de negocio" (`005`, propuesta como pestaña de Cliente 360) — decidir nombres que no choquen entre sí antes de construir la navegación real.                                  | C2                                           |
| R4  | `packages/auth/src/roles.ts`                            | Al especificar cada dominio nuevo, agregar sus capacidades de forma aditiva (nunca remover `ALL_CAPABILITIES` existentes); reusar `manage_billing`/`view_billing` para Cobranza y `manage_documents`/`view_documents` para Gestión Documental Fiscal en vez de crear nombres nuevos. | F1                                           |
| R5  | `specs/005-clientes-cobranza-expedientes/data-model.md` | Al especificar Servicios, revisar si `cargos_cobranza.concepto` deriva de un Servicio, preservando el snapshot inmutable de `recibos` (FR-025) sin alterar cargos/recibos ya emitidos.                                                                                               | E1 (ya en `001`, Actualización Pendiente #1) |
| R6  | `specs/005-clientes-cobranza-expedientes/data-model.md` | Al especificar Gestión Fiscal, revisar si `documentos` requiere relación opcional a Periodo Fiscal, sin alterar el expediente ya construido.                                                                                                                                         | E2 (ya en `001`, Actualización Pendiente #2) |

---

## 5. Módulos afectados

| Spec / artefacto                               | Nivel de impacto                | Motivo                                                                                                                                                      | Acción sugerida (no aplicada)                                                     |
| ---------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `000-monorepo-base-setup`                      | Ninguno                         | Infraestructura del monorepo, sin contenido de dominio de negocio.                                                                                          | Ninguna.                                                                          |
| `002-supabase-docker-stack`                    | Ninguno                         | Infraestructura de despliegue, sin contenido de dominio.                                                                                                    | Ninguna.                                                                          |
| `003-supabase-auth-roles`                      | Bajo (positivo)                 | Ya provee capacidades listas para Cobranza y Gestión Documental Fiscal, sin saberlo explícitamente.                                                         | Documentar la relación en el `research.md` de esos futuros specs (F1, R4).        |
| `004-portal-main-layout`                       | **Alto**                        | FR-006 y el código ya construido (`navigation.ts` de `apps/portal`) usan nombres de módulo desactualizados; faltan por completo Servicios y Gestión Fiscal. | Actualizar FR-006 + `navigation.ts` cuando se aborde la navegación real (R1, R2). |
| `005-clientes-cobranza-expedientes`            | Medio (diferido, ya registrado) | 2 de los 2 ajustes de esquema pendientes de `001` recaen aquí (Servicios detrás de Cargo; Documento sin Periodo Fiscal).                                    | Sin acción hasta especificar Servicios/Gestión Fiscal (R5, R6).                   |
| `006-crud-clientes-admin`                      | Ninguno                         | No toca Servicios/Obligaciones/Recibos; alineado con `001`.                                                                                                 | Ninguna.                                                                          |
| `007-alta-cliente-portal`                      | Ninguno                         | Ídem.                                                                                                                                                       | Ninguna.                                                                          |
| `008-contactos-y-detalle-cliente`              | Ninguno                         | El patrón "obsoleto en vez de eliminar" ya sigue el principio de registros históricos de `001`.                                                             | Ninguna.                                                                          |
| `docs/ux/design-system.md`                     | Medio                           | Confunde los dos significados de "Auditoría" (C2); anticipa navegación de módulos que aún no existen (ya reconocido en su propia sección 10).               | Aclarar terminología de Auditoría antes de construir la navegación real (R3).     |
| `packages/auth/src/roles.ts` (código, no spec) | Bajo (preparado)                | Ya anticipa capacidades de Cobranza/Documentos; faltan las de Servicios/Gestión Fiscal/Notificaciones.                                                      | Agregar de forma aditiva cuando cada dominio se especifique (F2, R4).             |
| `.specify/memory/constitution.md`              | Ninguno (ya resuelto)           | Ya se actualizó en la sesión de `001`.                                                                                                                      | Ninguna.                                                                          |

---

## Hallazgos positivos (no requieren acción, solo se documentan)

- La Constitución ya quedó alineada con `001` (aplicado en la sesión anterior).
- Las capacidades de Cobranza y Gestión Documental Fiscal ya existen en código, reduciendo el trabajo futuro estimado por `001`.
- `business_audit_log.entidad` es texto libre — extender auditoría de negocio a dominios nuevos no requiere migración de esquema.
- El principio "nunca eliminar, marcar obsoleto" de `001` ya está validado en código real y en producción de pruebas (`008`, Contactos) — no es solo teoría.
- `006`/`007`/`008` no presentan ninguna contradicción con `001` y pueden usarse como plantilla de patrones (Server Component + Server Action + Client Component, gate `view_X`/`manage_X`) al especificar los dominios nuevos.

---

## Siguiente paso sugerido (no aplicado)

Ninguno de los hallazgos de este reporte se resolvió como parte de generarlo. Cuando se decida actuar, el orden de menor a mayor esfuerzo sería: R3 (aclarar nombres de "Auditoría", solo documentación) → R1/R2 (actualizar navegación y su spec) → R4 (agregar capacidades aditivas al especificar cada dominio) → R5/R6 (cambios de esquema, solo al especificar Servicios/Gestión Fiscal).

---

## Estado de aplicación (2026-07-18 — actualizado)

Todos los hallazgos de este reporte se revisaron y aplicaron en sesiones posteriores de refinamiento por spec (`003`, `004`, `005`) más esta sesión de cierre. Ninguno requirió una decisión de producto nueva — todos eran correcciones de documentación (o, en dos casos, bugs de código) ya determinados por decisiones previas.

| #   | Estado                                       | Dónde se aplicó                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| --- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | ✅ Resuelto                                  | `004-portal-main-layout/spec.md` FR-006 reescrito (ver R2); `apps/portal/src/components/layout/navigation.ts` ya actualizado en el Rework #2 de `004`.                                                                                                                                                                                                                                                                                             |
| C2  | ✅ Resuelto                                  | Ver R3.                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| F1  | ✅ Resuelto                                  | `003-supabase-auth-roles/spec.md`, Assumptions (nota 2026-07-17): documenta que `manage_billing`/`view_billing`/`manage_documents`/`view_documents` ya existen pre-asignadas.                                                                                                                                                                                                                                                                      |
| F2  | ✅ Resuelto                                  | `003-supabase-auth-roles/spec.md`, Assumptions: Servicios/Gestión Fiscal/Notificaciones no tienen capacidad todavía, queda anotado para quien los especifique.                                                                                                                                                                                                                                                                                     |
| F3  | ✅ Resuelto                                  | `003-supabase-auth-roles/spec.md`, Assumptions: `manage_catalogs` queda explícitamente sin dueño (Configuración vs. futuro catálogo de Servicios).                                                                                                                                                                                                                                                                                                 |
| F4  | ✅ Resuelto                                  | `005-clientes-cobranza-expedientes/data-model.md` y `spec.md`: `business_audit_log.entidad` documentado como facilitador (texto libre por diseño).                                                                                                                                                                                                                                                                                                 |
| F5  | Sin acción (ya era correcto)                 | No requería cambio.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| E1  | ✅ Resuelto (nota, no aplicado en esquema)   | `005-clientes-cobranza-expedientes/data-model.md`: nota junto a `cargos_cobranza.concepto` anticipando la FK futura a Servicios.                                                                                                                                                                                                                                                                                                                   |
| E2  | ✅ Resuelto (nota, no aplicado en esquema)   | `005-clientes-cobranza-expedientes/data-model.md`: nota junto a `documentos`/`categorias_documento` anticipando la relación futura a Periodo Fiscal.                                                                                                                                                                                                                                                                                               |
| R1  | ✅ Resuelto (con una desviación documentada) | `apps/portal/src/components/layout/navigation.ts` ya corregido (`004` Rework #2): Cobranza/Documentos Fiscales/Obligaciones Fiscales. **Desviación respecto a la sugerencia original**: no se agregó placeholder de "Servicios" — `docs/ux/design-system.md` §2 (publicado después de este reporte) define que Servicios vive como pestaña de Cliente 360, no como ítem de nav; esa guía más específica y posterior sustituye la sugerencia de R1. |
| R2  | ✅ Resuelto                                  | `004-portal-main-layout/spec.md` FR-006 reescrito para usar los nombres vigentes.                                                                                                                                                                                                                                                                                                                                                                  |
| R3  | ✅ Resuelto                                  | `docs/ux/design-system.md` §2 (esta sesión): nota explícita distinguiendo "Auditoría de acceso" (`003`, `apps/admin`) de "Auditoría de negocio" (`005`, Cliente 360) — de paso se encontró y corrigió un hallazgo nuevo: "Auditoría de acceso" nunca aparecía como ítem propio en la lista ideal de `§2.1`, a pesar de ya existir como pantalla en `apps/admin`; se agregó como ítem 7 (mismo criterio que "Usuarios").                            |
| R4  | Sin acción pendiente (es guía, no una tarea) | Documentado en `003-supabase-auth-roles/spec.md` Assumptions; se aplicará cuando exista un spec real de Servicios/Gestión Fiscal — no hay nada que "aplicar" hoy.                                                                                                                                                                                                                                                                                  |
| R5  | ✅ Resuelto (nota, no aplicado en esquema)   | Igual que E1.                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| R6  | ✅ Resuelto (nota, no aplicado en esquema)   | Igual que E2.                                                                                                                                                                                                                                                                                                                                                                                                                                      |

**Hallazgo adicional no listado originalmente** (detectado al aplicar R3): la política RLS de `business_audit_log` restringía el `SELECT` a solo Administrador, contradiciendo `docs/ux/design-system.md` §9.2 (Auxiliar debe poder ver la pestaña "Auditoría" de Cliente 360 en solo lectura) — corregido con la migración `20260718100000_business_audit_log_select_staff.sql` durante el refinamiento de `007-alta-cliente-portal`.

**Sin acción pendiente de este reporte.** Los únicos ítems que siguen "abiertos" (E1/E2/R5/R6, F2) lo están por diseño: son notas para specs que todavía no existen (Servicios, Gestión Fiscal), no defectos a corregir ahora.
