import { describe, expect, it } from 'vitest'

import { darkTheme } from './dark'
import { lightTheme } from './light'
import { radiusTokens } from './radius'

describe('lightTheme / darkTheme paridad (009-migrate-design-system, FR-007)', () => {
  it('comparten exactamente la misma forma (radios) en ambos modos', () => {
    expect(lightTheme.shape.borderRadius).toBe(darkTheme.shape.borderRadius)
    expect(lightTheme.shape.borderRadius).toBe(radiusTokens.standard)
  })

  it('comparten exactamente la misma tipografía en ambos modos', () => {
    expect(lightTheme.typography.fontFamily).toBe(darkTheme.typography.fontFamily)
    expect(lightTheme.typography.h1.fontWeight).toBe(darkTheme.typography.h1.fontWeight)
    expect(lightTheme.custom.fontFamilyMono).toBe(darkTheme.custom.fontFamilyMono)
  })

  it('comparten exactamente el mismo espaciado en ambos modos', () => {
    expect(lightTheme.spacing(1)).toBe(darkTheme.spacing(1))
    expect(lightTheme.spacing(3)).toBe(darkTheme.spacing(3))
  })

  it('difieren en modo y en paleta de color', () => {
    expect(lightTheme.palette.mode).toBe('light')
    expect(darkTheme.palette.mode).toBe('dark')
    expect(lightTheme.palette.background.default).not.toBe(darkTheme.palette.background.default)
  })

  it('el color de estado "positivo" es azul (nunca verde) en ambos modos', () => {
    expect(lightTheme.custom.statusColors.positive).toBe('#1d4ed8')
    expect(darkTheme.custom.statusColors.positive).toBe('#7dd3fc')
  })
})
