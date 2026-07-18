import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import { calcularTotalPaginas } from '@control-contable/utils'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

import { ServiciosClient } from './ServiciosClient'

const SERVICIOS_POR_PAGINA = 20

/**
 * Historia 1 de 011-gestion-servicios: catálogo de servicios (listado
 * paginado, filtros por nombre/categoría/estado, crear/editar/activar/
 * desactivar). Solo en apps/admin — ver plan.md, Structure Decision.
 */
export default async function ServiciosPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; nombre?: string; categoria?: string; estado?: string }>
}) {
  const currentProfile = await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const params = await searchParams
  const paginaActual = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)
  const nombre = params.nombre?.trim() ?? ''
  const categoria = params.categoria?.trim() ?? ''
  const estado = params.estado === 'activo' || params.estado === 'inactivo' ? params.estado : ''

  let query = supabase
    .from('servicios')
    .select('id, nombre, descripcion, categoria, estado, observaciones', { count: 'exact' })
    .order('nombre', { ascending: true })

  if (nombre) query = query.ilike('nombre', `%${nombre}%`)
  if (categoria) query = query.ilike('categoria', `%${categoria}%`)
  if (estado) query = query.eq('estado', estado)

  const desde = (paginaActual - 1) * SERVICIOS_POR_PAGINA
  const hasta = desde + SERVICIOS_POR_PAGINA - 1

  const { data: serviciosData, count } = await query.range(desde, hasta)

  const servicios = (serviciosData ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion ?? '',
    categoria: row.categoria,
    estado: row.estado,
    observaciones: row.observaciones ?? '',
  }))

  const totalPaginas = calcularTotalPaginas(count ?? 0, SERVICIOS_POR_PAGINA)
  const canManage = currentProfile.capabilities.includes('manage_catalogs')

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Servicios
      </Typography>
      <ServiciosClient
        servicios={servicios}
        totalPaginas={totalPaginas}
        paginaActual={paginaActual}
        nombre={nombre}
        categoria={categoria}
        estado={estado}
        canManage={canManage}
      />
    </Container>
  )
}
