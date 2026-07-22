import { describe, expect, it } from 'vitest'

import { mapearErrorTipoDocumentoAMensaje, tipoDocumentoFormSchema } from './tipoDocumentoForm'

describe('tipoDocumentoFormSchema (016-expediente-fiscal)', () => {
  it('acepta un nombre válido sin descripción', async () => {
    await expect(
      tipoDocumentoFormSchema.validate({ nombre: 'Acuse SAT', descripcion: '' }),
    ).resolves.toBeTruthy()
  })

  it('rechaza un nombre vacío', async () => {
    await expect(
      tipoDocumentoFormSchema.validate({ nombre: '', descripcion: '' }),
    ).rejects.toThrow()
  })
})

describe('mapearErrorTipoDocumentoAMensaje', () => {
  it('devuelve un mensaje específico para nombre duplicado', () => {
    expect(
      mapearErrorTipoDocumentoAMensaje({
        message: 'duplicate key value violates unique constraint "categorias_documento_nombre_key"',
      }),
    ).toBe('Ya existe un Tipo de Documento con ese nombre.')
  })

  it('devuelve un mensaje genérico para cualquier otro error', () => {
    expect(mapearErrorTipoDocumentoAMensaje({ message: 'algo más' })).toBe(
      'No se pudo guardar el Tipo de Documento. Intenta de nuevo.',
    )
  })

  it('devuelve un mensaje genérico cuando no hay error', () => {
    expect(mapearErrorTipoDocumentoAMensaje(null)).toBe(
      'No se pudo guardar el Tipo de Documento. Intenta de nuevo.',
    )
  })
})
