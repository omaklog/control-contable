import { describe, expect, it } from 'vitest'

import {
  clienteFormSchema,
  filtrarRegimenesPorTipoPersona,
  mapearErrorClienteAMensaje,
  type RegimenFiscalOption,
} from './clienteForm'

const VALORES_VALIDOS = {
  nombre: 'Cliente de Prueba SA de CV',
  tipoPersona: 'moral' as const,
  rfc: 'CDP010101AAA',
  regimenFiscalCodigo: '601',
  correo: 'contacto@ejemplo.com',
  telefono: '',
  direccionFiscal: '',
}

describe('clienteFormSchema (006-crud-clientes-admin / 007-alta-cliente-portal, compartido)', () => {
  it('acepta valores válidos', async () => {
    await expect(clienteFormSchema.validate(VALORES_VALIDOS)).resolves.toBeTruthy()
  })

  it('rechaza un RFC con formato inválido', async () => {
    await expect(clienteFormSchema.validate({ ...VALORES_VALIDOS, rfc: '123' })).rejects.toThrow()
  })

  it('rechaza un correo inválido', async () => {
    await expect(
      clienteFormSchema.validate({ ...VALORES_VALIDOS, correo: 'no-es-un-correo' }),
    ).rejects.toThrow()
  })

  it('rechaza campos requeridos vacíos', async () => {
    await expect(clienteFormSchema.validate({ ...VALORES_VALIDOS, nombre: '' })).rejects.toThrow()
    await expect(
      clienteFormSchema.validate({ ...VALORES_VALIDOS, regimenFiscalCodigo: '' }),
    ).rejects.toThrow()
  })
})

const REGIMENES: RegimenFiscalOption[] = [
  {
    codigo: '601',
    descripcion: 'General de Ley Personas Morales',
    aplicaPersonaFisica: false,
    aplicaPersonaMoral: true,
    fechaFinVigencia: null,
  },
  {
    codigo: '605',
    descripcion: 'Sueldos y Salarios',
    aplicaPersonaFisica: true,
    aplicaPersonaMoral: false,
    fechaFinVigencia: null,
  },
  {
    codigo: '609',
    descripcion: 'Consolidación',
    aplicaPersonaFisica: false,
    aplicaPersonaMoral: true,
    fechaFinVigencia: '2019-12-31',
  },
]

describe('filtrarRegimenesPorTipoPersona (006-crud-clientes-admin research.md Decisión 3)', () => {
  it('filtra por tipo de persona física', () => {
    const opciones = filtrarRegimenesPorTipoPersona(REGIMENES, 'fisica', '2026-07-16')
    expect(opciones.map((r) => r.codigo)).toEqual(['605'])
  })

  it('filtra por tipo de persona moral, excluyendo regímenes vencidos', () => {
    const opciones = filtrarRegimenesPorTipoPersona(REGIMENES, 'moral', '2026-07-16')
    expect(opciones.map((r) => r.codigo)).toEqual(['601'])
  })

  it('incluye un régimen sin fecha de fin de vigencia', () => {
    const opciones = filtrarRegimenesPorTipoPersona(REGIMENES, 'moral', '2026-07-16')
    expect(opciones.some((r) => r.codigo === '601')).toBe(true)
  })
})

describe('mapearErrorClienteAMensaje (006-crud-clientes-admin research.md Decisión 4)', () => {
  it('mapea la violación de unicidad de RFC', () => {
    expect(
      mapearErrorClienteAMensaje({
        message: 'duplicate key value violates unique constraint "clientes_rfc_activo_unique"',
      }),
    ).toBe('Ya existe un cliente activo con este RFC.')
  })

  it('propaga el mensaje explícito del trigger de régimen fiscal (incompatibilidad)', () => {
    expect(
      mapearErrorClienteAMensaje({
        message: 'El régimen fiscal 605 no aplica a personas morales',
      }),
    ).toBe('El régimen fiscal 605 no aplica a personas morales')
  })

  it('propaga el mensaje explícito del trigger de régimen fiscal (vigencia)', () => {
    expect(
      mapearErrorClienteAMensaje({
        message: 'El régimen fiscal 609 ya no está vigente',
      }),
    ).toBe('El régimen fiscal 609 ya no está vigente')
  })

  it('cae a un mensaje genérico si el error no se reconoce', () => {
    expect(mapearErrorClienteAMensaje({ message: 'algo inesperado' })).toBe(
      'No se pudo guardar el cliente. Intenta de nuevo.',
    )
  })

  it('cae a un mensaje genérico si no hay error explícito', () => {
    expect(mapearErrorClienteAMensaje(null)).toBe(
      'No se pudo guardar el cliente. Intenta de nuevo.',
    )
  })
})
