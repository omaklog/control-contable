import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Prueba de integración contra un Supabase local real — verifica la RLS del
 * catálogo de Servicios (011-gestion-servicios, contracts/db-functions-rls.md):
 * cualquier staff autenticado puede consultar (SELECT), pero solo
 * `manage_catalogs` puede crear/editar (INSERT/UPDATE). Se omite
 * automáticamente si no hay un Supabase local accesible.
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

describe.skipIf(!reachable)('RLS de servicios (integración, 011-gestion-servicios)', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let auxiliarId: string
  let administradorId: string
  let servicioId: string
  const auxiliarEmail = `integration-servicios-aux-${Date.now()}@example.com`
  const administradorEmail = `integration-servicios-admin-${Date.now()}@example.com`

  beforeAll(async () => {
    const { data: auxUser, error: auxErr } = await admin.auth.admin.createUser({
      email: auxiliarEmail,
      password: PASSWORD,
      email_confirm: true,
    })
    if (auxErr || !auxUser.user) throw auxErr ?? new Error('No se pudo crear el auxiliar de prueba')
    auxiliarId = auxUser.user.id
    const { error: auxProfileErr } = await admin
      .from('profiles')
      .insert({ id: auxiliarId, role: 'auxiliar', is_active: true })
    if (auxProfileErr) throw auxProfileErr

    const { data: adminUser, error: adminErr } = await admin.auth.admin.createUser({
      email: administradorEmail,
      password: PASSWORD,
      email_confirm: true,
    })
    if (adminErr || !adminUser.user)
      throw adminErr ?? new Error('No se pudo crear el administrador de prueba')
    administradorId = adminUser.user.id
    const { error: adminProfileErr } = await admin
      .from('profiles')
      .insert({ id: administradorId, role: 'administrador', is_active: true })
    if (adminProfileErr) throw adminProfileErr

    const { data: servicio, error: servicioErr } = await admin
      .from('servicios')
      .insert({
        nombre: 'Servicio de prueba RLS',
        categoria: 'Pruebas',
        created_by: administradorId,
        updated_by: administradorId,
      })
      .select('id')
      .single()
    if (servicioErr || !servicio)
      throw servicioErr ?? new Error('No se pudo crear el servicio de prueba')
    servicioId = servicio.id
  })

  afterAll(async () => {
    if (auxiliarId) await admin.auth.admin.deleteUser(auxiliarId)
    if (administradorId) await admin.auth.admin.deleteUser(administradorId)
  })

  it('un Auxiliar (sin manage_catalogs) puede consultar el catálogo', async () => {
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: signInErr } = await client.auth.signInWithPassword({
      email: auxiliarEmail,
      password: PASSWORD,
    })
    expect(signInErr).toBeNull()

    const { data, error } = await client.from('servicios').select('id, nombre').eq('id', servicioId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('un Auxiliar (sin manage_catalogs) NO puede crear un servicio', async () => {
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await client.auth.signInWithPassword({ email: auxiliarEmail, password: PASSWORD })

    const { error } = await client
      .from('servicios')
      .insert({ nombre: 'Intento no autorizado', categoria: 'Pruebas' })
    expect(error).not.toBeNull()
  })

  it('un Administrador (con manage_catalogs) puede crear y editar un servicio', async () => {
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await client.auth.signInWithPassword({ email: administradorEmail, password: PASSWORD })

    const { data: creado, error: insertError } = await client
      .from('servicios')
      .insert({ nombre: 'Servicio creado por administrador', categoria: 'Pruebas' })
      .select('id')
      .single()
    expect(insertError).toBeNull()
    expect(creado).not.toBeNull()

    const { error: updateError } = await client
      .from('servicios')
      .update({ estado: 'inactivo' })
      .eq('id', creado!.id)
    expect(updateError).toBeNull()
  })
})
