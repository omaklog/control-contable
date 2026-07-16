import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Prueba de integración contra un Supabase local real — verifica las reglas
 * de negocio del Expediente digital (005-clientes-cobranza-expedientes US3):
 * carga de PDF, rechazo de no-PDF, versionado sin eliminación física, y
 * bloqueo de DELETE. Se omite si no hay Supabase local accesible.
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
  'Expediente digital (integración, 005-clientes-cobranza-expedientes US3)',
  () => {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let testUserId: string
    let clienteId: string
    let categoriaId: string
    let documentoV1Id: string
    const testUserEmail = `integration-expediente-${Date.now()}@example.com`

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
          nombre: 'Cliente Expediente',
          tipo_persona: 'moral',
          rfc: `EXP${Date.now().toString().slice(-6)}AA1`,
          regimen_fiscal_codigo: '601',
          correo: 'expediente@ejemplo.com',
          created_by: testUserId,
          updated_by: testUserId,
        })
        .select()
        .single()
      if (clienteError || !cliente)
        throw clienteError ?? new Error('No se pudo crear el cliente de prueba')
      clienteId = cliente.id

      const { data: categoria, error: categoriaError } = await admin
        .from('categorias_documento')
        .insert({
          nombre: `Constancia Fiscal ${Date.now()}`,
          created_by: testUserId,
          updated_by: testUserId,
        })
        .select()
        .single()
      if (categoriaError || !categoria)
        throw categoriaError ?? new Error('No se pudo crear la categoría de prueba')
      categoriaId = categoria.id
    })

    afterAll(async () => {
      // Los documentos NUNCA se eliminan físicamente (FR-015, ni siquiera vía
      // service_role), así que ni ellos ni el cliente/categoría de los que
      // dependen (FK) se pueden limpiar aquí — las filas de prueba quedan en la
      // base local a propósito; usar `supabase db reset` para limpiar por completo.
      if (testUserId) await admin.auth.admin.deleteUser(testUserId)
    })

    it('carga de un documento PDF queda "activo" con version = 1 (FR-010, FR-012)', async () => {
      const { data, error } = await admin
        .from('documentos')
        .insert({
          cliente_id: clienteId,
          categoria_id: categoriaId,
          nombre_original: 'constancia_situacion_fiscal.pdf',
          tamano_bytes: 204800,
          formato: 'application/pdf',
          ruta_almacenamiento: `clientes/${clienteId}/doc1.pdf`,
          cargado_por: testUserId,
          created_by: testUserId,
          updated_by: testUserId,
        })
        .select()
        .single()

      expect(error).toBeNull()
      expect(data?.version).toBe(1)
      expect(data?.estado).toBe('activo')
      documentoV1Id = data?.id
    })

    it('la carga de un archivo que no es PDF falla (FR-011)', async () => {
      const { error } = await admin.from('documentos').insert({
        cliente_id: clienteId,
        categoria_id: categoriaId,
        nombre_original: 'foto.png',
        tamano_bytes: 1024,
        formato: 'image/png',
        ruta_almacenamiento: `clientes/${clienteId}/doc2.png`,
        cargado_por: testUserId,
        created_by: testUserId,
        updated_by: testUserId,
      })
      expect(error).not.toBeNull()
    })

    it('una nueva versión conserva la anterior con estado "reemplazado" (FR-013)', async () => {
      const { data, error } = await admin
        .from('documentos')
        .insert({
          cliente_id: clienteId,
          categoria_id: categoriaId,
          nombre_original: 'constancia_situacion_fiscal_v2.pdf',
          tamano_bytes: 210000,
          formato: 'application/pdf',
          ruta_almacenamiento: `clientes/${clienteId}/doc1_v2.pdf`,
          cargado_por: testUserId,
          version: 2,
          documento_anterior_id: documentoV1Id,
          created_by: testUserId,
          updated_by: testUserId,
        })
        .select()
        .single()
      expect(error).toBeNull()
      expect(data?.version).toBe(2)

      const { error: updateError } = await admin
        .from('documentos')
        .update({ estado: 'reemplazado' })
        .eq('id', documentoV1Id)
      expect(updateError).toBeNull()

      const { data: v1, error: v1Error } = await admin
        .from('documentos')
        .select('estado')
        .eq('id', documentoV1Id)
        .single()
      expect(v1Error).toBeNull()
      expect(v1?.estado).toBe('reemplazado')
    })

    it('un DELETE directo sobre documentos falla (FR-015)', async () => {
      const { error } = await admin.from('documentos').delete().eq('id', documentoV1Id)
      expect(error).not.toBeNull()
    })
  },
)
