import * as yup from 'yup'

export interface ServicioFormValues {
  nombre: string
  descripcion: string
  categoria: string
  observaciones: string
}

export const servicioFormSchema: yup.ObjectSchema<ServicioFormValues> = yup.object({
  nombre: yup.string().trim().required('El nombre es obligatorio.'),
  descripcion: yup.string().trim().default(''),
  categoria: yup.string().trim().required('La categoría es obligatoria.'),
  observaciones: yup.string().trim().default(''),
})

/**
 * Traduce errores de Postgres/Supabase a mensajes claros para el catálogo de
 * Servicios (011-gestion-servicios), mismo patrón que
 * mapearErrorClienteAMensaje/mapearErrorContactoAMensaje.
 */
export function mapearErrorServicioAMensaje(error: { message: string } | null): string {
  if (!error) return 'No se pudo guardar el servicio. Intenta de nuevo.'

  return 'No se pudo guardar el servicio. Intenta de nuevo.'
}
