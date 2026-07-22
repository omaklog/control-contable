import * as yup from 'yup'

export interface DocumentoEsperadoFormValues {
  categoriaDocumentoId: string
}

/**
 * Agregar un Documento Esperado a una obligación fiscal (016-expediente-fiscal,
 * US5, FR-010): selecciona un Tipo de Documento del catálogo ya existente —
 * la configuración en sí no tiene más campos que esa referencia.
 */
export const documentoEsperadoFormSchema: yup.ObjectSchema<DocumentoEsperadoFormValues> =
  yup.object({
    categoriaDocumentoId: yup.string().trim().required('Selecciona un Tipo de Documento.'),
  })

/**
 * Traduce errores de Postgres/Supabase a mensajes claros para Documentos
 * Esperados de una obligación fiscal.
 */
export function mapearErrorDocumentoEsperadoAMensaje(error: { message: string } | null): string {
  if (!error) return 'No se pudo guardar el Documento Esperado. Intenta de nuevo.'

  if (error.message.includes('documentos_esperados_obligaci_obligacion_fiscal_id_categori_key')) {
    return 'Ese Tipo de Documento ya está configurado como esperado para esta obligación.'
  }

  return 'No se pudo guardar el Documento Esperado. Intenta de nuevo.'
}
