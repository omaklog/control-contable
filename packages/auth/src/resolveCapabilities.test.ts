import { describe, expect, it } from 'vitest'

import { ALL_CAPABILITIES } from './roles'
import { resolveCapabilities } from './session'

describe('resolveCapabilities (FR-014, research.md #13)', () => {
  it('sin overrides, devuelve exactamente la plantilla por defecto del rol', () => {
    expect(new Set(resolveCapabilities('auxiliar', []))).toEqual(
      new Set(['view_clients', 'view_billing', 'view_documents', 'manage_documents']),
    )
    expect(new Set(resolveCapabilities('administrador', []))).toEqual(new Set(ALL_CAPABILITIES))
  })

  it('un override granted=true agrega una capacidad fuera de la plantilla del rol', () => {
    const capabilities = resolveCapabilities('auxiliar', [
      { capability: 'view_auth_audit_log', granted: true },
    ])
    expect(capabilities).toContain('view_auth_audit_log')
  })

  it('un override granted=false retira una capacidad que la plantilla del rol sí incluiría', () => {
    const capabilities = resolveCapabilities('administrador', [
      { capability: 'manage_users', granted: false },
    ])
    expect(capabilities).not.toContain('manage_users')
    expect(capabilities).toContain('view_auth_audit_log')
  })

  it('varios overrides se aplican de forma independiente', () => {
    const capabilities = resolveCapabilities('contador', [
      { capability: 'manage_users', granted: true },
      { capability: 'view_auth_audit_log', granted: false },
    ])
    expect(capabilities).toContain('manage_users')
    expect(capabilities).not.toContain('view_auth_audit_log')
  })
})
