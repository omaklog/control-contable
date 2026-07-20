import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import { calcularTotalPaginas } from '@control-contable/utils'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

import { PeriodicidadesClient } from './PeriodicidadesClient'

const PERIODICIDADES_POR_PAGINA = 10

/**
 * Historia 3 y 4 de 012-administracion-catalogos: catálogo protegido de
 * Periodicidades — solo consulta (búsqueda, orden alfabético, selección por
 * Autocomplete, paginación condicional), sin ninguna ruta de escritura. Solo
 * en apps/admin — ver plan.md, Structure Decision.
 */
export default async function PeriodicidadesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; buscar?: string }>
}) {
  await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const params = await searchParams
  const paginaActual = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)
  const buscar = params.buscar?.trim() ?? ''

  const { data: opcionesData } = await supabase
    .from('periodicidades')
    .select('nombre')
    .order('nombre', { ascending: true })
  const nombresDisponibles = (opcionesData ?? []).map((row) => row.nombre)

  let query = supabase
    .from('periodicidades')
    .select('id, nombre, descripcion, estado', { count: 'exact' })
    .order('nombre', { ascending: true })

  if (buscar) query = query.ilike('nombre', `%${buscar}%`)

  const desde = (paginaActual - 1) * PERIODICIDADES_POR_PAGINA
  const hasta = desde + PERIODICIDADES_POR_PAGINA - 1

  const { data: periodicidadesData, count } = await query.range(desde, hasta)

  const periodicidades = (periodicidadesData ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion ?? '',
    estado: row.estado,
  }))

  const totalPaginas = calcularTotalPaginas(count ?? 0, PERIODICIDADES_POR_PAGINA)

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Periodicidades
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Catálogo protegido — solo consulta.
      </Typography>
      <PeriodicidadesClient
        periodicidades={periodicidades}
        nombresDisponibles={nombresDisponibles}
        totalPaginas={totalPaginas}
        paginaActual={paginaActual}
        buscar={buscar}
      />
    </Container>
  )
}
