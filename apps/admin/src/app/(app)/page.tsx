import { getCurrentProfile } from '@control-contable/auth'
import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

/**
 * Inicio del Panel Administrativo. El acceso (`requireApp('admin')`) y la
 * navegación (menú, avatar, cierre de sesión) ya los provee el layout de
 * `(app)` — esta página solo muestra un saludo; la navegación a
 * Usuarios/Clientes/Auditoría vive en el menú lateral, no en botones sueltos
 * aquí (004-portal-main-layout, ampliado a apps/admin).
 */
export default async function HomePage() {
  const profile = await getCurrentProfile()

  return (
    <Container maxWidth="md">
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Typography variant="h4" component="h1" fontWeight={700} color="primary">
          Panel Administrativo
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Sesión iniciada como {profile?.fullName ?? profile?.email} ({profile?.role})
        </Typography>
      </Box>
    </Container>
  )
}
