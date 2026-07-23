import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { notFound } from 'next/navigation'

import { CobranzaDetalleClient, type ComprobanteRow } from './CobranzaDetalleClient'
import {
  adjuntarComprobante,
  cancelarCobranza,
  eliminarCobranza,
  eliminarComprobante,
  eliminarPago,
  modificarPago,
  registrarPago,
  revertirPago,
} from './actions'

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
      .select(
        'id, monto, fecha_pago, comentario, metodo_pago_id, estado, motivo_reversion, created_at, metodos_pago(nombre)',
      )
      .eq('cobranza_id', cobranzaId)
      .order('fecha_pago', { ascending: true }),
    supabase
      .from('metodos_pago')
      .select('id, nombre')
      .eq('activo', true)
      .order('nombre', { ascending: true }),
  ])

  const pagoIds = (pagosData ?? []).map((row) => row.id)
  const { data: comprobantesData } =
    pagoIds.length > 0
      ? await supabase
          .from('comprobantes_pago')
          .select('id, pago_id, nombre_original, tipo_archivo, tamano_bytes, ruta_almacenamiento')
          .in('pago_id', pagoIds)
          .order('created_at', { ascending: true })
      : { data: [] }

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

  const comprobantesPorPago = new Map<string, ComprobanteRow[]>()
  for (const row of comprobantesData ?? []) {
    const lista = comprobantesPorPago.get(row.pago_id) ?? []
    lista.push({
      id: row.id,
      nombreOriginal: row.nombre_original,
      tipoArchivo: row.tipo_archivo,
      tamanoBytes: row.tamano_bytes,
      rutaAlmacenamiento: row.ruta_almacenamiento,
    })
    comprobantesPorPago.set(row.pago_id, lista)
  }

  const pagos = (pagosData ?? []).map((row) => ({
    id: row.id,
    monto: row.monto,
    fechaPago: row.fecha_pago,
    metodoPagoId: row.metodo_pago_id,
    comentario: row.comentario,
    metodoPagoNombre: row.metodos_pago?.nombre ?? '',
    estado: row.estado as 'activo' | 'revertido' | 'eliminado',
    motivoReversion: row.motivo_reversion,
    comprobantes: comprobantesPorPago.get(row.id) ?? [],
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
        onModificarPago={(pagoId, values) => modificarPago(cobranzaId, pagoId, values)}
        onRevertirPago={(pagoId, motivo) => revertirPago(cobranzaId, pagoId, motivo)}
        onEliminarPago={(pagoId) => eliminarPago(cobranzaId, pagoId)}
        onAdjuntarComprobante={(pagoId, formData) =>
          adjuntarComprobante(cobranzaId, pagoId, formData)
        }
        onEliminarComprobante={(comprobanteId, ruta) =>
          eliminarComprobante(cobranzaId, comprobanteId, ruta)
        }
      />
    </Container>
  )
}
