import { describe, expect, it } from 'vitest'

import {
  mapearErrorObligacionFiscalAMensaje,
  obligacionFiscalFormSchema,
} from './obligacionFiscalForm'

const VALORES_VALIDOS = {
  nombre: 'Declaración Mensual ISR',
  descripcion: 'Pago provisional mensual de ISR.',
  periodicidadId: '11111111-1111-1111-1111-111111111111',
  prioridad: '10',
}

describe('obligacionFiscalFormSchema (013-catalogo-obligaciones-fiscales)', () => {
  it('acepta valores válidos', async () => {
    await expect(obligacionFiscalFormSchema.validate(VALORES_VALIDOS)).resolves.toBeTruthy()
  })

  it('acepta descripción vacía', async () => {
    await expect(
      obligacionFiscalFormSchema.validate({ ...VALORES_VALIDOS, descripcion: '' }),
    ).resolves.toBeTruthy()
  })

  it('rechaza nombre vacío', async () => {
    await expect(
      obligacionFiscalFormSchema.validate({ ...VALORES_VALIDOS, nombre: '' }),
    ).rejects.toThrow()
  })

  it('rechaza periodicidad vacía', async () => {
    await expect(
      obligacionFiscalFormSchema.validate({ ...VALORES_VALIDOS, periodicidadId: '' }),
    ).rejects.toThrow()
  })

  it('rechaza prioridad vacía', async () => {
    await expect(
      obligacionFiscalFormSchema.validate({ ...VALORES_VALIDOS, prioridad: '' }),
    ).rejects.toThrow()
  })

  it('rechaza prioridad no entera', async () => {
    await expect(
      obligacionFiscalFormSchema.validate({ ...VALORES_VALIDOS, prioridad: '1.5' }),
    ).rejects.toThrow()
  })

  it('acepta prioridad cero o negativa (solo se exige que sea entera)', async () => {
    await expect(
      obligacionFiscalFormSchema.validate({ ...VALORES_VALIDOS, prioridad: '0' }),
    ).resolves.toBeTruthy()
  })
})

describe('mapearErrorObligacionFiscalAMensaje', () => {
  it('devuelve un mensaje específico para nombre duplicado', () => {
    expect(
      mapearErrorObligacionFiscalAMensaje({
        message:
          'duplicate key value violates unique constraint "obligaciones_fiscales_nombre_activo_unique"',
      }),
    ).toContain('reactívala')
  })

  it('devuelve un mensaje específico para periodicidad inactiva', () => {
    expect(
      mapearErrorObligacionFiscalAMensaje({ message: 'La periodicidad xyz no está activa' }),
    ).toContain('ya no está activa')
  })

  it('devuelve un mensaje genérico para cualquier otro error', () => {
    expect(mapearErrorObligacionFiscalAMensaje({ message: 'algo más' })).toBe(
      'No se pudo guardar la obligación fiscal. Intenta de nuevo.',
    )
  })

  it('devuelve un mensaje genérico cuando no hay error', () => {
    expect(mapearErrorObligacionFiscalAMensaje(null)).toBe(
      'No se pudo guardar la obligación fiscal. Intenta de nuevo.',
    )
  })
})
