import { describe, expect, it } from 'vitest'

import { mapearErrorModificarPagoAMensaje, modificarPagoFormSchema } from './modificarPagoForm'

const VALORES_VALIDOS = {
  monto: '3000',
  metodoPagoId: '11111111-1111-1111-1111-111111111111',
  fechaPago: '2026-07-22',
  comentario: '',
}

describe('modificarPagoFormSchema (018-gestion-pagos)', () => {
  it('acepta valores válidos', async () => {
    await expect(modificarPagoFormSchema.validate(VALORES_VALIDOS)).resolves.toBeTruthy()
  })

  it('rechaza un monto vacío', async () => {
    await expect(
      modificarPagoFormSchema.validate({ ...VALORES_VALIDOS, monto: '' }),
    ).rejects.toThrow()
  })

  it('rechaza un monto cero o negativo', async () => {
    await expect(
      modificarPagoFormSchema.validate({ ...VALORES_VALIDOS, monto: '0' }),
    ).rejects.toThrow()
  })

  it('rechaza cuando no se selecciona método de pago', async () => {
    await expect(
      modificarPagoFormSchema.validate({ ...VALORES_VALIDOS, metodoPagoId: '' }),
    ).rejects.toThrow()
  })

  it('rechaza fecha de pago vacía', async () => {
    await expect(
      modificarPagoFormSchema.validate({ ...VALORES_VALIDOS, fechaPago: '' }),
    ).rejects.toThrow()
  })
})

describe('mapearErrorModificarPagoAMensaje', () => {
  it('devuelve un mensaje específico cuando el pago excede el saldo', () => {
    expect(
      mapearErrorModificarPagoAMensaje({
        message: 'El pago excede el saldo pendiente de la cobranza',
      }),
    ).toBe('El pago excede el saldo pendiente de la cobranza.')
  })

  it('devuelve un mensaje genérico para cualquier otro error', () => {
    expect(mapearErrorModificarPagoAMensaje({ message: 'algo más' })).toBe(
      'No se pudo registrar el pago. Intenta de nuevo.',
    )
  })
})
