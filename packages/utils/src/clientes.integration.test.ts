import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Prueba de integración contra un Supabase local real — verifica las reglas
 * de negocio de Cliente (005-clientes-cobranza-expedientes, US1): alta con
 * régimen fiscal válido, RFC único entre activos, baja sin eliminación física,
 * auditoría. Se omite automáticamente si no hay un Supabase local accesible.
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

describe.skipIf(!reachable)('Cliente (integración, 005-clientes-cobranza-expedientes US1)', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let testUserId: string
  const testUserEmail = `integration-cliente-${Date.now()}@example.com`
  const rfc = `CDP${Date.now().toString().slice(-6)}AA${Date.now() % 10}`
  let clienteId: string

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
    if (clienteId) await admin.from('clientes').delete().eq('id', clienteId)
    if (testUserId) await admin.auth.admin.deleteUser(testUserId)
  })

  it('alta de Cliente con régimen fiscal válido queda "activo" (FR-001, FR-020)', async () => {
    const { data, error } = await admin
      .from('clientes')
      .insert({
        nombre: 'Cliente de Prueba SA de CV',
        tipo_persona: 'moral',
        rfc,
        regimen_fiscal_codigo: '601',
        correo: 'contacto@ejemplo.com',
        created_by: testUserId,
        updated_by: testUserId,
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data?.estado).toBe('activo')
    clienteId = data?.id
  })

  it('una segunda alta con el mismo RFC activo falla (FR-002)', async () => {
    const { error } = await admin.from('clientes').insert({
      nombre: 'Otro Cliente',
      tipo_persona: 'moral',
      rfc,
      regimen_fiscal_codigo: '601',
      correo: 'otro@ejemplo.com',
      created_by: testUserId,
      updated_by: testUserId,
    })

    expect(error).not.toBeNull()
  })

  it('dar de baja cambia el estado a "inactivo" sin eliminar la fila (soft-delete, FR-003) y genera auditoría', async () => {
    const { error: updateError } = await admin
      .from('clientes')
      .update({ estado: 'inactivo', fecha_baja: new Date().toISOString(), updated_by: testUserId })
      .eq('id', clienteId)
    expect(updateError).toBeNull()

    const { data: row, error: selectError } = await admin
      .from('clientes')
      .select('id, estado')
      .eq('id', clienteId)
      .single()
    expect(selectError).toBeNull()
    expect(row?.estado).toBe('inactivo')

    const { data: auditRows, error: auditError } = await admin
      .from('business_audit_log')
      .select('accion')
      .eq('entidad', 'cliente')
      .eq('entidad_id', clienteId)
    expect(auditError).toBeNull()
    expect((auditRows ?? []).length).toBeGreaterThan(0)
  })
})
