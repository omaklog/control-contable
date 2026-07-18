import * as yup from 'yup'

export interface ServicioContratadoFormValues {
  servicioId: string
  precioAcordado: string
  fechaInicio: string
  observaciones: string
}

export const servicioContratadoFormSchema: yup.ObjectSchema<ServicioContratadoFormValues> =
  yup.object({
    servicioId: yup.string().trim().required('Selecciona un servicio.'),
    precioAcordado: yup
      .string()
      .trim()
      .required('El precio acordado es obligatorio.')
      .test('es-numero-positivo', 'El precio debe ser un número mayor a 0.', (value) => {
        const numero = Number(value)
        return Number.isFinite(numero) && numero > 0
      }),
    fechaInicio: yup.string().trim().required('La fecha de inicio es obligatoria.'),
    observaciones: yup.string().trim().default(''),
  })

/**
 * Traduce errores de Postgres/Supabase a mensajes claros para los Servicios
 * Contratados de un cliente (011-gestion-servicios), mismo patrón que
 * mapearErrorContactoAMensaje.
 */
export function mapearErrorServicioContratadoAMensaje(error: { message: string } | null): string {
  if (!error) return 'No se pudo guardar el servicio contratado. Intenta de nuevo.'

  if (error.message.includes('servicios_contratados_cliente_servicio_unique')) {
    return 'Este cliente ya tiene ese servicio asignado. Si estaba finalizado o suspendido, reactívalo en vez de agregarlo de nuevo.'
  }

  return 'No se pudo guardar el servicio contratado. Intenta de nuevo.'
}
