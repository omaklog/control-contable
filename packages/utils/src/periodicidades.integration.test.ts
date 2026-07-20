import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Prueba de integración contra un Supabase local real — verifica el contrato
 * de catálogo protegido de Periodicidades (012-administracion-catalogos,
 * contracts/db-functions-rls.md): cualquier staff autenticado puede
 * consultar (SELECT), pero ningún rol —ni siquiera Administrador— puede
 * escribir (INSERT/UPDATE/DELETE), ya que no existe ninguna política RLS de
 * escritura para `authenticated`. También verifica, a nivel de esquema, el
 * contrato general de ciclo de vida (Historia 2) e integridad histórica
 * (Historia 5) que heredarán los catálogos editables futuros. Se omite
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
  'Contrato de periodicidades (integración, 012-administracion-catalogos)',
  () => {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let auxiliarId: string
    let administradorId: string
    const auxiliarEmail = `integration-periodicidades-aux-${Date.now()}@example.com`
    const administradorEmail = `integration-periodicidades-admin-${Date.now()}@example.com`

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
    })

    afterAll(async () => {
      if (auxiliarId) await admin.auth.admin.deleteUser(auxiliarId)
      if (administradorId) await admin.auth.admin.deleteUser(administradorId)
    })

    it('un Auxiliar (sin manage_catalogs) puede consultar el catálogo', async () => {
      const client = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      await client.auth.signInWithPassword({ email: auxiliarEmail, password: PASSWORD })

      const { data, error } = await client.from('periodicidades').select('id, nombre')
      expect(error).toBeNull()
      expect(data!.length).toBeGreaterThan(0)
    })

    it('[US2] un registro nuevo nace con estado activo por defecto', async () => {
      const { data, error } = await admin
        .from('periodicidades')
        .insert({ nombre: `Prueba ciclo de vida ${Date.now()}` })
        .select('estado')
        .single()
      expect(error).toBeNull()
      expect(data!.estado).toBe('activo')
    })

    it('[US2] ningún rol puede eliminar físicamente un registro (sin política de delete)', async () => {
      const { data: creado } = await admin
        .from('periodicidades')
        .insert({ nombre: `Prueba sin delete ${Date.now()}` })
        .select('id')
        .single()

      const client = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      await client.auth.signInWithPassword({ email: administradorEmail, password: PASSWORD })

      const { error, count } = await client
        .from('periodicidades')
        .delete({ count: 'exact' })
        .eq('id', creado!.id)
      // Sin política de DELETE, RLS filtra la fila del alcance de la operación
      // (0 filas afectadas) en vez de lanzar un error explícito — así es como
      // Postgres protege UPDATE/DELETE cuando no existe ninguna política.
      expect(error).toBeNull()
      expect(count ?? 0).toBe(0)

      const { data: sigueExistiendo } = await admin
        .from('periodicidades')
        .select('id')
        .eq('id', creado!.id)
      expect(sigueExistiendo).toHaveLength(1)
    })

    it('[US2] un nombre se puede reutilizar tras inactivar el registro que lo tenía', async () => {
      const nombre = `Prueba reutilización ${Date.now()}`
      const { data: original } = await admin
        .from('periodicidades')
        .insert({ nombre })
        .select('id')
        .single()

      await admin.from('periodicidades').update({ estado: 'inactivo' }).eq('id', original!.id)

      const { error } = await admin.from('periodicidades').insert({ nombre })
      expect(error).toBeNull()
    })

    it('[US3] un Administrador (con manage_catalogs) NO puede crear ni editar una periodicidad', async () => {
      const client = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      await client.auth.signInWithPassword({ email: administradorEmail, password: PASSWORD })

      const { error: insertError } = await client
        .from('periodicidades')
        .insert({ nombre: `Intento no autorizado ${Date.now()}` })
      expect(insertError).not.toBeNull()

      const { data: existente } = await admin
        .from('periodicidades')
        .select('id, descripcion')
        .limit(1)
        .single()
      const { error: updateError, count } = await client
        .from('periodicidades')
        .update({ descripcion: 'edición no autorizada' }, { count: 'exact' })
        .eq('id', existente!.id)
      // Igual que DELETE: sin política de UPDATE, RLS reduce las filas
      // afectadas a cero en vez de lanzar un error explícito.
      expect(updateError).toBeNull()
      expect(count ?? 0).toBe(0)

      const { data: sinCambios } = await admin
        .from('periodicidades')
        .select('descripcion')
        .eq('id', existente!.id)
        .single()
      expect(sinCambios!.descripcion).toBe(existente!.descripcion)
    })

    it('[US4] el listado se devuelve en orden alfabético por nombre', async () => {
      const { data, error } = await admin
        .from('periodicidades')
        .select('nombre')
        .eq('estado', 'activo')
        .order('nombre', { ascending: true })
      expect(error).toBeNull()
      const nombres = data!.map((row) => row.nombre)
      expect(nombres).toEqual([...nombres].sort((a, b) => a.localeCompare(b)))
    })

    it('[US5] un registro inactivo sigue siendo consultable, pero se excluye de la selección de activos', async () => {
      const nombre = `Prueba integridad histórica ${Date.now()}`
      const { data: creado } = await admin
        .from('periodicidades')
        .insert({ nombre })
        .select('id')
        .single()
      await admin.from('periodicidades').update({ estado: 'inactivo' }).eq('id', creado!.id)

      const { data: sinFiltro } = await admin
        .from('periodicidades')
        .select('id')
        .eq('id', creado!.id)
      expect(sinFiltro).toHaveLength(1)

      const { data: soloActivos } = await admin
        .from('periodicidades')
        .select('id')
        .eq('id', creado!.id)
        .eq('estado', 'activo')
      expect(soloActivos).toHaveLength(0)
    })
  },
)
