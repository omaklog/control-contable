import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import { calcularTotalPaginas } from '@control-contable/utils'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

import { PagosClient } from './PagosClient'

const PAGOS_POR_PAGINA = 20

/**
 * Vista global de pagos (018-gestion-pagos, US5, FR-017/FR-018): consulta
 * independiente de la navegación por cobranza, con filtros combinables
 * (cliente, RFC, fecha de pago, método, estado, cobranza, usuario que
 * registró). El filtro de estado por defecto es "activo" — ampliable por el
 * usuario. Filtra/pagina en JS sobre el conjunto ya acotado por RLS, mismo
 * patrón que `cobranza/page.tsx` (017).
 */
export default async function PagosPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    cliente?: string
    rfc?: string
    fechaInicial?: string
    fechaFinal?: string
    metodoPagoId?: string
    estado?: string
    periodo?: string
    usuario?: string
  }>
}) {
  await requireCapability('view_billing')
  const supabase = await createServerSupabaseClient()

  const params = await searchParams
  const paginaActual = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)
  const filtroCliente = params.cliente?.trim().toLowerCase() ?? ''
  const filtroRfc = params.rfc?.trim().toLowerCase() ?? ''
  const filtroFechaInicial = params.fechaInicial?.trim() ?? ''
  const filtroFechaFinal = params.fechaFinal?.trim() ?? ''
  const filtroMetodoPagoId = params.metodoPagoId?.trim() ?? ''
  const filtroEstado = params.estado?.trim() || 'activo'
  const filtroPeriodo = params.periodo?.trim().toLowerCase() ?? ''
  const filtroUsuario = params.usuario?.trim().toLowerCase() ?? ''

  const [{ data: pagosData }, { data: metodosData }] = await Promise.all([
    supabase
      .from('pagos')
      .select(
        'id, monto, fecha_pago, comentario, estado, metodo_pago_id, created_by, metodos_pago(nombre), cobranzas(id, cliente_id, periodo_mes, periodo_anio)',
      )
      .order('fecha_pago', { ascending: false }),
    supabase.from('metodos_pago').select('id, nombre').order('nombre', { ascending: true }),
  ])

  const clienteIds = Array.from(
    new Set(
      (pagosData ?? [])
        .map((row) => row.cobranzas?.cliente_id)
        .filter((id): id is string => Boolean(id)),
    ),
  )
  const usuarioIds = Array.from(
    new Set(
      (pagosData ?? []).map((row) => row.created_by).filter((id): id is string => Boolean(id)),
    ),
  )

  const [{ data: clientesData }, { data: perfilesData }] = await Promise.all([
    clienteIds.length > 0
      ? supabase.from('clientes').select('id, nombre, rfc').in('id', clienteIds)
      : Promise.resolve({ data: [] as { id: string; nombre: string; rfc: string }[] }),
    usuarioIds.length > 0
      ? supabase.from('profiles').select('id, full_name').in('id', usuarioIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string | null }[] }),
  ])

  const clientePorId = new Map((clientesData ?? []).map((row) => [row.id, row]))
  const perfilPorId = new Map((perfilesData ?? []).map((row) => [row.id, row]))

  const todos = (pagosData ?? [])
    .filter((row) => row.cobranzas?.cliente_id)
    .map((row) => {
      const cliente = clientePorId.get(row.cobranzas!.cliente_id)
      const perfil = row.created_by ? perfilPorId.get(row.created_by) : undefined
      return {
        id: row.id,
        clienteNombre: cliente?.nombre ?? '',
        clienteRfc: cliente?.rfc ?? '',
        cobranzaId: row.cobranzas!.id,
        periodoMes: row.cobranzas!.periodo_mes,
        periodoAnio: row.cobranzas!.periodo_anio,
        fechaPago: row.fecha_pago,
        metodoPagoId: row.metodo_pago_id,
        metodoPagoNombre: row.metodos_pago?.nombre ?? '',
        monto: row.monto,
        comentario: row.comentario,
        estado: row.estado as 'activo' | 'revertido' | 'eliminado',
        usuarioNombre: perfil?.full_name ?? '',
      }
    })

  const filtrados = todos.filter((pago) => {
    if (filtroCliente && !pago.clienteNombre.toLowerCase().includes(filtroCliente)) return false
    if (filtroRfc && !pago.clienteRfc.toLowerCase().includes(filtroRfc)) return false
    if (filtroFechaInicial && pago.fechaPago.slice(0, 10) < filtroFechaInicial) return false
    if (filtroFechaFinal && pago.fechaPago.slice(0, 10) > filtroFechaFinal) return false
    if (filtroMetodoPagoId && pago.metodoPagoId !== filtroMetodoPagoId) return false
    if (filtroEstado && filtroEstado !== 'todos' && pago.estado !== filtroEstado) return false
    if (
      filtroPeriodo &&
      !`${pago.periodoMes}/${pago.periodoAnio}`.includes(filtroPeriodo) &&
      !`${pago.clienteNombre}`.toLowerCase().includes(filtroPeriodo)
    )
      return false
    if (filtroUsuario && !pago.usuarioNombre.toLowerCase().includes(filtroUsuario)) return false
    return true
  })

  const totalPaginas = calcularTotalPaginas(filtrados.length, PAGOS_POR_PAGINA)
  const desde = (paginaActual - 1) * PAGOS_POR_PAGINA
  const pagos = filtrados.slice(desde, desde + PAGOS_POR_PAGINA)

  const metodosPago = (metodosData ?? []).map((row) => ({ id: row.id, nombre: row.nombre }))

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Pagos
      </Typography>
      <PagosClient
        pagos={pagos}
        metodosPago={metodosPago}
        totalPaginas={totalPaginas}
        paginaActual={paginaActual}
        cliente={params.cliente ?? ''}
        rfc={params.rfc ?? ''}
        fechaInicial={params.fechaInicial ?? ''}
        fechaFinal={params.fechaFinal ?? ''}
        metodoPagoId={params.metodoPagoId ?? ''}
        estado={filtroEstado}
        periodo={params.periodo ?? ''}
        usuario={params.usuario ?? ''}
      />
    </Container>
  )
}
