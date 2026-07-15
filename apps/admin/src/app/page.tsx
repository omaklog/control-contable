import { requireApp } from '@control-contable/auth'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import Link from 'next/link'

export default async function HomePage() {
  const profile = await requireApp('admin')

  return (
    <Container maxWidth="md">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
        }}
      >
        <Typography variant="h3" component="h1" fontWeight={700} color="primary">
          Panel Administrativo
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Administración del sistema de control contable
        </Typography>
        <Typography variant="body1">
          Sesión iniciada como {profile.fullName ?? profile.id} ({profile.role})
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {profile.capabilities.includes('manage_users') ? (
            <Button component={Link} href="/usuarios" variant="contained">
              Gestión de usuarios
            </Button>
          ) : null}
          {profile.capabilities.includes('view_auth_audit_log') ? (
            <Button component={Link} href="/auditoria" variant="outlined">
              Auditoría
            </Button>
          ) : null}
        </Box>
      </Box>
    </Container>
  )
}
