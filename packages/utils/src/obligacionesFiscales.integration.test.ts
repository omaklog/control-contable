import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Prueba de integración contra un Supabase local real — verifica la RLS y las
 * reglas de negocio del catálogo de Obligaciones Fiscales
 * (013-catalogo-obligaciones-fiscales, contracts/db-functions-rls.md):
 * cualquier staff autenticado puede consultar (SELECT), pero solo
 * `manage_catalogs` puede crear/editar (INSERT/UPDATE); el nombre es único
 * solo entre obligaciones activas; la periodicidad debe estar activa tanto
 * al crear como al editar; la prioridad no es única. Se omite
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

describe.skipIf(!reachable)(
  'RLS y reglas de negocio de obligaciones_fiscales (integración, 013-catalogo-obligaciones-fiscales)',
  () => {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let auxiliarId: string
    let administradorId: string
    let periodicidadActivaId: string
    let periodicidadInactivaId: string
    const auxiliarEmail = `integration-obligaciones-aux-${Date.now()}@example.com`
    const administradorEmail = `integration-obligaciones-admin-${Date.now()}@example.com`

    beforeAll(async () => {
      const { data: auxUser, error: auxErr } = await admin.auth.admin.createUser({
        email: auxiliarEmail,
        password: PASSWORD,
        email_confirm: true,
      })
      if (auxErr || !auxUser.user)
        throw auxErr ?? new Error('No se pudo crear el auxiliar de prueba')
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

      const { data: periodicidadActiva, error: periodicidadActivaErr } = await admin
        .from('periodicidades')
        .insert({ nombre: `Periodicidad activa prueba ${Date.now()}` })
        .select('id')
        .single()
      if (periodicidadActivaErr || !periodicidadActiva)
        throw (
          periodicidadActivaErr ?? new Error('No se pudo crear la periodicidad activa de prueba')
        )
      periodicidadActivaId = periodicidadActiva.id

      const { data: periodicidadInactiva, error: periodicidadInactivaErr } = await admin
        .from('periodicidades')
        .insert({ nombre: `Periodicidad inactiva prueba ${Date.now()}`, estado: 'inactivo' })
        .select('id')
        .single()
      if (periodicidadInactivaErr || !periodicidadInactiva)
        throw (
          periodicidadInactivaErr ??
          new Error('No se pudo crear la periodicidad inactiva de prueba')
        )
      periodicidadInactivaId = periodicidadInactiva.id
    })

    afterAll(async () => {
      if (auxiliarId) await admin.auth.admin.deleteUser(auxiliarId)
      if (administradorId) await admin.auth.admin.deleteUser(administradorId)
    })

    it('[US1] un Auxiliar (sin manage_catalogs) puede consultar el catálogo', async () => {
      const { data: obligacion } = await admin
        .from('obligaciones_fiscales')
        .insert({
          nombre: `Obligación consulta ${Date.now()}`,
          periodicidad_id: periodicidadActivaId,
          prioridad: 1,
        })
        .select('id')
        .single()

      const client = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      await client.auth.signInWithPassword({ email: auxiliarEmail, password: PASSWORD })

      const { data, error } = await client
        .from('obligaciones_fiscales')
        .select('id, nombre')
        .eq('id', obligacion!.id)
      expect(error).toBeNull()
      expect(data).toHaveLength(1)
    })

    it('[US1] un Auxiliar (sin manage_catalogs) NO puede crear una obligación fiscal', async () => {
      const client = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      await client.auth.signInWithPassword({ email: auxiliarEmail, password: PASSWORD })

      const { error } = await client.from('obligaciones_fiscales').insert({
        nombre: `Intento no autorizado ${Date.now()}`,
        periodicidad_id: periodicidadActivaId,
        prioridad: 1,
      })
      expect(error).not.toBeNull()
    })

    it('[US1] un Administrador (con manage_catalogs) puede crear y editar una obligación fiscal', async () => {
      const client = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      await client.auth.signInWithPassword({ email: administradorEmail, password: PASSWORD })

      const { data: creado, error: insertError } = await client
        .from('obligaciones_fiscales')
        .insert({
          nombre: `Obligación creada por administrador ${Date.now()}`,
          periodicidad_id: periodicidadActivaId,
          prioridad: 5,
        })
        .select('id')
        .single()
      expect(insertError).toBeNull()
      expect(creado).not.toBeNull()

      const { error: updateError } = await client
        .from('obligaciones_fiscales')
        .update({ estado: 'inactivo' })
        .eq('id', creado!.id)
      expect(updateError).toBeNull()
    })

    it('[US1] el nombre es único solo entre obligaciones activas', async () => {
      const nombre = `Obligación nombre único ${Date.now()}`
      const { error: primerError } = await admin.from('obligaciones_fiscales').insert({
        nombre,
        periodicidad_id: periodicidadActivaId,
        prioridad: 1,
      })
      expect(primerError).toBeNull()

      const { error: duplicadoError } = await admin.from('obligaciones_fiscales').insert({
        nombre,
        periodicidad_id: periodicidadActivaId,
        prioridad: 2,
      })
      expect(duplicadoError).not.toBeNull()
    })

    it('[US2] crear una obligación con una periodicidad inactiva es rechazado', async () => {
      const { error } = await admin.from('obligaciones_fiscales').insert({
        nombre: `Obligación periodicidad inactiva ${Date.now()}`,
        periodicidad_id: periodicidadInactivaId,
        prioridad: 1,
      })
      expect(error).not.toBeNull()
    })

    it('[US2] cambiar la periodicidad de una obligación existente a una inactiva es rechazado', async () => {
      const { data: obligacion } = await admin
        .from('obligaciones_fiscales')
        .insert({
          nombre: `Obligación cambio periodicidad ${Date.now()}`,
          periodicidad_id: periodicidadActivaId,
          prioridad: 1,
        })
        .select('id')
        .single()

      const { error } = await admin
        .from('obligaciones_fiscales')
        .update({ periodicidad_id: periodicidadInactivaId })
        .eq('id', obligacion!.id)
      expect(error).not.toBeNull()
    })

    it('[US2] dos obligaciones pueden compartir el mismo valor de prioridad', async () => {
      const { error: error1 } = await admin.from('obligaciones_fiscales').insert({
        nombre: `Obligación prioridad A ${Date.now()}`,
        periodicidad_id: periodicidadActivaId,
        prioridad: 10,
      })
      const { error: error2 } = await admin.from('obligaciones_fiscales').insert({
        nombre: `Obligación prioridad B ${Date.now()}`,
        periodicidad_id: periodicidadActivaId,
        prioridad: 10,
      })
      expect(error1).toBeNull()
      expect(error2).toBeNull()
    })

    it('[US3] el listado ordenado por nombre devuelve las obligaciones en orden alfabético', async () => {
      const { data, error } = await admin
        .from('obligaciones_fiscales')
        .select('nombre')
        .eq('estado', 'activo')
        .order('nombre', { ascending: true })
      expect(error).toBeNull()
      const nombres = data!.map((row) => row.nombre)
      expect(nombres).toEqual([...nombres].sort((a, b) => a.localeCompare(b)))
    })

    it('[US3] una obligación inactivada sigue siendo consultable, pero se excluye de la selección de activas', async () => {
      const { data: creado } = await admin
        .from('obligaciones_fiscales')
        .insert({
          nombre: `Obligación integridad histórica ${Date.now()}`,
          periodicidad_id: periodicidadActivaId,
          prioridad: 1,
        })
        .select('id')
        .single()
      await admin.from('obligaciones_fiscales').update({ estado: 'inactivo' }).eq('id', creado!.id)

      const { data: sinFiltro } = await admin
        .from('obligaciones_fiscales')
        .select('id')
        .eq('id', creado!.id)
      expect(sinFiltro).toHaveLength(1)

      const { data: soloActivas } = await admin
        .from('obligaciones_fiscales')
        .select('id')
        .eq('id', creado!.id)
        .eq('estado', 'activo')
      expect(soloActivas).toHaveLength(0)
    })
  },
)
