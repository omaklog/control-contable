import { describe, expect, it } from 'vitest'

import { contactoFormSchema, mapearErrorContactoAMensaje } from './contactoForm'

const VALORES_VALIDOS = {
  nombre: 'Juan Pérez',
  telefono: '5555555555',
  email: '',
}

describe('contactoFormSchema (008-contactos-y-detalle-cliente, compartido)', () => {
  it('acepta valores válidos con correo vacío', async () => {
    await expect(contactoFormSchema.validate(VALORES_VALIDOS)).resolves.toBeTruthy()
  })

  it('acepta un correo válido', async () => {
    await expect(
      contactoFormSchema.validate({ ...VALORES_VALIDOS, email: 'juan@ejemplo.com' }),
    ).resolves.toBeTruthy()
  })

  it('rechaza un correo con formato inválido', async () => {
    await expect(
      contactoFormSchema.validate({ ...VALORES_VALIDOS, email: 'no-es-un-correo' }),
    ).rejects.toThrow()
  })

  it('rechaza nombre vacío', async () => {
    await expect(contactoFormSchema.validate({ ...VALORES_VALIDOS, nombre: '' })).rejects.toThrow()
  })

  it('rechaza teléfono vacío', async () => {
    await expect(
      contactoFormSchema.validate({ ...VALORES_VALIDOS, telefono: '' }),
    ).rejects.toThrow()
  })
})

describe('mapearErrorContactoAMensaje', () => {
  it('devuelve un mensaje claro cuando ya hay un contacto principal', () => {
    expect(
      mapearErrorContactoAMensaje({
        message: 'duplicate key value violates unique constraint "contactos_principal_unico"',
      }),
    ).toBe('Otro contacto ya fue marcado como principal. Actualiza la página e inténtalo de nuevo.')
  })

  it('devuelve un mensaje genérico para otros errores', () => {
    expect(mapearErrorContactoAMensaje({ message: 'algo más' })).toBe(
      'No se pudo guardar el contacto. Intenta de nuevo.',
    )
  })

  it('devuelve un mensaje genérico cuando no hay error', () => {
    expect(mapearErrorContactoAMensaje(null)).toBe(
      'No se pudo guardar el contacto. Intenta de nuevo.',
    )
  })
})
