import { describe, expect, it } from 'vitest'

import {
  mapearErrorServicioContratadoAMensaje,
  servicioContratadoFormSchema,
} from './servicioContratadoForm'

const VALORES_VALIDOS = {
  servicioId: '11111111-1111-1111-1111-111111111111',
  precioAcordado: '4500',
  fechaInicio: '2026-01-01',
  observaciones: '',
}

describe('servicioContratadoFormSchema (011-gestion-servicios, compartido)', () => {
  it('acepta valores válidos', async () => {
    await expect(servicioContratadoFormSchema.validate(VALORES_VALIDOS)).resolves.toBeTruthy()
  })

  it('rechaza sin servicio seleccionado', async () => {
    await expect(
      servicioContratadoFormSchema.validate({ ...VALORES_VALIDOS, servicioId: '' }),
    ).rejects.toThrow()
  })

  it('rechaza precio no numérico', async () => {
    await expect(
      servicioContratadoFormSchema.validate({ ...VALORES_VALIDOS, precioAcordado: 'abc' }),
    ).rejects.toThrow()
  })

  it('rechaza precio menor o igual a 0', async () => {
    await expect(
      servicioContratadoFormSchema.validate({ ...VALORES_VALIDOS, precioAcordado: '0' }),
    ).rejects.toThrow()
  })

  it('rechaza fecha de inicio vacía', async () => {
    await expect(
      servicioContratadoFormSchema.validate({ ...VALORES_VALIDOS, fechaInicio: '' }),
    ).rejects.toThrow()
  })
})

describe('mapearErrorServicioContratadoAMensaje', () => {
  it('devuelve un mensaje claro cuando el servicio ya está asignado (FR-005)', () => {
    expect(
      mapearErrorServicioContratadoAMensaje({
        message:
          'duplicate key value violates unique constraint "servicios_contratados_cliente_servicio_unique"',
      }),
    ).toBe(
      'Este cliente ya tiene ese servicio asignado. Si estaba finalizado o suspendido, reactívalo en vez de agregarlo de nuevo.',
    )
  })

  it('devuelve un mensaje genérico para otros errores', () => {
    expect(mapearErrorServicioContratadoAMensaje({ message: 'algo más' })).toBe(
      'No se pudo guardar el servicio contratado. Intenta de nuevo.',
    )
  })

  it('devuelve un mensaje genérico cuando no hay error', () => {
    expect(mapearErrorServicioContratadoAMensaje(null)).toBe(
      'No se pudo guardar el servicio contratado. Intenta de nuevo.',
    )
  })
})
