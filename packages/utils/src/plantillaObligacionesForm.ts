import * as yup from 'yup'

export interface PlantillaObligacionesFormValues {
  nombre: string
  descripcion: string
}

export const plantillaObligacionesFormSchema: yup.ObjectSchema<PlantillaObligacionesFormValues> =
  yup.object({
    nombre: yup.string().trim().required('El nombre es obligatorio.'),
    descripcion: yup.string().trim().default(''),
  })

export interface PlantillaItemFormValues {
  obligacionFiscalId: string
  periodicidadId: string
  orden: string
}

export const plantillaItemFormSchema: yup.ObjectSchema<PlantillaItemFormValues> = yup.object({
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
})

/**
 * Traduce errores de Postgres/Supabase a mensajes claros para Plantillas de
 * Obligaciones (014-obligaciones-fiscales-cliente), mismo patrón que
 * mapearErrorObligacionFiscalAMensaje (013).
 */
export function mapearErrorPlantillaObligacionesAMensaje(
  error: { message: string } | null,
): string {
  if (!error) return 'No se pudo guardar la plantilla de obligaciones. Intenta de nuevo.'

  if (error.message.includes('plantillas_obligaciones_nombre_activo_unique')) {
    return 'Ya existe una plantilla activa con ese nombre. Si estaba inactiva, reactívala en vez de crear una nueva.'
  }

  return 'No se pudo guardar la plantilla de obligaciones. Intenta de nuevo.'
}

/**
 * Traduce errores al agregar/editar un ítem dentro de una plantilla.
 */
export function mapearErrorPlantillaItemAMensaje(error: { message: string } | null): string {
  if (!error) return 'No se pudo guardar el ítem de la plantilla. Intenta de nuevo.'

  if (error.message.includes('plantilla_obligaciones_items_unique')) {
    return 'Esa obligación fiscal ya está incluida en esta plantilla.'
  }

  if (error.message.includes('no está activa en el catálogo')) {
    return 'Esa obligación fiscal ya no está activa en el catálogo.'
  }

  if (error.message.includes('no está activa')) {
    return 'La periodicidad seleccionada ya no está activa. Elige otra periodicidad.'
  }

  return 'No se pudo guardar el ítem de la plantilla. Intenta de nuevo.'
}
