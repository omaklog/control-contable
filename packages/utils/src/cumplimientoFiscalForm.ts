import * as yup from 'yup'

export interface CumplimientoExtraordinarioFormValues {
  obligacionFiscalId: string
  descripcion: string
  periodoInicio: string
  periodoFin: string
  fechaLimite: string
  responsableId: string
}

export const cumplimientoExtraordinarioFormSchema: yup.ObjectSchema<CumplimientoExtraordinarioFormValues> =
  yup.object({
    obligacionFiscalId: yup.string().trim().default(''),
    descripcion: yup
      .string()
      .trim()
      .default('')
      .when('obligacionFiscalId', {
        is: (value: string) => !value,
        then: (schema) =>
          schema.required('La descripción es obligatoria si no seleccionas una obligación.'),
      }),
    periodoInicio: yup.string().trim().required('El inicio del periodo es obligatorio.'),
    periodoFin: yup.string().trim().required('El fin del periodo es obligatorio.'),
    fechaLimite: yup.string().trim().required('La fecha límite es obligatoria.'),
    responsableId: yup.string().trim().default(''),
  })

/**
 * Traduce errores de Postgres/Supabase a mensajes claros para Cumplimientos
 * Fiscales (015-control-cumplimiento-fiscal), mismo patrón que
 * mapearErrorObligacionFiscalClienteAMensaje (014).
 */
export function mapearErrorCumplimientoFiscalAMensaje(error: { message: string } | null): string {
  if (!error) return 'No se pudo guardar el cumplimiento. Intenta de nuevo.'

  if (error.message.includes('pertenece a un cliente distinto del cumplimiento')) {
    return 'Ese documento pertenece a otro cliente y no puede asociarse a este cumplimiento.'
  }

  if (error.message.includes('cumplimientos_fiscales_obligacion_periodo_unique')) {
    return 'Ya existe un cumplimiento para esa obligación y ese periodo.'
  }

  if (error.message.includes('cumplimiento_fiscal_documentos_unique')) {
    return 'Ese documento ya está asociado a este cumplimiento.'
  }

  return 'No se pudo guardar el cumplimiento. Intenta de nuevo.'
}
