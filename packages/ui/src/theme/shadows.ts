import type { ShadowTokens } from './types'

/**
 * design-system.md §1.5 — Elevación, bordes y formas. La jerarquía visual se logra
 * con capas tonales y bordes de 1px, no con sombras pesadas. Nivel 1 (tarjetas,
 * sidebar, tablas) usa un borde de 1px + sombra suave opcional; Nivel 2 (modales,
 * popovers) usa una sombra difusa mayor para indicar foco.
 */
export const shadowTokens: ShadowTokens = {
  level1: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
  level2: '0 12px 24px -8px rgba(15, 23, 42, 0.25)',
}
