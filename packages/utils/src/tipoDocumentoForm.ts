import * as yup from 'yup'

export interface TipoDocumentoFormValues {
  nombre: string
  descripcion: string
}

/**
 * Catálogo de Tipos de Documento (016-expediente-fiscal, US5, FR-005):
 * mismo modelo que `categorias_documento` desde 005 — nombre y descripción,
 * sin campos adicionales.
 */
export const tipoDocumentoFormSchema: yup.ObjectSchema<TipoDocumentoFormValues> = yup.object({
  nombre: yup.string().trim().required('El nombre es obligatorio.'),
  descripcion: yup.string().trim().default(''),
})

/**
 * Traduce errores de Postgres/Supabase a mensajes claros para el catálogo de
 * Tipos de Documento, mismo patrón que mapearErrorPlantillaObligacionesAMensaje.
 */
export function mapearErrorTipoDocumentoAMensaje(error: { message: string } | null): string {
  if (!error) return 'No se pudo guardar el Tipo de Documento. Intenta de nuevo.'

  if (error.message.includes('categorias_documento_nombre_key')) {
    return 'Ya existe un Tipo de Documento con ese nombre.'
  }

  return 'No se pudo guardar el Tipo de Documento. Intenta de nuevo.'
}
