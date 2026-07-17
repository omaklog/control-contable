import { describe, expect, it } from 'vitest'

import { MENU_ITEMS } from './navigation'

describe('MENU_ITEMS (apps/portal)', () => {
  it('incluye "Inicio" ya implementado', () => {
    const inicio = MENU_ITEMS.find((item) => item.label === 'Inicio')
    expect(inicio?.implemented).toBe(true)
  })

  it('incluye "Clientes" ya implementado (007-alta-cliente-portal), restringido a manage_clients', () => {
    const clientes = MENU_ITEMS.find((item) => item.label === 'Clientes')
    expect(clientes?.implemented).toBe(true)
    expect(clientes?.capability).toBe('manage_clients')
  })

  it('no tiene hrefs duplicados', () => {
    const hrefs = MENU_ITEMS.map((item) => item.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})
