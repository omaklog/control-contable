'use client'

import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import DownloadIcon from '@mui/icons-material/Download'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import { useMemo, useState, useTransition } from 'react'

export interface DocumentoExpedienteRow {
  id: string
  nombreOriginal: string
  categoriaId: string | null
  categoriaNombre: string | null
  obligacionFiscalId: string | null
  obligacionFiscalNombre: string | null
  cumplimientoId: string | null
  periodoEtiqueta: string | null
  periodoAnio: number | null
  tamanoBytes: number
  rutaAlmacenamiento: string
  fechaCarga: string
}

export interface TipoDocumentoOption {
  id: string
  nombre: string
}

export interface CumplimientoOption {
  id: string
  etiqueta: string
}

export interface ObligacionFiscalDocumentoOption {
  id: string
  nombre: string
}

interface ActionResult {
  error: string | null
}

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const SIN_CLASIFICAR = 'Sin clasificar'

/**
 * Sección "Expediente Fiscal" del detalle de un Cliente
 * (016-expediente-fiscal, US1/US4): documentos organizados en "Documentos
 * Generales" y "Documentos por Periodo" (agrupados por año/etiqueta,
 * derivados del Cumplimiento asociado — nunca almacenados en el propio
 * documento, research.md Decisión 3). Vive dentro de ClienteDetalleClient,
 * no en una ruta propia (plan.md, Structure Decision).
 */
