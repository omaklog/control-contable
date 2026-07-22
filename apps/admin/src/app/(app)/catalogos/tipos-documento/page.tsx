import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

import { TiposDocumentoClient } from './TiposDocumentoClient'

/**
 * Catálogo editable de Tipos de Documento (016-expediente-fiscal, US5,
 * FR-005): listado, crear/editar/activar/desactivar, dentro del hub
 * "Administración > Catálogos" (012). Solo en apps/admin — mismo patrón que
 * Obligaciones Fiscales (013) y Plantillas de Obligaciones (014).
 */
export default async function TiposDocumentoPage() {
  const currentProfile = await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const { data: categoriasData } = await supabase
    .from('categorias_documento')
    .select('id, nombre, descripcion, activa')
    .order('nombre', { ascending: true })

  const tiposDocumento = (categoriasData ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion ?? '',
    activa: row.activa,
  }))

  const canManage = currentProfile.capabilities.includes('manage_catalogs')

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Tipos de Documento
      </Typography>
      <TiposDocumentoClient tiposDocumento={tiposDocumento} canManage={canManage} />
    </Container>
  )
}
