import { describe, expect, it } from 'vitest'

import { esRfcValido } from './rfc'

describe('esRfcValido (005-clientes-cobranza-expedientes US1)', () => {
  it('acepta un RFC de persona moral (12 caracteres)', () => {
    expect(esRfcValido('CDP010101AAA')).toBe(true)
  })

  it('acepta un RFC de persona física (13 caracteres)', () => {
    expect(esRfcValido('XAXX010101000')).toBe(true)
  })

  it('acepta minúsculas y espacios alrededor, normalizando internamente', () => {
    expect(esRfcValido(' cdp010101aaa ')).toBe(true)
  })

  it('rechaza formatos inválidos', () => {
    expect(esRfcValido('')).toBe(false)
    expect(esRfcValido('12345')).toBe(false)
    expect(esRfcValido('CDP0101011111')).toBe(false)
    expect(esRfcValido('CD010101AAA')).toBe(false)
  })
})
