import type { Capability } from '@control-contable/auth'
import { describe, expect, it } from 'vitest'

import { type MenuItem, visibleMenuItems } from './navigation'

const HOME: MenuItem = { label: 'Inicio', href: '/', icon: () => null, implemented: true }
const RESTRICTED: MenuItem = {
  label: 'Reservado',
  href: '/reservado',
  icon: () => null,
  capability: 'manage_users' as Capability,
  implemented: false,
}

describe('visibleMenuItems (004-portal-main-layout, compartido por apps/portal y apps/admin)', () => {
  it('sin capability asignada, la entrada es visible sin importar las capacidades del usuario', () => {
    expect(visibleMenuItems([HOME], [])).toEqual([HOME])
    expect(visibleMenuItems([HOME], ['manage_users'])).toEqual([HOME])
  })

  it('una entrada con capability solo es visible si esa capacidad está en las capacidades recibidas', () => {
    expect(visibleMenuItems([RESTRICTED], [])).toEqual([])
    expect(visibleMenuItems([RESTRICTED], ['view_auth_audit_log'])).toEqual([])
    expect(visibleMenuItems([RESTRICTED], ['manage_users'])).toEqual([RESTRICTED])
  })

  it('el campo implemented no afecta la visibilidad (solo se usa para deshabilitar en la UI)', () => {
    const notImplementedNoCapability: MenuItem = {
      ...HOME,
      label: 'Próximamente',
      implemented: false,
    }
    expect(visibleMenuItems([notImplementedNoCapability], [])).toEqual([notImplementedNoCapability])
  })

  it('filtra una lista mixta preservando el orden original', () => {
    const result = visibleMenuItems([HOME, RESTRICTED], ['manage_users'])
    expect(result).toEqual([HOME, RESTRICTED])
    expect(visibleMenuItems([HOME, RESTRICTED], [])).toEqual([HOME])
  })
})
