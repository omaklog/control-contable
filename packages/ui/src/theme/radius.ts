import type { RadiusScale } from './types'

/**
 * design-system.md §1.5 — Radio de esquina: escala única, idéntica en ambos modos
 * (el modo oscuro no tiene su propia escala de radios, solo cambia color/superficie).
 * 8px en componentes estándar, 12px en contenedores grandes, pill en badges/chips.
 */
export const radiusTokens: RadiusScale = {
  standard: 8,
  large: 12,
  pill: 9999,
}
