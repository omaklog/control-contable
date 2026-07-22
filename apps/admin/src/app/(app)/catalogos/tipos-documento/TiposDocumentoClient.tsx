'use client'

import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ToggleOffIcon from '@mui/icons-material/ToggleOff'
import ToggleOnIcon from '@mui/icons-material/ToggleOn'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
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

import { createTipoDocumento, setTipoDocumentoActivo, updateTipoDocumento } from './actions'

export interface TipoDocumentoRow {
  id: string
  nombre: string
  descripcion: string
  activa: boolean
}

const VALORES_VACIOS = { nombre: '', descripcion: '' }

/**
 * Catálogo editable de Tipos de Documento (016-expediente-fiscal, US5,
 * FR-005): mismo patrón de crear/editar/activar-desactivar ya usado en
 * Obligaciones Fiscales (013) y Plantillas de Obligaciones (014), sin
 * paginación explícita — se espera un catálogo pequeño, igual que
 * Periodicidades/Plantillas.
 */
export function TiposDocumentoClient({
  tiposDocumento,
  canManage,
}: {
  tiposDocumento: TipoDocumentoRow[]
  canManage: boolean
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [globalError, setGlobalError] = useState<string | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formValues, setFormValues] = useState(VALORES_VACIOS)
  const [editTargetId, setEditTargetId] = useState<string | null>(null)
  const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null)

  function abrirAlta() {
    setFormError(null)
    setFormValues(VALORES_VACIOS)
    setCreateOpen(true)
  }

  function abrirEdicion(tipo: TipoDocumentoRow) {
    setFormError(null)
    setFormValues({ nombre: tipo.nombre, descripcion: tipo.descripcion })
    setEditTargetId(tipo.id)
  }

  function handleGuardar() {
    setFormError(null)
    startTransition(async () => {
      const result = editTargetId
        ? await updateTipoDocumento(editTargetId, formValues)
        : await createTipoDocumento(formValues)

      if (result.error) {
        setFormError(result.error)
        return
      }
      setCreateOpen(false)
      setEditTargetId(null)
      router.refresh()
    })
  }

  function confirmarDesactivar() {
    if (!confirmTargetId) return
    const categoriaId = confirmTargetId
    setConfirmTargetId(null)
    setGlobalError(null)
    startTransition(async () => {
      const result = await setTipoDocumentoActivo(categoriaId, false)
      if (result.error) {
        setGlobalError(result.error)
        return
      }
      router.refresh()
    })
  }

  function activar(categoriaId: string) {
    setGlobalError(null)
    startTransition(async () => {
      const result = await setTipoDocumentoActivo(categoriaId, true)
      if (result.error) setGlobalError(result.error)
      else router.refresh()
    })
  }

  const formularioAbierto = createOpen || Boolean(editTargetId)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {globalError ? <Alert severity="error">{globalError}</Alert> : null}

      {canManage ? (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={abrirAlta}>
            Nuevo Tipo de Documento
          </Button>
        </Box>
      ) : null}

      <Paper sx={{ p: 3 }}>
        {tiposDocumento.length === 0 ? (
          <Typography color="text.secondary">
            No hay Tipos de Documento registrados todavía.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Estado</TableCell>
                {canManage ? <TableCell>Acciones</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {tiposDocumento.map((tipo) => (
                <TableRow key={tipo.id} hover>
                  <TableCell>{tipo.nombre}</TableCell>
                  <TableCell>{tipo.descripcion || '—'}</TableCell>
                  <TableCell>
                    <StatusChip status={tipo.activa ? 'activo' : 'inactivo'} />
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Editar">
                          <span>
                            <IconButton
                              size="small"
                              disabled={isPending}
                              onClick={() => abrirEdicion(tipo)}
                              aria-label="Editar Tipo de Documento"
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        {tipo.activa ? (
                          <Tooltip title="Desactivar">
                            <span>
                              <IconButton
                                size="small"
                                disabled={isPending}
                                onClick={() => setConfirmTargetId(tipo.id)}
                                aria-label="Desactivar Tipo de Documento"
                              >
                                <ToggleOnIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Activar">
                            <span>
                              <IconButton
                                size="small"
                                disabled={isPending}
                                onClick={() => activar(tipo.id)}
                                aria-label="Activar Tipo de Documento"
                              >
                                <ToggleOffIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog
        open={formularioAbierto}
        onClose={() => {
          setCreateOpen(false)
          setEditTargetId(null)
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editTargetId ? 'Editar Tipo de Documento' : 'Nuevo Tipo de Documento'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {formError ? <Alert severity="error">{formError}</Alert> : null}
          <TextField
            label="Nombre"
            value={formValues.nombre}
            onChange={(event) => setFormValues({ ...formValues, nombre: event.target.value })}
            required
            fullWidth
          />
          <TextField
            label="Descripción"
            value={formValues.descripcion}
            onChange={(event) => setFormValues({ ...formValues, descripcion: event.target.value })}
            multiline
            minRows={2}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setCreateOpen(false)
              setEditTargetId(null)
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            disabled={isPending || !formValues.nombre.trim()}
            onClick={handleGuardar}
          >
            {isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmTargetId)} onClose={() => setConfirmTargetId(null)}>
        <DialogTitle>Confirmar desactivación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Seguro que deseas desactivar este Tipo de Documento? Los documentos ya clasificados con
            él no se ven afectados; solo dejará de estar disponible para clasificar documentos
            nuevos o configurarse como Documento Esperado.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmTargetId(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmarDesactivar}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
