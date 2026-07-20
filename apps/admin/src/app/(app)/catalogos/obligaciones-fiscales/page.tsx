import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import { calcularTotalPaginas } from '@control-contable/utils'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

import { ObligacionesFiscalesClient } from './ObligacionesFiscalesClient'

const OBLIGACIONES_POR_PAGINA = 10

/**
 * Historia 1 de 013-catalogo-obligaciones-fiscales: catálogo editable de
 * Obligaciones Fiscales (listado paginado, filtros por nombre/periodicidad/
 * estado, crear/editar/activar/desactivar) dentro del hub "Administración >
 * Catálogos" (012). Solo en apps/admin — ver plan.md, Structure Decision.
 */
export default async function ObligacionesFiscalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    nombre?: string
    periodicidadId?: string
    estado?: string
  }>
}) {
  const currentProfile = await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const params = await searchParams
  const paginaActual = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)
  const nombre = params.nombre?.trim() ?? ''
  const periodicidadId = params.periodicidadId?.trim() ?? ''
  const estado = params.estado === 'activo' || params.estado === 'inactivo' ? params.estado : ''

  const { data: periodicidadesData } = await supabase
    .from('periodicidades')
    .select('id, nombre')
    .eq('estado', 'activo')
    .order('nombre', { ascending: true })
  const periodicidadesActivas = periodicidadesData ?? []

  const { data: nombresData } = await supabase
    .from('obligaciones_fiscales')
    .select('nombre')
    .order('nombre', { ascending: true })
  const nombresDisponibles = (nombresData ?? []).map((row) => row.nombre)

  let query = supabase
    .from('obligaciones_fiscales')
    .select('id, nombre, descripcion, prioridad, estado, periodicidad_id, periodicidades(nombre)', {
      count: 'exact',
    })
    .order('nombre', { ascending: true })

  if (nombre) query = query.ilike('nombre', `%${nombre}%`)
  if (periodicidadId) query = query.eq('periodicidad_id', periodicidadId)
  if (estado) query = query.eq('estado', estado)

  const desde = (paginaActual - 1) * OBLIGACIONES_POR_PAGINA
  const hasta = desde + OBLIGACIONES_POR_PAGINA - 1

  const { data: obligacionesData, count } = await query.range(desde, hasta)

  const obligaciones = (obligacionesData ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion ?? '',
    periodicidadId: row.periodicidad_id,
    periodicidadNombre: row.periodicidades?.nombre ?? '',
    prioridad: row.prioridad,
    estado: row.estado,
  }))

  const totalPaginas = calcularTotalPaginas(count ?? 0, OBLIGACIONES_POR_PAGINA)
  const canManage = currentProfile.capabilities.includes('manage_catalogs')

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Obligaciones Fiscales
      </Typography>
      <ObligacionesFiscalesClient
        obligaciones={obligaciones}
        periodicidadesActivas={periodicidadesActivas}
        nombresDisponibles={nombresDisponibles}
        totalPaginas={totalPaginas}
        paginaActual={paginaActual}
        nombre={nombre}
        periodicidadId={periodicidadId}
        estado={estado}
        canManage={canManage}
      />
    </Container>
  )
}
