import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Prueba de integración contra un Supabase local real — verifica la RLS y
 * las reglas de negocio de Control de Cumplimiento Fiscal
 * (015-control-cumplimiento-fiscal, contracts/db-functions-rls.md):
 * generación idempotente (Historia 1), rechazo de documentos de otro
 * cliente y que "Presentada" nunca vuelva a "Vencida" (Historia 2), que la
 * fecha límite y el responsable se ajustan de forma independiente por
 * registro (Historia 3), cumplimientos extraordinarios (Historia 4), y que
 * los cambios quedan en business_audit_log (Historia 5). Se omite
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
  'Control de Cumplimiento Fiscal (integración, 015-control-cumplimiento-fiscal)',
  () => {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let auxiliarId: string
    let administradorId: string
    let clienteId: string
    let periodicidadId: string
    let obligacionCatalogoId: string
    let categoriaDocumentoId: string
    let documentoClienteId: string
    let documentoOtroClienteId: string
    const auxiliarEmail = `integration-cumplimientos-aux-${Date.now()}@example.com`
    const administradorEmail = `integration-cumplimientos-admin-${Date.now()}@example.com`

    async function crearObligacionFiscalCliente(orden: number) {
      const { data: obligacion } = await admin
        .from('obligaciones_fiscales')
        .insert({
          nombre: `Obligación cumplimiento ${orden} ${Date.now()}`,
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
          orden,
        })
        .select('id, created_at')
        .single()

      return ofc!.id as string
    }

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

      const { data: cliente } = await admin
        .from('clientes')
        .insert({
          nombre: 'Cliente con Cumplimientos Fiscales',
          tipo_persona: 'moral',
          rfc: `CMP${Date.now().toString().slice(-6)}AA1`,
          regimen_fiscal_codigo: '601',
          correo: 'cumplimientos-fiscales@ejemplo.com',
          responsable_id: administradorId,
          created_by: administradorId,
          updated_by: administradorId,
        })
        .select('id')
        .single()
      clienteId = cliente!.id

      const { data: otroCliente } = await admin
        .from('clientes')
        .insert({
          nombre: 'Otro Cliente (para prueba de aislamiento de documentos)',
          tipo_persona: 'moral',
          rfc: `CMP${(Date.now() + 1).toString().slice(-6)}AA2`,
          regimen_fiscal_codigo: '601',
          correo: 'otro-cliente-cumplimientos@ejemplo.com',
          created_by: administradorId,
          updated_by: administradorId,
        })
        .select('id')
        .single()

      // calcular_periodo_fiscal() interpreta el nombre literal de la periodicidad
      // (Mensual/Bimestral/Trimestral/Semestral/Anual, sembrados por 012) — no
      // sirve una periodicidad con un nombre sintético/único como en otras
      // pruebas de este monorepo.
      const { data: periodicidad } = await admin
        .from('periodicidades')
        .select('id')
        .eq('nombre', 'Mensual')
        .single()
      periodicidadId = periodicidad!.id

      const { data: obligacionCatalogo } = await admin
        .from('obligaciones_fiscales')
        .insert({
          nombre: `Obligación catálogo cumplimiento ${Date.now()}`,
          periodicidad_id: periodicidadId,
          prioridad: 1,
        })
        .select('id')
        .single()
      obligacionCatalogoId = obligacionCatalogo!.id

      const { data: categoria } = await admin
        .from('categorias_documento')
        .insert({ nombre: `Categoría cumplimiento ${Date.now()}` })
        .select('id')
        .single()
      categoriaDocumentoId = categoria!.id

      const { data: documento } = await admin
        .from('documentos')
        .insert({
          cliente_id: clienteId,
          categoria_id: categoriaDocumentoId,
          nombre_original: 'acuse-prueba.pdf',
          tamano_bytes: 1024,
          formato: 'application/pdf',
          ruta_almacenamiento: 'clientes/prueba/acuse-prueba.pdf',
          cargado_por: administradorId,
        })
        .select('id')
        .single()
      documentoClienteId = documento!.id

      const { data: documentoOtro } = await admin
        .from('documentos')
        .insert({
          cliente_id: otroCliente!.id,
          categoria_id: categoriaDocumentoId,
          nombre_original: 'documento-otro-cliente.pdf',
          tamano_bytes: 1024,
          formato: 'application/pdf',
          ruta_almacenamiento: 'clientes/otro/documento-otro-cliente.pdf',
          cargado_por: administradorId,
        })
        .select('id')
        .single()
      documentoOtroClienteId = documentoOtro!.id
    })

    afterAll(async () => {
      if (clienteId) await admin.from('clientes').delete().eq('id', clienteId)
      if (auxiliarId) await admin.auth.admin.deleteUser(auxiliarId)
      if (administradorId) await admin.auth.admin.deleteUser(administradorId)
    })

    it('[US1] la generación crea un cumplimiento por obligación activa y periodo, y es idempotente', async () => {
      const obligacionFiscalClienteId = await crearObligacionFiscalCliente(1)

      const { error: primerError } = await admin.rpc('generar_cumplimientos_fiscales')
      expect(primerError).toBeNull()

      const { data: primeraGeneracion } = await admin
        .from('cumplimientos_fiscales')
        .select('id')
        .eq('obligacion_fiscal_cliente_id', obligacionFiscalClienteId)
      expect(primeraGeneracion!.length).toBeGreaterThan(0)

      const { error: segundoError } = await admin.rpc('generar_cumplimientos_fiscales')
      expect(segundoError).toBeNull()

      const { data: segundaGeneracion } = await admin
        .from('cumplimientos_fiscales')
        .select('id')
        .eq('obligacion_fiscal_cliente_id', obligacionFiscalClienteId)
      expect(segundaGeneracion!.length).toBe(primeraGeneracion!.length)
    })

    it('[US1] un Auxiliar con view_clients puede consultar, pero no insertar/actualizar cumplimientos', async () => {
      const obligacionFiscalClienteId = await crearObligacionFiscalCliente(2)
      await admin.rpc('generar_cumplimientos_fiscales')
      const { data: fila } = await admin
        .from('cumplimientos_fiscales')
        .select('id')
        .eq('obligacion_fiscal_cliente_id', obligacionFiscalClienteId)
        .limit(1)
        .single()

      const client = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      await client.auth.signInWithPassword({ email: auxiliarEmail, password: PASSWORD })

      const { data: consulta, error: selectError } = await client
        .from('cumplimientos_fiscales')
        .select('id')
        .eq('id', fila!.id)
      expect(selectError).toBeNull()
      expect(consulta).toHaveLength(1)

      const { error: updateError, count } = await client
        .from('cumplimientos_fiscales')
        .update({ estado: 'en_proceso' }, { count: 'exact' })
        .eq('id', fila!.id)
      expect(updateError).toBeNull()
      expect(count ?? 0).toBe(0)
    })

    it('[US2] rechaza asociar un documento de un cliente distinto al del cumplimiento (FR-009)', async () => {
      const obligacionFiscalClienteId = await crearObligacionFiscalCliente(3)
      await admin.rpc('generar_cumplimientos_fiscales')
      const { data: fila } = await admin
        .from('cumplimientos_fiscales')
        .select('id')
        .eq('obligacion_fiscal_cliente_id', obligacionFiscalClienteId)
        .limit(1)
        .single()

      const { error } = await admin.from('cumplimiento_fiscal_documentos').insert({
        cumplimiento_id: fila!.id,
        documento_id: documentoOtroClienteId,
      })
      expect(error).not.toBeNull()

      const { error: okError } = await admin.from('cumplimiento_fiscal_documentos').insert({
        cumplimiento_id: fila!.id,
        documento_id: documentoClienteId,
        es_acuse: true,
      })
      expect(okError).toBeNull()
    })

    it('[US2] "Presentada" nunca vuelve a mostrarse como "Vencida", sin importar la fecha límite', async () => {
      const obligacionFiscalClienteId = await crearObligacionFiscalCliente(4)
      await admin.rpc('generar_cumplimientos_fiscales')
      const { data: fila } = await admin
        .from('cumplimientos_fiscales')
        .select('id')
        .eq('obligacion_fiscal_cliente_id', obligacionFiscalClienteId)
        .limit(1)
        .single()

      await admin
        .from('cumplimientos_fiscales')
        .update({ estado: 'presentada', fecha_limite: '2000-01-01' })
        .eq('id', fila!.id)

      const { data: actualizado } = await admin
        .from('cumplimientos_fiscales')
        .select('estado, fecha_limite')
        .eq('id', fila!.id)
        .single()

      const vencida =
        (actualizado!.estado === 'pendiente' || actualizado!.estado === 'en_proceso') &&
        actualizado!.fecha_limite < new Date().toISOString().slice(0, 10)
      expect(vencida).toBe(false)
      expect(actualizado!.estado).toBe('presentada')
    })

    it('[US2] un cumplimiento Pendiente con fecha límite pasada se calcula como Vencida', async () => {
      const obligacionFiscalClienteId = await crearObligacionFiscalCliente(5)
      await admin.rpc('generar_cumplimientos_fiscales')
      const { data: fila } = await admin
        .from('cumplimientos_fiscales')
        .select('id')
        .eq('obligacion_fiscal_cliente_id', obligacionFiscalClienteId)
        .limit(1)
        .single()

      await admin
        .from('cumplimientos_fiscales')
        .update({ fecha_limite: '2000-01-01' })
        .eq('id', fila!.id)

      const { data: actualizado } = await admin
        .from('cumplimientos_fiscales')
        .select('estado, fecha_limite')
        .eq('id', fila!.id)
        .single()

      const vencida =
        (actualizado!.estado === 'pendiente' || actualizado!.estado === 'en_proceso') &&
        actualizado!.fecha_limite < new Date().toISOString().slice(0, 10)
      expect(vencida).toBe(true)
    })

    it('[US3] cambiar la fecha límite de un cumplimiento no afecta otros registros', async () => {
      const obligacionA = await crearObligacionFiscalCliente(6)
      const obligacionB = await crearObligacionFiscalCliente(7)
      await admin.rpc('generar_cumplimientos_fiscales')

      const { data: filaA } = await admin
        .from('cumplimientos_fiscales')
        .select('id, fecha_limite')
        .eq('obligacion_fiscal_cliente_id', obligacionA)
        .limit(1)
        .single()
      const { data: filaB } = await admin
        .from('cumplimientos_fiscales')
        .select('id, fecha_limite')
        .eq('obligacion_fiscal_cliente_id', obligacionB)
        .limit(1)
        .single()

      await admin
        .from('cumplimientos_fiscales')
        .update({ fecha_limite: '2030-12-31' })
        .eq('id', filaA!.id)

      const { data: filaBSinCambios } = await admin
        .from('cumplimientos_fiscales')
        .select('fecha_limite')
        .eq('id', filaB!.id)
        .single()
      expect(filaBSinCambios!.fecha_limite).toBe(filaB!.fecha_limite)
    })

    it('[US3] un cumplimiento generado conserva el responsable vigente del cliente al momento de generarse', async () => {
      const obligacionFiscalClienteId = await crearObligacionFiscalCliente(8)
      await admin.rpc('generar_cumplimientos_fiscales')
      const { data: fila } = await admin
        .from('cumplimientos_fiscales')
        .select('responsable_id')
        .eq('obligacion_fiscal_cliente_id', obligacionFiscalClienteId)
        .limit(1)
        .single()
      expect(fila!.responsable_id).toBe(administradorId)

      // Cambiar el responsable del cliente después no debe alterar el ya generado.
      await admin.from('clientes').update({ responsable_id: auxiliarId }).eq('id', clienteId)

      const { data: filaSinCambios } = await admin
        .from('cumplimientos_fiscales')
        .select('responsable_id')
        .eq('obligacion_fiscal_cliente_id', obligacionFiscalClienteId)
        .limit(1)
        .single()
      expect(filaSinCambios!.responsable_id).toBe(administradorId)

      // Restaurar para no afectar otras pruebas de este archivo.
      await admin.from('clientes').update({ responsable_id: administradorId }).eq('id', clienteId)
    })

    it('[US4] registra un cumplimiento extraordinario con obligación del catálogo', async () => {
      const { data, error } = await admin
        .from('cumplimientos_fiscales')
        .insert({
          cliente_id: clienteId,
          es_extraordinario: true,
          obligacion_fiscal_id: obligacionCatalogoId,
          descripcion: 'Declaración complementaria de prueba',
          periodo_inicio: '2026-01-01',
          periodo_fin: '2026-01-31',
          periodo_etiqueta: 'Enero 2026',
          fecha_limite: '2026-02-17',
        })
        .select('id, es_extraordinario, obligacion_fiscal_cliente_id')
        .single()
      expect(error).toBeNull()
      expect(data!.es_extraordinario).toBe(true)
      expect(data!.obligacion_fiscal_cliente_id).toBeNull()
    })

    it('[US4] registra un cumplimiento extraordinario sin obligación del catálogo, solo con descripción', async () => {
      const { data, error } = await admin
        .from('cumplimientos_fiscales')
        .insert({
          cliente_id: clienteId,
          es_extraordinario: true,
          descripcion: 'Trámite extraordinario sin obligación del catálogo',
          periodo_inicio: '2026-02-01',
          periodo_fin: '2026-02-28',
          periodo_etiqueta: 'Febrero 2026',
          fecha_limite: '2026-03-17',
        })
        .select('id')
        .single()
      expect(error).toBeNull()
      expect(data).not.toBeNull()
    })

    it('[US4] rechaza un cumplimiento extraordinario sin obligación de catálogo ni descripción', async () => {
      const { error } = await admin.from('cumplimientos_fiscales').insert({
        cliente_id: clienteId,
        es_extraordinario: true,
        periodo_inicio: '2026-03-01',
        periodo_fin: '2026-03-31',
        periodo_etiqueta: 'Marzo 2026',
        fecha_limite: '2026-04-17',
      })
      expect(error).not.toBeNull()
    })

    it('[US5] los cambios de estado, fecha límite y documentos generan eventos distinguibles en business_audit_log', async () => {
      const obligacionFiscalClienteId = await crearObligacionFiscalCliente(9)
      await admin.rpc('generar_cumplimientos_fiscales')
      const { data: fila } = await admin
        .from('cumplimientos_fiscales')
        .select('id')
        .eq('obligacion_fiscal_cliente_id', obligacionFiscalClienteId)
        .limit(1)
        .single()
      const cumplimientoId = fila!.id as string

      await admin
        .from('cumplimientos_fiscales')
        .update({ estado: 'en_proceso' })
        .eq('id', cumplimientoId)
      await admin
        .from('cumplimientos_fiscales')
        .update({ fecha_limite: '2030-06-30' })
        .eq('id', cumplimientoId)

      // Documento propio de esta prueba (no documentoClienteId, ya asociado a
      // otro cumplimiento en la prueba de US2): desde 016-expediente-fiscal
      // un documento admite como máximo un cumplimiento asociado
      // (cumplimiento_fiscal_documentos_documento_unique).
      const { data: documentoEvento } = await admin
        .from('documentos')
        .insert({
          cliente_id: clienteId,
          categoria_id: categoriaDocumentoId,
          nombre_original: `evento-auditoria-${Date.now()}.pdf`,
          tamano_bytes: 1024,
          formato: 'application/pdf',
          ruta_almacenamiento: `clientes/prueba/evento-auditoria-${Date.now()}.pdf`,
          cargado_por: administradorId,
        })
        .select('id')
        .single()

      await admin.from('cumplimiento_fiscal_documentos').insert({
        cumplimiento_id: cumplimientoId,
        documento_id: documentoEvento!.id,
      })

      const { data: eventos } = await admin
        .from('business_audit_log')
        .select('accion')
        .eq('entidad', 'cumplimiento_fiscal')
        .eq('entidad_id', cumplimientoId)
        .order('creado_en', { ascending: true })

      const acciones = eventos!.map((e) => e.accion)
      expect(acciones).toContain('alta')
      expect(acciones).toContain('cambio_estado')
      expect(acciones).toContain('cambio_fecha_limite')
      expect(acciones).toContain('asociacion_documento')
    })
  },
)
