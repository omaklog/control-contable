'use client'

import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DownloadIcon from '@mui/icons-material/Download'
import HistoryIcon from '@mui/icons-material/History'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Checkbox from '@mui/material/Checkbox'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import MenuItem from '@mui/material/MenuItem'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { StatusChip } from '@control-contable/ui'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
  asociarDocumentoCumplimiento,
  cambiarEstadoCumplimiento,
  cambiarFechaLimiteCumplimiento,
  cambiarResponsableCumplimiento,
  desasociarDocumentoCumplimiento,
  obtenerHistorialCumplimiento,
  type HistorialEvento,
} from './actions'

export interface CumplimientoDetalle {
  id: string
  clienteId: string
  clienteNombre: string
  clienteRfc: string
  obligacionNombre: string
  descripcion: string | null
  periodoEtiqueta: string
  fechaLimite: string
  estado: 'pendiente' | 'en_proceso' | 'presentada' | 'no_aplica'
  vencida: boolean
  responsableId: string | null
  responsableNombre: string
  esExtraordinario: boolean
}

export interface DocumentoAsociadoRow {
  id: string
  documentoId: string
  nombreOriginal: string
  esAcuse: boolean
}

export interface DocumentoEsperadoRow {
  categoriaDocumentoId: string
  categoriaNombre: string
  disponible: boolean
}

export interface DocumentoAdicionalRow {
  id: string
  nombreOriginal: string
  categoriaNombre: string | null
  rutaAlmacenamiento: string
}

interface OpcionDocumento {
  id: string
  nombre: string
}

interface OpcionResponsable {
  id: string
  nombre: string
}

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: 'Pendiente',
  en_proceso: 'En proceso',
  presentada: 'Presentada',
  no_aplica: 'No aplica',
  vencida: 'Vencida',
}

const VARIANTE_ESTADO: Record<string, 'positivo' | 'negativo' | 'neutro'> = {
  pendiente: 'neutro',
  en_proceso: 'neutro',
  presentada: 'positivo',
  no_aplica: 'neutro',
  vencida: 'negativo',
}

const ETIQUETA_ACCION: Record<string, string> = {
  alta: 'Cumplimiento generado',
  cambio_estado: 'Estado cambiado',
  cambio_fecha_limite: 'Fecha límite cambiada',
  cambio_responsable: 'Responsable cambiado',
  asociacion_documento: 'Documento asociado',
  desasociacion_documento: 'Documento desasociado',
}

function formatearDetalle(accion: string, detalle: unknown): string | null {
  if (!detalle || typeof detalle !== 'object') return null
  const valores = detalle as Record<string, unknown>
  if (
    accion === 'cambio_estado' ||
    accion === 'cambio_fecha_limite' ||
    accion === 'cambio_responsable'
  ) {
    const anterior = valores.anterior
    const nuevo = valores.nuevo
    if (anterior !== undefined && nuevo !== undefined) {
      return `${anterior ?? '—'} → ${nuevo ?? '—'}`
    }
  }
  return null
}

/**
 * Historias 2, 3 y 5 de 015-control-cumplimiento-fiscal: cambiar estado,
 * fecha límite y responsable de un cumplimiento; asociar/desasociar
 * documentos del Expediente Fiscal del mismo cliente; consultar el
 * historial de cambios. "Vencida" llega ya calculada desde page.tsx.
 */
