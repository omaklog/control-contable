import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Prueba de integración contra un Supabase local real — verifica la
 * corrección de RLS de `business_audit_log` (005-clientes-cobranza-expedientes,
 * migración 20260718100000_business_audit_log_select_staff.sql): el SELECT
 * ya no está restringido a Administrador, sino a cualquier miembro del
 * personal con `view_clients` o `manage_clients` (docs/ux/design-system.md
 * §9.2, Cliente 360 — Auxiliar puede consultar la pestaña Auditoría en solo
 * lectura). Se omite automáticamente si no hay un Supabase local accesible.
 */

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321'
const ANON_KEY =
  process.env.SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

const PASSWORD = 'Integration-Test-Pass1!'

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
  'RLS de business_audit_log (integración, 005 corrección 2026-07-18)',
  () => {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let auxiliarId: string
    let clienteId: string
    const auxiliarEmail = `integration-auditlog-aux-${Date.now()}@example.com`
    const rfc = `CDP${Date.now().toString().slice(-6)}AB${Date.now() % 10}`

    beforeAll(async () => {
      const { data: auxUser, error: auxErr } = await admin.auth.admin.createUser({
        email: auxiliarEmail,
        password: PASSWORD,
        email_confirm: true,
      })
      if (auxErr || !auxUser.user)
        throw auxErr ?? new Error('No se pudo crear el auxiliar de prueba')
      auxiliarId = auxUser.user.id

      const { error: profileErr } = await admin
        .from('profiles')
        .insert({ id: auxiliarId, role: 'auxiliar', is_active: true })
      if (profileErr) throw profileErr

      const { data: cliente, error: clienteErr } = await admin
        .from('clientes')
        .insert({
          nombre: 'Cliente Auditoría de Prueba SA de CV',
          tipo_persona: 'moral',
          rfc,
          regimen_fiscal_codigo: '601',
          correo: 'auditoria@ejemplo.com',
          created_by: auxiliarId,
          updated_by: auxiliarId,
        })
        .select('id')
        .single()
      if (clienteErr || !cliente)
        throw clienteErr ?? new Error('No se pudo crear el cliente de prueba')
      clienteId = cliente.id
    })

    afterAll(async () => {
      if (clienteId) await admin.from('clientes').delete().eq('id', clienteId)
      if (auxiliarId) await admin.auth.admin.deleteUser(auxiliarId)
    })

    it('un Auxiliar (solo view_clients) puede consultar el registro de auditoría de un cliente', async () => {
      const client = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { error: signInErr } = await client.auth.signInWithPassword({
        email: auxiliarEmail,
        password: PASSWORD,
      })
      expect(signInErr).toBeNull()

      const { data, error } = await client
        .from('business_audit_log')
        .select('accion')
        .eq('entidad', 'cliente')
        .eq('entidad_id', clienteId)

      expect(error).toBeNull()
      expect((data ?? []).length).toBeGreaterThan(0)
    })
  },
)
