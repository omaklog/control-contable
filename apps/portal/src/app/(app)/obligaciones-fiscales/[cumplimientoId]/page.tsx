import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { notFound } from 'next/navigation'

import { CumplimientoDetalleClient } from './CumplimientoDetalleClient'

/**
 * Detalle de un Cumplimiento Fiscal (015-control-cumplimiento-fiscal,
 * Historias 2, 3 y 5): cambiar estado, fecha límite y responsable, asociar
 * documentos del Expediente Fiscal del mismo cliente, y consultar el
 * historial de cambios.
 */
export default async function CumplimientoDetallePage({
  params,
}: {
  params: Promise<{ cumplimientoId: string }>
}) {
  const currentProfile = await requireCapability('view_clients')
  const supabase = await createServerSupabaseClient()
  const { cumplimientoId } = await params

  const { data: cumplimientoData } = await supabase
    .from('cumplimientos_fiscales')
    .select(
      `id, cliente_id, descripcion, periodo_etiqueta, periodo_inicio, periodo_fin, fecha_limite, estado, responsable_id, es_extraordinario,
       clientes(nombre, rfc),
       obligaciones_fiscales_cliente(obligaciones_fiscales(nombre)),
       obligaciones_fiscales(nombre)`,
    )
    .eq('id', cumplimientoId)
    .maybeSingle()

  if (!cumplimientoData) {
    notFound()
  }

  const [
    { data: documentosAsociadosData },
    { data: documentosClienteData },
    { data: responsablesData },
  ] = await Promise.all([
    supabase
      .from('cumplimiento_fiscal_documentos')
      .select('id, documento_id, es_acuse, documentos(nombre_original)')
      .eq('cumplimiento_id', cumplimientoId),
    supabase
      .from('documentos')
      .select('id, nombre_original')
      .eq('cliente_id', cumplimientoData.cliente_id)
      .eq('estado', 'activo')
      .order('nombre_original', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name', { ascending: true }),
  ])

  const responsableIds = cumplimientoData.responsable_id ? [cumplimientoData.responsable_id] : []
  const { data: responsableActualData } =
    responsableIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', responsableIds)
      : { data: [] as { id: string; full_name: string | null }[] }

  const cumplimiento = {
    id: cumplimientoData.id,
    clienteId: cumplimientoData.cliente_id,
    clienteNombre: cumplimientoData.clientes?.nombre ?? '',
    clienteRfc: cumplimientoData.clientes?.rfc ?? '',
    obligacionNombre:
      cumplimientoData.obligaciones_fiscales_cliente?.obligaciones_fiscales?.nombre ??
      cumplimientoData.obligaciones_fiscales?.nombre ??
      cumplimientoData.descripcion ??
      '',
    descripcion: cumplimientoData.descripcion,
    periodoEtiqueta: cumplimientoData.periodo_etiqueta,
    fechaLimite: cumplimientoData.fecha_limite,
    estado: cumplimientoData.estado,
    vencida:
      (cumplimientoData.estado === 'pendiente' || cumplimientoData.estado === 'en_proceso') &&
      cumplimientoData.fecha_limite < new Date().toISOString().slice(0, 10),
    responsableId: cumplimientoData.responsable_id,
    responsableNombre: responsableActualData?.[0]?.full_name ?? '',
    esExtraordinario: cumplimientoData.es_extraordinario,
  }

  const documentosAsociados = (documentosAsociadosData ?? []).map((row) => ({
    id: row.id,
    documentoId: row.documento_id,
    nombreOriginal: row.documentos?.nombre_original ?? '',
    esAcuse: row.es_acuse,
  }))

  const documentosDisponibles = (documentosClienteData ?? [])
    .filter((doc) => !documentosAsociados.some((asociado) => asociado.documentoId === doc.id))
    .map((doc) => ({ id: doc.id, nombre: doc.nombre_original }))

  const responsablesDisponibles = (responsablesData ?? []).map((row) => ({
    id: row.id,
    nombre: row.full_name ?? '',
  }))

  const canManage = currentProfile.capabilities.includes('manage_clients')

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {cumplimiento.clienteNombre} — {cumplimiento.obligacionNombre}
      </Typography>
      <CumplimientoDetalleClient
        cumplimiento={cumplimiento}
        documentosAsociados={documentosAsociados}
        documentosDisponibles={documentosDisponibles}
        responsablesDisponibles={responsablesDisponibles}
        canManage={canManage}
      />
    </Container>
  )
}
