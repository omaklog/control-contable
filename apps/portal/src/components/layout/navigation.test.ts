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

  it('tiene exactamente 5 entradas, alineadas a docs/ux/design-system.md §2.2', () => {
    expect(MENU_ITEMS.map((item) => item.label)).toEqual([
      'Inicio',
      'Clientes',
      'Cobranza',
      'Documentos Fiscales',
      'Obligaciones Fiscales',
    ])
  })

  it('"Cobranza" y "Documentos Fiscales" reusan capacidades existentes de packages/auth (FR-007)', () => {
    const cobranza = MENU_ITEMS.find((item) => item.label === 'Cobranza')
    const documentosFiscales = MENU_ITEMS.find((item) => item.label === 'Documentos Fiscales')
    expect(cobranza?.capability).toBe('view_billing')
    expect(cobranza?.implemented).toBe(false)
    expect(documentosFiscales?.capability).toBe('view_documents')
    expect(documentosFiscales?.implemented).toBe(false)
  })

  it('"Obligaciones Fiscales" ya está implementado (015-control-cumplimiento-fiscal), restringido a view_clients', () => {
    const obligacionesFiscales = MENU_ITEMS.find((item) => item.label === 'Obligaciones Fiscales')
    expect(obligacionesFiscales?.capability).toBe('view_clients')
    expect(obligacionesFiscales?.implemented).toBe(true)
  })

  it('no conserva las entradas ya superadas (Expedientes Digitales/Recibos de Honorarios/Reportes)', () => {
    const labels = MENU_ITEMS.map((item) => item.label)
    expect(labels).not.toContain('Expedientes Digitales')
    expect(labels).not.toContain('Recibos de Honorarios')
    expect(labels).not.toContain('Reportes')
  })

  it('no tiene hrefs duplicados', () => {
    const hrefs = MENU_ITEMS.map((item) => item.href)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })
})
