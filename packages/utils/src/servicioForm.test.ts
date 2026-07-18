import { describe, expect, it } from 'vitest'

import { mapearErrorServicioAMensaje, servicioFormSchema } from './servicioForm'

const VALORES_VALIDOS = {
  nombre: 'Contabilidad mensual',
  descripcion: 'Registro contable y presentación de reportes mensuales.',
  categoria: 'Contabilidad',
  observaciones: '',
}

describe('servicioFormSchema (011-gestion-servicios, compartido)', () => {
  it('acepta valores válidos', async () => {
    await expect(servicioFormSchema.validate(VALORES_VALIDOS)).resolves.toBeTruthy()
  })

  it('acepta descripción y observaciones vacías', async () => {
    await expect(
      servicioFormSchema.validate({ ...VALORES_VALIDOS, descripcion: '', observaciones: '' }),
    ).resolves.toBeTruthy()
  })

  it('rechaza nombre vacío', async () => {
    await expect(servicioFormSchema.validate({ ...VALORES_VALIDOS, nombre: '' })).rejects.toThrow()
  })

  it('rechaza categoría vacía', async () => {
    await expect(
      servicioFormSchema.validate({ ...VALORES_VALIDOS, categoria: '' }),
    ).rejects.toThrow()
  })
})

describe('mapearErrorServicioAMensaje', () => {
  it('devuelve un mensaje genérico para cualquier error', () => {
    expect(mapearErrorServicioAMensaje({ message: 'algo más' })).toBe(
      'No se pudo guardar el servicio. Intenta de nuevo.',
    )
  })

  it('devuelve un mensaje genérico cuando no hay error', () => {
    expect(mapearErrorServicioAMensaje(null)).toBe(
      'No se pudo guardar el servicio. Intenta de nuevo.',
    )
  })
})