export function ExpedienteFiscalSection({
  documentos,
  tiposDocumentoDisponibles,
  cumplimientosDisponibles,
  obligacionesFiscalesDisponibles,
  canManage,
  onSubirDocumento,
  onActualizarClasificacionDocumento,
  onObtenerUrlFirmadaDocumento,
  onEliminarDocumento,
}: {
  documentos: DocumentoExpedienteRow[]
  tiposDocumentoDisponibles: readonly TipoDocumentoOption[]
  cumplimientosDisponibles: readonly CumplimientoOption[]
  obligacionesFiscalesDisponibles: readonly ObligacionFiscalDocumentoOption[]
  canManage: boolean
  onSubirDocumento: (formData: FormData) => Promise<ActionResult>
  onActualizarClasificacionDocumento: (
    documentoId: string,
    categoriaId: string,
  ) => Promise<ActionResult>
  onObtenerUrlFirmadaDocumento: (
    rutaAlmacenamiento: string,
  ) => Promise<{ url: string | null; error: string | null }>
  onEliminarDocumento: (documentoId: string) => Promise<ActionResult>
}) {
  const [isPending, startTransition] = useTransition()
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [categoriaId, setCategoriaId] = useState<string>('')
  const [cumplimientoId, setCumplimientoId] = useState<string>('')
  const [obligacionFiscalId, setObligacionFiscalId] = useState<string>('')
  const [confirmEliminarId, setConfirmEliminarId] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const documentosGenerales = useMemo(
    () => documentos.filter((documento) => !documento.cumplimientoId),
    [documentos],
  )

  const documentosPorPeriodo = useMemo(() => {
    const grupos = new Map<string, DocumentoExpedienteRow[]>()
    for (const documento of documentos) {
      if (!documento.cumplimientoId) continue
      const clave = `${documento.periodoAnio ?? ''}|${documento.periodoEtiqueta ?? ''}`
      const grupo = grupos.get(clave) ?? []
      grupo.push(documento)
      grupos.set(clave, grupo)
    }
    return Array.from(grupos.entries()).sort(([a], [b]) => (a < b ? 1 : -1))
  }, [documentos])

  function abrirCargarDocumento() {
    setArchivo(null)
    setCategoriaId('')
    setCumplimientoId('')
    setObligacionFiscalId('')
    setUploadError(null)
    setUploadOpen(true)
  }

  function handleSubir() {
    if (!archivo) {
      setUploadError('Selecciona un archivo PDF para cargar.')
      return
    }
    const formData = new FormData()
    formData.set('archivo', archivo)
    formData.set('categoriaId', categoriaId)
    formData.set('cumplimientoId', cumplimientoId)
    formData.set('obligacionFiscalId', obligacionFiscalId)

    startTransition(async () => {
      const result = await onSubirDocumento(formData)
      if (result.error) {
        setUploadError(result.error)
        return
      }
      setUploadOpen(false)
    })
  }

  function handleReclasificar(documentoId: string, nuevaCategoriaId: string) {
    startTransition(async () => {
      const result = await onActualizarClasificacionDocumento(documentoId, nuevaCategoriaId)
      if (result.error) setGlobalError(result.error)
    })
  }

  function handleVerDocumento(rutaAlmacenamiento: string) {
    startTransition(async () => {
      const { url, error } = await onObtenerUrlFirmadaDocumento(rutaAlmacenamiento)
      if (error || !url) {
        setGlobalError(error ?? 'No se pudo abrir el documento.')
        return
      }
      window.open(url, '_blank', 'noopener,noreferrer')
    })
  }

  function confirmarEliminar() {
    if (!confirmEliminarId) return
    const documentoId = confirmEliminarId
    setConfirmEliminarId(null)
    startTransition(async () => {
      const result = await onEliminarDocumento(documentoId)
      if (result.error) setGlobalError(result.error)
    })
  }

  function renderFilaDocumento(documento: DocumentoExpedienteRow) {
    return (
      <TableRow key={documento.id} hover>
        <TableCell>{documento.nombreOriginal}</TableCell>
        <TableCell sx={{ minWidth: 200 }}>
          {canManage ? (
            <Autocomplete
              size="small"
              options={tiposDocumentoDisponibles}
              getOptionLabel={(option) => option.nombre}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={
                tiposDocumentoDisponibles.find((option) => option.id === documento.categoriaId) ??
                null
              }
              onChange={(_event, value) => handleReclasificar(documento.id, value?.id ?? '')}
              renderInput={({ InputLabelProps, InputProps, size: _size, ...rest }) => (
                <TextField
                  {...rest}
                  slotProps={{ inputLabel: InputLabelProps, input: InputProps }}
                  placeholder={SIN_CLASIFICAR}
                  size="small"
                />
              )}
            />
          ) : (
            (documento.categoriaNombre ?? SIN_CLASIFICAR)
          )}
        </TableCell>
        <TableCell>{documento.obligacionFiscalNombre ?? '—'}</TableCell>
        <TableCell>{formatearTamano(documento.tamanoBytes)}</TableCell>
        <TableCell>{new Date(documento.fechaCarga).toLocaleDateString('es-MX')}</TableCell>
        <TableCell>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Ver / descargar">
              <span>
                <IconButton
                  size="small"
                  disabled={isPending}
                  onClick={() => handleVerDocumento(documento.rutaAlmacenamiento)}
                  aria-label="Ver o descargar documento"
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            {canManage ? (
              <Tooltip title="Eliminar">
                <span>
                  <IconButton
                    size="small"
                    color="error"
                    disabled={isPending}
                    onClick={() => setConfirmEliminarId(documento.id)}
                    aria-label="Eliminar documento"
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </span>
              </Tooltip>
            ) : null}
          </Box>
        </TableCell>
      </TableRow>
    )
  }

  return (
    <>
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
        <Typography variant="h6">Expediente Fiscal</Typography>
        {canManage ? (
          <Button variant="contained" startIcon={<UploadFileIcon />} onClick={abrirCargarDocumento}>
            Subir documento
          </Button>
        ) : null}
      </Box>

      {globalError ? (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setGlobalError(null)}>
          {globalError}
        </Alert>
      ) : null}

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
        Documentos Generales
      </Typography>
      {documentosGenerales.length === 0 ? (
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Este cliente no tiene documentos generales todavía.
        </Typography>
      ) : (
        <Table size="small" sx={{ mb: 3 }}>
          <TableHead>
            <TableRow>
              <TableCell>Documento</TableCell>
              <TableCell>Tipo de Documento</TableCell>
              <TableCell>Obligación</TableCell>
              <TableCell>Tamaño</TableCell>
              <TableCell>Fecha de alta</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>{documentosGenerales.map(renderFilaDocumento)}</TableBody>
        </Table>
      )}

      <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
        Documentos por Periodo
      </Typography>
      {documentosPorPeriodo.length === 0 ? (
        <Typography color="text.secondary">
          Este cliente no tiene documentos asociados a un periodo todavía.
        </Typography>
      ) : (
        documentosPorPeriodo.map(([clave, grupo]) => (
          <Box key={clave} sx={{ mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {grupo[0]?.periodoAnio ?? ''} — {grupo[0]?.periodoEtiqueta ?? ''}
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Documento</TableCell>
                  <TableCell>Tipo de Documento</TableCell>
                  <TableCell>Obligación</TableCell>
                  <TableCell>Tamaño</TableCell>
                  <TableCell>Fecha de alta</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>{grupo.map(renderFilaDocumento)}</TableBody>
            </Table>
          </Box>
        ))
      )}

      <Dialog open={uploadOpen} onClose={() => setUploadOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Subir documento</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {uploadError ? <Alert severity="error">{uploadError}</Alert> : null}

          <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
            {archivo ? archivo.name : 'Seleccionar archivo PDF'}
            <input
              type="file"
              accept="application/pdf"
              hidden
              onChange={(event) => setArchivo(event.target.files?.[0] ?? null)}
            />
          </Button>

          <Autocomplete
            options={tiposDocumentoDisponibles}
            getOptionLabel={(option) => option.nombre}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={tiposDocumentoDisponibles.find((option) => option.id === categoriaId) ?? null}
            onChange={(_event, value) => setCategoriaId(value?.id ?? '')}
            renderInput={({ InputLabelProps, InputProps, size: _size, ...rest }) => (
              <TextField
                {...rest}
                slotProps={{ inputLabel: InputLabelProps, input: InputProps }}
                label="Tipo de Documento (opcional)"
                fullWidth
              />
            )}
          />

          <Autocomplete
            options={cumplimientosDisponibles}
            getOptionLabel={(option) => option.etiqueta}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={cumplimientosDisponibles.find((option) => option.id === cumplimientoId) ?? null}
            onChange={(_event, value) => setCumplimientoId(value?.id ?? '')}
            renderInput={({ InputLabelProps, InputProps, size: _size, ...rest }) => (
              <TextField
                {...rest}
                slotProps={{ inputLabel: InputLabelProps, input: InputProps }}
                label="Cumplimiento asociado (opcional)"
                fullWidth
              />
            )}
          />

          <Autocomplete
            options={obligacionesFiscalesDisponibles}
            getOptionLabel={(option) => option.nombre}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={
              obligacionesFiscalesDisponibles.find((option) => option.id === obligacionFiscalId) ??
              null
            }
            onChange={(_event, value) => setObligacionFiscalId(value?.id ?? '')}
            renderInput={({ InputLabelProps, InputProps, size: _size, ...rest }) => (
              <TextField
                {...rest}
                slotProps={{ inputLabel: InputLabelProps, input: InputProps }}
                label="Obligación fiscal relacionada (opcional, informativo)"
                fullWidth
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={isPending} onClick={handleSubir}>
            {isPending ? 'Subiendo…' : 'Subir'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmEliminarId)} onClose={() => setConfirmEliminarId(null)}>
        <DialogTitle>Eliminar documento</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Seguro que deseas eliminar este documento? Dejará de aparecer en el expediente, pero se
            conservará en el historial de auditoría.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEliminarId(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmarEliminar}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
