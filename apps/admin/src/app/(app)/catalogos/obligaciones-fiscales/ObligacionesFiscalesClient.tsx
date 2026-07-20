'use client'

import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import ToggleOffIcon from '@mui/icons-material/ToggleOff'
import ToggleOnIcon from '@mui/icons-material/ToggleOn'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Paper from '@mui/material/Paper'
import Select from '@mui/material/Select'
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { StatusChip } from '@control-contable/ui'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
  createObligacionFiscal,
  setObligacionFiscalEstado,
  updateObligacionFiscal,
} from './actions'

export interface PeriodicidadOption {
  id: string
  nombre: string
}

export interface ObligacionFiscalRow {
  id: string
  nombre: string
  descripcion: string
  periodicidadId: string
  periodicidadNombre: string
  prioridad: number
  estado: 'activo' | 'inactivo'
}

const VALORES_VACIOS = { nombre: '', descripcion: '', periodicidadId: '', prioridad: '' }

/**
 * Historia 1 de 013-catalogo-obligaciones-fiscales: catálogo editable
 * (listado paginado, filtros por nombre/periodicidad/estado, crear/editar/
 * activar/desactivar). `canManage` es siempre true aquí — la página ya exige
 * `manage_catalogs` para poder entrar (ver page.tsx). El selector de
 * periodicidad usa `Autocomplete` de MUI (research.md #5 de 013), primer uso
 * real de este patrón como selector de FK dentro de otra entidad.
 */
