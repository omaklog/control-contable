import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Prueba de integración contra un Supabase local real — verifica que el
 * índice único parcial contactos_principal_unico garantiza a lo más un
 * contacto principal por cliente, incluso ante escrituras concurrentes
 * (008-contactos-y-detalle-cliente FR-007, research.md Decisión 3). Se omite
 * automáticamente si no hay un Supabase local accesible.
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

describe.skipIf(!reachable)(
  'Contacto principal (integración, 008-contactos-y-detalle-cliente FR-007)',
  () => {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let testUserId: string
    let clienteId: string
    let contactoAId: string
    let contactoBId: string
    const testUserEmail = `integration-contacto-principal-${Date.now()}@example.com`

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
          nombre: 'Cliente con Contacto Principal',
          tipo_persona: 'moral',
          rfc: `CTP${Date.now().toString().slice(-6)}AA1`,
          regimen_fiscal_codigo: '601',
          correo: 'principal@ejemplo.com',
          created_by: testUserId,
          updated_by: testUserId,
        })
        .select()
        .single()
      if (clienteError || !cliente)
        throw clienteError ?? new Error('No se pudo crear el cliente de prueba')
      clienteId = cliente.id

      const { data: contactos, error: contactosError } = await admin
        .from('contactos')
        .insert([
          {
            cliente_id: clienteId,
            nombre: 'Contacto A',
            telefono: '5551111111',
            created_by: testUserId,
            updated_by: testUserId,
          },
          {
            cliente_id: clienteId,
            nombre: 'Contacto B',
            telefono: '5552222222',
            created_by: testUserId,
            updated_by: testUserId,
          },
        ])
        .select()
      if (contactosError || !contactos)
        throw contactosError ?? new Error('No se pudieron crear los contactos de prueba')
      contactoAId = contactos[0]!.id
      contactoBId = contactos[1]!.id
    })

    afterAll(async () => {
      if (clienteId) await admin.from('contactos').delete().eq('cliente_id', clienteId)
      if (clienteId) await admin.from('clientes').delete().eq('id', clienteId)
      if (testUserId) await admin.auth.admin.deleteUser(testUserId)
    })

    it('permite marcar un contacto como principal cuando ninguno lo era', async () => {
      const { error } = await admin
        .from('contactos')
        .update({ es_principal: true })
        .eq('id', contactoAId)
      expect(error).toBeNull()
    })

    it('al marcar un segundo contacto como principal, el primero debe desmarcarse antes (secuencia de dos updates)', async () => {
      const { error: unsetError } = await admin
        .from('contactos')
        .update({ es_principal: false })
        .eq('cliente_id', clienteId)
        .eq('es_principal', true)
      expect(unsetError).toBeNull()

      const { error: setError } = await admin
        .from('contactos')
        .update({ es_principal: true })
        .eq('id', contactoBId)
      expect(setError).toBeNull()

      const { data: principales } = await admin
        .from('contactos')
        .select('id')
        .eq('cliente_id', clienteId)
        .eq('es_principal', true)
      expect(principales).toHaveLength(1)
      expect(principales?.[0]?.id).toBe(contactoBId)
    })

    it('el índice único parcial rechaza dos contactos principales simultáneos para el mismo cliente', async () => {
      const { error } = await admin
        .from('contactos')
        .update({ es_principal: true })
        .eq('id', contactoAId)
      expect(error).not.toBeNull()
      expect(error?.message).toMatch(/contactos_principal_unico|duplicate key/i)

      const { data: principales } = await admin
        .from('contactos')
        .select('id')
        .eq('cliente_id', clienteId)
        .eq('es_principal', true)
      expect(principales).toHaveLength(1)
      expect(principales?.[0]?.id).toBe(contactoBId)
    })
  },
)
