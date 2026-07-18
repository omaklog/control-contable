import { createClient } from '@supabase/supabase-js'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Pruebas de integración contra un Supabase local real — verifican las
 * reglas centrales de Servicios Contratados (011-gestion-servicios):
 * unicidad por cliente+servicio sin importar el estado (FR-005, Historia 2),
 * que un cambio de precio no altera el historial ya generado (FR-006,
 * Historia 3), el ciclo completo de estados sobre el mismo registro
 * (Clarifications Q1, Historia 4), y que cada tipo de cambio se registra
 * como un evento de auditoría distinguible (research.md #6, Historia 5). Se
 * omiten automáticamente si no hay un Supabase local accesible.
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

describe.skipIf(!reachable)('Servicios Contratados (integración, 011-gestion-servicios)', () => {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  let testUserId: string
  let clienteId: string
  let servicioId: string
  const testUserEmail = `integration-servicioscontratados-${Date.now()}@example.com`

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
        nombre: 'Cliente con Servicios Contratados',
        tipo_persona: 'moral',
        rfc: `SVC${Date.now().toString().slice(-6)}AA1`,
        regimen_fiscal_codigo: '601',
        correo: 'servicios-contratados@ejemplo.com',
        created_by: testUserId,
        updated_by: testUserId,
      })
      .select('id')
      .single()
    if (clienteError || !cliente)
      throw clienteError ?? new Error('No se pudo crear el cliente de prueba')
    clienteId = cliente.id

    const { data: servicio, error: servicioError } = await admin
      .from('servicios')
      .insert({
        nombre: 'Servicio de prueba (contratado)',
        categoria: 'Pruebas',
        created_by: testUserId,
        updated_by: testUserId,
      })
      .select('id')
      .single()
    if (servicioError || !servicio)
      throw servicioError ?? new Error('No se pudo crear el servicio de prueba')
    servicioId = servicio.id
  })

  afterAll(async () => {
    if (clienteId) await admin.from('clientes').delete().eq('id', clienteId)
    if (testUserId) await admin.auth.admin.deleteUser(testUserId)
  })

  it('rechaza un segundo servicio contratado para el mismo cliente+servicio (FR-005)', async () => {
    const { data: primero, error: primerError } = await admin
      .from('servicios_contratados')
      .insert({
        cliente_id: clienteId,
        servicio_id: servicioId,
        precio_acordado: 1000,
        created_by: testUserId,
        updated_by: testUserId,
      })
      .select('id')
      .single()
    expect(primerError).toBeNull()
    expect(primero).not.toBeNull()

    const { error: duplicadoError } = await admin.from('servicios_contratados').insert({
      cliente_id: clienteId,
      servicio_id: servicioId,
      precio_acordado: 2000,
      created_by: testUserId,
      updated_by: testUserId,
    })
    expect(duplicadoError).not.toBeNull()
    expect(duplicadoError?.message).toContain('servicios_contratados_cliente_servicio_unique')

    await admin.from('servicios_contratados').delete().eq('id', primero!.id)
  })

  it('registra un evento de alta, y un cambio de precio conserva el valor anterior sin alterar la historia previa (FR-006/FR-007)', async () => {
    const { data: contratado, error: insertError } = await admin
      .from('servicios_contratados')
      .insert({
        cliente_id: clienteId,
        servicio_id: servicioId,
        precio_acordado: 4500,
        created_by: testUserId,
        updated_by: testUserId,
      })
      .select('id')
      .single()
    expect(insertError).toBeNull()
    const servicioContratadoId = contratado!.id

    const { error: updateError } = await admin
      .from('servicios_contratados')
      .update({ precio_acordado: 5000, updated_by: testUserId })
      .eq('id', servicioContratadoId)
    expect(updateError).toBeNull()

    const { data: eventos, error: eventosError } = await admin
      .from('business_audit_log')
      .select('accion, detalle')
      .eq('entidad', 'servicio_contratado')
      .eq('entidad_id', servicioContratadoId)
      .order('creado_en', { ascending: true })
    expect(eventosError).toBeNull()

    const alta = eventos?.find((e) => e.accion === 'alta')
    expect(alta).toBeTruthy()

    const cambioPrecio = eventos?.find((e) => e.accion === 'cambio_precio')
    expect(cambioPrecio).toBeTruthy()
    expect((cambioPrecio?.detalle as { precio_anterior: number }).precio_anterior).toBe(4500)
    expect((cambioPrecio?.detalle as { precio_nuevo: number }).precio_nuevo).toBe(5000)

    await admin.from('servicios_contratados').delete().eq('id', servicioContratadoId)
  })

  it('ciclo completo activo→suspendido→finalizado→activo permanece sobre el mismo registro (Clarifications Q1)', async () => {
    const { data: contratado, error: insertError } = await admin
      .from('servicios_contratados')
      .insert({
        cliente_id: clienteId,
        servicio_id: servicioId,
        precio_acordado: 3000,
        fecha_inicio: '2026-01-01',
        created_by: testUserId,
        updated_by: testUserId,
      })
      .select('id, fecha_inicio')
      .single()
    expect(insertError).toBeNull()
    const servicioContratadoId = contratado!.id
    const fechaInicioOriginal = contratado!.fecha_inicio

    const { error: suspenderError } = await admin
      .from('servicios_contratados')
      .update({ estado: 'suspendido' })
      .eq('id', servicioContratadoId)
    expect(suspenderError).toBeNull()

    const { error: finalizarError } = await admin
      .from('servicios_contratados')
      .update({ estado: 'finalizado', fecha_fin: '2026-06-01' })
      .eq('id', servicioContratadoId)
    expect(finalizarError).toBeNull()

    const { error: reactivarError } = await admin
      .from('servicios_contratados')
      .update({ estado: 'activo', fecha_fin: null })
      .eq('id', servicioContratadoId)
    expect(reactivarError).toBeNull()

    const { data: final, error: selectError } = await admin
      .from('servicios_contratados')
      .select('id, estado, fecha_fin, fecha_inicio')
      .eq('id', servicioContratadoId)
      .single()
    expect(selectError).toBeNull()
    expect(final?.id).toBe(servicioContratadoId)
    expect(final?.estado).toBe('activo')
    expect(final?.fecha_fin).toBeNull()
    expect(final?.fecha_inicio).toBe(fechaInicioOriginal)

    const { data: eventos, error: eventosError } = await admin
      .from('business_audit_log')
      .select('accion')
      .eq('entidad', 'servicio_contratado')
      .eq('entidad_id', servicioContratadoId)
      .order('creado_en', { ascending: true })
    expect(eventosError).toBeNull()
    const acciones = (eventos ?? []).map((e) => e.accion)
    expect(acciones).toEqual(['alta', 'suspension', 'finalizacion', 'reactivacion'])

    await admin.from('servicios_contratados').delete().eq('id', servicioContratadoId)
  })

  it('no permite asignar un servicio del catálogo que está inactivo (FR-004)', async () => {
    const { data: servicioInactivo, error: servicioError } = await admin
      .from('servicios')
      .insert({
        nombre: 'Servicio inactivo de prueba',
        categoria: 'Pruebas',
        estado: 'inactivo',
        created_by: testUserId,
        updated_by: testUserId,
      })
      .select('id')
      .single()
    expect(servicioError).toBeNull()

    const { error: insertError } = await admin.from('servicios_contratados').insert({
      cliente_id: clienteId,
      servicio_id: servicioInactivo!.id,
      precio_acordado: 1000,
      created_by: testUserId,
      updated_by: testUserId,
    })
    expect(insertError).not.toBeNull()

    await admin.from('servicios').delete().eq('id', servicioInactivo!.id)
  })
})
