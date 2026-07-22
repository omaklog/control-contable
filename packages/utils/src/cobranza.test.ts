import { describe, expect, it } from 'vitest'

import { calcularEstadoPago, calcularEstadoVencimiento } from './cobranza'

describe('calcularEstadoPago (017-cobranza, FR-015)', () => {
  it('sin pagos queda "pendiente"', () => {
    expect(calcularEstadoPago({ totalConceptos: 5000, totalPagado: 0 })).toBe('pendiente')
  })

  it('pago parcial (no cubre el total) queda "parcial"', () => {
    expect(calcularEstadoPago({ totalConceptos: 5000, totalPagado: 2000 })).toBe('parcial')
  })

  it('pago que cubre exactamente el total queda "pagada"', () => {
    expect(calcularEstadoPago({ totalConceptos: 5000, totalPagado: 5000 })).toBe('pagada')
  })
})

describe('calcularEstadoVencimiento (017-cobranza, FR-016/FR-017)', () => {
  it('dentro del plazo queda "vigente"', () => {
    expect(
      calcularEstadoVencimiento({
        fechaLimite: '2026-08-20',
        hoy: '2026-08-10',
        estadoPago: 'pendiente',
      }),
    ).toBe('vigente')
  })

  it('fuera del plazo con saldo pendiente queda "vencida"', () => {
    expect(
      calcularEstadoVencimiento({
        fechaLimite: '2026-08-20',
        hoy: '2026-08-21',
        estadoPago: 'pendiente',
      }),
    ).toBe('vencida')
  })

  it('fuera del plazo con pago parcial también queda "vencida"', () => {
    expect(
      calcularEstadoVencimiento({
        fechaLimite: '2026-08-20',
        hoy: '2026-08-21',
        estadoPago: 'parcial',
      }),
    ).toBe('vencida')
  })

  it('una cobranza "pagada" siempre queda "vigente", sin importar la fecha límite', () => {
    expect(
      calcularEstadoVencimiento({
        fechaLimite: '2026-08-20',
        hoy: '2026-09-15',
        estadoPago: 'pagada',
      }),
    ).toBe('vigente')
  })
})
