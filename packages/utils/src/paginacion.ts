export function calcularTotalPaginas(total: number, porPagina: number): number {
  if (total <= 0) return 1
  return Math.ceil(total / porPagina)
}
