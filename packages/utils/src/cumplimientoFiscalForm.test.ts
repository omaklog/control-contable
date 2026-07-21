import { describe, expect, it } from 'vitest'

import {
  cumplimientoExtraordinarioFormSchema,
  mapearErrorCumplimientoFiscalAMensaje,
} from './cumplimientoFiscalForm'

const VALORES_CON_OBLIGACION = {
  obligacionFiscalId: '11111111-1111-1111-1111-111111111111',
  descripcion: '',
  periodoInicio: '2026-01-01',
  periodoFin: '2026-01-31',
  fechaLimite: '2026-02-17',
  responsableId: '',
}

const VALORES_SIN_OBLIGACION = {
  ...VALORES_CON_OBLIGACION,
  obligacionFiscalId: '',
  descripcion: 'Declaración complementaria del ejercicio 2025.',
}

describe('cumplimientoExtraordinarioFormSchema (015-control-cumplimiento-fiscal)', () => {
  it('acepta valores válidos con obligación del catálogo y sin descripción', async () => {
    await expect(
      cumplimientoExtraordinarioFormSchema.validate(VALORES_CON_OBLIGACION),
    ).resolves.toBeTruthy()
  })

  it('acepta valores válidos sin obligación del catálogo, con descripción', async () => {
    await expect(
      cumplimientoExtraordinarioFormSchema.validate(VALORES_SIN_OBLIGACION),
    ).resolves.toBeTruthy()
  })

  it('rechaza cuando no hay obligación ni descripción', async () => {
    await expect(
      cumplimientoExtraordinarioFormSchema.validate({
        ...VALORES_CON_OBLIGACION,
        obligacionFiscalId: '',
        descripcion: '',
      }),
    ).rejects.toThrow()
  })

  it('rechaza periodo de inicio vacío', async () => {
    await expect(
      cumplimientoExtraordinarioFormSchema.validate({
        ...VALORES_CON_OBLIGACION,
        periodoInicio: '',
      }),
    ).rejects.toThrow()
  })

  it('rechaza fecha límite vacía', async () => {
    await expect(
      cumplimientoExtraordinarioFormSchema.validate({ ...VALORES_CON_OBLIGACION, fechaLimite: '' }),
    ).rejects.toThrow()
  })
})

describe('mapearErrorCumplimientoFiscalAMensaje', () => {
  it('devuelve un mensaje específico para documento de otro cliente', () => {
    expect(
      mapearErrorCumplimientoFiscalAMensaje({
        message: 'El documento xyz pertenece a un cliente distinto del cumplimiento',
      }),
    ).toBe('Ese documento pertenece a otro cliente y no puede asociarse a este cumplimiento.')
  })

  it('devuelve un mensaje específico para obligación+periodo duplicado', () => {
    expect(
      mapearErrorCumplimientoFiscalAMensaje({
        message:
          'duplicate key value violates unique constraint "cumplimientos_fiscales_obligacion_periodo_unique"',
      }),
    ).toBe('Ya existe un cumplimiento para esa obligación y ese periodo.')
  })

  it('devuelve un mensaje específico para documento duplicado en el mismo cumplimiento', () => {
    expect(
      mapearErrorCumplimientoFiscalAMensaje({
        message:
          'duplicate key value violates unique constraint "cumplimiento_fiscal_documentos_unique"',
      }),
    ).toBe('Ese documento ya está asociado a este cumplimiento.')
  })

  it('devuelve un mensaje genérico para cualquier otro error', () => {
    expect(mapearErrorCumplimientoFiscalAMensaje({ message: 'algo más' })).toBe(
      'No se pudo guardar el cumplimiento. Intenta de nuevo.',
    )
  })

  it('devuelve un mensaje genérico cuando no hay error', () => {
    expect(mapearErrorCumplimientoFiscalAMensaje(null)).toBe(
      'No se pudo guardar el cumplimiento. Intenta de nuevo.',
    )
  })
})
