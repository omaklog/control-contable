import * as yup from 'yup'

export interface RevertirPagoFormValues {
  motivoReversion: string
}

/**
 * Reversión de un pago (018-gestion-pagos, US2, FR-015/FR-016): el motivo es
 * obligatorio — el pago conserva su registro histórico, solo cambia de
 * estado y se excluye del saldo.
 */
export const revertirPagoFormSchema: yup.ObjectSchema<RevertirPagoFormValues> = yup.object({
  motivoReversion: yup.string().trim().required('El motivo de la reversión es obligatorio.'),
})

/**
 * Traduce errores de Postgres/Supabase a mensajes claros para la reversión
 * de pagos (018), mismo patrón que mapearErrorPagoCobranzaAMensaje (017).
 */
export function mapearErrorRevertirPagoAMensaje(error: { message: string } | null): string {
  if (!error) return 'No se pudo revertir el pago. Intenta de nuevo.'

  if (error.message.includes('estado final')) {
    return 'Este pago ya no puede modificarse: es un estado final.'
  }

  return 'No se pudo revertir el pago. Intenta de nuevo.'
}
