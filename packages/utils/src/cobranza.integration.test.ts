import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Prueba de integración contra un Supabase local real — verifica las reglas
 * de negocio de Cobranza (005-clientes-cobranza-expedientes US2): cargo
 * pendiente, pago parcial que genera recibo automático sin cambiar el estado,
 * pago que completa el saldo y cambia el cargo a "pagado", y el bloqueo de
 * cargos para clientes inactivos. Se omite si no hay Supabase local accesible.
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

describe.skipIf(!reachable)('Cobranza (integración, 005-clientes-cobranza-expedientes US2)', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let testUserId: string
  let clienteActivoId: string
  let clienteInactivoId: string
  let transferenciaId: string
  let cargoId: string
  const testUserEmail = `integration-cobranza-${Date.now()}@example.com`

  beforeAll(async () => {
    const { data: userData, error: userError } = await admin.auth.admin.createUser({
      email: testUserEmail,
      password: 'Integration-Test-Pass1!',
      email_confirm: true,
    })
    if (userError || !userData.user)
      throw userError ?? new Error('No se pudo crear el usuario de prueba')
    testUserId = userData.user.id

    const { data: clienteActivo, error: clienteActivoError } = await admin
      .from('clientes')
      .insert({
        nombre: 'Cliente Cobranza Activo',
        tipo_persona: 'moral',
        rfc: `CBZ${Date.now().toString().slice(-6)}AA1`,
        regimen_fiscal_codigo: '601',
        correo: 'cobranza-activo@ejemplo.com',
        created_by: testUserId,
        updated_by: testUserId,
      })
      .select()
      .single()
    if (clienteActivoError || !clienteActivo)
      throw clienteActivoError ?? new Error('No se pudo crear el cliente activo de prueba')
    clienteActivoId = clienteActivo.id

    const { data: clienteInactivo, error: clienteInactivoError } = await admin
      .from('clientes')
      .insert({
        nombre: 'Cliente Cobranza Inactivo',
        tipo_persona: 'moral',
        rfc: `CBZ${Date.now().toString().slice(-6)}AA2`,
        regimen_fiscal_codigo: '601',
        correo: 'cobranza-inactivo@ejemplo.com',
        estado: 'inactivo',
        created_by: testUserId,
        updated_by: testUserId,
      })
      .select()
      .single()
    if (clienteInactivoError || !clienteInactivo)
      throw clienteInactivoError ?? new Error('No se pudo crear el cliente inactivo de prueba')
    clienteInactivoId = clienteInactivo.id

    const { data: metodo, error: metodoError } = await admin
      .from('metodos_pago')
      .select('id')
      .eq('nombre', 'transferencia')
      .single()
    if (metodoError || !metodo)
      throw metodoError ?? new Error('No se encontró el método de pago sembrado')
    transferenciaId = metodo.id
  })

  afterAll(async () => {
    if (cargoId) await admin.from('cargo_pagos').delete().eq('cargo_id', cargoId)
    if (clienteActivoId) {
      await admin.from('recibos').delete().eq('cliente_id', clienteActivoId)
      await admin.from('pagos').delete().eq('cliente_id', clienteActivoId)
      await admin.from('cargos_cobranza').delete().eq('cliente_id', clienteActivoId)
      await admin.from('clientes').delete().eq('id', clienteActivoId)
    }
    if (clienteInactivoId) await admin.from('clientes').delete().eq('id', clienteInactivoId)
    if (testUserId) await admin.auth.admin.deleteUser(testUserId)
  })

  it('un cargo nuevo queda "pendiente" (FR-005)', async () => {
    const { data, error } = await admin
      .from('cargos_cobranza')
      .insert({
        cliente_id: clienteActivoId,
        periodo_mes: 7,
        periodo_anio: 2026,
        concepto: 'Honorarios julio',
        monto: 1500,
        fecha_vencimiento: '2026-08-05',
        created_by: testUserId,
        updated_by: testUserId,
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data?.estado).toBe('pendiente')
    cargoId = data?.id
  })

  it('registrar un cargo para un cliente inactivo falla (FR-009)', async () => {
    const { error } = await admin.from('cargos_cobranza').insert({
      cliente_id: clienteInactivoId,
      periodo_mes: 7,
      periodo_anio: 2026,
      concepto: 'Honorarios julio',
      monto: 1500,
      fecha_vencimiento: '2026-08-05',
      created_by: testUserId,
      updated_by: testUserId,
    })
    expect(error).not.toBeNull()
  })

  it('un pago parcial no cambia el estado a "pagado" pero genera un recibo con el concepto (FR-008, FR-025)', async () => {
    const { data: pago, error: pagoError } = await admin
      .from('pagos')
      .insert({
        cliente_id: clienteActivoId,
        monto: 500,
        metodo_pago_id: transferenciaId,
        created_by: testUserId,
        updated_by: testUserId,
      })
      .select()
      .single()
    expect(pagoError).toBeNull()

    const { error: cargoPagoError } = await admin
      .from('cargo_pagos')
      .insert({ cargo_id: cargoId, pago_id: pago!.id, monto_aplicado: 500 })
    expect(cargoPagoError).toBeNull()

    const { data: cargo, error: cargoError } = await admin
      .from('cargos_cobranza')
      .select('estado')
      .eq('id', cargoId)
      .single()
    expect(cargoError).toBeNull()
    expect(cargo?.estado).toBe('pendiente')

    const { data: recibo, error: reciboError } = await admin
      .from('recibos')
      .select('concepto, monto')
      .eq('pago_id', pago!.id)
      .single()
    expect(reciboError).toBeNull()
    expect(recibo?.concepto).toBe('Honorarios julio')
    expect(Number(recibo?.monto)).toBe(500)
  })

  it('un segundo pago que cubre el saldo restante cambia el cargo a "pagado" y genera un segundo recibo (FR-005, FR-008)', async () => {
    const { data: pago, error: pagoError } = await admin
      .from('pagos')
      .insert({
        cliente_id: clienteActivoId,
        monto: 1000,
        metodo_pago_id: transferenciaId,
        created_by: testUserId,
        updated_by: testUserId,
      })
      .select()
      .single()
    expect(pagoError).toBeNull()

    const { error: cargoPagoError } = await admin
      .from('cargo_pagos')
      .insert({ cargo_id: cargoId, pago_id: pago!.id, monto_aplicado: 1000 })
    expect(cargoPagoError).toBeNull()

    const { data: cargo, error: cargoError } = await admin
      .from('cargos_cobranza')
      .select('estado')
      .eq('id', cargoId)
      .single()
    expect(cargoError).toBeNull()
    expect(cargo?.estado).toBe('pagado')

    const { data: recibos, error: recibosError } = await admin
      .from('recibos')
      .select('id')
      .eq('cliente_id', clienteActivoId)
    expect(recibosError).toBeNull()
    expect(recibos).toHaveLength(2)
  })
})
