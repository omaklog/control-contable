import { describe, expect, it } from 'vitest'

import { resolveInitialMode } from './useColorMode'

describe('resolveInitialMode (009-migrate-design-system, FR-010, Historia 3 AS3-AS4)', () => {
  it('sin valor guardado, sigue la preferencia oscura del sistema operativo', () => {
    expect(resolveInitialMode({ storedMode: null, prefersDark: true })).toBe('dark')
  })

  it('sin valor guardado, sigue la preferencia clara del sistema operativo', () => {
    expect(resolveInitialMode({ storedMode: null, prefersDark: false })).toBe('light')
  })

  it('sin valor guardado y sin poder detectar la preferencia del SO, usa claro como respaldo (Edge Case)', () => {
    expect(resolveInitialMode({ storedMode: null, prefersDark: null })).toBe('light')
  })

  it('un valor manual guardado en oscuro prevalece aunque el SO prefiera claro', () => {
    expect(resolveInitialMode({ storedMode: 'dark', prefersDark: false })).toBe('dark')
  })

  it('un valor manual guardado en claro prevalece aunque el SO prefiera oscuro', () => {
    expect(resolveInitialMode({ storedMode: 'light', prefersDark: true })).toBe('light')
  })
})
