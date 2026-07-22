import * as yup from 'yup'

export interface PagoCobranzaFormValues {
  monto: string
  metodoPagoId: string
  fechaPago: string
  comentario: string
}

/**
 * Registro de un pago sobre una cobranza (017-cobranza, US2, FR-014): total o
 * parcial, con método de pago del catálogo existente (`metodos_pago`).
 */
export const pagoCobranzaFormSchema: yup.ObjectSchema<PagoCobranzaFormValues> = yup.object({
  monto: yup
    .string()
    .trim()
    .required('El monto es obligatorio.')
    .test('es-positivo', 'El monto debe ser mayor a cero.', (value) => {
      const numero = Number(value)
      return Number.isFinite(numero) && numero > 0
    }),
  metodoPagoId: yup.string().trim().required('Selecciona un método de pago.'),
  fechaPago: yup.string().trim().required('La fecha de pago es obligatoria.'),
  comentario: yup.string().trim().default(''),
})

/**
 * Traduce errores de Postgres/Supabase a mensajes claros para Pagos de
 * Cobranza (017), mismo patrón que mapearErrorCumplimientoFiscalAMensaje (015).
 */
export function mapearErrorPagoCobranzaAMensaje(error: { message: string } | null): string {
  if (!error) return 'No se pudo registrar el pago. Intenta de nuevo.'

  if (error.message.includes('El pago excede el saldo pendiente')) {
    return 'El pago excede el saldo pendiente de la cobranza.'
  }

  if (error.message.includes('no está vigente')) {
    return 'No se pueden registrar pagos sobre una cobranza cancelada o eliminada.'
  }

  return 'No se pudo registrar el pago. Intenta de nuevo.'
}
