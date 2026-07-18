import { describe, expect, it } from 'vitest'

import { darkColors, lightColors } from './colors'
import type { ColorTokens } from './types'

/** Componente de canal → luminancia relativa lineal (fórmula WCAG 2.1). */
function channelToLinear(channel: number): number {
  const c = channel / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.substring(0, 2), 16)
  const g = parseInt(normalized.substring(2, 4), 16)
  const b = parseInt(normalized.substring(4, 6), 16)
  return [r, g, b]
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b)
}

/** Ratio de contraste WCAG 2.1 entre dos colores (§FR-002, SC-007). */
function contrastRatio(hexA: string, hexB: string): number {
  const lumA = relativeLuminance(hexA)
  const lumB = relativeLuminance(hexB)
  const lighter = Math.max(lumA, lumB)
  const darker = Math.min(lumA, lumB)
  return (lighter + 0.05) / (darker + 0.05)
}

const NORMAL_TEXT_MIN = 4.5
const LARGE_TEXT_OR_ICON_MIN = 3

interface Pair {
  name: string
  fg: string
  bg: string
  minRatio: number
}

function pairsForMode(colors: ColorTokens): Pair[] {
  return [
    {
      name: 'texto primario sobre fondo de página',
      fg: colors.text.primary,
      bg: colors.surface.background,
      minRatio: NORMAL_TEXT_MIN,
    },
    {
      name: 'texto primario sobre superficie (paper)',
      fg: colors.text.primary,
      bg: colors.surface.paper,
      minRatio: NORMAL_TEXT_MIN,
    },
    {
      name: 'texto secundario sobre fondo de página',
      fg: colors.text.secondary,
      bg: colors.surface.background,
      minRatio: NORMAL_TEXT_MIN,
    },
    {
      name: 'texto secundario sobre superficie (paper)',
      fg: colors.text.secondary,
      bg: colors.surface.paper,
      minRatio: NORMAL_TEXT_MIN,
    },
    {
      name: 'primary.contrastText sobre primary.main (botón primario)',
      fg: colors.primary.contrastText,
      bg: colors.primary.main,
      minRatio: NORMAL_TEXT_MIN,
    },
    {
      name: 'secondary.main sobre superficie (enlaces/icono activo)',
      fg: colors.secondary.main,
      bg: colors.surface.paper,
      minRatio: LARGE_TEXT_OR_ICON_MIN,
    },
    {
      name: 'status.positive sobre status.positiveBg (chip)',
      fg: colors.status.positive,
      bg: colors.status.positiveBg,
      minRatio: NORMAL_TEXT_MIN,
    },
    {
      name: 'status.negative sobre status.negativeBg (chip)',
      fg: colors.status.negative,
      bg: colors.status.negativeBg,
      minRatio: NORMAL_TEXT_MIN,
    },
    {
      name: 'status.neutral sobre status.neutralBg (chip)',
      fg: colors.status.neutral,
      bg: colors.status.neutralBg,
      minRatio: NORMAL_TEXT_MIN,
    },
    {
      name: 'status.negative sobre fondo de página (error.main / texto de alerta)',
      fg: colors.status.negative,
      bg: colors.surface.background,
      minRatio: NORMAL_TEXT_MIN,
    },
  ]
}

describe.each([
  ['claro', lightColors],
  ['oscuro', darkColors],
])(
  'Contraste WCAG 2.1 AA — modo %s (009-migrate-design-system, FR-002/SC-007)',
  (_modeName, colors) => {
    const pairs = pairsForMode(colors as ColorTokens)

    it.each(pairs)('$name cumple contraste mínimo $minRatio:1', ({ fg, bg, minRatio }) => {
      const ratio = contrastRatio(fg, bg)
      expect(ratio).toBeGreaterThanOrEqual(minRatio)
    })
  },
)
