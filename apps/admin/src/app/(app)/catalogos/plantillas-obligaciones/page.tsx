import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import { calcularTotalPaginas } from '@control-contable/utils'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

import { PlantillasObligacionesClient } from './PlantillasObligacionesClient'

const PLANTILLAS_POR_PAGINA = 20

/**
 * Historia 2 de 014-obligaciones-fiscales-cliente: catálogo editable de
 * Plantillas de Obligaciones (listado paginado, filtros por nombre/estado,
 * crear/editar/activar/desactivar, más la gestión de sus ítems) dentro del
 * hub "Administración > Catálogos" (012). Solo en apps/admin — ver plan.md,
 * Structure Decision.
 */
export default async function PlantillasObligacionesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; nombre?: string; estado?: string }>
}) {
  const currentProfile = await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const params = await searchParams
  const paginaActual = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)
  const nombre = params.nombre?.trim() ?? ''
  const estado = params.estado === 'activo' || params.estado === 'inactivo' ? params.estado : ''

  const { data: obligacionesActivasData } = await supabase
    .from('obligaciones_fiscales')
    .select('id, nombre')
    .eq('estado', 'activo')
    .order('nombre', { ascending: true })
  const obligacionesActivas = obligacionesActivasData ?? []

  const { data: periodicidadesActivasData } = await supabase
    .from('periodicidades')
    .select('id, nombre')
    .eq('estado', 'activo')
    .order('nombre', { ascending: true })
  const periodicidadesActivas = periodicidadesActivasData ?? []

  let query = supabase
    .from('plantillas_obligaciones')
    .select('id, nombre, descripcion, estado', { count: 'exact' })
    .order('nombre', { ascending: true })

  if (nombre) query = query.ilike('nombre', `%${nombre}%`)
  if (estado) query = query.eq('estado', estado)

  const desde = (paginaActual - 1) * PLANTILLAS_POR_PAGINA
  const hasta = desde + PLANTILLAS_POR_PAGINA - 1

  const { data: plantillasData, count } = await query.range(desde, hasta)

  const plantillas = (plantillasData ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion ?? '',
    estado: row.estado,
  }))

  const totalPaginas = calcularTotalPaginas(count ?? 0, PLANTILLAS_POR_PAGINA)
  const canManage = currentProfile.capabilities.includes('manage_catalogs')

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Plantillas de Obligaciones
      </Typography>
      <PlantillasObligacionesClient
        plantillas={plantillas}
        obligacionesActivas={obligacionesActivas}
        periodicidadesActivas={periodicidadesActivas}
        totalPaginas={totalPaginas}
        paginaActual={paginaActual}
        nombre={nombre}
        estado={estado}
        canManage={canManage}
      />
    </Container>
  )
}
