import { describe, expect, it } from 'vitest'

import { mapearErrorRevertirPagoAMensaje, revertirPagoFormSchema } from './revertirPagoForm'

describe('revertirPagoFormSchema (018-gestion-pagos)', () => {
  it('acepta un motivo capturado', async () => {
    await expect(
      revertirPagoFormSchema.validate({ motivoReversion: 'Transferencia rechazada' }),
    ).resolves.toBeTruthy()
  })

  it('rechaza un motivo vacío', async () => {
    await expect(revertirPagoFormSchema.validate({ motivoReversion: '' })).rejects.toThrow()
  })

  it('rechaza un motivo compuesto solo por espacios', async () => {
    await expect(revertirPagoFormSchema.validate({ motivoReversion: '   ' })).rejects.toThrow()
  })
})

describe('mapearErrorRevertirPagoAMensaje', () => {
  it('devuelve un mensaje específico cuando el pago es un estado final', () => {
    expect(
      mapearErrorRevertirPagoAMensaje({
        message: 'Un pago eliminado es un estado final y no admite ninguna modificación',
      }),
    ).toBe('Este pago ya no puede modificarse: es un estado final.')
  })

  it('devuelve un mensaje genérico para cualquier otro error', () => {
    expect(mapearErrorRevertirPagoAMensaje({ message: 'algo más' })).toBe(
      'No se pudo revertir el pago. Intenta de nuevo.',
    )
  })

  it('devuelve un mensaje genérico cuando no hay error', () => {
    expect(mapearErrorRevertirPagoAMensaje(null)).toBe(
      'No se pudo revertir el pago. Intenta de nuevo.',
    )
  })
})
