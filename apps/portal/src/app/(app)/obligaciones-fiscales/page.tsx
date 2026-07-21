import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

import { ObligacionesFiscalesClient } from './ObligacionesFiscalesClient'

const CUMPLIMIENTOS_POR_PAGINA = 20

/**
 * Historia 1 de 015-control-cumplimiento-fiscal: bandeja operativa cruzada
 * entre clientes — primera pantalla del sistema que no vive anidada en el
 * detalle de un cliente (plan.md, Structure Decision). "Vencida" se calcula
 * aquí (estado en pendiente/en_proceso + fecha_limite pasada), nunca se lee
 * de la base de datos (Clarifications, FR-004/FR-005).
 */
export default async function ObligacionesFiscalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    cliente?: string
    rfc?: string
    obligacion?: string
    periodo?: string
    estado?: string
    responsable?: string
  }>
}) {
  const currentProfile = await requireCapability('view_clients')
  const supabase = await createServerSupabaseClient()

  const params = await searchParams
  const paginaActual = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)
  const filtroCliente = params.cliente?.trim().toLowerCase() ?? ''
  const filtroRfc = params.rfc?.trim().toLowerCase() ?? ''
  const filtroObligacion = params.obligacion?.trim().toLowerCase() ?? ''
  const filtroPeriodo = params.periodo?.trim().toLowerCase() ?? ''
  const filtroEstado = params.estado?.trim() ?? ''
  const filtroResponsable = params.responsable?.trim().toLowerCase() ?? ''

  const [
    { data: clientesActivosData },
    { data: obligacionesActivasData },
    { data: responsablesActivosData },
  ] = await Promise.all([
    supabase
      .from('clientes')
      .select('id, nombre, rfc')
      .eq('estado', 'activo')
      .order('nombre', { ascending: true }),
    supabase
      .from('obligaciones_fiscales')
      .select('id, nombre')
      .eq('estado', 'activo')
      .order('nombre', { ascending: true }),
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('is_active', true)
      .order('full_name', { ascending: true }),
  ])

  const { data: cumplimientosData } = await supabase
    .from('cumplimientos_fiscales')
    .select(
      `id, cliente_id, periodo_etiqueta, periodo_inicio, fecha_limite, estado, responsable_id, es_extraordinario, descripcion,
       clientes(nombre, rfc),
       obligaciones_fiscales_cliente(obligaciones_fiscales(nombre)),
       obligaciones_fiscales(nombre),
       cumplimiento_fiscal_documentos(id)`,
    )
    .order('fecha_limite', { ascending: true })

  const responsableIds = Array.from(
    new Set((cumplimientosData ?? []).map((row) => row.responsable_id).filter(Boolean)),
  ) as string[]

  const { data: responsablesData } =
    responsableIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', responsableIds)
      : { data: [] as { id: string; full_name: string | null }[] }
  const nombrePorResponsableId = new Map(
    (responsablesData ?? []).map((row) => [row.id, row.full_name ?? '']),
  )

  const hoy = new Date().toISOString().slice(0, 10)

  const todos = (cumplimientosData ?? []).map((row) => {
    const vencida =
      (row.estado === 'pendiente' || row.estado === 'en_proceso') && row.fecha_limite < hoy
    return {
      id: row.id,
      clienteId: row.cliente_id,
      clienteNombre: row.clientes?.nombre ?? '',
      clienteRfc: row.clientes?.rfc ?? '',
      obligacionNombre:
        row.obligaciones_fiscales_cliente?.obligaciones_fiscales?.nombre ??
        row.obligaciones_fiscales?.nombre ??
        row.descripcion ??
        '',
      periodoEtiqueta: row.periodo_etiqueta,
      periodoInicio: row.periodo_inicio,
      fechaLimite: row.fecha_limite,
      estado: row.estado,
      vencida,
      responsableId: row.responsable_id,
      responsableNombre: row.responsable_id
        ? (nombrePorResponsableId.get(row.responsable_id) ?? '')
        : '',
      esExtraordinario: row.es_extraordinario,
      totalDocumentos: row.cumplimiento_fiscal_documentos?.length ?? 0,
    }
  })

  const filtrados = todos.filter((c) => {
    if (filtroCliente && !c.clienteNombre.toLowerCase().includes(filtroCliente)) return false
    if (filtroRfc && !c.clienteRfc.toLowerCase().includes(filtroRfc)) return false
    if (filtroObligacion && !c.obligacionNombre.toLowerCase().includes(filtroObligacion))
      return false
    if (filtroPeriodo && !c.periodoEtiqueta.toLowerCase().includes(filtroPeriodo)) return false
    if (filtroResponsable && !c.responsableNombre.toLowerCase().includes(filtroResponsable))
      return false
    if (filtroEstado === 'vencida') return c.vencida
    if (filtroEstado) return !c.vencida && c.estado === filtroEstado
    return true
  })

  const ordenados = [...filtrados].sort((a, b) => {
    if (a.vencida !== b.vencida) return a.vencida ? -1 : 1
    return a.fechaLimite < b.fechaLimite ? -1 : a.fechaLimite > b.fechaLimite ? 1 : 0
  })

  const totalPaginas = Math.max(1, Math.ceil(ordenados.length / CUMPLIMIENTOS_POR_PAGINA))
  const desde = (paginaActual - 1) * CUMPLIMIENTOS_POR_PAGINA
  const cumplimientos = ordenados.slice(desde, desde + CUMPLIMIENTOS_POR_PAGINA)

  const canManage = currentProfile.capabilities.includes('manage_clients')

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Obligaciones Fiscales
      </Typography>
      <ObligacionesFiscalesClient
        cumplimientos={cumplimientos}
        clientesActivos={clientesActivosData ?? []}
        obligacionesActivas={obligacionesActivasData ?? []}
        responsablesActivos={(responsablesActivosData ?? []).map((row) => ({
          id: row.id,
          nombre: row.full_name ?? '',
        }))}
        totalPaginas={totalPaginas}
        paginaActual={paginaActual}
        cliente={params.cliente ?? ''}
        rfc={params.rfc ?? ''}
        obligacion={params.obligacion ?? ''}
        periodo={params.periodo ?? ''}
        estado={filtroEstado}
        responsable={params.responsable ?? ''}
        canManage={canManage}
      />
    </Container>
  )
}
