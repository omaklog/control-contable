import { describe, expect, it } from 'vitest'

import { excedeTamanoMaximo, TAMANO_MAXIMO_DOCUMENTO_BYTES } from './expedientes'

describe('excedeTamanoMaximo (005-clientes-cobranza-expedientes US3, FR-016)', () => {
  it('no excede cuando el tamaño es menor al máximo', () => {
    expect(excedeTamanoMaximo(1024)).toBe(false)
  })

  it('no excede cuando el tamaño es exactamente el máximo', () => {
    expect(excedeTamanoMaximo(TAMANO_MAXIMO_DOCUMENTO_BYTES)).toBe(false)
  })

  it('excede cuando el tamaño es mayor al máximo', () => {
    expect(excedeTamanoMaximo(TAMANO_MAXIMO_DOCUMENTO_BYTES + 1)).toBe(true)
  })

  it('acepta un máximo configurado explícitamente distinto del default', () => {
    expect(excedeTamanoMaximo(2000, 1000)).toBe(true)
    expect(excedeTamanoMaximo(500, 1000)).toBe(false)
  })
})
