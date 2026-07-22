import * as yup from 'yup'

export interface ConfiguracionCobranzaFormValues {
  diaGeneracion: string
  diaLimitePago: string
}

/**
 * Configuración global de Cobranza (017-cobranza, US6, FR-018): día del mes
 * de generación automática y día límite de pago. Ambos entre 1 y 28 para
 * evitar meses sin ese día calendario.
 */
export const configuracionCobranzaFormSchema: yup.ObjectSchema<ConfiguracionCobranzaFormValues> =
  yup.object({
    diaGeneracion: yup
      .string()
      .trim()
      .required('El día de generación es obligatorio.')
      .test('rango-valido', 'El día debe estar entre 1 y 28.', (value) => {
        const numero = Number(value)
        return Number.isInteger(numero) && numero >= 1 && numero <= 28
      }),
    diaLimitePago: yup
      .string()
      .trim()
      .required('El día límite de pago es obligatorio.')
      .test('rango-valido', 'El día debe estar entre 1 y 28.', (value) => {
        const numero = Number(value)
        return Number.isInteger(numero) && numero >= 1 && numero <= 28
      }),
  })
