import { describe, expect, it } from 'vitest'

import { resolveStatusChipVariant } from './StatusChip'

describe('resolveStatusChipVariant (009-migrate-design-system, FR-012)', () => {
  it('"activo" mapea a la variante positiva (azul)', () => {
    expect(resolveStatusChipVariant('activo')).toBe('positivo')
  })

  it('"inactivo" y "obsoleto" mapean a la variante neutra (gris), nunca positiva', () => {
    expect(resolveStatusChipVariant('inactivo')).toBe('neutro')
    expect(resolveStatusChipVariant('obsoleto')).toBe('neutro')
  })

  it('"vencido" mapea a la variante negativa (rojo)', () => {
    expect(resolveStatusChipVariant('vencido')).toBe('negativo')
  })

  it('un valor de estado desconocido cae en la variante neutra por defecto, nunca falla', () => {
    expect(resolveStatusChipVariant('valor-no-documentado')).toBe('neutro')
  })
})