export function ObligacionesFiscalesClient({
  obligaciones,
  periodicidadesActivas,
  nombresDisponibles,
  totalPaginas,
  paginaActual,
  nombre,
  periodicidadId,
  estado,
  canManage,
}: {
  obligaciones: ObligacionFiscalRow[]
  periodicidadesActivas: PeriodicidadOption[]
  nombresDisponibles: string[]
  totalPaginas: number
  paginaActual: number
  nombre: string
  periodicidadId: string
  estado: string
  canManage: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [globalError, setGlobalError] = useState<string | null>(null)

  const [filtroNombre, setFiltroNombre] = useState(nombre)
  const [filtroPeriodicidadId, setFiltroPeriodicidadId] = useState(periodicidadId)
  const [filtroEstado, setFiltroEstado] = useState(estado)

  const [createOpen, setCreateOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formValues, setFormValues] = useState(VALORES_VACIOS)
  const [editTargetId, setEditTargetId] = useState<string | null>(null)
  const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null)

  function irAPagina(pagina: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(pagina))
    router.push(`/catalogos/obligaciones-fiscales?${params.toString()}`)
  }

  function aplicarFiltros() {
    const params = new URLSearchParams()
    if (filtroNombre.trim()) params.set('nombre', filtroNombre.trim())
    if (filtroPeriodicidadId) params.set('periodicidadId', filtroPeriodicidadId)
    if (filtroEstado) params.set('estado', filtroEstado)
    params.set('page', '1')
    router.push(`/catalogos/obligaciones-fiscales?${params.toString()}`)
  }

  function limpiarFiltros() {
    setFiltroNombre('')
    setFiltroPeriodicidadId('')
    setFiltroEstado('')
    router.push('/catalogos/obligaciones-fiscales')
  }

  function abrirAlta() {
    setFormError(null)
    setFormValues(VALORES_VACIOS)
    setCreateOpen(true)
  }

  function abrirEdicion(obligacion: ObligacionFiscalRow) {
    setFormError(null)
    setFormValues({
      nombre: obligacion.nombre,
      descripcion: obligacion.descripcion,
      periodicidadId: obligacion.periodicidadId,
      prioridad: String(obligacion.prioridad),
    })
    setEditTargetId(obligacion.id)
  }

  function handleGuardar() {
    setFormError(null)
    startTransition(async () => {
      const result = editTargetId
        ? await updateObligacionFiscal(editTargetId, formValues)
        : await createObligacionFiscal(formValues)

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
    const obligacionId = confirmTargetId
    setConfirmTargetId(null)
    setGlobalError(null)
    startTransition(async () => {
      const result = await setObligacionFiscalEstado(obligacionId, 'inactivo')
      if (result.error) {
        setGlobalError(result.error)
        return
      }
      router.refresh()
    })
  }

  function activar(obligacionId: string) {
    setGlobalError(null)
    startTransition(async () => {
      const result = await setObligacionFiscalEstado(obligacionId, 'activo')
      if (result.error) setGlobalError(result.error)
      else router.refresh()
    })
  }

  const formularioAbierto = createOpen || Boolean(editTargetId)
  const periodicidadSeleccionada =
    periodicidadesActivas.find((p) => p.id === formValues.periodicidadId) ?? null
  const periodicidadFiltro =
    periodicidadesActivas.find((p) => p.id === filtroPeriodicidadId) ?? null

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {globalError ? <Alert severity="error">{globalError}</Alert> : null}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        <Autocomplete
          freeSolo
          options={nombresDisponibles}
          inputValue={filtroNombre}
          onInputChange={(_event, value) => setFiltroNombre(value)}
          onChange={(_event, value) => {
            const params = new URLSearchParams()
            if (value?.trim()) params.set('nombre', value.trim())
            if (filtroPeriodicidadId) params.set('periodicidadId', filtroPeriodicidadId)
            if (filtroEstado) params.set('estado', filtroEstado)
            params.set('page', '1')
            router.push(`/catalogos/obligaciones-fiscales?${params.toString()}`)
          }}
          sx={{ minWidth: 220 }}
          renderInput={({ InputLabelProps, InputProps, ...rest }) => (
            <TextField
              {...rest}
              slotProps={{ inputLabel: InputLabelProps, input: InputProps }}
              label="Buscar por nombre"
              size="small"
              onKeyDown={(event) => {
                if (event.key === 'Enter') aplicarFiltros()
              }}
            />
          )}
        />
        <Autocomplete
          options={periodicidadesActivas}
          getOptionLabel={(option) => option.nombre}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          value={periodicidadFiltro}
          onChange={(_event, value) => setFiltroPeriodicidadId(value?.id ?? '')}
          sx={{ minWidth: 200 }}
          renderInput={({ InputLabelProps, InputProps, ...rest }) => (
            <TextField
              {...rest}
              slotProps={{ inputLabel: InputLabelProps, input: InputProps }}
              label="Periodicidad"
              size="small"
            />
          )}
        />
        <Select
          size="small"
          displayEmpty
          value={filtroEstado}
          onChange={(event) => setFiltroEstado(event.target.value)}
        >
          <MenuItem value="">Todos los estados</MenuItem>
          <MenuItem value="activo">Activo</MenuItem>
          <MenuItem value="inactivo">Inactivo</MenuItem>
        </Select>
        <Button variant="outlined" onClick={aplicarFiltros}>
          Buscar
        </Button>
        <Button onClick={limpiarFiltros}>Limpiar filtros</Button>

        <Box sx={{ flexGrow: 1 }} />

        {canManage ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={abrirAlta}>
            Nueva obligación
          </Button>
        ) : null}
      </Box>

      <Paper sx={{ p: 3 }}>
        {obligaciones.length === 0 ? (
          <Typography color="text.secondary">
            No hay obligaciones fiscales que coincidan con los filtros aplicados.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Periodicidad</TableCell>
                <TableCell>Prioridad</TableCell>
                <TableCell>Estado</TableCell>
                {canManage ? <TableCell>Acciones</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {obligaciones.map((obligacion) => (
                <TableRow key={obligacion.id} hover>
                  <TableCell>{obligacion.nombre}</TableCell>
                  <TableCell>{obligacion.periodicidadNombre}</TableCell>
                  <TableCell>{obligacion.prioridad}</TableCell>
                  <TableCell>
                    <StatusChip status={obligacion.estado} />
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Editar obligación">
                          <span>
                            <IconButton
                              size="small"
                              disabled={isPending}
                              onClick={() => abrirEdicion(obligacion)}
                              aria-label="Editar obligación"
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        {obligacion.estado === 'activo' ? (
                          <Tooltip title="Desactivar">
                            <span>
                              <IconButton
                                size="small"
                                disabled={isPending}
                                onClick={() => setConfirmTargetId(obligacion.id)}
                                aria-label="Desactivar obligación"
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
                                onClick={() => activar(obligacion.id)}
                                aria-label="Activar obligación"
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

        {totalPaginas > 1 ? (
          <Pagination
            count={totalPaginas}
            page={paginaActual}
            onChange={(_event, pagina) => irAPagina(pagina)}
            sx={{ mt: 2 }}
          />
        ) : null}
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
          {editTargetId ? 'Editar obligación fiscal' : 'Nueva obligación fiscal'}
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
          <Autocomplete
            options={periodicidadesActivas}
            getOptionLabel={(option) => option.nombre}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={periodicidadSeleccionada}
            onChange={(_event, value) =>
              setFormValues({ ...formValues, periodicidadId: value?.id ?? '' })
            }
            renderInput={({ InputLabelProps, InputProps, size: _size, ...rest }) => (
              <TextField
                {...rest}
                slotProps={{ inputLabel: InputLabelProps, input: InputProps }}
                label="Periodicidad"
                required
                fullWidth
              />
            )}
          />
          <TextField
            label="Prioridad"
            type="number"
            value={formValues.prioridad}
            onChange={(event) => setFormValues({ ...formValues, prioridad: event.target.value })}
            required
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
            disabled={
              isPending ||
              !formValues.nombre.trim() ||
              !formValues.periodicidadId ||
              !formValues.prioridad.trim()
            }
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
            ¿Seguro que deseas desactivar esta obligación fiscal? La información donde ya se usó no
            se ve afectada; solo dejará de estar disponible para agregarse a información nueva.
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
