export type AppRole = 'administrador' | 'contador' | 'auxiliar'

export type AppName = 'admin' | 'portal'

export type Capability =
  | 'manage_users'
  | 'view_auth_audit_log'
  | 'manage_user_permissions'
  | 'manage_clients'
  | 'view_clients'
  | 'manage_billing'
  | 'view_billing'
  | 'manage_documents'
  | 'view_documents'
  | 'manage_catalogs'

export const ALL_ROLES: readonly AppRole[] = ['administrador', 'contador', 'auxiliar']

export const ALL_CAPABILITIES: readonly Capability[] = [
  'manage_users',
  'view_auth_audit_log',
  'manage_user_permissions',
  'manage_clients',
  'view_clients',
  'manage_billing',
  'view_billing',
  'manage_documents',
  'view_documents',
  'manage_catalogs',
]

/**
 * Plantilla por defecto rol -> capacidades. Fuente única de verdad en código
 * para la matriz de contracts/role-permissions.md. Un Administrador puede
 * ajustar capacidades individuales por usuario por encima de esta plantilla
 * (permission_overrides, ver contracts/db-functions-rls.md) — la resolución
 * de esas excepciones vive en session.ts, no aquí: esta función solo conoce
 * la plantilla, nunca overrides de un usuario concreto.
 *
 * Es la contraparte en aplicación de las políticas RLS (contracts/db-functions-rls.md):
 * la UI oculta lo que el rol (más sus ajustes) no puede hacer, la base de
 * datos es la que realmente lo impide.
 */
const ROLE_DEFAULT_CAPABILITIES: Record<AppRole, ReadonlySet<Capability>> = {
  administrador: new Set<Capability>(ALL_CAPABILITIES),
  contador: new Set<Capability>([
    'manage_clients',
    'view_clients',
    'manage_billing',
    'view_billing',
    'view_documents',
    'manage_documents',
  ]),
  auxiliar: new Set<Capability>([
    'view_clients',
    'view_billing',
    'view_documents',
    'manage_documents',
  ]),
}

export function roleDefaultCapabilities(role: AppRole): Capability[] {
  return Array.from(ROLE_DEFAULT_CAPABILITIES[role])
}

/**
 * Acceso a aplicaciones: regla fija por rol, deliberadamente NO ajustable por
 * usuario (a diferencia de las Capability) — evita que un ajuste de permisos
 * termine, indirectamente, dándole a un Contador/Auxiliar acceso a apps/admin.
 * Ver research.md #12.
 */
const APP_ACCESS: Record<AppRole, ReadonlySet<AppName>> = {
  administrador: new Set<AppName>(['admin', 'portal']),
  contador: new Set<AppName>(['portal']),
  auxiliar: new Set<AppName>(['portal']),
}

export function canAccessApp(role: AppRole, app: AppName): boolean {
  return APP_ACCESS[role].has(app)
}
