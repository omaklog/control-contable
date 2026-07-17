import * as yup from 'yup'

export interface ContactoFormValues {
  nombre: string
  telefono: string
  email: string
}

export const contactoFormSchema: yup.ObjectSchema<ContactoFormValues> = yup.object({
  nombre: yup.string().trim().required('El nombre es obligatorio.'),
  telefono: yup.string().trim().required('El teléfono es obligatorio.'),
  email: yup.string().trim().email('El correo no es válido.').default(''),
})

/**
 * Traduce errores de Postgres/Supabase a mensajes claros para el formulario
 * de Contacto (008-contactos-y-detalle-cliente FR-010), mismo patrón que
 * mapearErrorClienteAMensaje. Compartida por apps/admin y apps/portal.
 */
export function mapearErrorContactoAMensaje(error: { message: string } | null): string {
  if (!error) return 'No se pudo guardar el contacto. Intenta de nuevo.'

  if (error.message.includes('contactos_principal_unico')) {
    return 'Otro contacto ya fue marcado como principal. Actualiza la página e inténtalo de nuevo.'
  }

  return 'No se pudo guardar el contacto. Intenta de nuevo.'
}
