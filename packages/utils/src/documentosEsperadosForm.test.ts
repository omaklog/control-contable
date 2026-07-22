import { describe, expect, it } from 'vitest'

import {
  documentoEsperadoFormSchema,
  mapearErrorDocumentoEsperadoAMensaje,
} from './documentosEsperadosForm'

describe('documentoEsperadoFormSchema (016-expediente-fiscal)', () => {
  it('acepta un Tipo de Documento seleccionado', async () => {
    await expect(
      documentoEsperadoFormSchema.validate({
        categoriaDocumentoId: '11111111-1111-1111-1111-111111111111',
      }),
    ).resolves.toBeTruthy()
  })

  it('rechaza cuando no se selecciona ningún Tipo de Documento', async () => {
    await expect(
      documentoEsperadoFormSchema.validate({ categoriaDocumentoId: '' }),
    ).rejects.toThrow()
  })
})

describe('mapearErrorDocumentoEsperadoAMensaje', () => {
  it('devuelve un mensaje específico cuando el Tipo de Documento ya está configurado', () => {
    expect(
      mapearErrorDocumentoEsperadoAMensaje({
        message:
          'duplicate key value violates unique constraint "documentos_esperados_obligaci_obligacion_fiscal_id_categori_key"',
      }),
    ).toBe('Ese Tipo de Documento ya está configurado como esperado para esta obligación.')
  })

  it('devuelve un mensaje genérico para cualquier otro error', () => {
    expect(mapearErrorDocumentoEsperadoAMensaje({ message: 'algo más' })).toBe(
      'No se pudo guardar el Documento Esperado. Intenta de nuevo.',
    )
  })

  it('devuelve un mensaje genérico cuando no hay error', () => {
    expect(mapearErrorDocumentoEsperadoAMensaje(null)).toBe(
      'No se pudo guardar el Documento Esperado. Intenta de nuevo.',
    )
  })
})
