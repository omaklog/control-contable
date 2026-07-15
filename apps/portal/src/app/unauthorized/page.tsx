import Box from '@mui/material/Box'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

export default function UnauthorizedPage() {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: 2,
          textAlign: 'center',
        }}
      >
        <Typography variant="h4" component="h1" color="error">
          No autorizado
        </Typography>
        <Typography variant="body1" color="text.secondary">
          No tienes permiso para acceder a esta sección con tu cuenta actual.
        </Typography>
      </Box>
    </Container>
  )
}
