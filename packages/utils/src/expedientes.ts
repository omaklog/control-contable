export const TAMANO_MAXIMO_DOCUMENTO_BYTES = 20 * 1024 * 1024 // 20 MB

export function excedeTamanoMaximo(
  tamanoBytes: number,
  maximoBytes: number = TAMANO_MAXIMO_DOCUMENTO_BYTES,
): boolean {
  return tamanoBytes > maximoBytes
}
