import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Container from '@mui/material/Container'

export default function HomePage() {
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
          Portal de Control Contable
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Sistema de administración del despacho
        </Typography>
      </Box>
    </Container>
  )
}
