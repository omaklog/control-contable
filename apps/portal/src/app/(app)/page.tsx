import { getCurrentProfile } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import Box from '@mui/material/Box'
import Card from '@mui/material/Card'
import CardActionArea from '@mui/material/CardActionArea'
import CardContent from '@mui/material/CardContent'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Link from 'next/link'

/**
 * El acceso a esta página ya lo protege el layout del route group (app),
 * que llama a requireApp('portal') y no renderiza estos hijos si no hay
 * sesión válida — ver app/(app)/layout.tsx. La tarjeta "Clientes sin
 * servicios activos" (017-cobranza, US6, FR-023) se muestra a quien tenga
 * `view_billing`/`manage_billing`, mismo gate que el resto del módulo de
 * Cobranza — enlaza al listado ya filtrable en /clientes.
 */
export default async function HomePage() {
  const profile = await getCurrentProfile()
  const puedeVerCobranza =
    profile?.capabilities.includes('view_billing') ||
    profile?.capabilities.includes('manage_billing')

  let clientesSinServiciosActivos = 0
  if (puedeVerCobranza) {
    const supabase = await createServerSupabaseClient()
    const [{ data: clientesActivosData }, { data: serviciosActivosData }] = await Promise.all([
      supabase.from('clientes').select('id').eq('estado', 'activo'),
      supabase.from('servicios_contratados').select('cliente_id').eq('estado', 'activo'),
    ])
    const idsConServicioActivo = new Set((serviciosActivosData ?? []).map((row) => row.cliente_id))
    clientesSinServiciosActivos = (clientesActivosData ?? []).filter(
      (cliente) => !idsConServicioActivo.has(cliente.id),
    ).length
  }

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '40vh',
          gap: 2,
        }}
      >
        <Typography variant="h3" component="h1" fontWeight={700} color="primary">
          Portal de Control Contable
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Sistema de administración del despacho
        </Typography>
        <Typography variant="body1">
          Sesión iniciada como {profile?.fullName ?? profile?.id}
        </Typography>
      </Box>

      {puedeVerCobranza ? (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, pb: 4 }}>
          <Card sx={{ minWidth: 260 }}>
            <CardActionArea component={Link} href="/clientes?sinServiciosActivos=1">
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  Clientes sin servicios activos
                </Typography>
                <Typography variant="h3" component="p">
                  {clientesSinServiciosActivos}
                </Typography>
              </CardContent>
            </CardActionArea>
          </Card>
        </Box>
      ) : null}
    </Container>
  )
}
