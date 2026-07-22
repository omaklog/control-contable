import * as yup from 'yup'

import { TAMANO_MAXIMO_DOCUMENTO_BYTES } from './expedientes'

export interface DocumentoFormValues {
  categoriaId: string
  cumplimientoId: string
  obligacionFiscalId: string
}

/**
 * Clasificación y asociaciones de un documento del Expediente Fiscal
 * (016-expediente-fiscal, US1). Todos los campos son opcionales — un
 * documento puede quedar "Sin clasificar" (FR-006/FR-028) y sin ninguna
 * asociación (FR-007, FR-027).
 */
export const documentoFormSchema: yup.ObjectSchema<DocumentoFormValues> = yup.object({
  categoriaId: yup.string().trim().default(''),
  cumplimientoId: yup.string().trim().default(''),
  obligacionFiscalId: yup.string().trim().default(''),
})

const FORMATO_ACEPTADO = 'application/pdf'

/**
 * Valida un archivo antes de subirlo (FR-003): solo PDF, dentro del tamaño
 * máximo. Devuelve un mensaje de error o null si el archivo es válido.
 */
export function validarArchivoDocumento(archivo: {
  tamanoBytes: number
  tipoMime: string
}): string | null {
  if (archivo.tipoMime !== FORMATO_ACEPTADO) {
    return 'Solo se permiten archivos PDF.'
  }
  if (archivo.tamanoBytes > TAMANO_MAXIMO_DOCUMENTO_BYTES) {
    return 'El archivo excede el tamaño máximo permitido (20 MB).'
  }
  return null
}

/**
 * Traduce errores de Postgres/Supabase a mensajes claros para el Expediente
 * Fiscal (016-expediente-fiscal), mismo patrón que
 * mapearErrorCumplimientoFiscalAMensaje (015).
 */
export function mapearErrorDocumentoAMensaje(error: { message: string } | null): string {
  if (!error) return 'No se pudo guardar el documento. Intenta de nuevo.'

  if (error.message.includes('pertenece a un cliente distinto del cumplimiento')) {
    return 'Ese cumplimiento pertenece a otro cliente y no puede asociarse a este documento.'
  }

  if (error.message.includes('cumplimiento_fiscal_documentos_documento_unique')) {
    return 'Este documento ya está asociado a otro cumplimiento. Desasócialo primero.'
  }

  if (error.message.includes('cumplimiento_fiscal_documentos_unique')) {
    return 'Ese documento ya está asociado a este cumplimiento.'
  }

  if (error.message.includes('Solo un Administrador puede eliminar un documento')) {
    return 'Solo un Administrador puede eliminar un documento con más de tres meses de antigüedad.'
  }

  return 'No se pudo guardar el documento. Intenta de nuevo.'
}
