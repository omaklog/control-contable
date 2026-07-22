export type EstadoPagoCobranza = 'pendiente' | 'parcial' | 'pagada'
export type EstadoVencimientoCobranza = 'vigente' | 'vencida'

export interface CalcularEstadoPagoInput {
  totalConceptos: number
  totalPagado: number
}

/**
 * Estado de pago de una cobranza (017-cobranza, FR-015): siempre derivado de
 * la suma real de sus pagos frente al total de sus conceptos — nunca se
 * almacena. Refleja la misma lógica que la vista `cobranzas_resumen`
 * (contracts/db-functions-rls.md Sección H), reutilizable en pruebas
 * unitarias y para previsualización en la UI sin duplicar la lógica SQL.
 */
export function calcularEstadoPago(input: CalcularEstadoPagoInput): EstadoPagoCobranza {
  const { totalConceptos, totalPagado } = input
  if (totalPagado <= 0) return 'pendiente'
  if (totalPagado < totalConceptos) return 'parcial'
  return 'pagada'
}

export interface CalcularEstadoVencimientoInput {
  fechaLimite: string
  hoy: string
  estadoPago: EstadoPagoCobranza
}

/**
 * Estado de vencimiento de una cobranza (017-cobranza, FR-016/FR-017):
 * independiente del estado de pago, salvo que una cobranza "Pagada" siempre
 * se considera vigente sin importar la fecha límite.
 */
export function calcularEstadoVencimiento(
  input: CalcularEstadoVencimientoInput,
): EstadoVencimientoCobranza {
  const { fechaLimite, hoy, estadoPago } = input
  if (estadoPago === 'pagada') return 'vigente'
  return hoy > fechaLimite ? 'vencida' : 'vigente'
}
