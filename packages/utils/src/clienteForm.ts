import { esRfcValido } from './rfc'
import * as yup from 'yup'

export interface ClienteFormValues {
  nombre: string
  tipoPersona: 'fisica' | 'moral'
  rfc: string
  regimenFiscalCodigo: string
  correo: string
  telefono: string
  direccionFiscal: string
}

export interface RegimenFiscalOption {
  codigo: string
  descripcion: string
  aplicaPersonaFisica: boolean
  aplicaPersonaMoral: boolean
  fechaFinVigencia: string | null
}

export const clienteFormSchema: yup.ObjectSchema<ClienteFormValues> = yup.object({
  nombre: yup.string().trim().required('El nombre o razón social es obligatorio.'),
  tipoPersona: yup
    .string()
    .oneOf(['fisica', 'moral'] as const)
    .required('El tipo de persona es obligatorio.'),
  rfc: yup
    .string()
    .trim()
    .required('El RFC es obligatorio.')
    .test('rfc-valido', 'El RFC no tiene un formato válido.', (value) =>
      value ? esRfcValido(value) : false,
    ),
  regimenFiscalCodigo: yup.string().required('El régimen fiscal es obligatorio.'),
  correo: yup
    .string()
    .trim()
    .email('El correo no es válido.')
    .required('El correo es obligatorio.'),
  telefono: yup.string().trim().default(''),
  direccionFiscal: yup.string().trim().default(''),
})

/**
 * Mejora de UX (006-crud-clientes-admin research.md Decisión 3): el selector
 * de régimen fiscal solo ofrece las opciones compatibles con el tipo de
 * persona elegido y vigentes. La autoridad final sigue siendo el trigger
 * trg_clientes_validar_regimen_fiscal de 005-clientes-cobranza-expedientes.
 * Compartida por apps/admin (edición) y apps/portal (alta) desde
 * 007-alta-cliente-portal.
 */
export function filtrarRegimenesPorTipoPersona(
  regimenes: readonly RegimenFiscalOption[],
  tipoPersona: 'fisica' | 'moral',
  hoy: string,
): RegimenFiscalOption[] {
  return regimenes.filter((regimen) => {
    const aplicaTipoPersona =
      tipoPersona === 'fisica' ? regimen.aplicaPersonaFisica : regimen.aplicaPersonaMoral
    const vigente = regimen.fechaFinVigencia === null || regimen.fechaFinVigencia >= hoy
    return aplicaTipoPersona && vigente
  })
}

/**
 * Traduce errores de Postgres/Supabase a mensajes claros para el formulario
 * (006-crud-clientes-admin research.md Decisión 4). Los triggers de régimen
 * fiscal ya lanzan mensajes explícitos en español — se propagan tal cual.
 * Compartida por apps/admin (edición) y apps/portal (alta) desde
 * 007-alta-cliente-portal.
 */
export function mapearErrorClienteAMensaje(error: { message: string } | null): string {
  if (!error) return 'No se pudo guardar el cliente. Intenta de nuevo.'

  if (
    error.message.includes('clientes_rfc_activo_unique') ||
    error.message.includes('duplicate key')
  ) {
    return 'Ya existe un cliente activo con este RFC.'
  }

  if (
    error.message.includes('no aplica a personas') ||
    error.message.includes('ya no está vigente') ||
    error.message.includes('no existe en el catálogo')
  ) {
    return error.message
  }

  return 'No se pudo guardar el cliente. Intenta de nuevo.'
}
