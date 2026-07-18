'use client'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Typography from '@mui/material/Typography'

export interface HistorialEvento {
  accion: string
  detalle: unknown
  creadoEn: string
}

const ETIQUETA_ACCION: Record<string, string> = {
  alta: 'Servicio agregado',
  edicion: 'Datos editados',
  cambio_precio: 'Precio actualizado',
  suspension: 'Suspendido',
  reactivacion: 'Reactivado',
  finalizacion: 'Finalizado',
}

function formatearDetalle(accion: string, detalle: unknown): string | null {
  if (accion === 'cambio_precio' && detalle && typeof detalle === 'object') {
    const { precio_anterior: anterior, precio_nuevo: nuevo } = detalle as {
      precio_anterior?: number
      precio_nuevo?: number
    }
    if (anterior !== undefined && nuevo !== undefined) {
      return `$${anterior} → $${nuevo}`
    }
  }
  return null
}

/**
 * Línea de tiempo de un servicio contratado (011-gestion-servicios, Historia
 * 5): eventos de `business_audit_log` ya filtrados y ordenados
 * cronológicamente por el Server Action `onObtenerHistorial` de cada app.
 */
export function ServicioHistorialDialog({
  open,
  onClose,
  eventos,
  error,
}: {
  open: boolean
  onClose: () => void
  eventos: HistorialEvento[]
  error: string | null
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Historial del servicio</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {!error && eventos.length === 0 ? (
          <Typography color="text.secondary">
            Todavía no hay eventos registrados para este servicio.
          </Typography>
        ) : null}
        {eventos.map((evento, index) => (
          <Box key={index} sx={{ borderLeft: '2px solid', borderColor: 'divider', pl: 2, py: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              {new Date(evento.creadoEn).toLocaleString('es-MX')}
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {ETIQUETA_ACCION[evento.accion] ?? evento.accion}
            </Typography>
            {formatearDetalle(evento.accion, evento.detalle) ? (
              <Typography variant="body2" color="text.secondary">
                {formatearDetalle(evento.accion, evento.detalle)}
              </Typography>
            ) : null}
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
      </DialogActions>
    </Dialog>
  )
}
