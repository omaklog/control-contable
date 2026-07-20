import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Prueba de integración contra un Supabase local real — verifica la RLS y
 * las reglas de negocio de Obligaciones Fiscales del Cliente
 * (014-obligaciones-fiscales-cliente, contracts/db-functions-rls.md sección
 * C/D): `view_clients` permite `select`, `manage_clients` es requerido para
 * `insert`/`update`/`delete`; una obligación no puede repetirse para un
 * mismo cliente; el orden es único por cliente; una obligación/periodicidad
 * inactiva es rechazada; solo una obligación Activa puede eliminarse
 * físicamente (Historia 1/4); y aplicar una plantilla copia sus obligaciones
 * de forma independiente por cliente, omitiendo duplicados (Historia 3). Se
 * omite automáticamente si no hay un Supabase local accesible.
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
  'Obligaciones Fiscales del Cliente (integración, 014-obligaciones-fiscales-cliente)',
  () => {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let auxiliarId: string
    let administradorId: string
    let clienteId: string
    let clienteId2: string
    let periodicidadActivaId: string
    let periodicidadInactivaId: string
    let obligacionInactivaId: string
    const auxiliarEmail = `integration-obligcliente-aux-${Date.now()}@example.com`
    const administradorEmail = `integration-obligcliente-admin-${Date.now()}@example.com`

    async function crearObligacionActiva(sufijo: string) {
      const { data } = await admin
        .from('obligaciones_fiscales')
        .insert({
          nombre: `Obligación cliente ${sufijo} ${Date.now()}`,
          periodicidad_id: periodicidadActivaId,
          prioridad: 1,
        })
        .select('id')
        .single()
      return data!.id as string
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
          nombre: 'Cliente con Obligaciones Fiscales',
          tipo_persona: 'moral',
          rfc: `OFC${Date.now().toString().slice(-6)}AA1`,
          regimen_fiscal_codigo: '601',
          correo: 'obligaciones-fiscales@ejemplo.com',
          created_by: administradorId,
          updated_by: administradorId,
        })
        .select('id')
        .single()
      clienteId = cliente!.id

      const { data: cliente2 } = await admin
        .from('clientes')
        .insert({
          nombre: 'Segundo Cliente con Obligaciones Fiscales',
          tipo_persona: 'moral',
          rfc: `OFC${(Date.now() + 1).toString().slice(-6)}AA2`,
          regimen_fiscal_codigo: '601',
          correo: 'obligaciones-fiscales-2@ejemplo.com',
          created_by: administradorId,
          updated_by: administradorId,
        })
        .select('id')
        .single()
      clienteId2 = cliente2!.id

      const { data: periodicidadActiva } = await admin
        .from('periodicidades')
        .insert({ nombre: `Periodicidad cliente activa ${Date.now()}` })
        .select('id')
        .single()
      periodicidadActivaId = periodicidadActiva!.id

      const { data: periodicidadInactiva } = await admin
        .from('periodicidades')
        .insert({ nombre: `Periodicidad cliente inactiva ${Date.now()}`, estado: 'inactivo' })
        .select('id')
        .single()
      periodicidadInactivaId = periodicidadInactiva!.id

      obligacionInactivaId = await (async () => {
        const { data } = await admin
          .from('obligaciones_fiscales')
          .insert({
            nombre: `Obligación cliente inactiva ${Date.now()}`,
            periodicidad_id: periodicidadActivaId,
            prioridad: 1,
            estado: 'inactivo',
          })
          .select('id')
          .single()
        return data!.id
      })()
    })

    afterAll(async () => {
      if (clienteId) await admin.from('clientes').delete().eq('id', clienteId)
      if (clienteId2) await admin.from('clientes').delete().eq('id', clienteId2)
      if (auxiliarId) await admin.auth.admin.deleteUser(auxiliarId)
      if (administradorId) await admin.auth.admin.deleteUser(administradorId)
    })

    it('[US1] un Auxiliar con view_clients puede consultar las obligaciones del cliente', async () => {
      const obligacionId = await crearObligacionActiva('consulta')
      const { data: fila } = await admin
        .from('obligaciones_fiscales_cliente')
        .insert({
          cliente_id: clienteId,
          obligacion_fiscal_id: obligacionId,
          periodicidad_id: periodicidadActivaId,
          orden: 1,
        })
        .select('id')
        .single()

      const client = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      await client.auth.signInWithPassword({ email: auxiliarEmail, password: PASSWORD })

      const { data, error } = await client
        .from('obligaciones_fiscales_cliente')
        .select('id')
        .eq('id', fila!.id)
      expect(error).toBeNull()
      expect(data).toHaveLength(1)
    })

    it('[US1] un Auxiliar (sin manage_clients) NO puede agregar una obligación al cliente', async () => {
      const obligacionId = await crearObligacionActiva('sin-permiso')
      const client = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      await client.auth.signInWithPassword({ email: auxiliarEmail, password: PASSWORD })

      const { error } = await client.from('obligaciones_fiscales_cliente').insert({
        cliente_id: clienteId,
        obligacion_fiscal_id: obligacionId,
        periodicidad_id: periodicidadActivaId,
        orden: 2,
      })
      expect(error).not.toBeNull()
    })

    it('[US1] no puede haber dos filas para el mismo cliente y la misma obligación (FR-003)', async () => {
      const obligacionId = await crearObligacionActiva('duplicado')
      const { error: primerError } = await admin.from('obligaciones_fiscales_cliente').insert({
        cliente_id: clienteId,
        obligacion_fiscal_id: obligacionId,
        periodicidad_id: periodicidadActivaId,
        orden: 3,
      })
      expect(primerError).toBeNull()

      const { error: duplicadoError } = await admin.from('obligaciones_fiscales_cliente').insert({
        cliente_id: clienteId,
        obligacion_fiscal_id: obligacionId,
        periodicidad_id: periodicidadActivaId,
        orden: 4,
      })
      expect(duplicadoError).not.toBeNull()
    })

    it('[US1] el orden es único dentro de las obligaciones de un mismo cliente (FR-008)', async () => {
      const obligacionA = await crearObligacionActiva('orden-a')
      const obligacionB = await crearObligacionActiva('orden-b')
      const orden = 1000

      const { error: primerError } = await admin.from('obligaciones_fiscales_cliente').insert({
        cliente_id: clienteId,
        obligacion_fiscal_id: obligacionA,
        periodicidad_id: periodicidadActivaId,
        orden,
      })
      expect(primerError).toBeNull()

      const { error: duplicadoError } = await admin.from('obligaciones_fiscales_cliente').insert({
        cliente_id: clienteId,
        obligacion_fiscal_id: obligacionB,
        periodicidad_id: periodicidadActivaId,
        orden,
      })
      expect(duplicadoError).not.toBeNull()
    })

    it('[US1] rechaza una obligación fiscal inactiva del catálogo (FR-002)', async () => {
      const { error } = await admin.from('obligaciones_fiscales_cliente').insert({
        cliente_id: clienteId,
        obligacion_fiscal_id: obligacionInactivaId,
        periodicidad_id: periodicidadActivaId,
        orden: 5,
      })
      expect(error).not.toBeNull()
    })

    it('[US1] rechaza una periodicidad inactiva (FR-007)', async () => {
      const obligacionId = await crearObligacionActiva('periodicidad-inactiva')
      const { error } = await admin.from('obligaciones_fiscales_cliente').insert({
        cliente_id: clienteId,
        obligacion_fiscal_id: obligacionId,
        periodicidad_id: periodicidadInactivaId,
        orden: 6,
      })
      expect(error).not.toBeNull()
    })

    it('[US1/US4] una obligación Activa puede eliminarse físicamente; una No aplica no puede (FR-005/FR-006)', async () => {
      const obligacionActivaEliminar = await crearObligacionActiva('eliminar-activa')
      const { data: filaActiva } = await admin
        .from('obligaciones_fiscales_cliente')
        .insert({
          cliente_id: clienteId,
          obligacion_fiscal_id: obligacionActivaEliminar,
          periodicidad_id: periodicidadActivaId,
          orden: 7,
        })
        .select('id')
        .single()

      const client = createClient(SUPABASE_URL, ANON_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      await client.auth.signInWithPassword({ email: administradorEmail, password: PASSWORD })

      const { error: deleteActivaError, count: deleteActivaCount } = await client
        .from('obligaciones_fiscales_cliente')
        .delete({ count: 'exact' })
        .eq('id', filaActiva!.id)
      expect(deleteActivaError).toBeNull()
      expect(deleteActivaCount).toBe(1)

      const obligacionNoAplica = await crearObligacionActiva('no-aplica')
      const { data: filaNoAplica } = await admin
        .from('obligaciones_fiscales_cliente')
        .insert({
          cliente_id: clienteId,
          obligacion_fiscal_id: obligacionNoAplica,
          periodicidad_id: periodicidadActivaId,
          orden: 8,
        })
        .select('id')
        .single()
      await admin
        .from('obligaciones_fiscales_cliente')
        .update({ estado: 'no_aplica' })
        .eq('id', filaNoAplica!.id)

      // Sin política de DELETE para estado = no_aplica, RLS filtra la fila
      // del alcance de la operación (0 filas afectadas) en vez de lanzar un
      // error explícito.
      const { error: deleteNoAplicaError, count: deleteNoAplicaCount } = await client
        .from('obligaciones_fiscales_cliente')
        .delete({ count: 'exact' })
        .eq('id', filaNoAplica!.id)
      expect(deleteNoAplicaError).toBeNull()
      expect(deleteNoAplicaCount).toBe(0)

      const { data: sigueExistiendo } = await admin
        .from('obligaciones_fiscales_cliente')
        .select('id')
        .eq('id', filaNoAplica!.id)
      expect(sigueExistiendo).toHaveLength(1)
    })

    it('[US4] una obligación No aplica sigue siendo consultable, distinguida de las Activas', async () => {
      const obligacionId = await crearObligacionActiva('historial')
      const { data: fila } = await admin
        .from('obligaciones_fiscales_cliente')
        .insert({
          cliente_id: clienteId,
          obligacion_fiscal_id: obligacionId,
          periodicidad_id: periodicidadActivaId,
          orden: 9,
        })
        .select('id')
        .single()
      await admin
        .from('obligaciones_fiscales_cliente')
        .update({ estado: 'no_aplica' })
        .eq('id', fila!.id)

      const { data: sinFiltro } = await admin
        .from('obligaciones_fiscales_cliente')
        .select('id, estado')
        .eq('id', fila!.id)
      expect(sinFiltro).toHaveLength(1)
      expect(sinFiltro![0]!.estado).toBe('no_aplica')

      const { data: soloActivas } = await admin
        .from('obligaciones_fiscales_cliente')
        .select('id')
        .eq('id', fila!.id)
        .eq('estado', 'activa')
      expect(soloActivas).toHaveLength(0)
    })

    it('[US3] aplicar una plantilla copia sus obligaciones al cliente, omitiendo las ya configuradas', async () => {
      const obligacionYaConfigurada = await crearObligacionActiva('ya-configurada')
      const obligacionNueva = await crearObligacionActiva('nueva-por-plantilla')

      await admin.from('obligaciones_fiscales_cliente').insert({
        cliente_id: clienteId,
        obligacion_fiscal_id: obligacionYaConfigurada,
        periodicidad_id: periodicidadActivaId,
        orden: 100,
      })

      const { data: plantilla } = await admin
        .from('plantillas_obligaciones')
        .insert({ nombre: `Plantilla aplicar ${Date.now()}` })
        .select('id')
        .single()

      await admin.from('plantilla_obligaciones_items').insert([
        {
          plantilla_id: plantilla!.id,
          obligacion_fiscal_id: obligacionYaConfigurada,
          periodicidad_id: periodicidadActivaId,
          orden: 1,
        },
        {
          plantilla_id: plantilla!.id,
          obligacion_fiscal_id: obligacionNueva,
          periodicidad_id: periodicidadActivaId,
          orden: 2,
        },
      ])

      const { error } = await admin.rpc('aplicar_plantilla_obligaciones', {
        p_cliente_id: clienteId,
        p_plantilla_id: plantilla!.id,
      })
      expect(error).toBeNull()

      const { data: nuevaFila } = await admin
        .from('obligaciones_fiscales_cliente')
        .select('id')
        .eq('cliente_id', clienteId)
        .eq('obligacion_fiscal_id', obligacionNueva)
      expect(nuevaFila).toHaveLength(1)

      const { data: yaConfiguradaFilas } = await admin
        .from('obligaciones_fiscales_cliente')
        .select('id')
        .eq('cliente_id', clienteId)
        .eq('obligacion_fiscal_id', obligacionYaConfigurada)
      expect(yaConfiguradaFilas).toHaveLength(1)
    })

    it('[US3] aplicar la misma plantilla a dos clientes produce copias independientes', async () => {
      const obligacionCompartida = await crearObligacionActiva('compartida')
      const { data: plantilla } = await admin
        .from('plantillas_obligaciones')
        .insert({ nombre: `Plantilla compartida ${Date.now()}` })
        .select('id')
        .single()
      await admin.from('plantilla_obligaciones_items').insert({
        plantilla_id: plantilla!.id,
        obligacion_fiscal_id: obligacionCompartida,
        periodicidad_id: periodicidadActivaId,
        // Orden alto y exclusivo de esta prueba para no chocar con los
        // órdenes ya ocupados por clienteId en pruebas anteriores (el
        // ON CONFLICT de la función solo cubre cliente+obligación, no
        // cliente+orden).
        orden: 9999,
      })

      const { error: rpcError1 } = await admin.rpc('aplicar_plantilla_obligaciones', {
        p_cliente_id: clienteId,
        p_plantilla_id: plantilla!.id,
      })
      expect(rpcError1).toBeNull()
      const { error: rpcError2 } = await admin.rpc('aplicar_plantilla_obligaciones', {
        p_cliente_id: clienteId2,
        p_plantilla_id: plantilla!.id,
      })
      expect(rpcError2).toBeNull()

      const { data: filaCliente1 } = await admin
        .from('obligaciones_fiscales_cliente')
        .select('id')
        .eq('cliente_id', clienteId)
        .eq('obligacion_fiscal_id', obligacionCompartida)
        .single()
      const { data: filaCliente2 } = await admin
        .from('obligaciones_fiscales_cliente')
        .select('id')
        .eq('cliente_id', clienteId2)
        .eq('obligacion_fiscal_id', obligacionCompartida)
        .single()

      expect(filaCliente1!.id).not.toBe(filaCliente2!.id)

      // Modificar la copia de un cliente no afecta la del otro.
      await admin
        .from('obligaciones_fiscales_cliente')
        .update({ estado: 'no_aplica' })
        .eq('id', filaCliente1!.id)

      const { data: cliente2SinCambios } = await admin
        .from('obligaciones_fiscales_cliente')
        .select('estado')
        .eq('id', filaCliente2!.id)
        .single()
      expect(cliente2SinCambios!.estado).toBe('activa')
    })
  },
)
