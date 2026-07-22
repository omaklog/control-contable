import { describe, expect, it } from 'vitest'

import {
  cargoExtraordinarioFormSchema,
  mapearErrorCargoExtraordinarioAMensaje,
} from './cargoExtraordinarioForm'

const VALORES_VALIDOS = {
  descripcion: 'Asesoría fiscal extraordinaria',
  monto: '2000',
  periodoMes: '6',
  periodoAnio: '2026',
}

describe('cargoExtraordinarioFormSchema (017-cobranza)', () => {
  it('acepta valores válidos', async () => {
    await expect(cargoExtraordinarioFormSchema.validate(VALORES_VALIDOS)).resolves.toBeTruthy()
  })

  it('rechaza una descripción vacía', async () => {
    await expect(
      cargoExtraordinarioFormSchema.validate({ ...VALORES_VALIDOS, descripcion: '' }),
    ).rejects.toThrow()
  })

  it('rechaza un monto cero o negativo', async () => {
    await expect(
      cargoExtraordinarioFormSchema.validate({ ...VALORES_VALIDOS, monto: '0' }),
    ).rejects.toThrow()
  })

  it('rechaza un mes fuera de rango', async () => {
    await expect(
      cargoExtraordinarioFormSchema.validate({ ...VALORES_VALIDOS, periodoMes: '13' }),
    ).rejects.toThrow()
    await expect(
      cargoExtraordinarioFormSchema.validate({ ...VALORES_VALIDOS, periodoMes: '0' }),
    ).rejects.toThrow()
  })

  it('rechaza un año no numérico', async () => {
    await expect(
      cargoExtraordinarioFormSchema.validate({ ...VALORES_VALIDOS, periodoAnio: 'abcd' }),
    ).rejects.toThrow()
  })
})

describe('mapearErrorCargoExtraordinarioAMensaje', () => {
  it('devuelve un mensaje genérico para cualquier otro error', () => {
    expect(mapearErrorCargoExtraordinarioAMensaje({ message: 'algo más' })).toBe(
      'No se pudo guardar el cargo extraordinario. Intenta de nuevo.',
    )
  })

  it('devuelve un mensaje genérico cuando no hay error', () => {
    expect(mapearErrorCargoExtraordinarioAMensaje(null)).toBe(
      'No se pudo guardar el cargo extraordinario. Intenta de nuevo.',
    )
  })
})
