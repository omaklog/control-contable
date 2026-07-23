import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Prueba de integración contra un Supabase local real — verifica la RLS y
 * las reglas de negocio de Gestión de Pagos (018-gestion-pagos,
 * contracts/db-functions-rls.md): modificación con revalidación de saldo y
 * auditoría por campo (Historia 1), reversión con motivo obligatorio
 * (Historia 2), eliminación lógica (Historia 3), comprobantes (Historia 4),
 * filtros de la vista global (Historia 5), y recalculo inmediato del saldo
 * en `cobranzas_resumen` (Historia 6). Se omite si no hay Supabase local
 * accesible.
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

describe.skipIf(!reachable)('Gestión de Pagos (integración, 018-gestion-pagos)', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let administradorId: string
  const administradorEmail = `integration-pagos-admin-${Date.now()}@example.com`

  async function crearCliente(nombreSufijo: string) {
    const { data, error } = await admin
      .from('clientes')
      .insert({
        nombre: `Cliente Pagos ${nombreSufijo}`,
        tipo_persona: 'moral',
        rfc: `PGS${Date.now().toString().slice(-6)}${Math.random().toString(36).slice(2, 4).toUpperCase()}`,
        regimen_fiscal_codigo: '601',
        correo: `pagos-${nombreSufijo.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}@ejemplo.com`,
        created_by: administradorId,
        updated_by: administradorId,
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

  async function contratarServicio(clienteId: string, servicioId: string, precio: number) {
    await admin.from('servicios_contratados').insert({
      cliente_id: clienteId,
      servicio_id: servicioId,
      precio_acordado: precio,
      estado: 'activo',
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
    const clienteId = await crearCliente(`pagos-${Date.now()}-${Math.random()}`)
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
    return { cobranzaId: cobranza!.id as string, clienteId }
  }

  async function obtenerMetodoPago(nombre = 'efectivo') {
    const { data } = await admin.from('metodos_pago').select('id').eq('nombre', nombre).single()
    return data!.id as string
  }

  async function registrarPago(
    cobranzaId: string,
    monto: number,
    overrides: Record<string, unknown> = {},
  ) {
    const metodoId = await obtenerMetodoPago()
    const { data, error } = await admin
      .from('pagos')
      .insert({
        cobranza_id: cobranzaId,
        monto,
        metodo_pago_id: metodoId,
        created_by: administradorId,
        updated_by: administradorId,
        ...overrides,
      })
      .select('id')
      .single()
    if (error || !data) throw error ?? new Error('No se pudo registrar el pago de prueba')
    return data.id as string
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

  describe('[US1] modificación de pagos', () => {
    it('modificar el monto de un pago recalcula el saldo de la cobranza (FR-004)', async () => {
      const { cobranzaId } = await crearCobranzaConServicio(7000)
      const pagoId = await registrarPago(cobranzaId, 2000)

      const { error } = await admin.from('pagos').update({ monto: 3000 }).eq('id', pagoId)
      expect(error).toBeNull()

      const { data: resumen } = await admin
        .from('cobranzas_resumen')
        .select('saldo, estado_pago')
        .eq('id', cobranzaId)
        .single()
      expect(Number(resumen!.saldo)).toBe(4000)
      expect(resumen!.estado_pago).toBe('parcial')
    })

    it('rechaza una modificación de monto que excedería el saldo pendiente (FR-002/FR-004)', async () => {
      const { cobranzaId } = await crearCobranzaConServicio(5000)
      const pagoId = await registrarPago(cobranzaId, 2000)
      await registrarPago(cobranzaId, 2000)

      const { error } = await admin.from('pagos').update({ monto: 4000 }).eq('id', pagoId)
      expect(error).not.toBeNull()
      expect(error?.message).toContain('excede el saldo pendiente')
    })

    it('modificar la fecha de un pago queda registrado en auditoría con antes/después (FR-005/FR-012)', async () => {
      const { cobranzaId } = await crearCobranzaConServicio(3000)
      const pagoId = await registrarPago(cobranzaId, 1000)
      const nuevaFecha = '2026-06-10'

      await admin.from('pagos').update({ fecha_pago: nuevaFecha }).eq('id', pagoId)

      const { data: eventos } = await admin
        .from('business_audit_log')
        .select('accion, detalle')
        .eq('entidad', 'pago')
        .eq('entidad_id', pagoId)
        .eq('accion', 'modificacion')
        .order('creado_en', { ascending: false })
        .limit(1)

      expect(eventos).toHaveLength(1)
      const campos = (
        eventos![0]!.detalle as { campos: Record<string, { antes: string; despues: string }> }
      ).campos
      expect(campos.fecha_pago).toBeDefined()
    })
  })

  describe('[US2] reversión de pagos con motivo', () => {
    it('rechaza revertir un pago sin motivo (FR-016)', async () => {
      const { cobranzaId } = await crearCobranzaConServicio(3000)
      const pagoId = await registrarPago(cobranzaId, 3000)

      const { error } = await admin.from('pagos').update({ estado: 'revertido' }).eq('id', pagoId)
      expect(error).not.toBeNull()
    })

    it('revertir con motivo excluye el pago del saldo y recalcula el estado de pago (FR-015)', async () => {
      const { cobranzaId } = await crearCobranzaConServicio(5000)
      const pagoId = await registrarPago(cobranzaId, 5000)

      const { data: resumenPagada } = await admin
        .from('cobranzas_resumen')
        .select('estado_pago')
        .eq('id', cobranzaId)
        .single()
      expect(resumenPagada!.estado_pago).toBe('pagada')

      const { error } = await admin
        .from('pagos')
        .update({ estado: 'revertido', motivo_reversion: 'Transferencia rechazada' })
        .eq('id', pagoId)
      expect(error).toBeNull()

      const { data: resumen } = await admin
        .from('cobranzas_resumen')
        .select('saldo, estado_pago')
        .eq('id', cobranzaId)
        .single()
      expect(Number(resumen!.saldo)).toBe(5000)
      expect(resumen!.estado_pago).toBe('pendiente')

      const { data: pago } = await admin
        .from('pagos')
        .select('estado, motivo_reversion')
        .eq('id', pagoId)
        .single()
      expect(pago!.estado).toBe('revertido')
      expect(pago!.motivo_reversion).toBe('Transferencia rechazada')
    })

    it('un pago ya revertido es un estado final: no puede revertirse ni eliminarse de nuevo (FR-009)', async () => {
      const { cobranzaId } = await crearCobranzaConServicio(2000)
      const pagoId = await registrarPago(cobranzaId, 2000)
      await admin
        .from('pagos')
        .update({ estado: 'revertido', motivo_reversion: 'Pago duplicado' })
        .eq('id', pagoId)

      const { error: errorSegundaReversion } = await admin
        .from('pagos')
        .update({ motivo_reversion: 'Otro motivo' })
        .eq('id', pagoId)
      expect(errorSegundaReversion).not.toBeNull()

      const { error: errorEliminar } = await admin
        .from('pagos')
        .update({ estado: 'eliminado' })
        .eq('id', pagoId)
      expect(errorEliminar).not.toBeNull()
    })
  })

  describe('[US3] eliminación lógica de pagos', () => {
    it('eliminar lógicamente un pago lo excluye del saldo y de la vista operativa por defecto (FR-006)', async () => {
      const { cobranzaId } = await crearCobranzaConServicio(4000)
      const pagoId = await registrarPago(cobranzaId, 1500)

      const { error } = await admin.from('pagos').update({ estado: 'eliminado' }).eq('id', pagoId)
      expect(error).toBeNull()

      const { data: resumen } = await admin
        .from('cobranzas_resumen')
        .select('saldo, total_pagado')
        .eq('id', cobranzaId)
        .single()
      expect(Number(resumen!.total_pagado)).toBe(0)
      expect(Number(resumen!.saldo)).toBe(4000)

      const { data: pagosActivos } = await admin
        .from('pagos')
        .select('id')
        .eq('cobranza_id', cobranzaId)
        .eq('estado', 'activo')
      expect(pagosActivos).toHaveLength(0)
    })

    it('genera un evento de auditoría de eliminación lógica (FR-020)', async () => {
      const { cobranzaId } = await crearCobranzaConServicio(2000)
      const pagoId = await registrarPago(cobranzaId, 2000)
      await admin.from('pagos').update({ estado: 'eliminado' }).eq('id', pagoId)

      const { data: eventos } = await admin
        .from('business_audit_log')
        .select('accion')
        .eq('entidad', 'pago')
        .eq('entidad_id', pagoId)
        .eq('accion', 'eliminacion_logica')
      expect(eventos).toHaveLength(1)
    })

    it('un pago ya eliminado es un estado final: no puede eliminarse ni revertirse de nuevo (FR-009)', async () => {
      const { cobranzaId } = await crearCobranzaConServicio(1000)
      const pagoId = await registrarPago(cobranzaId, 1000)
      await admin.from('pagos').update({ estado: 'eliminado' }).eq('id', pagoId)

      const { error } = await admin
        .from('pagos')
        .update({ estado: 'revertido', motivo_reversion: 'Intento posterior' })
        .eq('id', pagoId)
      expect(error).not.toBeNull()
    })
  })

  describe('[US4] comprobantes de pago', () => {
    it('un pago admite múltiples comprobantes, cada uno con su metadata (FR-008/FR-009)', async () => {
      const { cobranzaId } = await crearCobranzaConServicio(1000)
      const pagoId = await registrarPago(cobranzaId, 1000)

      const { error } = await admin.from('comprobantes_pago').insert([
        {
          pago_id: pagoId,
          nombre_original: 'transferencia.pdf',
          tipo_archivo: 'application/pdf',
          tamano_bytes: 1024,
          ruta_almacenamiento: `${pagoId}/a-transferencia.pdf`,
          created_by: administradorId,
        },
        {
          pago_id: pagoId,
          nombre_original: 'captura-banco.png',
          tipo_archivo: 'image/png',
          tamano_bytes: 2048,
          ruta_almacenamiento: `${pagoId}/b-captura-banco.png`,
          created_by: administradorId,
        },
      ])
      expect(error).toBeNull()

      const { data: comprobantes } = await admin
        .from('comprobantes_pago')
        .select('nombre_original, tipo_archivo, tamano_bytes')
        .eq('pago_id', pagoId)
      expect(comprobantes).toHaveLength(2)
    })

    it('el mismo archivo puede adjuntarse repetidamente sin validar duplicidad (FR-010)', async () => {
      const { cobranzaId } = await crearCobranzaConServicio(1000)
      const pagoId = await registrarPago(cobranzaId, 1000)
      const ruta = `${pagoId}/repetido.pdf`

      const primero = await admin.from('comprobantes_pago').insert({
        pago_id: pagoId,
        nombre_original: 'repetido.pdf',
        tipo_archivo: 'application/pdf',
        tamano_bytes: 512,
        ruta_almacenamiento: ruta,
        created_by: administradorId,
      })
      const segundo = await admin.from('comprobantes_pago').insert({
        pago_id: pagoId,
        nombre_original: 'repetido.pdf',
        tipo_archivo: 'application/pdf',
        tamano_bytes: 512,
        ruta_almacenamiento: ruta,
        created_by: administradorId,
      })
      expect(primero.error).toBeNull()
      expect(segundo.error).toBeNull()

      const { data: comprobantes } = await admin
        .from('comprobantes_pago')
        .select('id')
        .eq('pago_id', pagoId)
      expect(comprobantes).toHaveLength(2)
    })

    it('eliminar un comprobante no afecta el pago ni los demás comprobantes (FR-011/FR-012)', async () => {
      const { cobranzaId } = await crearCobranzaConServicio(1000)
      const pagoId = await registrarPago(cobranzaId, 1000)

      const { data: comprobante1 } = await admin
        .from('comprobantes_pago')
        .insert({
          pago_id: pagoId,
          nombre_original: 'uno.pdf',
          tipo_archivo: 'application/pdf',
          tamano_bytes: 100,
          ruta_almacenamiento: `${pagoId}/uno.pdf`,
          created_by: administradorId,
        })
        .select('id')
        .single()
      const { data: comprobante2 } = await admin
        .from('comprobantes_pago')
        .insert({
          pago_id: pagoId,
          nombre_original: 'dos.pdf',
          tipo_archivo: 'application/pdf',
          tamano_bytes: 200,
          ruta_almacenamiento: `${pagoId}/dos.pdf`,
          created_by: administradorId,
        })
        .select('id')
        .single()

      await admin.from('comprobantes_pago').delete().eq('id', comprobante1!.id)

      const { data: restantes } = await admin
        .from('comprobantes_pago')
        .select('id')
        .eq('pago_id', pagoId)
      expect(restantes).toHaveLength(1)
      expect(restantes![0]!.id).toBe(comprobante2!.id)

      const { data: pago } = await admin
        .from('pagos')
        .select('estado, monto')
        .eq('id', pagoId)
        .single()
      expect(pago!.estado).toBe('activo')
      expect(Number(pago!.monto)).toBe(1000)
    })

    it('RLS: sin capacidad view_billing/manage_billing no puede consultar comprobantes', async () => {
      const { cobranzaId } = await crearCobranzaConServicio(1000)
      const pagoId = await registrarPago(cobranzaId, 1000)
      await admin.from('comprobantes_pago').insert({
        pago_id: pagoId,
        nombre_original: 'privado.pdf',
        tipo_archivo: 'application/pdf',
        tamano_bytes: 100,
        ruta_almacenamiento: `${pagoId}/privado.pdf`,
        created_by: administradorId,
      })

      const sinCapacidadEmail = `integration-pagos-sin-cap-${Date.now()}@example.com`
      const { data: sinCapacidadUser } = await admin.auth.admin.createUser({
        email: sinCapacidadEmail,
        password: PASSWORD,
        email_confirm: true,
      })
      await admin
        .from('profiles')
        .insert({ id: sinCapacidadUser!.user!.id, role: 'auxiliar', is_active: true })
      await admin.from('permission_overrides').insert([
        { profile_id: sinCapacidadUser!.user!.id, capability: 'view_billing', granted: false },
        { profile_id: sinCapacidadUser!.user!.id, capability: 'manage_billing', granted: false },
      ])

      const client = await signInAs(sinCapacidadEmail)
      const { data: comprobantes } = await client
        .from('comprobantes_pago')
        .select('id')
        .eq('pago_id', pagoId)
      expect(comprobantes).toHaveLength(0)

      await admin.auth.admin.deleteUser(sinCapacidadUser!.user!.id)
    })
  })

  describe('[US5] filtros combinables de la vista global de pagos', () => {
    it('combina método de pago y estado para acotar los resultados', async () => {
      const { cobranzaId: cobranzaEfectivo } = await crearCobranzaConServicio(1000)
      const { cobranzaId: cobranzaTransferencia } = await crearCobranzaConServicio(1000)
      const metodoEfectivo = await obtenerMetodoPago('efectivo')
      const metodoTransferencia = await obtenerMetodoPago('transferencia')

      const pagoEfectivo = await registrarPago(cobranzaEfectivo, 1000, {
        metodo_pago_id: metodoEfectivo,
      })
      await registrarPago(cobranzaTransferencia, 1000, { metodo_pago_id: metodoTransferencia })

      const { data: resultados } = await admin
        .from('pagos')
        .select('id')
        .eq('metodo_pago_id', metodoEfectivo)
        .eq('estado', 'activo')
        .in('id', [pagoEfectivo])
      expect(resultados).toHaveLength(1)
      expect(resultados![0]!.id).toBe(pagoEfectivo)
    })

    it('el filtro de estado por defecto (activo) excluye revertidos/eliminados hasta ampliarse', async () => {
      const { cobranzaId } = await crearCobranzaConServicio(3000)
      const pagoActivo = await registrarPago(cobranzaId, 1000)
      const pagoRevertido = await registrarPago(cobranzaId, 1000)
      await admin
        .from('pagos')
        .update({ estado: 'revertido', motivo_reversion: 'prueba' })
        .eq('id', pagoRevertido)

      const { data: soloActivos } = await admin
        .from('pagos')
        .select('id')
        .eq('cobranza_id', cobranzaId)
        .eq('estado', 'activo')
      expect(soloActivos!.map((p) => p.id)).toEqual([pagoActivo])

      const { data: todos } = await admin.from('pagos').select('id').eq('cobranza_id', cobranzaId)
      expect(todos).toHaveLength(2)
    })
  })

  describe('[US6] recalculo inmediato del saldo en cobranzas_resumen', () => {
    it('tras revertir y luego eliminar lógicamente pagos activos, el saldo se recalcula en cada paso', async () => {
      const { cobranzaId } = await crearCobranzaConServicio(6000)
      const pago1 = await registrarPago(cobranzaId, 2000)
      const pago2 = await registrarPago(cobranzaId, 4000)

      const { data: resumenInicial } = await admin
        .from('cobranzas_resumen')
        .select('saldo, estado_pago')
        .eq('id', cobranzaId)
        .single()
      expect(Number(resumenInicial!.saldo)).toBe(0)
      expect(resumenInicial!.estado_pago).toBe('pagada')

      await admin
        .from('pagos')
        .update({ estado: 'revertido', motivo_reversion: 'ajuste' })
        .eq('id', pago1)

      const { data: resumenTrasReversion } = await admin
        .from('cobranzas_resumen')
        .select('saldo, estado_pago')
        .eq('id', cobranzaId)
        .single()
      expect(Number(resumenTrasReversion!.saldo)).toBe(2000)
      expect(resumenTrasReversion!.estado_pago).toBe('parcial')

      await admin.from('pagos').update({ estado: 'eliminado' }).eq('id', pago2)

      const { data: resumenFinal } = await admin
        .from('cobranzas_resumen')
        .select('saldo, estado_pago')
        .eq('id', cobranzaId)
        .single()
      expect(Number(resumenFinal!.saldo)).toBe(6000)
      expect(resumenFinal!.estado_pago).toBe('pendiente')
    })
  })
})
