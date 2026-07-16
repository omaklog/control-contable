import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Prueba de integración contra un Supabase local real — verifica que el
 * concepto de un Recibo ya emitido es inmutable: editar el concepto del
 * Cargo original después de emitirse el recibo no lo modifica (005-clientes-
 * cobranza-expedientes US2, FR-025, Decisión 9). Se omite si no hay Supabase
 * local accesible.
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
  'Concepto de Recibo inmutable (integración, 005-clientes-cobranza-expedientes US2)',
  () => {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let testUserId: string
    let clienteId: string
    let cargoId: string
    let pagoId: string
    const testUserEmail = `integration-recibo-concepto-${Date.now()}@example.com`

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
          nombre: 'Cliente Recibo Concepto',
          tipo_persona: 'moral',
          rfc: `RCB${Date.now().toString().slice(-6)}AA1`,
          regimen_fiscal_codigo: '601',
          correo: 'recibo-concepto@ejemplo.com',
          created_by: testUserId,
          updated_by: testUserId,
        })
        .select()
        .single()
      if (clienteError || !cliente)
        throw clienteError ?? new Error('No se pudo crear el cliente de prueba')
      clienteId = cliente.id

      const { data: cargo, error: cargoError } = await admin
        .from('cargos_cobranza')
        .insert({
          cliente_id: clienteId,
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
      if (cargoError || !cargo) throw cargoError ?? new Error('No se pudo crear el cargo de prueba')
      cargoId = cargo.id

      const { data: metodo } = await admin
        .from('metodos_pago')
        .select('id')
        .eq('nombre', 'efectivo')
        .single()

      const { data: pago, error: pagoError } = await admin
        .from('pagos')
        .insert({
          cliente_id: clienteId,
          monto: 1500,
          metodo_pago_id: metodo!.id,
          created_by: testUserId,
          updated_by: testUserId,
        })
        .select()
        .single()
      if (pagoError || !pago) throw pagoError ?? new Error('No se pudo crear el pago de prueba')
      pagoId = pago.id

      const { error: cargoPagoError } = await admin
        .from('cargo_pagos')
        .insert({ cargo_id: cargoId, pago_id: pagoId, monto_aplicado: 1500 })
      if (cargoPagoError) throw cargoPagoError
    })

    afterAll(async () => {
      if (cargoId) await admin.from('cargo_pagos').delete().eq('cargo_id', cargoId)
      if (pagoId) await admin.from('recibos').delete().eq('pago_id', pagoId)
      if (pagoId) await admin.from('pagos').delete().eq('id', pagoId)
      if (cargoId) await admin.from('cargos_cobranza').delete().eq('id', cargoId)
      if (clienteId) await admin.from('clientes').delete().eq('id', clienteId)
      if (testUserId) await admin.auth.admin.deleteUser(testUserId)
    })

    it('editar el concepto del Cargo original después de emitido el recibo no lo modifica (FR-025)', async () => {
      const { data: reciboAntes } = await admin
        .from('recibos')
        .select('concepto')
        .eq('pago_id', pagoId)
        .single()
      expect(reciboAntes?.concepto).toBe('Honorarios julio')

      const { error: updateError } = await admin
        .from('cargos_cobranza')
        .update({ concepto: 'Honorarios julio (corregido)' })
        .eq('id', cargoId)
      expect(updateError).toBeNull()

      const { data: reciboDespues, error: reciboDespuesError } = await admin
        .from('recibos')
        .select('concepto')
        .eq('pago_id', pagoId)
        .single()
      expect(reciboDespuesError).toBeNull()
      expect(reciboDespues?.concepto).toBe('Honorarios julio')
    })
  },
)
