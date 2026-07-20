import * as yup from 'yup'

export interface ObligacionFiscalFormValues {
  nombre: string
  descripcion: string
  periodicidadId: string
  prioridad: string
}

export const obligacionFiscalFormSchema: yup.ObjectSchema<ObligacionFiscalFormValues> = yup.object({
  nombre: yup.string().trim().required('El nombre es obligatorio.'),
  descripcion: yup.string().trim().default(''),
  periodicidadId: yup.string().trim().required('Selecciona una periodicidad.'),
  prioridad: yup
    .string()
    .trim()
    .required('La prioridad es obligatoria.')
    .test('es-entero', 'La prioridad debe ser un número entero.', (value) => {
      const numero = Number(value)
      return Number.isInteger(numero)
    }),
})

/**
 * Traduce errores de Postgres/Supabase a mensajes claros para el catálogo de
 * Obligaciones Fiscales (013-catalogo-obligaciones-fiscales), mismo patrón
 * que mapearErrorServicioContratadoAMensaje.
 */
export function mapearErrorObligacionFiscalAMensaje(error: { message: string } | null): string {
  if (!error) return 'No se pudo guardar la obligación fiscal. Intenta de nuevo.'

  if (error.message.includes('obligaciones_fiscales_nombre_activo_unique')) {
    return 'Ya existe una obligación fiscal activa con ese nombre. Si estaba inactiva, reactívala en vez de crear una nueva.'
  }

  if (error.message.includes('no está activa')) {
    return 'La periodicidad seleccionada ya no está activa. Elige otra periodicidad.'
  }

  return 'No se pudo guardar la obligación fiscal. Intenta de nuevo.'
}
