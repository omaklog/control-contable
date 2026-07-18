import { buildAppTheme } from './buildTheme'
import { darkColors } from './colors'

/**
 * Theme MUI en modo oscuro (design-system.md §1.2). Construido con la misma
 * fábrica que `light.ts`, garantizando idéntica forma, tipografía y espaciado
 * (FR-007) — únicamente cambia la paleta de color.
 */
export const darkTheme = buildAppTheme(darkColors)
