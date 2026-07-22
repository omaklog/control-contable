import { describe, expect, it } from 'vitest'

import { mapearErrorPagoCobranzaAMensaje, pagoCobranzaFormSchema } from './pagoCobranzaForm'

const VALORES_VALIDOS = {
  monto: '2000',
  metodoPagoId: '11111111-1111-1111-1111-111111111111',
  fechaPago: '2026-07-22',
  comentario: '',
}

describe('pagoCobranzaFormSchema (017-cobranza)', () => {
  it('acepta valores válidos', async () => {
    await expect(pagoCobranzaFormSchema.validate(VALORES_VALIDOS)).resolves.toBeTruthy()
  })

  it('rechaza un monto vacío', async () => {
    await expect(
      pagoCobranzaFormSchema.validate({ ...VALORES_VALIDOS, monto: '' }),
    ).rejects.toThrow()
  })

  it('rechaza un monto cero o negativo', async () => {
    await expect(
      pagoCobranzaFormSchema.validate({ ...VALORES_VALIDOS, monto: '0' }),
    ).rejects.toThrow()
    await expect(
      pagoCobranzaFormSchema.validate({ ...VALORES_VALIDOS, monto: '-100' }),
    ).rejects.toThrow()
  })

  it('rechaza cuando no se selecciona método de pago', async () => {
    await expect(
      pagoCobranzaFormSchema.validate({ ...VALORES_VALIDOS, metodoPagoId: '' }),
    ).rejects.toThrow()
  })

  it('rechaza fecha de pago vacía', async () => {
    await expect(
      pagoCobranzaFormSchema.validate({ ...VALORES_VALIDOS, fechaPago: '' }),
    ).rejects.toThrow()
  })
})

describe('mapearErrorPagoCobranzaAMensaje', () => {
  it('devuelve un mensaje específico cuando el pago excede el saldo', () => {
    expect(
      mapearErrorPagoCobranzaAMensaje({
        message: 'El pago excede el saldo pendiente de la cobranza',
      }),
    ).toBe('El pago excede el saldo pendiente de la cobranza.')
  })

  it('devuelve un mensaje específico cuando la cobranza no está vigente', () => {
    expect(
      mapearErrorPagoCobranzaAMensaje({
        message:
          'No se pueden registrar pagos sobre una cobranza que no está vigente (estado=cancelada)',
      }),
    ).toBe('No se pueden registrar pagos sobre una cobranza cancelada o eliminada.')
  })

  it('devuelve un mensaje genérico para cualquier otro error', () => {
    expect(mapearErrorPagoCobranzaAMensaje({ message: 'algo más' })).toBe(
      'No se pudo registrar el pago. Intenta de nuevo.',
    )
  })

  it('devuelve un mensaje genérico cuando no hay error', () => {
    expect(mapearErrorPagoCobranzaAMensaje(null)).toBe(
      'No se pudo registrar el pago. Intenta de nuevo.',
    )
  })
})
