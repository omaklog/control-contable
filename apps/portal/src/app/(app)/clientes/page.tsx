import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import { calcularTotalPaginas } from '@control-contable/utils'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

import { ClientesPortalClient } from './ClientesPortalClient'

const CLIENTES_POR_PAGINA = 20

/**
 * Historia 1 (listado paginado + filtros), Historia 2 (alta vía modal) e
 * Historia 3 (acceso por capacidad) de 007-alta-cliente-portal (segunda
 * iteración). El gate es view_clients (lectura); manage_clients sólo
 * habilita el botón "Agregar cliente" (research.md Decisión 4 revisada).
 */
export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    mostrarInactivos?: string
    q?: string
    sinServiciosActivos?: string
  }>
}) {
  const currentProfile = await requireCapability('view_clients')
  const supabase = await createServerSupabaseClient()

  const params = await searchParams
  const paginaActual = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)
  const mostrarInactivos = params.mostrarInactivos === 'true'
  const q = params.q?.trim() ?? ''
  const sinServiciosActivos = params.sinServiciosActivos === '1'

  let query = supabase
    .from('clientes')
    .select('id, nombre, rfc, correo, estado', { count: 'exact' })
    .order('nombre', { ascending: true })

  if (!mostrarInactivos) {
    query = query.eq('estado', 'activo')
  }

  if (q) {
    query = query.or(`nombre.ilike.%${q}%,rfc.ilike.%${q}%`)
  }

  if (sinServiciosActivos) {
    const { data: clientesConServicioActivo } = await supabase
      .from('servicios_contratados')
      .select('cliente_id')
      .eq('estado', 'activo')
    const idsConServicioActivo = Array.from(
      new Set((clientesConServicioActivo ?? []).map((row) => row.cliente_id)),
    )
    if (idsConServicioActivo.length > 0) {
      query = query.not('id', 'in', `(${idsConServicioActivo.join(',')})`)
    }
  }

  const desde = (paginaActual - 1) * CLIENTES_POR_PAGINA
  const hasta = desde + CLIENTES_POR_PAGINA - 1

  const [{ data: clientesData, count }, { data: regimenesData }] = await Promise.all([
    query.range(desde, hasta),
    supabase
      .from('regimenes_fiscales')
      .select(
        'codigo, descripcion, aplica_persona_fisica, aplica_persona_moral, fecha_fin_vigencia',
      )
      .order('codigo', { ascending: true }),
  ])

  const clientes = clientesData ?? []

  const regimenesFiscales = (regimenesData ?? []).map((row) => ({
    codigo: row.codigo,
    descripcion: row.descripcion,
    aplicaPersonaFisica: row.aplica_persona_fisica,
    aplicaPersonaMoral: row.aplica_persona_moral,
    fechaFinVigencia: row.fecha_fin_vigencia,
  }))

  const totalPaginas = calcularTotalPaginas(count ?? 0, CLIENTES_POR_PAGINA)
  const canManage = currentProfile.capabilities.includes('manage_clients')

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Clientes
      </Typography>
      <ClientesPortalClient
        clientes={clientes}
        regimenesFiscales={regimenesFiscales}
        totalPaginas={totalPaginas}
        paginaActual={paginaActual}
        mostrarInactivos={mostrarInactivos}
        q={q}
        canManage={canManage}
      />
    </Container>
  )
}
