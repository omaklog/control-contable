import { describe, expect, it } from 'vitest'

import { configuracionCobranzaFormSchema } from './configuracionCobranzaForm'

describe('configuracionCobranzaFormSchema (017-cobranza)', () => {
  it('acepta valores válidos', async () => {
    await expect(
      configuracionCobranzaFormSchema.validate({ diaGeneracion: '1', diaLimitePago: '20' }),
    ).resolves.toBeTruthy()
  })

  it('rechaza un día de generación fuera de rango', async () => {
    await expect(
      configuracionCobranzaFormSchema.validate({ diaGeneracion: '29', diaLimitePago: '20' }),
    ).rejects.toThrow()
    await expect(
      configuracionCobranzaFormSchema.validate({ diaGeneracion: '0', diaLimitePago: '20' }),
    ).rejects.toThrow()
  })

  it('rechaza un día límite de pago fuera de rango', async () => {
    await expect(
      configuracionCobranzaFormSchema.validate({ diaGeneracion: '1', diaLimitePago: '29' }),
    ).rejects.toThrow()
  })

  it('rechaza valores vacíos', async () => {
    await expect(
      configuracionCobranzaFormSchema.validate({ diaGeneracion: '', diaLimitePago: '20' }),
    ).rejects.toThrow()
    await expect(
      configuracionCobranzaFormSchema.validate({ diaGeneracion: '1', diaLimitePago: '' }),
    ).rejects.toThrow()
  })
})
