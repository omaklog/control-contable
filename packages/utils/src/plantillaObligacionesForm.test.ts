import { describe, expect, it } from 'vitest'

import {
  mapearErrorPlantillaItemAMensaje,
  mapearErrorPlantillaObligacionesAMensaje,
  plantillaItemFormSchema,
  plantillaObligacionesFormSchema,
} from './plantillaObligacionesForm'

describe('plantillaObligacionesFormSchema', () => {
  const valores = { nombre: 'Régimen General de Ley', descripcion: '' }

  it('acepta valores válidos', async () => {
    await expect(plantillaObligacionesFormSchema.validate(valores)).resolves.toBeTruthy()
  })

  it('rechaza nombre vacío', async () => {
    await expect(
      plantillaObligacionesFormSchema.validate({ ...valores, nombre: '' }),
    ).rejects.toThrow()
  })

  it('acepta descripción vacía', async () => {
    await expect(
      plantillaObligacionesFormSchema.validate({ ...valores, descripcion: '' }),
    ).resolves.toBeTruthy()
  })
})

describe('plantillaItemFormSchema', () => {
  const valores = {
    obligacionFiscalId: '11111111-1111-1111-1111-111111111111',
    periodicidadId: '22222222-2222-2222-2222-222222222222',
    orden: '1',
  }

  it('acepta valores válidos', async () => {
    await expect(plantillaItemFormSchema.validate(valores)).resolves.toBeTruthy()
  })

  it('rechaza obligación fiscal vacía', async () => {
    await expect(
      plantillaItemFormSchema.validate({ ...valores, obligacionFiscalId: '' }),
    ).rejects.toThrow()
  })

  it('rechaza orden no entero', async () => {
    await expect(plantillaItemFormSchema.validate({ ...valores, orden: '1.5' })).rejects.toThrow()
  })
})

describe('mapearErrorPlantillaObligacionesAMensaje', () => {
  it('devuelve un mensaje específico para nombre duplicado', () => {
    expect(
      mapearErrorPlantillaObligacionesAMensaje({
        message:
          'duplicate key value violates unique constraint "plantillas_obligaciones_nombre_activo_unique"',
      }),
    ).toContain('reactívala')
  })

  it('devuelve un mensaje genérico para cualquier otro error', () => {
    expect(mapearErrorPlantillaObligacionesAMensaje({ message: 'algo más' })).toBe(
      'No se pudo guardar la plantilla de obligaciones. Intenta de nuevo.',
    )
  })

  it('devuelve un mensaje genérico cuando no hay error', () => {
    expect(mapearErrorPlantillaObligacionesAMensaje(null)).toBe(
      'No se pudo guardar la plantilla de obligaciones. Intenta de nuevo.',
    )
  })
})

describe('mapearErrorPlantillaItemAMensaje', () => {
  it('devuelve un mensaje específico para obligación duplicada dentro de la plantilla', () => {
    expect(
      mapearErrorPlantillaItemAMensaje({
        message:
          'duplicate key value violates unique constraint "plantilla_obligaciones_items_unique"',
      }),
    ).toBe('Esa obligación fiscal ya está incluida en esta plantilla.')
  })

  it('devuelve un mensaje genérico para cualquier otro error', () => {
    expect(mapearErrorPlantillaItemAMensaje({ message: 'algo más' })).toBe(
      'No se pudo guardar el ítem de la plantilla. Intenta de nuevo.',
    )
  })
})
