import * as yup from 'yup'

export interface ObligacionFiscalClienteFormValues {
  obligacionFiscalId: string
  periodicidadId: string
  orden: string
  observaciones: string
}

export const obligacionFiscalClienteFormSchema: yup.ObjectSchema<ObligacionFiscalClienteFormValues> =
  yup.object({
    obligacionFiscalId: yup.string().trim().required('Selecciona una obligación fiscal.'),
    periodicidadId: yup.string().trim().required('Selecciona una periodicidad.'),
    orden: yup
      .string()
      .trim()
      .required('El orden es obligatorio.')
      .test('es-entero', 'El orden debe ser un número entero.', (value) => {
        const numero = Number(value)
        return Number.isInteger(numero)
      }),
    observaciones: yup.string().trim().default(''),
  })

/**
 * Traduce errores de Postgres/Supabase a mensajes claros para las
 * Obligaciones Fiscales de un Cliente (014-obligaciones-fiscales-cliente),
 * mismo patrón que mapearErrorServicioContratadoAMensaje.
 */
export function mapearErrorObligacionFiscalClienteAMensaje(
  error: { message: string } | null,
): string {
  if (!error) return 'No se pudo guardar la obligación fiscal del cliente. Intenta de nuevo.'

  if (error.message.includes('obligaciones_fiscales_cliente_cliente_obligacion_unique')) {
    return 'Este cliente ya tiene esa obligación fiscal configurada.'
  }

  if (error.message.includes('obligaciones_fiscales_cliente_cliente_orden_unique')) {
    return 'Ese orden ya está en uso por otra obligación de este cliente.'
  }

  if (error.message.includes('no está activa en el catálogo')) {
    return 'Esa obligación fiscal ya no está activa en el catálogo.'
  }

  if (error.message.includes('no está activa')) {
    return 'La periodicidad seleccionada ya no está activa. Elige otra periodicidad.'
  }

  return 'No se pudo guardar la obligación fiscal del cliente. Intenta de nuevo.'
}
