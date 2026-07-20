import { describe, expect, it } from 'vitest'

import {
  mapearErrorObligacionFiscalClienteAMensaje,
  obligacionFiscalClienteFormSchema,
} from './obligacionFiscalClienteForm'

const VALORES_VALIDOS = {
  obligacionFiscalId: '11111111-1111-1111-1111-111111111111',
  periodicidadId: '22222222-2222-2222-2222-222222222222',
  orden: '1',
  observaciones: '',
}

describe('obligacionFiscalClienteFormSchema (014-obligaciones-fiscales-cliente)', () => {
  it('acepta valores válidos', async () => {
    await expect(obligacionFiscalClienteFormSchema.validate(VALORES_VALIDOS)).resolves.toBeTruthy()
  })

  it('rechaza obligación fiscal vacía', async () => {
    await expect(
      obligacionFiscalClienteFormSchema.validate({ ...VALORES_VALIDOS, obligacionFiscalId: '' }),
    ).rejects.toThrow()
  })

  it('rechaza periodicidad vacía', async () => {
    await expect(
      obligacionFiscalClienteFormSchema.validate({ ...VALORES_VALIDOS, periodicidadId: '' }),
    ).rejects.toThrow()
  })

  it('rechaza orden vacío', async () => {
    await expect(
      obligacionFiscalClienteFormSchema.validate({ ...VALORES_VALIDOS, orden: '' }),
    ).rejects.toThrow()
  })

  it('rechaza orden no entero', async () => {
    await expect(
      obligacionFiscalClienteFormSchema.validate({ ...VALORES_VALIDOS, orden: '1.5' }),
    ).rejects.toThrow()
  })

  it('acepta observaciones vacías', async () => {
    await expect(
      obligacionFiscalClienteFormSchema.validate({ ...VALORES_VALIDOS, observaciones: '' }),
    ).resolves.toBeTruthy()
  })
})

describe('mapearErrorObligacionFiscalClienteAMensaje', () => {
  it('devuelve un mensaje específico para obligación duplicada', () => {
    expect(
      mapearErrorObligacionFiscalClienteAMensaje({
        message:
          'duplicate key value violates unique constraint "obligaciones_fiscales_cliente_cliente_obligacion_unique"',
      }),
    ).toBe('Este cliente ya tiene esa obligación fiscal configurada.')
  })

  it('devuelve un mensaje específico para orden duplicado', () => {
    expect(
      mapearErrorObligacionFiscalClienteAMensaje({
        message:
          'duplicate key value violates unique constraint "obligaciones_fiscales_cliente_cliente_orden_unique"',
      }),
    ).toBe('Ese orden ya está en uso por otra obligación de este cliente.')
  })

  it('devuelve un mensaje específico para obligación inactiva', () => {
    expect(
      mapearErrorObligacionFiscalClienteAMensaje({
        message: 'La obligación fiscal xyz no está activa en el catálogo',
      }),
    ).toBe('Esa obligación fiscal ya no está activa en el catálogo.')
  })

  it('devuelve un mensaje específico para periodicidad inactiva', () => {
    expect(
      mapearErrorObligacionFiscalClienteAMensaje({ message: 'La periodicidad xyz no está activa' }),
    ).toBe('La periodicidad seleccionada ya no está activa. Elige otra periodicidad.')
  })

  it('devuelve un mensaje genérico para cualquier otro error', () => {
    expect(mapearErrorObligacionFiscalClienteAMensaje({ message: 'algo más' })).toBe(
      'No se pudo guardar la obligación fiscal del cliente. Intenta de nuevo.',
    )
  })

  it('devuelve un mensaje genérico cuando no hay error', () => {
    expect(mapearErrorObligacionFiscalClienteAMensaje(null)).toBe(
      'No se pudo guardar la obligación fiscal del cliente. Intenta de nuevo.',
    )
  })
})
