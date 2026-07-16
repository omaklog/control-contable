import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Prueba de integración contra un Supabase local real — verifica que el
 * trigger trg_clientes_validar_regimen_fiscal rechace asignaciones de
 * Régimen Fiscal incompatibles con el tipo de persona (FR-021) o no vigentes
 * (FR-022). Se omite automáticamente si no hay un Supabase local accesible.
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
  'Validación de Régimen Fiscal (integración, 005-clientes-cobranza-expedientes US1)',
  () => {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let testUserId: string
    const testUserEmail = `integration-regimen-${Date.now()}@example.com`
    const clienteIds: string[] = []

    beforeAll(async () => {
      const { data, error } = await admin.auth.admin.createUser({
        email: testUserEmail,
        password: 'Integration-Test-Pass1!',
        email_confirm: true,
      })
      if (error || !data.user) throw error ?? new Error('No se pudo crear el usuario de prueba')
      testUserId = data.user.id
    })

    afterAll(async () => {
      if (clienteIds.length > 0) await admin.from('clientes').delete().in('id', clienteIds)
      if (testUserId) await admin.auth.admin.deleteUser(testUserId)
    })

    it('rechaza asignar a un cliente moral un régimen exclusivo de persona física (FR-021)', async () => {
      // 605 = "Sueldos y Salarios e Ingresos Asimilados a Salarios": fisica=Sí, moral=No
      const { data, error } = await admin
        .from('clientes')
        .insert({
          nombre: 'Cliente Moral con Régimen de Física',
          tipo_persona: 'moral',
          rfc: `RMF${Date.now().toString().slice(-6)}AA1`,
          regimen_fiscal_codigo: '605',
          correo: 'moral-fisica@ejemplo.com',
          created_by: testUserId,
          updated_by: testUserId,
        })
        .select()
        .single()

      expect(error).not.toBeNull()
      if (data?.id) clienteIds.push(data.id)
    })

    it('rechaza asignar un régimen cuya vigencia ya terminó (FR-022)', async () => {
      // 609 = "Consolidación": fechaDeFinDeVigencia = 31-12-2019
      const { data, error } = await admin
        .from('clientes')
        .insert({
          nombre: 'Cliente con Régimen Vencido',
          tipo_persona: 'moral',
          rfc: `RVG${Date.now().toString().slice(-6)}AA2`,
          regimen_fiscal_codigo: '609',
          correo: 'vencido@ejemplo.com',
          created_by: testUserId,
          updated_by: testUserId,
        })
        .select()
        .single()

      expect(error).not.toBeNull()
      if (data?.id) clienteIds.push(data.id)
    })

    it('permite asignar un régimen compatible y vigente', async () => {
      // 601 = "General de Ley Personas Morales": fisica=No, moral=Sí, sin fecha de fin
      const { data, error } = await admin
        .from('clientes')
        .insert({
          nombre: 'Cliente con Régimen Válido',
          tipo_persona: 'moral',
          rfc: `RVL${Date.now().toString().slice(-6)}AA3`,
          regimen_fiscal_codigo: '601',
          correo: 'valido@ejemplo.com',
          created_by: testUserId,
          updated_by: testUserId,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.regimen_fiscal_codigo).toBe('601')
      if (data?.id) clienteIds.push(data.id)
    })
  },
)
