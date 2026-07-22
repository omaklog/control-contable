import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Prueba de integración contra un Supabase local real — verifica la RLS y
 * las reglas de negocio de Cobranza (017-cobranza, contracts/db-functions-rls.md):
 * generación idempotente y congelamiento de precios (Historia 1), pagos y
 * recibos (Historia 2), cargos extraordinarios (Historia 3), filtros
 * (Historia 4), eliminación/cancelación (Historia 5), y configuración/
 * Dashboard (Historia 6). Se omite si no hay Supabase local accesible.
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

describe.skipIf(!reachable)('Cobranza (integración, 017-cobranza)', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let administradorId: string
  const administradorEmail = `integration-cobranza-admin-${Date.now()}@example.com`

  async function crearCliente(nombreSufijo: string, overrides: Record<string, unknown> = {}) {
    const { data, error } = await admin
      .from('clientes')
      .insert({
        nombre: `Cliente Cobranza ${nombreSufijo}`,
        tipo_persona: 'moral',
        rfc: `CBZ${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`,
        regimen_fiscal_codigo: '601',
        correo: `cobranza-${nombreSufijo.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}@ejemplo.com`,
        created_by: administradorId,
        updated_by: administradorId,
        ...overrides,
      })
      .select('id')
      .single()
    if (error || !data) throw error ?? new Error('No se pudo crear el cliente de prueba')
    return data.id as string
  }

  async function crearServicio(nombre: string) {
    const { data: servicio } = await admin
      .from('servicios')
      .insert({ nombre: `${nombre} ${Date.now()}`, categoria: 'contable' })
      .select('id')
      .single()
    return servicio!.id as string
  }

  async function contratarServicio(
    clienteId: string,
    servicioId: string,
    precio: number,
    estado: 'activo' | 'suspendido' | 'finalizado' = 'activo',
  ) {
    await admin.from('servicios_contratados').insert({
      cliente_id: clienteId,
      servicio_id: servicioId,
      precio_acordado: precio,
      estado,
      created_by: administradorId,
      updated_by: administradorId,
    })
  }

  async function signInAs(email: string) {
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await client.auth.signInWithPassword({ email, password: PASSWORD })
    return client
  }

  async function crearCobranzaConServicio(monto: number) {
    const clienteId = await crearCliente(`US-cobranza-${Date.now()}-${Math.random()}`)
    const servicioId = await crearServicio('Honorarios')
    await contratarServicio(clienteId, servicioId, monto)
    await admin.rpc('generar_cobranzas', { p_forzar: true })

    const hoy = new Date()
    const { data: cobranza } = await admin
      .from('cobranzas')
      .select('id')
      .eq('cliente_id', clienteId)
      .eq('periodo_mes', hoy.getMonth() + 1)
      .eq('periodo_anio', hoy.getFullYear())
      .single()
    return cobranza!.id as string
  }

  async function obtenerMetodoPago() {
    const { data } = await admin.from('metodos_pago').select('id').eq('nombre', 'efectivo').single()
    return data!.id as string
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
  })

  afterAll(async () => {
    if (administradorId) await admin.auth.admin.deleteUser(administradorId)
  })

  describe('[US1] generación de cobranzas del periodo', () => {
    it('genera una única cobranza por cliente con un concepto por servicio activo', async () => {
      const clienteId = await crearCliente(`US1-${Date.now()}`)
      const servicioId = await crearServicio('Contabilidad')
      await contratarServicio(clienteId, servicioId, 3500)

      const { data: generadas, error } = await admin.rpc('generar_cobranzas', { p_forzar: true })
      expect(error).toBeNull()
      expect(generadas).toBeGreaterThanOrEqual(1)

      const hoy = new Date()
      const { data: cobranza } = await admin
        .from('cobranzas')
        .select('id')
        .eq('cliente_id', clienteId)
        .eq('periodo_mes', hoy.getMonth() + 1)
        .eq('periodo_anio', hoy.getFullYear())
        .single()
      expect(cobranza).not.toBeNull()

      const { data: conceptos } = await admin
        .from('conceptos_cobranza')
        .select('monto, tipo')
        .eq('cobranza_id', cobranza!.id)
      expect(conceptos).toHaveLength(1)
      expect(Number(conceptos![0]!.monto)).toBe(3500)
      expect(conceptos![0]!.tipo).toBe('servicio_recurrente')
    })

    it('un cliente activo sin servicios activos no genera una cobranza vacía (FR-005)', async () => {
      const clienteId = await crearCliente(`US1-sin-servicios-${Date.now()}`)
      const servicioId = await crearServicio('Nómina')
      await contratarServicio(clienteId, servicioId, 1500, 'suspendido')

      await admin.rpc('generar_cobranzas', { p_forzar: true })

      const hoy = new Date()
      const { data: cobranza } = await admin
        .from('cobranzas')
        .select('id')
        .eq('cliente_id', clienteId)
        .eq('periodo_mes', hoy.getMonth() + 1)
        .eq('periodo_anio', hoy.getFullYear())
        .maybeSingle()
      expect(cobranza).toBeNull()
    })

    it('ejecutar la generación varias veces no duplica cobranzas ni conceptos (idempotencia, FR-004)', async () => {
      const clienteId = await crearCliente(`US1-idempotente-${Date.now()}`)
      const servicioId = await crearServicio('Auditoría')
      await contratarServicio(clienteId, servicioId, 5000)

      await admin.rpc('generar_cobranzas', { p_forzar: true })
      await admin.rpc('generar_cobranzas', { p_forzar: true })
      await admin.rpc('generar_cobranzas', { p_forzar: true })

      const hoy = new Date()
      const { data: cobranzas } = await admin
        .from('cobranzas')
        .select('id')
        .eq('cliente_id', clienteId)
        .eq('periodo_mes', hoy.getMonth() + 1)
        .eq('periodo_anio', hoy.getFullYear())
      expect(cobranzas).toHaveLength(1)

      const { data: conceptos } = await admin
        .from('conceptos_cobranza')
        .select('id')
        .eq('cobranza_id', cobranzas![0]!.id)
      expect(conceptos).toHaveLength(1)
    })

    it('un cambio de precio posterior no afecta una cobranza ya generada (FR-006/FR-007)', async () => {
      const clienteId = await crearCliente(`US1-precio-congelado-${Date.now()}`)
      const servicioId = await crearServicio('Contabilidad')
      await contratarServicio(clienteId, servicioId, 3500)

      await admin.rpc('generar_cobranzas', { p_forzar: true })

      const hoy = new Date()
      const { data: cobranza } = await admin
        .from('cobranzas')
        .select('id')
        .eq('cliente_id', clienteId)
        .eq('periodo_mes', hoy.getMonth() + 1)
        .eq('periodo_anio', hoy.getFullYear())
        .single()

      await admin
        .from('servicios_contratados')
        .update({ precio_acordado: 4000 })
        .eq('cliente_id', clienteId)
        .eq('servicio_id', servicioId)

      const { data: conceptos } = await admin
        .from('conceptos_cobranza')
        .select('monto')
        .eq('cobranza_id', cobranza!.id)
      expect(Number(conceptos![0]!.monto)).toBe(3500)
    })
  })

  describe('[US2] pagos, saldo/estado y recibos', () => {
    it('un pago parcial actualiza el saldo y el estado de pago (FR-014/FR-015)', async () => {
      const cobranzaId = await crearCobranzaConServicio(7000)
      const metodoId = await obtenerMetodoPago()

      const { error } = await admin.from('pagos').insert({
        cobranza_id: cobranzaId,
        monto: 2000,
        metodo_pago_id: metodoId,
        created_by: administradorId,
        updated_by: administradorId,
      })
      expect(error).toBeNull()

      const { data: resumen } = await admin
        .from('cobranzas_resumen')
        .select('saldo, estado_pago')
        .eq('id', cobranzaId)
        .single()
      expect(Number(resumen!.saldo)).toBe(5000)
      expect(resumen!.estado_pago).toBe('parcial')
    })

    it('un pago que completa el total marca la cobranza como "Pagada" (FR-015)', async () => {
      const cobranzaId = await crearCobranzaConServicio(5000)
      const metodoId = await obtenerMetodoPago()

      await admin.from('pagos').insert({
        cobranza_id: cobranzaId,
        monto: 2000,
        metodo_pago_id: metodoId,
        created_by: administradorId,
        updated_by: administradorId,
      })
      await admin.from('pagos').insert({
        cobranza_id: cobranzaId,
        monto: 3000,
        metodo_pago_id: metodoId,
        created_by: administradorId,
        updated_by: administradorId,
      })

      const { data: resumen } = await admin
        .from('cobranzas_resumen')
        .select('saldo, estado_pago')
        .eq('id', cobranzaId)
        .single()
      expect(Number(resumen!.saldo)).toBe(0)
      expect(resumen!.estado_pago).toBe('pagada')
    })

    it('rechaza un pago que excede el saldo pendiente (FR-014)', async () => {
      const cobranzaId = await crearCobranzaConServicio(1000)
      const metodoId = await obtenerMetodoPago()

      const { error } = await admin.from('pagos').insert({
        cobranza_id: cobranzaId,
        monto: 1500,
        metodo_pago_id: metodoId,
        created_by: administradorId,
        updated_by: administradorId,
      })
      expect(error).not.toBeNull()
    })

    it('cada pago genera un recibo con folio propio (constitución — "recibos emitidos")', async () => {
      const cobranzaId = await crearCobranzaConServicio(3000)
      const metodoId = await obtenerMetodoPago()

      const { data: pago } = await admin
        .from('pagos')
        .insert({
          cobranza_id: cobranzaId,
          monto: 3000,
          metodo_pago_id: metodoId,
          created_by: administradorId,
          updated_by: administradorId,
        })
        .select('id')
        .single()

      const { data: recibo } = await admin
        .from('recibos')
        .select('folio, monto')
        .eq('pago_id', pago!.id)
        .single()
      expect(recibo?.folio).toMatch(/^REC-\d{6}$/)
      expect(Number(recibo?.monto)).toBe(3000)
    })
  })

  describe('[US3] cargos extraordinarios', () => {
    it('un cargo extraordinario pendiente se incorpora como concepto al generarse la cobranza de su periodo (FR-009)', async () => {
      const clienteId = await crearCliente(`US3-${Date.now()}`)
      const hoy = new Date()
      const mes = hoy.getMonth() + 1
      const anio = hoy.getFullYear()

      const { data: cargo } = await admin
        .from('cargos_extraordinarios')
        .insert({
          cliente_id: clienteId,
          descripcion: 'Asesoría fiscal extraordinaria',
          monto: 2000,
          periodo_mes: mes,
          periodo_anio: anio,
        })
        .select('id')
        .single()

      // Sin servicios activos: el cliente no generaría cobranza por sí solo,
      // así que se le da un servicio activo para que se genere la cabecera.
      const servicioId = await crearServicio('Contabilidad')
      await contratarServicio(clienteId, servicioId, 1000)

      await admin.rpc('generar_cobranzas', { p_forzar: true })

      const { data: cargoActualizado } = await admin
        .from('cargos_extraordinarios')
        .select('estado, concepto_cobranza_id')
        .eq('id', cargo!.id)
        .single()
      expect(cargoActualizado!.estado).toBe('incorporado')
      expect(cargoActualizado!.concepto_cobranza_id).not.toBeNull()

      const { data: concepto } = await admin
        .from('conceptos_cobranza')
        .select('monto, tipo')
        .eq('id', cargoActualizado!.concepto_cobranza_id)
        .single()
      expect(Number(concepto!.monto)).toBe(2000)
      expect(concepto!.tipo).toBe('cargo_extraordinario')
    })

    it('un cargo extraordinario ya incorporado no puede eliminarse — la RLS lo bloquea en silencio (FR-010)', async () => {
      const clienteId = await crearCliente(`US3-incorporado-${Date.now()}`)
      const hoy = new Date()

      const { data: cargo } = await admin
        .from('cargos_extraordinarios')
        .insert({
          cliente_id: clienteId,
          descripcion: 'Trámite especial',
          monto: 1000,
          periodo_mes: hoy.getMonth() + 1,
          periodo_anio: hoy.getFullYear(),
        })
        .select('id')
        .single()

      const servicioId = await crearServicio('Nómina')
      await contratarServicio(clienteId, servicioId, 500)
      await admin.rpc('generar_cobranzas', { p_forzar: true })

      const administradorClient = await signInAs(administradorEmail)
      const { error, count } = await administradorClient
        .from('cargos_extraordinarios')
        .delete({ count: 'exact' })
        .eq('id', cargo!.id)
      // La política RLS `cargos_extraordinarios_delete_pendiente` bloquea en
      // silencio (0 filas, sin error) cuando estado <> 'pendiente' — mismo
      // patrón que 014 (obligaciones_fiscales_cliente_delete_manage_clients_activa).
      expect(error).toBeNull()
      expect(count ?? 0).toBe(0)

      const { data: cargoTrasIntento } = await admin
        .from('cargos_extraordinarios')
        .select('id')
        .eq('id', cargo!.id)
        .maybeSingle()
      expect(cargoTrasIntento).not.toBeNull()
    })

    it('un cargo extraordinario pendiente sí puede eliminarse (FR-010)', async () => {
      const clienteId = await crearCliente(`US3-pendiente-${Date.now()}`)
      const { data: cargo } = await admin
        .from('cargos_extraordinarios')
        .insert({
          cliente_id: clienteId,
          descripcion: 'Trámite especial sin incorporar',
          monto: 1000,
          periodo_mes: 12,
          periodo_anio: 2099,
        })
        .select('id')
        .single()

      const administradorClient = await signInAs(administradorEmail)
      const { error, count } = await administradorClient
        .from('cargos_extraordinarios')
        .delete({ count: 'exact' })
        .eq('id', cargo!.id)
      expect(error).toBeNull()
      expect(count).toBe(1)
    })
  })

  describe('[US4] consulta de cobranzas: RLS y valores filtrables', () => {
    it('un usuario sin view_billing/manage_billing no puede consultar cobranzas_resumen (RLS, security_invoker)', async () => {
      const clienteId = await crearCliente(`US4-sinpermisos-${Date.now()}`)
      const servicioId = await crearServicio('Contabilidad')
      await contratarServicio(clienteId, servicioId, 1000)
      await admin.rpc('generar_cobranzas', { p_forzar: true })

      const sinPermisosEmail = `integration-cobranza-sinpermisos-${Date.now()}@example.com`
      const { data: sinPermisosUser } = await admin.auth.admin.createUser({
        email: sinPermisosEmail,
        password: PASSWORD,
        email_confirm: true,
      })
      const sinPermisosId = sinPermisosUser!.user!.id
      await admin.from('profiles').insert({ id: sinPermisosId, role: 'auxiliar', is_active: true })
      await admin.from('permission_overrides').insert([
        { profile_id: sinPermisosId, capability: 'view_billing', granted: false },
        { profile_id: sinPermisosId, capability: 'manage_billing', granted: false },
      ])

      const client = await signInAs(sinPermisosEmail)
      const { data, error } = await client
        .from('cobranzas_resumen')
        .select('id')
        .eq('cliente_id', clienteId)
      expect(error).toBeNull()
      expect(data).toHaveLength(0)

      await admin.auth.admin.deleteUser(sinPermisosId)
    })

    it('los campos de periodo y estado combinan correctamente para filtrar (mes+año+estado de pago+vencimiento)', async () => {
      const clienteId = await crearCliente(`US4-filtros-${Date.now()}`)
      const servicioId = await crearServicio('Contabilidad')
      await contratarServicio(clienteId, servicioId, 1000)

      // Cobranza vencida y sin pagos: fecha_limite en el pasado.
      const { data: cobranzaVencida } = await admin
        .from('cobranzas')
        .insert({
          cliente_id: clienteId,
          periodo_mes: 1,
          periodo_anio: 2020,
          fecha_limite: '2020-01-20',
        })
        .select('id')
        .single()
      await admin.from('conceptos_cobranza').insert({
        cobranza_id: cobranzaVencida!.id,
        descripcion: 'Contabilidad',
        monto: 1000,
        tipo: 'servicio_recurrente',
        servicio_contratado_id: (
          await admin
            .from('servicios_contratados')
            .select('id')
            .eq('cliente_id', clienteId)
            .eq('servicio_id', servicioId)
            .single()
        ).data!.id,
      })

      const { data: resumen } = await admin
        .from('cobranzas_resumen')
        .select('periodo_mes, periodo_anio, estado_pago, estado_vencimiento')
        .eq('id', cobranzaVencida!.id)
        .single()

      expect(resumen!.periodo_mes).toBe(1)
      expect(resumen!.periodo_anio).toBe(2020)
      expect(resumen!.estado_pago).toBe('pendiente')
      expect(resumen!.estado_vencimiento).toBe('vencida')

      // Simula la combinación de filtros de la bandeja (page.tsx): mes=1,
      // año=2020, estado de pago=pendiente, vencimiento=vencida.
      const coincide =
        resumen!.periodo_mes === 1 &&
        resumen!.periodo_anio === 2020 &&
        resumen!.estado_pago === 'pendiente' &&
        resumen!.estado_vencimiento === 'vencida'
      expect(coincide).toBe(true)
    })
  })

  describe('[US5] eliminación, cancelación y ciclo de vida', () => {
    it('una cobranza sin pagos puede eliminarse lógicamente (FR-019)', async () => {
      const cobranzaId = await crearCobranzaConServicio(1000)

      const { error } = await admin
        .from('cobranzas')
        .update({ estado: 'eliminada' })
        .eq('id', cobranzaId)
      expect(error).toBeNull()

      const { data: cobranza } = await admin
        .from('cobranzas')
        .select('estado')
        .eq('id', cobranzaId)
        .single()
      expect(cobranza!.estado).toBe('eliminada')
    })

    it('una cobranza con pagos registrados no puede eliminarse (FR-019/FR-020)', async () => {
      const cobranzaId = await crearCobranzaConServicio(1000)
      const metodoId = await obtenerMetodoPago()
      await admin.from('pagos').insert({
        cobranza_id: cobranzaId,
        monto: 500,
        metodo_pago_id: metodoId,
        created_by: administradorId,
        updated_by: administradorId,
      })

      const { error } = await admin
        .from('cobranzas')
        .update({ estado: 'eliminada' })
        .eq('id', cobranzaId)
      expect(error).not.toBeNull()
      expect(error!.message).toContain('pagos registrados')

      const { data: cobranza } = await admin
        .from('cobranzas')
        .select('estado')
        .eq('id', cobranzaId)
        .single()
      expect(cobranza!.estado).toBe('vigente')
    })

    it('cancelar una cobranza con pagos preserva la cobranza, sus conceptos y sus pagos como historial (FR-020)', async () => {
      const cobranzaId = await crearCobranzaConServicio(2000)
      const metodoId = await obtenerMetodoPago()
      await admin.from('pagos').insert({
        cobranza_id: cobranzaId,
        monto: 800,
        metodo_pago_id: metodoId,
        created_by: administradorId,
        updated_by: administradorId,
      })

      const { error } = await admin
        .from('cobranzas')
        .update({ estado: 'cancelada' })
        .eq('id', cobranzaId)
      expect(error).toBeNull()

      const { data: conceptos } = await admin
        .from('conceptos_cobranza')
        .select('id')
        .eq('cobranza_id', cobranzaId)
      expect(conceptos!.length).toBeGreaterThan(0)

      const { data: pagosRestantes } = await admin
        .from('pagos')
        .select('id')
        .eq('cobranza_id', cobranzaId)
      expect(pagosRestantes!.length).toBe(1)
    })

    it('una cobranza cancelada no admite nuevos pagos (FR-020)', async () => {
      const cobranzaId = await crearCobranzaConServicio(1000)
      await admin.from('cobranzas').update({ estado: 'cancelada' }).eq('id', cobranzaId)

      const metodoId = await obtenerMetodoPago()
      const { error } = await admin.from('pagos').insert({
        cobranza_id: cobranzaId,
        monto: 500,
        metodo_pago_id: metodoId,
        created_by: administradorId,
        updated_by: administradorId,
      })
      expect(error).not.toBeNull()
      expect(error!.message).toContain('no está vigente')
    })

    it('una cobranza en estado terminal no puede volver a cambiar de estado', async () => {
      const cobranzaId = await crearCobranzaConServicio(1000)
      await admin.from('cobranzas').update({ estado: 'eliminada' }).eq('id', cobranzaId)

      const { error } = await admin
        .from('cobranzas')
        .update({ estado: 'cancelada' })
        .eq('id', cobranzaId)
      expect(error).not.toBeNull()
    })
  })

  describe('[US6] configuración prospectiva y clientes sin servicios activos', () => {
    it('un cambio en el día límite configurado no altera la fecha límite de una cobranza ya generada (FR-018)', async () => {
      const { data: configOriginal } = await admin
        .from('configuracion_cobranza')
        .select('dia_limite_pago')
        .single()
      const diaOriginal = configOriginal!.dia_limite_pago

      const cobranzaId = await crearCobranzaConServicio(1000)
      const { data: cobranzaAntes } = await admin
        .from('cobranzas')
        .select('fecha_limite')
        .eq('id', cobranzaId)
        .single()

      await admin.from('configuracion_cobranza').update({ dia_limite_pago: 15 }).eq('id', true)

      const { data: cobranzaDespues } = await admin
        .from('cobranzas')
        .select('fecha_limite')
        .eq('id', cobranzaId)
        .single()
      expect(cobranzaDespues!.fecha_limite).toBe(cobranzaAntes!.fecha_limite)

      // Un cliente nuevo generado después del cambio sí usa el nuevo valor.
      const otroCobranzaId = await crearCobranzaConServicio(1000)
      const { data: nuevaCobranza } = await admin
        .from('cobranzas')
        .select('fecha_limite')
        .eq('id', otroCobranzaId)
        .single()
      const hoy = new Date()
      const fechaEsperada = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-15`
      expect(nuevaCobranza!.fecha_limite).toBe(fechaEsperada)

      // Restaurar para no afectar otras pruebas de este archivo.
      await admin
        .from('configuracion_cobranza')
        .update({ dia_limite_pago: diaOriginal })
        .eq('id', true)
    })

    it('identifica clientes activos sin ningún servicio activo (FR-023, Dashboard)', async () => {
      const clienteSinServicios = await crearCliente(`US6-sin-servicios-${Date.now()}`)
      const clienteConServicioSuspendido = await crearCliente(`US6-suspendido-${Date.now()}`)
      const servicioId = await crearServicio('Contabilidad')
      await contratarServicio(clienteConServicioSuspendido, servicioId, 1000, 'suspendido')

      const { data: clientesActivos } = await admin
        .from('clientes')
        .select('id')
        .eq('estado', 'activo')
      const { data: conServicioActivo } = await admin
        .from('servicios_contratados')
        .select('cliente_id')
        .eq('estado', 'activo')
      const idsConServicioActivo = new Set((conServicioActivo ?? []).map((row) => row.cliente_id))
      const sinServiciosActivos = (clientesActivos ?? [])
        .filter((c) => !idsConServicioActivo.has(c.id))
        .map((c) => c.id)

      expect(sinServiciosActivos).toContain(clienteSinServicios)
      expect(sinServiciosActivos).toContain(clienteConServicioSuspendido)
    })
  })
})
