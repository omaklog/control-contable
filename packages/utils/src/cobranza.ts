export type CargoEstado = 'pendiente' | 'pagado' | 'vencido' | 'cancelado'

export interface CalcularEstadoCargoInput {
  montoTotal: number
  montoAplicado: number
  fechaVencimiento: string
  hoy: string
  estadoActual: CargoEstado
}

export function calcularEstadoCargo(input: CalcularEstadoCargoInput): CargoEstado {
  const { montoTotal, montoAplicado, fechaVencimiento, hoy, estadoActual } = input

  if (estadoActual === 'cancelado') return 'cancelado'
  if (montoAplicado >= montoTotal) return 'pagado'
  if (hoy > fechaVencimiento) return 'vencido'
  return 'pendiente'
}
