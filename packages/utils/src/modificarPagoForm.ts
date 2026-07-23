import * as yup from 'yup'

export interface ModificarPagoFormValues {
  monto: string
  metodoPagoId: string
  fechaPago: string
  comentario: string
}

/**
 * Modificación de un pago existente (018-gestion-pagos, US1, FR-004): mismo
 * shape que `pagoCobranzaFormSchema` (017) — los campos editables son los
 * mismos que los de registro.
 */
export const modificarPagoFormSchema: yup.ObjectSchema<ModificarPagoFormValues> = yup.object({
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

export { mapearErrorPagoCobranzaAMensaje as mapearErrorModificarPagoAMensaje } from './pagoCobranzaForm'
