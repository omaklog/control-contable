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

| Capacidad                                                            | Administrador | Contador |            Auxiliar            |
| -------------------------------------------------------------------- | :-----------: | :------: | :----------------------------: |
| Gestión operativa de clientes/cobranza/expedientes (futuros módulos) |      ✅       |    ✅    | Consulta/captura, sin eliminar |
| Crear cuentas de personal (alta manual, FR-010)                      |      ✅       |    ❌    |               ❌               |
| Cambiar el rol de otro usuario                                       |      ✅       |    ❌    |               ❌               |
| Activar/desactivar cuentas                                           |      ✅       |    ❌    |               ❌               |
| Asignar contraseña temporal a una cuenta existente (FR-008)          |      ✅       |    ❌    |               ❌               |
| Ajustar permisos individuales de un usuario (FR-014)                 |      ✅       |    ❌    |               ❌               |
| Consultar el registro de auditoría de autenticación                  |      ✅       |    ❌    |               ❌               |

## Garantías del contrato

- `packages/auth` expone `roleDefaultCapabilities(role: AppRole): Capability[]` como la plantilla por rol de esta tabla; `getCurrentProfile()` combina esa plantilla con las filas de `permission_overrides` del usuario para resolver `CurrentProfile.capabilities` — ningún componente decide visibilidad comparando strings de rol directamente ni consultando `permission_overrides` por su cuenta.
- El acceso a aplicaciones (`requireApp('admin' | 'portal')`) es independiente del sistema de capacidades: es una regla fija por rol que un Administrador **no puede** ajustar por usuario — evita que un ajuste de permisos termine, indirectamente, dándole a un Contador o Auxiliar acceso a `apps/admin`.
- Esta matriz debe mantenerse en paridad con las políticas RLS descritas en `db-functions-rls.md`: la UI oculta lo que el rol (más sus ajustes) no puede hacer, pero la base de datos es la que realmente lo impide (defensa en profundidad, constitución — "nunca confiar únicamente en validaciones del frontend").
- Las filas marcadas "futuros módulos" (clientes/cobranza/expedientes) documentan la intención para cuando esos módulos existan; esta feature no los implementa, solo expone las primitivas (`roleDefaultCapabilities`, `permission_overrides`) que esos módulos futuros consumirán.
