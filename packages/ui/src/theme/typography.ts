import type { TypographyTokens } from './types'

/**
 * design-system.md §1.3 — Tipografía.
 * Inter para texto general (legibilidad en contextos densos de datos).
 * JetBrains Mono exclusiva para cifras/datos tabulares (columnas numéricas, montos, KPIs)
 * para que las cifras alineen verticalmente y no "salten" al actualizarse.
 */
export const typographyTokens: TypographyTokens = {
  fontFamilyGeneral: [
    'var(--font-inter)',
    'Inter',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Roboto',
    '"Helvetica Neue"',
    'Arial',
    'sans-serif',
  ].join(','),
  fontFamilyMono: [
    'var(--font-jetbrains-mono)',
    '"JetBrains Mono"',
    '"Courier New"',
    'monospace',
  ].join(','),
}

/**
 * Jerarquía por peso, no por saltos de tamaño agresivos (§1.3). En móvil, los
 * titulares grandes se reducen (36px → 28px) para evitar wrapping excesivo.
 */
export const typographyVariants = {
  fontFamily: typographyTokens.fontFamilyGeneral,
  h1: { fontWeight: 700, fontSize: '2.25rem' },
  h2: { fontWeight: 700, fontSize: '1.875rem' },
  h3: { fontWeight: 600, fontSize: '1.5rem' },
  h4: { fontWeight: 600, fontSize: '1.25rem' },
  h5: { fontWeight: 600, fontSize: '1.125rem' },
  h6: { fontWeight: 600, fontSize: '1rem' },
  subtitle1: { fontWeight: 600 },
  subtitle2: { fontWeight: 600, fontSize: '0.875rem' },
  body1: { fontWeight: 400 },
  body2: { fontWeight: 400, fontSize: '0.875rem' },
  overline: { fontWeight: 600, letterSpacing: '0.08em' },
} as const
