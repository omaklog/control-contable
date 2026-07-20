import { requireCapability } from '@control-contable/auth'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import EventRepeatIcon from '@mui/icons-material/EventRepeat'
import Container from '@mui/material/Container'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Link from 'next/link'

/**
 * Historia 1 de 012-administracion-catalogos: único punto de entrada
 * "Administración > Catálogos". En v1 solo lista Periodicidades (catálogo
 * protegido) — cada catálogo futuro (Tipos de Documento, Régimen Fiscal,
 * Obligaciones Fiscales) se agrega aquí desde su propia especificación.
 */
export default async function CatalogosPage() {
  await requireCapability('manage_catalogs')

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Catálogos
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Administración centralizada de los catálogos del sistema.
      </Typography>
      <Paper>
        <List disablePadding>
          <ListItemButton component={Link} href="/catalogos/periodicidades">
            <ListItemIcon>
              <EventRepeatIcon />
            </ListItemIcon>
            <ListItemText primary="Periodicidades" secondary="Catálogo protegido — solo consulta" />
            <ChevronRightIcon color="action" />
          </ListItemButton>
        </List>
      </Paper>
    </Container>
  )
}
