import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import { calcularTotalPaginas } from '@control-contable/utils'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

import { ClientesClient } from './ClientesClient'

const CLIENTES_POR_PAGINA = 20

/**
 * Historia 1 (lista paginada), Historia 2 (editar) e Historia 3 (baja con
 * confirmación) de 006-crud-clientes-admin. La alta de clientes no forma
 * parte de este módulo — ver spec.md, Clarifications.
 */
export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; mostrarInactivos?: string }>
}) {
  const currentProfile = await requireCapability('view_clients')
  const supabase = await createServerSupabaseClient()

  const params = await searchParams
  const paginaActual = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)
  const mostrarInactivos = params.mostrarInactivos === 'true'

  let query = supabase
    .from('clientes')
    .select(
      'id, nombre, tipo_persona, rfc, regimen_fiscal_codigo, correo, telefono, direccion_fiscal, estado, regimenes_fiscales(descripcion)',
      { count: 'exact' },
    )
    .order('nombre', { ascending: true })

  if (!mostrarInactivos) {
    query = query.eq('estado', 'activo')
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

  const clientes = (clientesData ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    tipoPersona: row.tipo_persona,
    rfc: row.rfc,
    regimenFiscalCodigo: row.regimen_fiscal_codigo,
    regimenFiscalDescripcion: row.regimenes_fiscales?.descripcion ?? '',
    correo: row.correo,
    telefono: row.telefono ?? '',
    direccionFiscal: row.direccion_fiscal ?? '',
    estado: row.estado,
  }))

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
      <ClientesClient
        clientes={clientes}
        regimenesFiscales={regimenesFiscales}
        totalPaginas={totalPaginas}
        paginaActual={paginaActual}
        mostrarInactivos={mostrarInactivos}
        canManage={canManage}
      />
    </Container>
  )
}
