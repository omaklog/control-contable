import { describe, expect, it } from 'vitest'

import { calcularTotalPaginas } from './paginacion'

describe('calcularTotalPaginas (006-crud-clientes-admin / 007-alta-cliente-portal, compartido)', () => {
  it('total exacto múltiplo del tamaño de página', () => {
    expect(calcularTotalPaginas(40, 20)).toBe(2)
  })

  it('total con residuo redondea hacia arriba', () => {
    expect(calcularTotalPaginas(41, 20)).toBe(3)
  })

  it('total en cero devuelve 1 página (para mostrar el estado vacío)', () => {
    expect(calcularTotalPaginas(0, 20)).toBe(1)
  })
})
