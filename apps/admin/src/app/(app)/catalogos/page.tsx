import { requireCapability } from '@control-contable/auth'
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import EventRepeatIcon from '@mui/icons-material/EventRepeat'
import ListAltIcon from '@mui/icons-material/ListAlt'
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
 * "Administración > Catálogos". Lista Periodicidades (protegido, 012),
 * Obligaciones Fiscales (editable, 013) y Plantillas de Obligaciones
 * (editable, 014) — cada catálogo futuro (Tipos de Documento, Régimen
 * Fiscal) se agrega aquí desde su propia especificación.
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
          <ListItemButton component={Link} href="/catalogos/obligaciones-fiscales">
            <ListItemIcon>
              <AssignmentOutlinedIcon />
            </ListItemIcon>
            <ListItemText
              primary="Obligaciones Fiscales"
              secondary="Catálogo reutilizable para plantillas y obligaciones de clientes"
            />
            <ChevronRightIcon color="action" />
          </ListItemButton>
          <ListItemButton component={Link} href="/catalogos/plantillas-obligaciones">
            <ListItemIcon>
              <ListAltIcon />
            </ListItemIcon>
            <ListItemText
              primary="Plantillas de Obligaciones"
              secondary="Carga inicial rápida de obligaciones fiscales para un cliente"
            />
            <ChevronRightIcon color="action" />
          </ListItemButton>
        </List>
      </Paper>
    </Container>
  )
}
