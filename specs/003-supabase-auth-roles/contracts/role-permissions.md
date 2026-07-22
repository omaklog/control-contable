# Contrato: matriz de roles y capacidades

**Feature**: [../spec.md](../spec.md)

Fuente única de verdad en código: `packages/auth/src/roles.ts` (plantilla por defecto) + `permission_overrides` en base de datos (excepciones por usuario, ver `data-model.md` y research.md #13). Esta tabla documenta la **plantilla por defecto** por rol que ese módulo debe cumplir (FR-003, FR-005, FR-006, FR-014).

> **Revisión 2026-07-15**: se elimina la columna "Cliente" (ya no existe ese rol). El acceso a `apps/admin`/`apps/portal` es una regla fija por rol (FR-002), **no** una capacidad ajustable por usuario — se documenta aparte, no en esta tabla de capacidades.

## Acceso a aplicaciones (fijo por rol, no ajustable por usuario — FR-002)

| Aplicación    | Administrador | Contador | Auxiliar |
| ------------- | :-----------: | :------: | :------: |
| `apps/admin`  |      ✅       |    ❌    |    ❌    |
| `apps/portal` |      ✅       |    ✅    |    ✅    |

## Capacidades (plantilla por rol + excepciones por usuario)

**Actualización 2026-07-17**: tabla regenerada a partir de los valores reales de `ALL_CAPABILITIES`/`ROLE_DEFAULT_CAPABILITIES` en `packages/auth/src/roles.ts` — la versión anterior usaba categorías abstractas ("futuros módulos") que ya no podían verificarse contra código, porque `manage_clients`/`view_clients` (`006`/`007`) ya están implementadas y `manage_billing`/`view_billing`/`manage_documents`/`view_documents` ya existen pre-asignadas por rol (ver `spec.md`, Assumptions 2026-07-17) aunque sus módulos (Cobranza, Gestión Documental Fiscal) todavía no existan.

**Actualización 2026-07-22 (016-expediente-fiscal)**: `manage_documents` se extiende a Contador y Auxiliar — ambos roles deben poder cargar, clasificar, asociar y eliminar documentos del Expediente Fiscal; el límite de antigüedad de 3 meses para la eliminación (Administrador sin límite) se aplica en base de datos (trigger `validar_eliminacion_logica_documento`), no mediante una capacidad distinta. Se retira la nota "sin módulo todavía" de `manage_documents`/`view_documents`: Gestión Documental Fiscal ya existe.

| Capacidad                 | Administrador | Contador | Auxiliar | Módulo/función                                                                                                                                                              |
| ------------------------- | :-----------: | :------: | :------: | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `manage_users`            |      ✅       |    ❌    |    ❌    | Crear cuentas de personal, cambiar rol, activar/desactivar (FR-006)                                                                                                         |
| `view_auth_audit_log`     |      ✅       |    ❌    |    ❌    | Consultar el registro de auditoría de **acceso/autenticación** (FR-009)                                                                                                     |
| `manage_user_permissions` |      ✅       |    ❌    |    ❌    | Ajustar permisos individuales de otro usuario (FR-014)                                                                                                                      |
| `manage_clients`          |      ✅       |    ✅    |    ❌    | Gestionar clientes — alta/edición/baja (`006`/`007`)                                                                                                                        |
| `view_clients`            |      ✅       |    ✅    |    ✅    | Consultar clientes                                                                                                                                                          |
| `manage_billing`          |      ✅       |    ✅    |    ❌    | Gestionar cobranza — cargos y pagos (**sin módulo todavía**, ver `spec.md`)                                                                                                 |
| `view_billing`            |      ✅       |    ✅    |    ✅    | Consultar cobranza (**sin módulo todavía**)                                                                                                                                 |
| `manage_documents`        |      ✅       |    ✅    |    ✅    | Cargar, clasificar, asociar y eliminar documentos del Expediente Fiscal (`016`; eliminación con límite de antigüedad para Contador/Auxiliar, sin límite para Administrador) |
| `view_documents`          |      ✅       |    ✅    |    ✅    | Consultar documentos del Expediente Fiscal (`016`)                                                                                                                          |
| `manage_catalogs`         |      ✅       |    ❌    |    ❌    | **Sin consumidor todavía** — ambigua entre Configuración y un futuro catálogo de Servicios (ver `spec.md`, Assumptions)                                                     |

La asignación por rol de esta tabla es la plantilla por defecto (`ROLE_DEFAULT_CAPABILITIES`); un Administrador puede otorgar o retirar cualquiera de estas capacidades para un usuario puntual mediante `permission_overrides` (FR-014), sin alterar la plantilla de su rol.

## Garantías del contrato

- `packages/auth` expone `roleDefaultCapabilities(role: AppRole): Capability[]` como la plantilla por rol de esta tabla; `getCurrentProfile()` combina esa plantilla con las filas de `permission_overrides` del usuario para resolver `CurrentProfile.capabilities` — ningún componente decide visibilidad comparando strings de rol directamente ni consultando `permission_overrides` por su cuenta.
- El acceso a aplicaciones (`requireApp('admin' | 'portal')`) es independiente del sistema de capacidades: es una regla fija por rol que un Administrador **no puede** ajustar por usuario — evita que un ajuste de permisos termine, indirectamente, dándole a un Contador o Auxiliar acceso a `apps/admin`.
- Esta matriz debe mantenerse en paridad con las políticas RLS descritas en `db-functions-rls.md`: la UI oculta lo que el rol (más sus ajustes) no puede hacer, pero la base de datos es la que realmente lo impide (defensa en profundidad, constitución — "nunca confiar únicamente en validaciones del frontend").
- Las capacidades marcadas "sin módulo todavía" (`manage_billing`/`view_billing`) documentan la intención para cuando Cobranza exista; esta feature no la implementa, solo expone las primitivas (`roleDefaultCapabilities`, `permission_overrides`) que ese módulo futuro consumirá — `004-portal-main-layout` (Rework #2) ya las reusa en sus placeholders de navegación sin necesidad de nombres nuevos. `manage_documents`/`view_documents` ya tienen consumidor real desde `016-expediente-fiscal`.
