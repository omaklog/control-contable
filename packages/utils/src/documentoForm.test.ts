import { describe, expect, it } from 'vitest'

import {
  documentoFormSchema,
  mapearErrorDocumentoAMensaje,
  validarArchivoDocumento,
} from './documentoForm'

describe('documentoFormSchema (016-expediente-fiscal)', () => {
  it('acepta valores completamente vacíos (documento sin clasificar ni asociaciones)', async () => {
    await expect(
      documentoFormSchema.validate({ categoriaId: '', cumplimientoId: '', obligacionFiscalId: '' }),
    ).resolves.toBeTruthy()
  })

  it('acepta valores con clasificación y asociaciones', async () => {
    await expect(
      documentoFormSchema.validate({
        categoriaId: '11111111-1111-1111-1111-111111111111',
        cumplimientoId: '22222222-2222-2222-2222-222222222222',
        obligacionFiscalId: '33333333-3333-3333-3333-333333333333',
      }),
    ).resolves.toBeTruthy()
  })
})

describe('validarArchivoDocumento', () => {
  it('acepta un PDF dentro del tamaño máximo', () => {
    expect(validarArchivoDocumento({ tamanoBytes: 1024, tipoMime: 'application/pdf' })).toBeNull()
  })

  it('rechaza un archivo que no es PDF', () => {
    expect(validarArchivoDocumento({ tamanoBytes: 1024, tipoMime: 'image/png' })).toBe(
      'Solo se permiten archivos PDF.',
    )
  })

  it('rechaza un PDF que excede el tamaño máximo', () => {
    expect(
      validarArchivoDocumento({ tamanoBytes: 21 * 1024 * 1024, tipoMime: 'application/pdf' }),
    ).toBe('El archivo excede el tamaño máximo permitido (20 MB).')
  })
})

describe('mapearErrorDocumentoAMensaje', () => {
  it('devuelve un mensaje específico cuando el cumplimiento pertenece a otro cliente', () => {
    expect(
      mapearErrorDocumentoAMensaje({
        message: 'El documento xyz pertenece a un cliente distinto del cumplimiento',
      }),
    ).toBe('Ese cumplimiento pertenece a otro cliente y no puede asociarse a este documento.')
  })

  it('devuelve un mensaje específico cuando el documento ya tiene otro cumplimiento asociado', () => {
    expect(
      mapearErrorDocumentoAMensaje({
        message:
          'duplicate key value violates unique constraint "cumplimiento_fiscal_documentos_documento_unique"',
      }),
    ).toBe('Este documento ya está asociado a otro cumplimiento. Desasócialo primero.')
  })

  it('devuelve un mensaje específico cuando el documento ya está asociado a ese mismo cumplimiento', () => {
    expect(
      mapearErrorDocumentoAMensaje({
        message:
          'duplicate key value violates unique constraint "cumplimiento_fiscal_documentos_unique"',
      }),
    ).toBe('Ese documento ya está asociado a este cumplimiento.')
  })

  it('devuelve un mensaje específico cuando la eliminación requiere un Administrador', () => {
    expect(
      mapearErrorDocumentoAMensaje({
        message:
          'Solo un Administrador puede eliminar un documento con más de tres meses de antigüedad',
      }),
    ).toBe('Solo un Administrador puede eliminar un documento con más de tres meses de antigüedad.')
  })

  it('devuelve un mensaje genérico para cualquier otro error', () => {
    expect(mapearErrorDocumentoAMensaje({ message: 'algo más' })).toBe(
      'No se pudo guardar el documento. Intenta de nuevo.',
    )
  })

  it('devuelve un mensaje genérico cuando no hay error', () => {
    expect(mapearErrorDocumentoAMensaje(null)).toBe(
      'No se pudo guardar el documento. Intenta de nuevo.',
    )
  })
})
