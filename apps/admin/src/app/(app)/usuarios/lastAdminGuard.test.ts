import { describe, expect, it } from 'vitest'

import { wouldRemoveLastActiveAdministrador } from './lastAdminGuard'

describe('wouldRemoveLastActiveAdministrador', () => {
  it('permite el cambio si el objetivo no es actualmente un Administrador activo', () => {
    expect(wouldRemoveLastActiveAdministrador(1, false, 'auxiliar', false)).toBe(false)
    expect(wouldRemoveLastActiveAdministrador(3, false, 'contador', true)).toBe(false)
  })

  it('permite el cambio si el objetivo sigue siendo Administrador activo tras el cambio', () => {
    expect(wouldRemoveLastActiveAdministrador(1, true, 'administrador', true)).toBe(false)
  })

  it('bloquea desactivar al único Administrador activo', () => {
    expect(wouldRemoveLastActiveAdministrador(1, true, 'administrador', false)).toBe(true)
  })

  it('bloquea cambiar de rol al único Administrador activo', () => {
    expect(wouldRemoveLastActiveAdministrador(1, true, 'contador', true)).toBe(true)
  })

  it('permite el cambio si hay más de un Administrador activo', () => {
    expect(wouldRemoveLastActiveAdministrador(2, true, 'administrador', false)).toBe(false)
    expect(wouldRemoveLastActiveAdministrador(2, true, 'contador', true)).toBe(false)
  })
})
