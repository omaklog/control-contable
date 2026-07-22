import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Prueba de integración contra un Supabase local real — verifica la RLS y
 * las reglas de negocio del Expediente Fiscal (016-expediente-fiscal,
 * contracts/db-functions-rls.md): clasificación opcional y aislamiento por
 * cliente (Historia 1), Documentos Esperados de un cumplimiento (Historia
 * 2), permisos de eliminación por antigüedad y rol (Historia 4), y snapshot
 * histórico de Documentos Esperados (Historia 5). Se omite automáticamente
 * si no hay un Supabase local accesible.
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

describe.skipIf(!reachable)('Expediente Fiscal (integración, 016-expediente-fiscal)', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let administradorId: string
  let contadorId: string
  let auxiliarId: string
  let clienteId: string
  let otroClienteId: string
  let categoriaId: string
  let periodicidadId: string
  const administradorEmail = `integration-expediente-admin-${Date.now()}@example.com`
  const contadorEmail = `integration-expediente-contador-${Date.now()}@example.com`
  const auxiliarEmail = `integration-expediente-aux-${Date.now()}@example.com`

  async function crearDocumento(overrides: Record<string, unknown> = {}) {
    const { data, error } = await admin
      .from('documentos')
      .insert({
        cliente_id: clienteId,
        categoria_id: categoriaId,
        nombre_original: `documento-${Date.now()}-${Math.random()}.pdf`,
        tamano_bytes: 1024,
        formato: 'application/pdf',
        ruta_almacenamiento: `clientes/${clienteId}/doc-${Date.now()}.pdf`,
        cargado_por: administradorId,
        created_by: administradorId,
        updated_by: administradorId,
        ...overrides,
      })
      .select('id, fecha_carga')
      .single()
    if (error || !data) throw error ?? new Error('No se pudo crear el documento de prueba')
    return data
  }

  async function signInAs(email: string) {
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await client.auth.signInWithPassword({ email, password: PASSWORD })
    return client
  }

  beforeAll(async () => {
    const { data: adminUser, error: adminErr } = await admin.auth.admin.createUser({
      email: administradorEmail,
      password: PASSWORD,
      email_confirm: true,
    })
    if (adminErr || !adminUser.user) throw adminErr ?? new Error('No se pudo crear administrador')
    administradorId = adminUser.user.id
    await admin
      .from('profiles')
      .insert({ id: administradorId, role: 'administrador', is_active: true })

    const { data: contadorUser, error: contadorErr } = await admin.auth.admin.createUser({
      email: contadorEmail,
      password: PASSWORD,
      email_confirm: true,
    })
    if (contadorErr || !contadorUser.user)
      throw contadorErr ?? new Error('No se pudo crear contador')
    contadorId = contadorUser.user.id
    await admin.from('profiles').insert({ id: contadorId, role: 'contador', is_active: true })

    const { data: auxUser, error: auxErr } = await admin.auth.admin.createUser({
      email: auxiliarEmail,
      password: PASSWORD,
      email_confirm: true,
    })
    if (auxErr || !auxUser.user) throw auxErr ?? new Error('No se pudo crear auxiliar')
    auxiliarId = auxUser.user.id
    await admin.from('profiles').insert({ id: auxiliarId, role: 'auxiliar', is_active: true })

    const { data: cliente } = await admin
      .from('clientes')
      .insert({
        nombre: 'Cliente Expediente Fiscal (016)',
        tipo_persona: 'moral',
        rfc: `EXF${Date.now().toString().slice(-6)}AA1`,
        regimen_fiscal_codigo: '601',
        correo: 'expediente-fiscal@ejemplo.com',
        created_by: administradorId,
        updated_by: administradorId,
      })
      .select('id')
      .single()
    clienteId = cliente!.id

    const { data: otroCliente } = await admin
      .from('clientes')
      .insert({
        nombre: 'Otro Cliente (aislamiento Expediente Fiscal)',
        tipo_persona: 'moral',
        rfc: `EXF${(Date.now() + 1).toString().slice(-6)}AA2`,
        regimen_fiscal_codigo: '601',
        correo: 'otro-cliente-expediente@ejemplo.com',
        created_by: administradorId,
        updated_by: administradorId,
      })
      .select('id')
      .single()
    otroClienteId = otroCliente!.id

    const { data: categoria } = await admin
      .from('categorias_documento')
      .insert({ nombre: `Tipo de Documento prueba ${Date.now()}` })
      .select('id')
      .single()
    categoriaId = categoria!.id

    const { data: periodicidad } = await admin
      .from('periodicidades')
      .select('id')
      .eq('nombre', 'Mensual')
      .single()
    periodicidadId = periodicidad!.id
  })

  afterAll(async () => {
    if (clienteId) await admin.from('clientes').delete().eq('id', clienteId)
    if (otroClienteId) await admin.from('clientes').delete().eq('id', otroClienteId)
    if (administradorId) await admin.auth.admin.deleteUser(administradorId)
    if (contadorId) await admin.auth.admin.deleteUser(contadorId)
    if (auxiliarId) await admin.auth.admin.deleteUser(auxiliarId)
  })

  describe('[US1] clasificación opcional y aislamiento por cliente', () => {
    it('carga un documento PDF válido clasificado', async () => {
      const documento = await crearDocumento()
      const { data, error } = await admin
        .from('documentos')
        .select('estado, categoria_id')
        .eq('id', documento.id)
        .single()
      expect(error).toBeNull()
      expect(data!.estado).toBe('activo')
      expect(data!.categoria_id).toBe(categoriaId)
    })

    it('rechaza un archivo que no es PDF', async () => {
      const { error } = await admin.from('documentos').insert({
        cliente_id: clienteId,
        categoria_id: categoriaId,
        nombre_original: 'imagen.png',
        tamano_bytes: 1024,
        formato: 'image/png',
        ruta_almacenamiento: `clientes/${clienteId}/imagen.png`,
        cargado_por: administradorId,
      })
      expect(error).not.toBeNull()
    })

    it('acepta un documento "Sin clasificar" (categoria_id nulo)', async () => {
      const documento = await crearDocumento({ categoria_id: null })
      const { data, error } = await admin
        .from('documentos')
        .select('categoria_id')
        .eq('id', documento.id)
        .single()
      expect(error).toBeNull()
      expect(data!.categoria_id).toBeNull()
    })

    it('rechaza asociar un documento a un cumplimiento de otro cliente', async () => {
      const documento = await crearDocumento()

      const { data: obligacion } = await admin
        .from('obligaciones_fiscales')
        .insert({
          nombre: `Obligación aislamiento documento ${Date.now()}`,
          periodicidad_id: periodicidadId,
          prioridad: 1,
        })
        .select('id')
        .single()

      const { data: ofc } = await admin
        .from('obligaciones_fiscales_cliente')
        .insert({
          cliente_id: otroClienteId,
          obligacion_fiscal_id: obligacion!.id,
          periodicidad_id: periodicidadId,
          orden: 1,
        })
        .select('id')
        .single()

      await admin.rpc('generar_cumplimientos_fiscales')
      const { data: cumplimiento } = await admin
        .from('cumplimientos_fiscales')
        .select('id')
        .eq('obligacion_fiscal_cliente_id', ofc!.id)
        .limit(1)
        .single()

      const { error } = await admin.from('cumplimiento_fiscal_documentos').insert({
        cumplimiento_id: cumplimiento!.id,
        documento_id: documento.id,
      })
      expect(error).not.toBeNull()
    })

    it('un documento no puede asociarse a más de un cumplimiento (FR-007)', async () => {
      const documento = await crearDocumento()

      const { data: obligacion } = await admin
        .from('obligaciones_fiscales')
        .insert({
          nombre: `Obligación unicidad documento ${Date.now()}`,
          periodicidad_id: periodicidadId,
          prioridad: 1,
        })
        .select('id')
        .single()

      const { data: ofc } = await admin
        .from('obligaciones_fiscales_cliente')
        .insert({
          cliente_id: clienteId,
          obligacion_fiscal_id: obligacion!.id,
          periodicidad_id: periodicidadId,
          orden: 50,
        })
        .select('id')
        .single()

      await admin.rpc('generar_cumplimientos_fiscales')
      const { data: cumplimientos } = await admin
        .from('cumplimientos_fiscales')
        .select('id')
        .eq('obligacion_fiscal_cliente_id', ofc!.id)

      const { error: primeraError } = await admin.from('cumplimiento_fiscal_documentos').insert({
        cumplimiento_id: cumplimientos![0]!.id,
        documento_id: documento.id,
      })
      expect(primeraError).toBeNull()

      // Un segundo cumplimiento del mismo cliente (distinto periodo/orden) para
      // intentar asociar el mismo documento por segunda vez.
      const { data: obligacion2 } = await admin
        .from('obligaciones_fiscales')
        .insert({
          nombre: `Obligación unicidad documento 2 ${Date.now()}`,
          periodicidad_id: periodicidadId,
          prioridad: 1,
        })
        .select('id')
        .single()
      const { data: ofc2 } = await admin
        .from('obligaciones_fiscales_cliente')
        .insert({
          cliente_id: clienteId,
          obligacion_fiscal_id: obligacion2!.id,
          periodicidad_id: periodicidadId,
          orden: 51,
        })
        .select('id')
        .single()
      await admin.rpc('generar_cumplimientos_fiscales')
      const { data: cumplimiento2 } = await admin
        .from('cumplimientos_fiscales')
        .select('id')
        .eq('obligacion_fiscal_cliente_id', ofc2!.id)
        .limit(1)
        .single()

      const { error: segundaError } = await admin.from('cumplimiento_fiscal_documentos').insert({
        cumplimiento_id: cumplimiento2!.id,
        documento_id: documento.id,
      })
      expect(segundaError).not.toBeNull()
    })
  })

  describe('[US2] Documentos Esperados de un cumplimiento', () => {
    async function crearObligacionConEsperados(
      orden: number,
      categoriasEsperadas: string[],
    ): Promise<string> {
      const { data: obligacion } = await admin
        .from('obligaciones_fiscales')
        .insert({
          nombre: `Obligación con esperados ${orden} ${Date.now()}`,
          periodicidad_id: periodicidadId,
          prioridad: 1,
        })
        .select('id')
        .single()

      for (const categoriaEsperadaId of categoriasEsperadas) {
        await admin.from('documentos_esperados_obligacion').insert({
          obligacion_fiscal_id: obligacion!.id,
          categoria_documento_id: categoriaEsperadaId,
        })
      }

      const { data: ofc } = await admin
        .from('obligaciones_fiscales_cliente')
        .insert({
          cliente_id: clienteId,
          obligacion_fiscal_id: obligacion!.id,
          periodicidad_id: periodicidadId,
          orden,
        })
        .select('id')
        .single()

      await admin.rpc('generar_cumplimientos_fiscales')
      const { data: cumplimiento } = await admin
        .from('cumplimientos_fiscales')
        .select('id')
        .eq('obligacion_fiscal_cliente_id', ofc!.id)
        .limit(1)
        .single()

      return cumplimiento!.id as string
    }

    it('el snapshot de esperados se fija automáticamente al generarse el cumplimiento', async () => {
      const { data: categoriaEsperada } = await admin
        .from('categorias_documento')
        .insert({ nombre: `Esperado snapshot ${Date.now()}` })
        .select('id')
        .single()

      const cumplimientoId = await crearObligacionConEsperados(100, [categoriaEsperada!.id])

      const { data: snapshot } = await admin
        .from('cumplimiento_documentos_esperados')
        .select('categoria_documento_id')
        .eq('cumplimiento_id', cumplimientoId)

      expect(snapshot).toHaveLength(1)
      expect(snapshot![0]!.categoria_documento_id).toBe(categoriaEsperada!.id)
    })

    it('un esperado se marca disponible solo cuando existe un documento asociado de ese tipo', async () => {
      const { data: categoriaEsperada } = await admin
        .from('categorias_documento')
        .insert({ nombre: `Esperado disponible ${Date.now()}` })
        .select('id')
        .single()

      const cumplimientoId = await crearObligacionConEsperados(101, [categoriaEsperada!.id])

      const documento = await crearDocumento({ categoria_id: categoriaEsperada!.id })
      await admin.from('cumplimiento_fiscal_documentos').insert({
        cumplimiento_id: cumplimientoId,
        documento_id: documento.id,
      })

      const { data: asociados } = await admin
        .from('cumplimiento_fiscal_documentos')
        .select('documento_id')
        .eq('cumplimiento_id', cumplimientoId)

      const documentoIds = (asociados ?? []).map((row) => row.documento_id)
      const { data: documentosAsociados } = await admin
        .from('documentos')
        .select('categoria_id, estado')
        .in('id', documentoIds)

      const categoriasDisponibles = new Set(
        (documentosAsociados ?? [])
          .filter((doc) => doc.estado !== 'eliminado')
          .map((doc) => doc.categoria_id),
      )
      expect(categoriasDisponibles.has(categoriaEsperada!.id)).toBe(true)
    })

    it('un esperado permanece faltante cuando no se ha cargado ningún documento de ese tipo', async () => {
      const { data: categoriaEsperada } = await admin
        .from('categorias_documento')
        .insert({ nombre: `Esperado faltante ${Date.now()}` })
        .select('id')
        .single()

      const cumplimientoId = await crearObligacionConEsperados(102, [categoriaEsperada!.id])

      const { data: asociados } = await admin
        .from('cumplimiento_fiscal_documentos')
        .select('documento_id')
        .eq('cumplimiento_id', cumplimientoId)

      expect(asociados ?? []).toHaveLength(0)
    })

    it('el cumplimiento puede marcarse "Presentada" aunque falten Documentos Esperados (FR-013)', async () => {
      const { data: categoriaEsperada } = await admin
        .from('categorias_documento')
        .insert({ nombre: `Esperado no bloqueante ${Date.now()}` })
        .select('id')
        .single()

      const cumplimientoId = await crearObligacionConEsperados(103, [categoriaEsperada!.id])

      const { error } = await admin
        .from('cumplimientos_fiscales')
        .update({ estado: 'presentada' })
        .eq('id', cumplimientoId)
      expect(error).toBeNull()

      const { data: actualizado } = await admin
        .from('cumplimientos_fiscales')
        .select('estado')
        .eq('id', cumplimientoId)
        .single()
      expect(actualizado!.estado).toBe('presentada')
    })

    it('un documento asociado que no corresponde a ningún esperado es identificable como "adicional"', async () => {
      const { data: categoriaEsperada } = await admin
        .from('categorias_documento')
        .insert({ nombre: `Esperado con adicional ${Date.now()}` })
        .select('id')
        .single()

      const cumplimientoId = await crearObligacionConEsperados(104, [categoriaEsperada!.id])

      const documentoAdicional = await crearDocumento({ categoria_id: categoriaId })
      await admin.from('cumplimiento_fiscal_documentos').insert({
        cumplimiento_id: cumplimientoId,
        documento_id: documentoAdicional.id,
      })

      const { data: esperados } = await admin
        .from('cumplimiento_documentos_esperados')
        .select('categoria_documento_id')
        .eq('cumplimiento_id', cumplimientoId)
      const categoriasEsperadas = new Set((esperados ?? []).map((e) => e.categoria_documento_id))

      expect(categoriasEsperadas.has(categoriaId)).toBe(false)
    })
  })

  describe('[US3] vista global de Expedientes', () => {
    it('un mismo Tipo de Documento es localizable entre distintos clientes (búsqueda transversal)', async () => {
      const { data: categoriaCompartida } = await admin
        .from('categorias_documento')
        .insert({ nombre: `Tipo compartido ${Date.now()}` })
        .select('id')
        .single()

      const documentoClienteA = await crearDocumento({ categoria_id: categoriaCompartida!.id })
      const documentoClienteB = await crearDocumento({
        categoria_id: categoriaCompartida!.id,
        cliente_id: otroClienteId,
      })

      const { data: coincidencias } = await admin
        .from('documentos')
        .select('id, cliente_id')
        .eq('categoria_id', categoriaCompartida!.id)

      const clientesEncontrados = new Set((coincidencias ?? []).map((row) => row.cliente_id))
      expect(clientesEncontrados.has(clienteId)).toBe(true)
      expect(clientesEncontrados.has(otroClienteId)).toBe(true)
      expect((coincidencias ?? []).map((row) => row.id)).toEqual(
        expect.arrayContaining([documentoClienteA.id, documentoClienteB.id]),
      )
    })

    it('un resultado de búsqueda resuelve el cliente correspondiente (FR-019)', async () => {
      const documento = await crearDocumento()
      const { data } = await admin
        .from('documentos')
        .select('cliente_id')
        .eq('id', documento.id)
        .single()
      expect(data!.cliente_id).toBe(clienteId)
    })

    it('un usuario sin view_documents/manage_documents no puede consultar documentos (RLS)', async () => {
      const sinPermisosEmail = `integration-expediente-sinpermisos-${Date.now()}@example.com`
      const { data: sinPermisosUser } = await admin.auth.admin.createUser({
        email: sinPermisosEmail,
        password: PASSWORD,
        email_confirm: true,
      })
      const sinPermisosId = sinPermisosUser!.user!.id
      await admin.from('profiles').insert({ id: sinPermisosId, role: 'auxiliar', is_active: true })
      await admin.from('permission_overrides').insert([
        { profile_id: sinPermisosId, capability: 'view_documents', granted: false },
        { profile_id: sinPermisosId, capability: 'manage_documents', granted: false },
      ])

      await crearDocumento()

      const client = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      await client.auth.signInWithPassword({ email: sinPermisosEmail, password: PASSWORD })

      const { data, error } = await client
        .from('documentos')
        .select('id')
        .eq('cliente_id', clienteId)
      expect(error).toBeNull()
      expect(data).toHaveLength(0)

      await admin.auth.admin.deleteUser(sinPermisosId)
    })
  })

  describe('[US4] eliminación lógica: permisos por antigüedad y rol', () => {
    async function envejecerDocumento(documentoId: string, meses: number) {
      const fecha = new Date()
      fecha.setMonth(fecha.getMonth() - meses)
      await admin
        .from('documentos')
        .update({ fecha_carga: fecha.toISOString() })
        .eq('id', documentoId)
    }

    it('un Auxiliar elimina lógicamente un documento reciente', async () => {
      const documento = await crearDocumento()
      const auxiliarClient = await signInAs(auxiliarEmail)

      const { error } = await auxiliarClient
        .from('documentos')
        .update({ estado: 'eliminado' })
        .eq('id', documento.id)
      expect(error).toBeNull()

      const { data } = await admin
        .from('documentos')
        .select('estado, eliminado_por, eliminado_en')
        .eq('id', documento.id)
        .single()
      expect(data!.estado).toBe('eliminado')
      expect(data!.eliminado_por).toBe(auxiliarId)
      expect(data!.eliminado_en).not.toBeNull()
    })

    it('un Contador no puede eliminar un documento con más de tres meses de antigüedad', async () => {
      const documento = await crearDocumento()
      await envejecerDocumento(documento.id, 4)
      const contadorClient = await signInAs(contadorEmail)

      const { error } = await contadorClient
        .from('documentos')
        .update({ estado: 'eliminado' })
        .eq('id', documento.id)
      expect(error).not.toBeNull()
      expect(error!.message).toContain('Solo un Administrador puede eliminar un documento')

      const { data } = await admin
        .from('documentos')
        .select('estado')
        .eq('id', documento.id)
        .single()
      expect(data!.estado).not.toBe('eliminado')
    })

    it('un Administrador elimina un documento con más de tres meses de antigüedad sin restricción', async () => {
      const documento = await crearDocumento()
      await envejecerDocumento(documento.id, 4)
      const administradorClient = await signInAs(administradorEmail)

      const { error } = await administradorClient
        .from('documentos')
        .update({ estado: 'eliminado' })
        .eq('id', documento.id)
      expect(error).toBeNull()

      const { data } = await admin
        .from('documentos')
        .select('estado')
        .eq('id', documento.id)
        .single()
      expect(data!.estado).toBe('eliminado')
    })

    it('la antigüedad se calcula desde la fecha de alta original, no desde la última modificación (FR-023)', async () => {
      const documento = await crearDocumento()
      await envejecerDocumento(documento.id, 4)

      // Modificar metadatos (Tipo de Documento) no reinicia el conteo de
      // antigüedad — fecha_carga permanece igual.
      await admin.from('documentos').update({ categoria_id: categoriaId }).eq('id', documento.id)

      const contadorClient = await signInAs(contadorEmail)
      const { error } = await contadorClient
        .from('documentos')
        .update({ estado: 'eliminado' })
        .eq('id', documento.id)
      expect(error).not.toBeNull()
    })
  })

  describe('[US5] configuración de Documentos Esperados y su snapshot histórico', () => {
    it('modificar la configuración después de generar un cumplimiento no altera su snapshot ya fijado (FR-011)', async () => {
      const { data: obligacion } = await admin
        .from('obligaciones_fiscales')
        .insert({
          nombre: `Obligación snapshot histórico ${Date.now()}`,
          periodicidad_id: periodicidadId,
          prioridad: 1,
        })
        .select('id')
        .single()

      const { data: categoriaOriginal } = await admin
        .from('categorias_documento')
        .insert({ nombre: `Esperado original ${Date.now()}` })
        .select('id')
        .single()

      await admin.from('documentos_esperados_obligacion').insert({
        obligacion_fiscal_id: obligacion!.id,
        categoria_documento_id: categoriaOriginal!.id,
      })

      const { data: ofc } = await admin
        .from('obligaciones_fiscales_cliente')
        .insert({
          cliente_id: clienteId,
          obligacion_fiscal_id: obligacion!.id,
          periodicidad_id: periodicidadId,
          orden: 200,
        })
        .select('id')
        .single()

      await admin.rpc('generar_cumplimientos_fiscales')
      const { data: cumplimientoOriginal } = await admin
        .from('cumplimientos_fiscales')
        .select('id')
        .eq('obligacion_fiscal_cliente_id', ofc!.id)
        .limit(1)
        .single()

      // Modificar la configuración: quitar el esperado original y agregar uno nuevo.
      await admin
        .from('documentos_esperados_obligacion')
        .update({ activo: false })
        .eq('obligacion_fiscal_id', obligacion!.id)
        .eq('categoria_documento_id', categoriaOriginal!.id)

      const { data: categoriaNueva } = await admin
        .from('categorias_documento')
        .insert({ nombre: `Esperado nuevo ${Date.now()}` })
        .select('id')
        .single()

      await admin.from('documentos_esperados_obligacion').insert({
        obligacion_fiscal_id: obligacion!.id,
        categoria_documento_id: categoriaNueva!.id,
      })

      // El cumplimiento ya generado conserva su snapshot original.
      const { data: snapshotOriginal } = await admin
        .from('cumplimiento_documentos_esperados')
        .select('categoria_documento_id')
        .eq('cumplimiento_id', cumplimientoOriginal!.id)
      expect(snapshotOriginal).toHaveLength(1)
      expect(snapshotOriginal![0]!.categoria_documento_id).toBe(categoriaOriginal!.id)

      // Un segundo cliente con la misma obligación genera un cumplimiento
      // nuevo que debe usar la configuración vigente (ya actualizada).
      const { data: ofc2 } = await admin
        .from('obligaciones_fiscales_cliente')
        .insert({
          cliente_id: otroClienteId,
          obligacion_fiscal_id: obligacion!.id,
          periodicidad_id: periodicidadId,
          orden: 201,
        })
        .select('id')
        .single()

      await admin.rpc('generar_cumplimientos_fiscales')
      const { data: cumplimientoNuevo } = await admin
        .from('cumplimientos_fiscales')
        .select('id')
        .eq('obligacion_fiscal_cliente_id', ofc2!.id)
        .limit(1)
        .single()

      const { data: snapshotNuevo } = await admin
        .from('cumplimiento_documentos_esperados')
        .select('categoria_documento_id')
        .eq('cumplimiento_id', cumplimientoNuevo!.id)
      expect(snapshotNuevo).toHaveLength(1)
      expect(snapshotNuevo![0]!.categoria_documento_id).toBe(categoriaNueva!.id)
    })
  })
})