export function CumplimientoDetalleClient({
  cumplimiento,
  documentosAsociados,
  documentosDisponibles,
  responsablesDisponibles,
  canManage,
  documentosEsperados,
  documentosAdicionales,
  onObtenerUrlFirmadaDocumento,
}: {
  cumplimiento: CumplimientoDetalle
  documentosAsociados: DocumentoAsociadoRow[]
  documentosDisponibles: OpcionDocumento[]
  responsablesDisponibles: OpcionResponsable[]
  canManage: boolean
  documentosEsperados: DocumentoEsperadoRow[]
  documentosAdicionales: DocumentoAdicionalRow[]
  onObtenerUrlFirmadaDocumento: (
    rutaAlmacenamiento: string,
  ) => Promise<{ url: string | null; error: string | null }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [globalError, setGlobalError] = useState<string | null>(null)

  const [fechaLimite, setFechaLimite] = useState(cumplimiento.fechaLimite)
  const [responsableSeleccionado, setResponsableSeleccionado] = useState<OpcionResponsable | null>(
    responsablesDisponibles.find((r) => r.id === cumplimiento.responsableId) ?? null,
  )

  const [documentoSeleccionado, setDocumentoSeleccionado] = useState<OpcionDocumento | null>(null)
  const [esAcuse, setEsAcuse] = useState(false)

  const [historialOpen, setHistorialOpen] = useState(false)
  const [historialEventos, setHistorialEventos] = useState<HistorialEvento[]>([])
  const [historialError, setHistorialError] = useState<string | null>(null)

  const estadoMostrado = cumplimiento.vencida ? 'vencida' : cumplimiento.estado

  function cambiarEstado(estado: 'pendiente' | 'en_proceso' | 'presentada' | 'no_aplica') {
    setGlobalError(null)
    startTransition(async () => {
      const result = await cambiarEstadoCumplimiento(cumplimiento.id, estado)
      if (result.error) {
        setGlobalError(result.error)
        return
      }
      router.refresh()
    })
  }

  function guardarFechaLimite() {
    setGlobalError(null)
    startTransition(async () => {
      const result = await cambiarFechaLimiteCumplimiento(cumplimiento.id, fechaLimite)
      if (result.error) {
        setGlobalError(result.error)
        return
      }
      router.refresh()
    })
  }

  function guardarResponsable(opcion: OpcionResponsable | null) {
    setResponsableSeleccionado(opcion)
    setGlobalError(null)
    startTransition(async () => {
      const result = await cambiarResponsableCumplimiento(cumplimiento.id, opcion?.id ?? null)
      if (result.error) {
        setGlobalError(result.error)
      }
      router.refresh()
    })
  }

  function asociarDocumento() {
    if (!documentoSeleccionado) return
    setGlobalError(null)
    startTransition(async () => {
      const result = await asociarDocumentoCumplimiento(
        cumplimiento.id,
        documentoSeleccionado.id,
        esAcuse,
      )
      if (result.error) {
        setGlobalError(result.error)
        return
      }
      setDocumentoSeleccionado(null)
      setEsAcuse(false)
      router.refresh()
    })
  }

  function desasociarDocumento(cumplimientoFiscalDocumentoId: string) {
    setGlobalError(null)
    startTransition(async () => {
      const result = await desasociarDocumentoCumplimiento(
        cumplimiento.id,
        cumplimientoFiscalDocumentoId,
      )
      if (result.error) {
        setGlobalError(result.error)
        return
      }
      router.refresh()
    })
  }

  function verDocumento(rutaAlmacenamiento: string) {
    startTransition(async () => {
      const { url, error } = await onObtenerUrlFirmadaDocumento(rutaAlmacenamiento)
      if (error || !url) {
        setGlobalError(error ?? 'No se pudo abrir el documento.')
        return
      }
      window.open(url, '_blank', 'noopener,noreferrer')
    })
  }

  async function abrirHistorial() {
    setHistorialError(null)
    setHistorialEventos([])
    setHistorialOpen(true)
    const result = await obtenerHistorialCumplimiento(cumplimiento.id)
    if (result.error) {
      setHistorialError(result.error)
      return
    }
    setHistorialEventos(result.eventos)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {globalError ? <Alert severity="error">{globalError}</Alert> : null}

      <Paper sx={{ p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            mb: 2,
          }}
        >
          <Typography variant="h6">Información general</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <StatusChip
              status={estadoMostrado}
              variant={VARIANTE_ESTADO[estadoMostrado] ?? 'neutro'}
              label={ETIQUETA_ESTADO[estadoMostrado] ?? estadoMostrado}
            />
            {cumplimiento.esExtraordinario ? <Chip label="Extraordinario" size="small" /> : null}
            <Tooltip title="Ver historial">
              <span>
                <IconButton size="small" onClick={abrirHistorial} aria-label="Ver historial">
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Cliente
            </Typography>
            <Typography>
              {cumplimiento.clienteNombre} ({cumplimiento.clienteRfc})
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Periodo
            </Typography>
            <Typography>{cumplimiento.periodoEtiqueta}</Typography>
          </Box>
          {cumplimiento.descripcion ? (
            <Box sx={{ gridColumn: '1 / -1' }}>
              <Typography variant="caption" color="text.secondary">
                Descripción
              </Typography>
              <Typography>{cumplimiento.descripcion}</Typography>
            </Box>
          ) : null}
        </Box>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 3 }}>
          {canManage ? (
            <Select
              size="small"
              value={cumplimiento.estado}
              onChange={(event) =>
                cambiarEstado(
                  event.target.value as 'pendiente' | 'en_proceso' | 'presentada' | 'no_aplica',
                )
              }
              disabled={isPending}
            >
              <MenuItem value="pendiente">Pendiente</MenuItem>
              <MenuItem value="en_proceso">En proceso</MenuItem>
              <MenuItem value="presentada">Presentada</MenuItem>
              <MenuItem value="no_aplica">No aplica</MenuItem>
            </Select>
          ) : null}

          <TextField
            label="Fecha límite"
            type="date"
            size="small"
            value={fechaLimite}
            onChange={(event) => setFechaLimite(event.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
            disabled={!canManage}
          />
          {canManage ? (
            <Button
              variant="outlined"
              size="small"
              disabled={isPending || fechaLimite === cumplimiento.fechaLimite}
              onClick={guardarFechaLimite}
            >
              Guardar fecha
            </Button>
          ) : null}

          <Autocomplete
            options={responsablesDisponibles}
            getOptionLabel={(option) => option.nombre}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={responsableSeleccionado}
            onChange={(_event, value) => guardarResponsable(value)}
            disabled={!canManage}
            sx={{ minWidth: 220 }}
            renderInput={({ InputLabelProps, InputProps, size: _size, ...rest }) => (
              <TextField
                {...rest}
                slotProps={{ inputLabel: InputLabelProps, input: InputProps }}
                label="Responsable"
                size="small"
              />
            )}
          />
        </Box>
      </Paper>

      {documentosEsperados.length > 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Documentos Esperados
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Referencia informativa — su ausencia no bloquea ninguna acción sobre este cumplimiento.
          </Typography>
          <List dense>
            {documentosEsperados.map((esperado) => (
              <ListItem key={esperado.categoriaDocumentoId} disableGutters>
                <ListItemIcon sx={{ minWidth: 32 }}>
                  {esperado.disponible ? (
                    <CheckCircleOutlineIcon color="success" fontSize="small" />
                  ) : (
                    <CancelOutlinedIcon color="disabled" fontSize="small" />
                  )}
                </ListItemIcon>
                <ListItemText primary={esperado.categoriaNombre} />
              </ListItem>
            ))}
          </List>
        </Paper>
      ) : null}

      {documentosAdicionales.length > 0 ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Documentos Adicionales
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Documentos cargados para este cumplimiento que no corresponden a ningún Documento
            Esperado configurado.
          </Typography>
          <Table size="small">
            <TableBody>
              {documentosAdicionales.map((documento) => (
                <TableRow key={documento.id} hover>
                  <TableCell>{documento.nombreOriginal}</TableCell>
                  <TableCell>{documento.categoriaNombre ?? 'Sin clasificar'}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Ver / descargar">
                      <span>
                        <IconButton
                          size="small"
                          disabled={isPending}
                          onClick={() => verDocumento(documento.rutaAlmacenamiento)}
                          aria-label="Ver o descargar documento"
                        >
                          <DownloadIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      ) : null}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Documentos asociados
        </Typography>

        {documentosAsociados.length === 0 ? (
          <Typography color="text.secondary">
            Este cumplimiento no tiene documentos asociados.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Documento</TableCell>
                <TableCell>Acuse</TableCell>
                {canManage ? <TableCell>Acciones</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {documentosAsociados.map((documento) => (
                <TableRow key={documento.id} hover>
                  <TableCell>{documento.nombreOriginal}</TableCell>
                  <TableCell>
                    {documento.esAcuse ? <Chip label="Acuse" size="small" color="primary" /> : '—'}
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <Tooltip title="Desasociar">
                        <span>
                          <IconButton
                            size="small"
                            disabled={isPending}
                            onClick={() => desasociarDocumento(documento.id)}
                            aria-label="Desasociar documento"
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {canManage ? (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mt: 2 }}>
            <Autocomplete
              options={documentosDisponibles}
              getOptionLabel={(option) => option.nombre}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={documentoSeleccionado}
              onChange={(_event, value) => setDocumentoSeleccionado(value)}
              sx={{ minWidth: 260 }}
              renderInput={({ InputLabelProps, InputProps, size: _size, ...rest }) => (
                <TextField
                  {...rest}
                  slotProps={{ inputLabel: InputLabelProps, input: InputProps }}
                  label="Documento del Expediente Fiscal"
                  size="small"
                />
              )}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={esAcuse}
                  onChange={(event) => setEsAcuse(event.target.checked)}
                />
              }
              label="Es el acuse de presentación"
            />
            <Button
              variant="outlined"
              disabled={!documentoSeleccionado || isPending}
              onClick={asociarDocumento}
            >
              Asociar
            </Button>
          </Box>
        ) : null}
      </Paper>

      <Dialog open={historialOpen} onClose={() => setHistorialOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Historial del cumplimiento</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {historialError ? <Alert severity="error">{historialError}</Alert> : null}
          {historialEventos.length === 0 && !historialError ? (
            <Typography color="text.secondary">Sin cambios registrados todavía.</Typography>
          ) : (
            historialEventos.map((evento, index) => {
              const detalleTexto = formatearDetalle(evento.accion, evento.detalle)
              return (
                <Box key={index} sx={{ borderLeft: 2, borderColor: 'divider', pl: 2 }}>
                  <Typography variant="subtitle2">
                    {ETIQUETA_ACCION[evento.accion] ?? evento.accion}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(evento.creadoEn).toLocaleString('es-MX')}
                    {evento.actorNombre ? ` · ${evento.actorNombre}` : ''}
                  </Typography>
                  {detalleTexto ? <Typography variant="body2">{detalleTexto}</Typography> : null}
                </Box>
              )
            })
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistorialOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
