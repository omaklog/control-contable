import { describe, expect, it } from 'vitest'

import { calcularEstadoCargo } from './cobranza'

describe('calcularEstadoCargo (005-clientes-cobranza-expedientes US2, Decisión 2)', () => {
  it('sin pagos y no vencido queda "pendiente"', () => {
    expect(
      calcularEstadoCargo({
        montoTotal: 1500,
        montoAplicado: 0,
        fechaVencimiento: '2026-08-05',
        hoy: '2026-07-20',
        estadoActual: 'pendiente',
      }),
    ).toBe('pendiente')
  })

  it('pago parcial (no cubre el total) y no vencido queda "pendiente"', () => {
    expect(
      calcularEstadoCargo({
        montoTotal: 1500,
        montoAplicado: 500,
        fechaVencimiento: '2026-08-05',
        hoy: '2026-07-20',
        estadoActual: 'pendiente',
      }),
    ).toBe('pendiente')
  })

  it('pago que cubre el total queda "pagado" (FR-005)', () => {
    expect(
      calcularEstadoCargo({
        montoTotal: 1500,
        montoAplicado: 1500,
        fechaVencimiento: '2026-08-05',
        hoy: '2026-07-20',
        estadoActual: 'pendiente',
      }),
    ).toBe('pagado')
  })

  it('un pago que excede el total también queda "pagado"', () => {
    expect(
      calcularEstadoCargo({
        montoTotal: 1500,
        montoAplicado: 2000,
        fechaVencimiento: '2026-08-05',
        hoy: '2026-07-20',
        estadoActual: 'pendiente',
      }),
    ).toBe('pagado')
  })

  it('fecha de vencimiento pasada sin cubrir el total queda "vencido"', () => {
    expect(
      calcularEstadoCargo({
        montoTotal: 1500,
        montoAplicado: 0,
        fechaVencimiento: '2026-07-01',
        hoy: '2026-07-20',
        estadoActual: 'pendiente',
      }),
    ).toBe('vencido')
  })

  it('un cargo "cancelado" nunca cambia de estado, sin importar los pagos', () => {
    expect(
      calcularEstadoCargo({
        montoTotal: 1500,
        montoAplicado: 1500,
        fechaVencimiento: '2026-07-01',
        hoy: '2026-07-20',
        estadoActual: 'cancelado',
      }),
    ).toBe('cancelado')
  })
})
