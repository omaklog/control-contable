import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Prueba de integración contra un Supabase local real — verifica que un
 * Cliente pueda tener uno o más Contactos asociados (005-clientes-cobranza-
 * expedientes US1, FR-023). Se omite automáticamente si no hay un Supabase
 * local accesible.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

async function isSupabaseReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, { signal: AbortSignal.timeout(1500) })
    return res.ok
  } catch {
    return false
  }
}

const reachable = await isSupabaseReachable()

describe.skipIf(!reachable)('Contacto (integración, 005-clientes-cobranza-expedientes US1)', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let testUserId: string
  let clienteId: string
  const testUserEmail = `integration-contacto-${Date.now()}@example.com`

  beforeAll(async () => {
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email: testUserEmail,
      password: 'Integration-Test-Pass1!',
      email_confirm: true,
    })
    if (userError || !userData.user)
      throw userError ?? new Error('No se pudo crear el usuario de prueba')
    testUserId = userData.user.id

    const { data: cliente, error: clienteError } = await admin
      .from('clientes')
      .insert({
        nombre: 'Cliente con Contactos',
        tipo_persona: 'moral',
        rfc: `CTC${Date.now().toString().slice(-6)}AA1`,
        regimen_fiscal_codigo: '601',
        correo: 'contactos@ejemplo.com',
        created_by: testUserId,
        updated_by: testUserId,
      })
      .select()
      .single()
    if (clienteError || !cliente)
      throw clienteError ?? new Error('No se pudo crear el cliente de prueba')
    clienteId = cliente.id
  })

  afterAll(async () => {
    if (clienteId) await admin.from('clientes').delete().eq('id', clienteId)
    if (testUserId) await admin.auth.admin.deleteUser(testUserId)
  })

  it('crea uno o más Contactos asociados a un Cliente y son consultables desde su ficha (FR-023)', async () => {
    const { error: insertError } = await admin.from('contactos').insert([
      {
        cliente_id: clienteId,
        nombre: 'Juan Pérez',
        telefono: '5555555555',
        email: 'juan@ejemplo.com',
        created_by: testUserId,
        updated_by: testUserId,
      },
      {
        cliente_id: clienteId,
        nombre: 'María López',
        telefono: '5555555556',
        created_by: testUserId,
        updated_by: testUserId,
      },
    ])
    expect(insertError).toBeNull()

    const { data: contactos, error: selectError } = await admin
      .from('contactos')
      .select('nombre, telefono, email')
      .eq('cliente_id', clienteId)
    expect(selectError).toBeNull()
    expect(contactos).toHaveLength(2)
    expect(contactos?.some((c) => c.email === null)).toBe(true)
  })

  it('exige nombre y teléfono (FR-023)', async () => {
    const contactoIncompleto = {
      cliente_id: clienteId,
      created_by: testUserId,
      updated_by: testUserId,
    }
    const { error } = await admin
      .from('contactos')
      .insert(
        contactoIncompleto as unknown as { cliente_id: string; nombre: string; telefono: string },
      )
    expect(error).not.toBeNull()
  })
})
