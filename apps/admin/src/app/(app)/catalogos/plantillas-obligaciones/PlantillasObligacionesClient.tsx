'use client'

import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted'
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
  agregarItemPlantilla,
  createPlantillaObligaciones,
  obtenerItemsPlantilla,
  quitarItemPlantilla,
  setPlantillaObligacionesEstado,
  updatePlantillaObligaciones,
  type PlantillaItemRow,
} from './actions'

export interface PlantillaObligacionesRow {
  id: string
  nombre: string
  descripcion: string
  estado: 'activo' | 'inactivo'
}

interface OpcionCatalogo {
  id: string
  nombre: string
}

const VALORES_VACIOS = { nombre: '', descripcion: '' }
const VALORES_ITEM_VACIOS = { obligacionFiscalId: '', periodicidadId: '', orden: '' }

/**
 * Historia 2 de 014-obligaciones-fiscales-cliente: catálogo editable de
 * Plantillas de Obligaciones — tabla + Dialog de alta/edición, más un
 * segundo Dialog para administrar la lista ordenada de ítems de cada
 * plantilla, cargados bajo demanda (actions.ts, obtenerItemsPlantilla).
 */
export function PlantillasObligacionesClient({
  plantillas,
  obligacionesActivas,
  periodicidadesActivas,
  totalPaginas,
  paginaActual,
  nombre,
  estado,
  canManage,
}: {
  plantillas: PlantillaObligacionesRow[]
  obligacionesActivas: OpcionCatalogo[]
  periodicidadesActivas: OpcionCatalogo[]
  totalPaginas: number
  paginaActual: number
  nombre: string
  estado: string
  canManage: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [globalError, setGlobalError] = useState<string | null>(null)

  const [filtroNombre, setFiltroNombre] = useState(nombre)
  const [filtroEstado, setFiltroEstado] = useState(estado)

  const [createOpen, setCreateOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formValues, setFormValues] = useState(VALORES_VACIOS)
  const [editTargetId, setEditTargetId] = useState<string | null>(null)

  const [itemsTarget, setItemsTarget] = useState<PlantillaObligacionesRow | null>(null)
  const [items, setItems] = useState<PlantillaItemRow[]>([])
  const [itemsError, setItemsError] = useState<string | null>(null)
  const [itemFormValues, setItemFormValues] = useState(VALORES_ITEM_VACIOS)
  const [itemFormError, setItemFormError] = useState<string | null>(null)

  function irAPagina(pagina: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(pagina))
    router.push(`/catalogos/plantillas-obligaciones?${params.toString()}`)
  }

  function aplicarFiltros() {
    const params = new URLSearchParams()
    if (filtroNombre.trim()) params.set('nombre', filtroNombre.trim())
    if (filtroEstado) params.set('estado', filtroEstado)
    params.set('page', '1')
    router.push(`/catalogos/plantillas-obligaciones?${params.toString()}`)
  }

  function limpiarFiltros() {
    setFiltroNombre('')
    setFiltroEstado('')
    router.push('/catalogos/plantillas-obligaciones')
  }

  function abrirAlta() {
    setFormError(null)
    setFormValues(VALORES_VACIOS)
    setCreateOpen(true)
  }

  function abrirEdicion(plantilla: PlantillaObligacionesRow) {
    setFormError(null)
    setFormValues({ nombre: plantilla.nombre, descripcion: plantilla.descripcion })
    setEditTargetId(plantilla.id)
  }

  function handleGuardar() {
    setFormError(null)
    startTransition(async () => {
      const result = editTargetId
        ? await updatePlantillaObligaciones(editTargetId, formValues)
        : await createPlantillaObligaciones(formValues)

      if (result.error) {
        setFormError(result.error)
        return
      }
      setCreateOpen(false)
      setEditTargetId(null)
      router.refresh()
    })
  }

  function cambiarEstado(plantillaId: string, nuevoEstado: 'activo' | 'inactivo') {
    setGlobalError(null)
    startTransition(async () => {
      const result = await setPlantillaObligacionesEstado(plantillaId, nuevoEstado)
      if (result.error) setGlobalError(result.error)
      else router.refresh()
    })
  }

  async function abrirItems(plantilla: PlantillaObligacionesRow) {
    setItemsTarget(plantilla)
    setItemsError(null)
    setItems([])
    setItemFormValues(VALORES_ITEM_VACIOS)
    setItemFormError(null)
    const result = await obtenerItemsPlantilla(plantilla.id)
    if (result.error) {
      setItemsError(result.error)
      return
    }
    setItems(result.items)
  }

  function agregarItem() {
    if (!itemsTarget) return
    setItemFormError(null)
    startTransition(async () => {
      const result = await agregarItemPlantilla(itemsTarget.id, itemFormValues)
      if (result.error) {
        setItemFormError(result.error)
        return
      }
      setItemFormValues(VALORES_ITEM_VACIOS)
      const refreshed = await obtenerItemsPlantilla(itemsTarget.id)
      if (!refreshed.error) setItems(refreshed.items)
      router.refresh()
    })
  }

  function quitarItem(itemId: string) {
    if (!itemsTarget) return
    setItemFormError(null)
    startTransition(async () => {
      const result = await quitarItemPlantilla(itemId)
      if (result.error) {
        setItemFormError(result.error)
        return
      }
      const refreshed = await obtenerItemsPlantilla(itemsTarget.id)
      if (!refreshed.error) setItems(refreshed.items)
      router.refresh()
    })
  }

  const formularioAbierto = createOpen || Boolean(editTargetId)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {globalError ? <Alert severity="error">{globalError}</Alert> : null}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        <TextField
          label="Nombre"
          size="small"
          value={filtroNombre}
          onChange={(event) => setFiltroNombre(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') aplicarFiltros()
          }}
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
            Nueva plantilla
          </Button>
        ) : null}
      </Box>

      <Paper sx={{ p: 3 }}>
        {plantillas.length === 0 ? (
          <Typography color="text.secondary">
            No hay plantillas que coincidan con los filtros aplicados.
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
              {plantillas.map((plantilla) => (
                <TableRow key={plantilla.id} hover>
                  <TableCell>{plantilla.nombre}</TableCell>
                  <TableCell>{plantilla.descripcion || '—'}</TableCell>
                  <TableCell>
                    <StatusChip status={plantilla.estado} />
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Ítems de la plantilla">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => abrirItems(plantilla)}
                              aria-label="Ítems de la plantilla"
                            >
                              <FormatListBulletedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Editar plantilla">
                          <span>
                            <IconButton
                              size="small"
                              disabled={isPending}
                              onClick={() => abrirEdicion(plantilla)}
                              aria-label="Editar plantilla"
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        {plantilla.estado === 'activo' ? (
                          <Tooltip title="Desactivar">
                            <span>
                              <IconButton
                                size="small"
                                disabled={isPending}
                                onClick={() => cambiarEstado(plantilla.id, 'inactivo')}
                                aria-label="Desactivar plantilla"
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
                                onClick={() => cambiarEstado(plantilla.id, 'activo')}
                                aria-label="Activar plantilla"
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
        <DialogTitle>{editTargetId ? 'Editar plantilla' : 'Nueva plantilla'}</DialogTitle>
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

      <Dialog
        open={Boolean(itemsTarget)}
        onClose={() => setItemsTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ítems de "{itemsTarget?.nombre}"</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {itemsError ? <Alert severity="error">{itemsError}</Alert> : null}
          {itemFormError ? <Alert severity="error">{itemFormError}</Alert> : null}

          {items.length === 0 ? (
            <Typography color="text.secondary">Esta plantilla no tiene ítems todavía.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Obligación</TableCell>
                  <TableCell>Periodicidad</TableCell>
                  <TableCell>Orden</TableCell>
                  <TableCell />
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.obligacionFiscalNombre}</TableCell>
                    <TableCell>{item.periodicidadNombre}</TableCell>
                    <TableCell>{item.orden}</TableCell>
                    <TableCell>
                      <Tooltip title="Quitar de la plantilla">
                        <span>
                          <IconButton
                            size="small"
                            disabled={isPending}
                            onClick={() => quitarItem(item.id)}
                            aria-label="Quitar ítem"
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Typography variant="subtitle2">Agregar obligación</Typography>
          <Autocomplete
            options={obligacionesActivas}
            getOptionLabel={(option) => option.nombre}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={
              obligacionesActivas.find(
                (option) => option.id === itemFormValues.obligacionFiscalId,
              ) ?? null
            }
            onChange={(_event, value) =>
              setItemFormValues({ ...itemFormValues, obligacionFiscalId: value?.id ?? '' })
            }
            renderInput={({ InputLabelProps, InputProps, size: _size, ...rest }) => (
              <TextField
                {...rest}
                slotProps={{ inputLabel: InputLabelProps, input: InputProps }}
                label="Obligación fiscal"
                fullWidth
              />
            )}
          />
          <Autocomplete
            options={periodicidadesActivas}
            getOptionLabel={(option) => option.nombre}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={
              periodicidadesActivas.find((option) => option.id === itemFormValues.periodicidadId) ??
              null
            }
            onChange={(_event, value) =>
              setItemFormValues({ ...itemFormValues, periodicidadId: value?.id ?? '' })
            }
            renderInput={({ InputLabelProps, InputProps, size: _size, ...rest }) => (
              <TextField
                {...rest}
                slotProps={{ inputLabel: InputLabelProps, input: InputProps }}
                label="Periodicidad"
                fullWidth
              />
            )}
          />
          <TextField
            label="Orden"
            type="number"
            value={itemFormValues.orden}
            onChange={(event) =>
              setItemFormValues({ ...itemFormValues, orden: event.target.value })
            }
            fullWidth
          />
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            disabled={
              isPending ||
              !itemFormValues.obligacionFiscalId ||
              !itemFormValues.periodicidadId ||
              !itemFormValues.orden.trim()
            }
            onClick={agregarItem}
          >
            Agregar a la plantilla
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setItemsTarget(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
