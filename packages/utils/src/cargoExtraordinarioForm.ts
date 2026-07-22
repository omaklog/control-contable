import * as yup from 'yup'

export interface CargoExtraordinarioFormValues {
  descripcion: string
  monto: string
  periodoMes: string
  periodoAnio: string
}

/**
 * Registro de un Cargo Extraordinario (017-cobranza, US3, FR-008): importe
 * puntual con un periodo objetivo de cobranza al que se incorporará.
 */
export const cargoExtraordinarioFormSchema: yup.ObjectSchema<CargoExtraordinarioFormValues> =
  yup.object({
    descripcion: yup.string().trim().required('La descripción es obligatoria.'),
    monto: yup
      .string()
      .trim()
      .required('El monto es obligatorio.')
      .test('es-positivo', 'El monto debe ser mayor a cero.', (value) => {
        const numero = Number(value)
        return Number.isFinite(numero) && numero > 0
      }),
    periodoMes: yup
      .string()
      .trim()
      .required('El mes objetivo es obligatorio.')
      .test('rango-valido', 'El mes debe estar entre 1 y 12.', (value) => {
        const numero = Number(value)
        return Number.isInteger(numero) && numero >= 1 && numero <= 12
      }),
    periodoAnio: yup
      .string()
      .trim()
      .required('El año objetivo es obligatorio.')
      .test('es-entero', 'El año debe ser un número entero.', (value) => {
        const numero = Number(value)
        return Number.isInteger(numero)
      }),
  })

/**
 * Traduce errores de Postgres/Supabase a mensajes claros para Cargos
 * Extraordinarios (017), mismo patrón que mapearErrorPagoCobranzaAMensaje.
 */
export function mapearErrorCargoExtraordinarioAMensaje(error: { message: string } | null): string {
  if (!error) return 'No se pudo guardar el cargo extraordinario. Intenta de nuevo.'

  if (error.message.includes('RLS') || error.message.includes('policy')) {
    return 'No se pudo eliminar: este cargo extraordinario ya fue incorporado a una cobranza.'
  }

  return 'No se pudo guardar el cargo extraordinario. Intenta de nuevo.'
}
