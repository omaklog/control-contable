import { getCurrentProfile } from '@control-contable/auth'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

/**
 * El acceso a esta página ya lo protege el layout del route group (app),
 * que llama a requireApp('portal') y no renderiza estos hijos si no hay
 * sesión válida — ver app/(app)/layout.tsx.
 */
export default async function HomePage() {
  const profile = await getCurrentProfile()

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
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
    </Container>
  )
}
