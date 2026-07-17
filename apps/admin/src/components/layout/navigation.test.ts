import { describe, expect, it } from 'vitest'

import { MENU_ITEMS } from './navigation'

describe('MENU_ITEMS (apps/admin, 004-portal-main-layout ampliado)', () => {
  it('incluye "Inicio" sin capacidad requerida', () => {
    const inicio = MENU_ITEMS.find((item) => item.label === 'Inicio')
    expect(inicio?.capability).toBeUndefined()
  })

  it('todas las entradas están marcadas como implemented (sin "Próximamente" en admin)', () => {
    expect(MENU_ITEMS.every((item) => item.implemented)).toBe(true)
  })

  it('Usuarios, Clientes y Auditoría requieren su capacidad correspondiente', () => {
    expect(MENU_ITEMS.find((item) => item.label === 'Usuarios')?.capability).toBe('manage_users')
    expect(MENU_ITEMS.find((item) => item.label === 'Clientes')?.capability).toBe('view_clients')
    expect(MENU_ITEMS.find((item) => item.label === 'Auditoría')?.capability).toBe(
      'view_auth_audit_log',
    )
  })

  it('no tiene hrefs duplicados', () => {
    const hrefs = MENU_ITEMS.map((item) => item.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})
