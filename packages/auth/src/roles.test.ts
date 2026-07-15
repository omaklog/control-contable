import { describe, expect, it } from 'vitest'

import {
  ALL_ROLES,
  type AppName,
  type AppRole,
  type Capability,
  canAccessApp,
  roleDefaultCapabilities,
} from './roles'

const APPS: readonly AppName[] = ['admin', 'portal']

// Matriz completa de contracts/role-permissions.md — cualquier cambio de
// capacidad por rol debe reflejarse aquí Y en ese documento.
const EXPECTED_CAPABILITIES: Record<AppRole, ReadonlySet<Capability>> = {
  administrador: new Set(['manage_users', 'view_auth_audit_log', 'manage_user_permissions']),
  contador: new Set([]),
  auxiliar: new Set([]),
}

// Matriz de "Acceso a aplicaciones" de contracts/role-permissions.md.
const EXPECTED_APP_ACCESS: Record<AppRole, ReadonlySet<AppName>> = {
  administrador: new Set<AppName>(['admin', 'portal']),
  contador: new Set<AppName>(['portal']),
  auxiliar: new Set<AppName>(['portal']),
}

describe('roleDefaultCapabilities', () => {
  for (const role of ALL_ROLES) {
    it(`plantilla de ${role} coincide con la matriz de role-permissions.md`, () => {
      expect(new Set(roleDefaultCapabilities(role))).toEqual(EXPECTED_CAPABILITIES[role])
    })
  }

  it('un Auxiliar no gestiona usuarios por defecto (Historia 1, Acceptance Scenario 4)', () => {
    expect(roleDefaultCapabilities('auxiliar')).not.toContain('manage_users')
  })

  it('un Administrador gestiona usuarios, auditoría y permisos por defecto (Historia 1, Acceptance Scenario 1)', () => {
    const capabilities = roleDefaultCapabilities('administrador')
    expect(capabilities).toContain('manage_users')
    expect(capabilities).toContain('view_auth_audit_log')
    expect(capabilities).toContain('manage_user_permissions')
  })
})

describe('canAccessApp', () => {
  for (const role of ALL_ROLES) {
    for (const app of APPS) {
      const expected = EXPECTED_APP_ACCESS[role].has(app)
      it(`role=${role} app=${app} -> ${expected}`, () => {
        expect(canAccessApp(role, app)).toBe(expected)
      })
    }
  }

  it('solo Administrador puede entrar a apps/admin (Historia 1, Acceptance Scenario 3)', () => {
    expect(canAccessApp('administrador', 'admin')).toBe(true)
    expect(canAccessApp('contador', 'admin')).toBe(false)
    expect(canAccessApp('auxiliar', 'admin')).toBe(false)
  })

  it('los 3 roles de personal pueden entrar a apps/portal (Historia 1, Acceptance Scenario 4)', () => {
    for (const role of ALL_ROLES) {
      expect(canAccessApp(role, 'portal')).toBe(true)
    }
  })
})
