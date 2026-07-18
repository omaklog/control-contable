import { createTheme } from '@mui/material/styles'
import { esES } from '@mui/material/locale'
import type { Theme } from '@mui/material/styles'

import { radiusTokens } from './radius'
import { shadowTokens } from './shadows'
import { spacingUnit } from './spacing'
import { typographyVariants } from './typography'
import type { ColorTokens } from './types'

/**
 * Fábrica única consumida por light.ts y dark.ts: recibe solo la paleta de color
 * y construye el resto del Theme (tipografía, espaciado, radios, elevación) a partir
 * de los mismos tokens compartidos, garantizando por construcción que ambos modos
 * comparten exactamente la misma forma, tipografía y espaciado (FR-007).
 */
export function buildAppTheme(colors: ColorTokens): Theme {
  return createTheme(
    {
      palette: {
        mode: colors.mode,
        primary: colors.primary,
        secondary: colors.secondary,
        background: {
          default: colors.surface.background,
          paper: colors.surface.paper,
        },
        divider: colors.surface.divider,
        error: {
          main: colors.status.negative,
        },
        text: colors.text,
        action: {
          hover: colors.surface.hover,
          selected: colors.surface.selected,
        },
      },
      typography: typographyVariants,
      spacing: spacingUnit,
      shape: {
        borderRadius: radiusTokens.standard,
      },
      custom: {
        fontFamilyMono: [
          'var(--font-jetbrains-mono)',
          '"JetBrains Mono"',
          '"Courier New"',
          'monospace',
        ].join(','),
        statusColors: colors.status,
      },
      components: {
        MuiButton: {
          defaultProps: {
            disableElevation: true,
          },
          styleOverrides: {
            root: {
              borderRadius: radiusTokens.standard,
            },
          },
        },
        MuiPaper: {
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              border: `1px solid ${colors.surface.divider}`,
              borderRadius: radiusTokens.large,
            },
            elevation1: {
              boxShadow: shadowTokens.level1,
            },
          },
        },
        MuiDialog: {
          styleOverrides: {
            paper: {
              borderRadius: radiusTokens.large,
              boxShadow: shadowTokens.level2,
            },
          },
        },
        MuiChip: {
          styleOverrides: {
            root: {
              borderRadius: radiusTokens.pill,
            },
          },
        },
        MuiTableRow: {
          styleOverrides: {
            root: {
              '&:hover': {
                backgroundColor: colors.surface.hover,
              },
            },
          },
        },
      },
    },
    esES,
  )
}
