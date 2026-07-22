import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { notFound } from 'next/navigation'

import { CobranzaDetalleClient } from './CobranzaDetalleClient'
import { cancelarCobranza, eliminarCobranza, registrarPago } from './actions'

/**
 * Detalle de una Cobranza (017-cobranza, US2): conceptos, pagos, saldo y
 * estados — estos últimos siempre leídos de `cobranzas_resumen`, nunca
 * recalculados en esta página (contracts/db-functions-rls.md Sección H).
 */
export default async function CobranzaDetallePage({
  params,
}: {
  params: Promise<{ cobranzaId: string }>
}) {
  const currentProfile = await requireCapability('view_billing')
  const supabase = await createServerSupabaseClient()
  const { cobranzaId } = await params

  const { data: resumen } = await supabase
    .from('cobranzas_resumen')
    .select('*')
    .eq('id', cobranzaId)
    .maybeSingle()

  if (!resumen) {
    notFound()
  }

  const [
    { data: clienteData },
    { data: conceptosData },
    { data: pagosData },
    { data: metodosData },
  ] = await Promise.all([
    supabase.from('clientes').select('nombre, rfc').eq('id', resumen.cliente_id!).single(),
    supabase
      .from('conceptos_cobranza')
      .select('id, descripcion, monto, tipo, fecha_incorporacion')
      .eq('cobranza_id', cobranzaId)
      .order('fecha_incorporacion', { ascending: true }),
    supabase
      .from('pagos')
      .select('id, monto, fecha_pago, comentario, created_at, metodos_pago(nombre)')
      .eq('cobranza_id', cobranzaId)
      .order('fecha_pago', { ascending: true }),
    supabase
      .from('metodos_pago')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre', { ascending: true }),
  ])

  const cobranza = {
    id: resumen.id!,
    clienteNombre: clienteData?.nombre ?? '',
    clienteRfc: clienteData?.rfc ?? '',
    periodoMes: resumen.periodo_mes ?? 0,
    periodoAnio: resumen.periodo_anio ?? 0,
    fechaLimite: resumen.fecha_limite ?? '',
    estado: resumen.estado as 'vigente' | 'cancelada' | 'eliminada',
    totalConceptos: resumen.total_conceptos ?? 0,
    totalPagado: resumen.total_pagado ?? 0,
    saldo: resumen.saldo ?? 0,
    estadoPago: (resumen.estado_pago ?? 'pendiente') as 'pendiente' | 'parcial' | 'pagada',
    estadoVencimiento: (resumen.estado_vencimiento ?? 'vigente') as 'vigente' | 'vencida',
  }

  const conceptos = (conceptosData ?? []).map((row) => ({
    id: row.id,
    descripcion: row.descripcion,
    monto: row.monto,
    tipo: row.tipo,
    fechaIncorporacion: row.fecha_incorporacion,
  }))

  const pagos = (pagosData ?? []).map((row) => ({
    id: row.id,
    monto: row.monto,
    fechaPago: row.fecha_pago,
    comentario: row.comentario,
    metodoPagoNombre: row.metodos_pago?.nombre ?? '',
  }))

  const metodosPagoDisponibles = (metodosData ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
  }))

  const canManage = currentProfile.capabilities.includes('manage_billing')

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {cobranza.clienteNombre} — {cobranza.periodoMes}/{cobranza.periodoAnio}
      </Typography>
      <CobranzaDetalleClient
        cobranza={cobranza}
        conceptos={conceptos}
        pagos={pagos}
        metodosPagoDisponibles={metodosPagoDisponibles}
        canManage={canManage}
        onRegistrarPago={registrarPago.bind(null, cobranzaId)}
        onEliminarCobranza={eliminarCobranza.bind(null, cobranzaId)}
        onCancelarCobranza={cancelarCobranza.bind(null, cobranzaId)}
      />
    </Container>
  )
}
