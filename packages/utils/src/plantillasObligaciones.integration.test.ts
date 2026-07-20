import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Prueba de integración contra un Supabase local real — verifica la RLS y
 * las reglas de negocio de Plantillas de Obligaciones
 * (014-obligaciones-fiscales-cliente, contracts/db-functions-rls.md sección
 * A/B): cualquier staff autenticado puede consultar (SELECT), pero solo
 * `manage_catalogs` puede crear/editar; el nombre es único solo entre
 * plantillas activas; una obligación no puede repetirse dentro de la misma
 * plantilla; una obligación/periodicidad inactiva es rechazada en un ítem.
 * Se omite automáticamente si no hay un Supabase local accesible.
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
  'RLS y reglas de negocio de plantillas_obligaciones (integración, 014-obligaciones-fiscales-cliente)',
  () => {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let auxiliarId: string
    let administradorId: string
    let periodicidadActivaId: string
    let periodicidadInactivaId: string
    let obligacionActivaId: string
    let obligacionInactivaId: string
    const auxiliarEmail = `integration-plantillas-aux-${Date.now()}@example.com`
    const administradorEmail = `integration-plantillas-admin-${Date.now()}@example.com`

    beforeAll(async () => {
      const { data: auxUser, error: auxErr } = await admin.auth.admin.createUser({
        email: auxiliarEmail,
        password: PASSWORD,
        email_confirm: true,
      })
      if (auxErr || !auxUser.user)
        throw auxErr ?? new Error('No se pudo crear el auxiliar de prueba')
      auxiliarId = auxUser.user.id
      await admin.from('profiles').insert({ id: auxiliarId, role: 'auxiliar', is_active: true })

      const { data: adminUser, error: adminErr } = await admin.auth.admin.createUser({
        email: administradorEmail,
        password: PASSWORD,
        email_confirm: true,
      })
      if (adminErr || !adminUser.user)
        throw adminErr ?? new Error('No se pudo crear el administrador de prueba')
      administradorId = adminUser.user.id
      await admin
        .from('profiles')
        .insert({ id: administradorId, role: 'administrador', is_active: true })

      const { data: periodicidadActiva } = await admin
        .from('periodicidades')
        .insert({ nombre: `Periodicidad plantilla activa ${Date.now()}` })
        .select('id')
        .single()
      periodicidadActivaId = periodicidadActiva!.id

      const { data: periodicidadInactiva } = await admin
        .from('periodicidades')
        .insert({ nombre: `Periodicidad plantilla inactiva ${Date.now()}`, estado: 'inactivo' })
        .select('id')
        .single()
      periodicidadInactivaId = periodicidadInactiva!.id

      const { data: obligacionActiva } = await admin
        .from('obligaciones_fiscales')
        .insert({
          nombre: `Obligación plantilla activa ${Date.now()}`,
          periodicidad_id: periodicidadActivaId,
          prioridad: 1,
        })
        .select('id')
        .single()
      obligacionActivaId = obligacionActiva!.id

      const { data: obligacionInactiva } = await admin
        .from('obligaciones_fiscales')
        .insert({
          nombre: `Obligación plantilla inactiva ${Date.now()}`,
          periodicidad_id: periodicidadActivaId,
          prioridad: 1,
          estado: 'inactivo',
        })
        .select('id')
        .single()
      obligacionInactivaId = obligacionInactiva!.id
    })

    afterAll(async () => {
      if (auxiliarId) await admin.auth.admin.deleteUser(auxiliarId)
      if (administradorId) await admin.auth.admin.deleteUser(administradorId)
    })

    it('un Auxiliar (sin manage_catalogs) puede consultar el catálogo de plantillas', async () => {
      const { data: plantilla } = await admin
        .from('plantillas_obligaciones')
        .insert({ nombre: `Plantilla consulta ${Date.now()}` })
        .select('id')
        .single()

      const client = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      await client.auth.signInWithPassword({ email: auxiliarEmail, password: PASSWORD })

      const { data, error } = await client
        .from('plantillas_obligaciones')
        .select('id, nombre')
        .eq('id', plantilla!.id)
      expect(error).toBeNull()
      expect(data).toHaveLength(1)
    })

    it('un Auxiliar (sin manage_catalogs) NO puede crear una plantilla', async () => {
      const client = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      await client.auth.signInWithPassword({ email: auxiliarEmail, password: PASSWORD })

      const { error } = await client
        .from('plantillas_obligaciones')
        .insert({ nombre: `Intento no autorizado ${Date.now()}` })
      expect(error).not.toBeNull()
    })

    it('un Administrador (con manage_catalogs) puede crear y editar una plantilla', async () => {
      const client = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      await client.auth.signInWithPassword({ email: administradorEmail, password: PASSWORD })

      const { data: creada, error: insertError } = await client
        .from('plantillas_obligaciones')
        .insert({ nombre: `Plantilla creada por administrador ${Date.now()}` })
        .select('id')
        .single()
      expect(insertError).toBeNull()

      const { error: updateError } = await client
        .from('plantillas_obligaciones')
        .update({ estado: 'inactivo' })
        .eq('id', creada!.id)
      expect(updateError).toBeNull()
    })

    it('el nombre de una plantilla es único solo entre plantillas activas', async () => {
      const nombre = `Plantilla nombre único ${Date.now()}`
      const { error: primerError } = await admin.from('plantillas_obligaciones').insert({ nombre })
      expect(primerError).toBeNull()

      const { error: duplicadoError } = await admin
        .from('plantillas_obligaciones')
        .insert({ nombre })
      expect(duplicadoError).not.toBeNull()
    })

    it('una obligación no puede repetirse dentro de la misma plantilla', async () => {
      const { data: plantilla } = await admin
        .from('plantillas_obligaciones')
        .insert({ nombre: `Plantilla sin duplicados ${Date.now()}` })
        .select('id')
        .single()

      const { error: primerError } = await admin.from('plantilla_obligaciones_items').insert({
        plantilla_id: plantilla!.id,
        obligacion_fiscal_id: obligacionActivaId,
        periodicidad_id: periodicidadActivaId,
        orden: 1,
      })
      expect(primerError).toBeNull()

      const { error: duplicadoError } = await admin.from('plantilla_obligaciones_items').insert({
        plantilla_id: plantilla!.id,
        obligacion_fiscal_id: obligacionActivaId,
        periodicidad_id: periodicidadActivaId,
        orden: 2,
      })
      expect(duplicadoError).not.toBeNull()
    })

    it('rechaza una obligación fiscal inactiva como ítem de una plantilla', async () => {
      const { data: plantilla } = await admin
        .from('plantillas_obligaciones')
        .insert({ nombre: `Plantilla obligación inactiva ${Date.now()}` })
        .select('id')
        .single()

      const { error } = await admin.from('plantilla_obligaciones_items').insert({
        plantilla_id: plantilla!.id,
        obligacion_fiscal_id: obligacionInactivaId,
        periodicidad_id: periodicidadActivaId,
        orden: 1,
      })
      expect(error).not.toBeNull()
    })

    it('rechaza una periodicidad inactiva como ítem de una plantilla', async () => {
      const { data: plantilla } = await admin
        .from('plantillas_obligaciones')
        .insert({ nombre: `Plantilla periodicidad inactiva ${Date.now()}` })
        .select('id')
        .single()

      const { error } = await admin.from('plantilla_obligaciones_items').insert({
        plantilla_id: plantilla!.id,
        obligacion_fiscal_id: obligacionActivaId,
        periodicidad_id: periodicidadInactivaId,
        orden: 1,
      })
      expect(error).not.toBeNull()
    })
  },
)
