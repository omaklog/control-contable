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

import { createServicio, setServicioEstado, updateServicio } from './actions'

export interface ServicioRow {
  id: string
  nombre: string
  descripcion: string
  categoria: string
  estado: 'activo' | 'inactivo'
  observaciones: string
}

const VALORES_VACIOS = { nombre: '', descripcion: '', categoria: '', observaciones: '' }

/**
 * Historia 1 de 011-gestion-servicios: catálogo de servicios (listado
 * paginado, filtros por nombre/categoría/estado, crear/editar/activar/
 * desactivar). `canManage` es siempre true aquí — la página ya exige
 * `manage_catalogs` para poder entrar (ver page.tsx).
 */
export function ServiciosClient({
  servicios,
  totalPaginas,
  paginaActual,
  nombre,
  categoria,
  estado,
  canManage,
}: {
  servicios: ServicioRow[]
  totalPaginas: number
  paginaActual: number
  nombre: string
  categoria: string
  estado: string
  canManage: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [globalError, setGlobalError] = useState<string | null>(null)

  const [filtroNombre, setFiltroNombre] = useState(nombre)
  const [filtroCategoria, setFiltroCategoria] = useState(categoria)
  const [filtroEstado, setFiltroEstado] = useState(estado)

  const [createOpen, setCreateOpen] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [formValues, setFormValues] = useState(VALORES_VACIOS)
  const [editTargetId, setEditTargetId] = useState<string | null>(null)
  const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null)

  function irAPagina(pagina: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(pagina))
    router.push(`/servicios?${params.toString()}`)
  }

  function aplicarFiltros() {
    const params = new URLSearchParams()
    if (filtroNombre.trim()) params.set('nombre', filtroNombre.trim())
    if (filtroCategoria.trim()) params.set('categoria', filtroCategoria.trim())
    if (filtroEstado) params.set('estado', filtroEstado)
    params.set('page', '1')
    router.push(`/servicios?${params.toString()}`)
  }

  function limpiarFiltros() {
    setFiltroNombre('')
    setFiltroCategoria('')
    setFiltroEstado('')
    router.push('/servicios')
  }

  function abrirAlta() {
    setFormError(null)
    setFormValues(VALORES_VACIOS)
    setCreateOpen(true)
  }

  function abrirEdicion(servicio: ServicioRow) {
    setFormError(null)
    setFormValues({
      nombre: servicio.nombre,
      descripcion: servicio.descripcion,
      categoria: servicio.categoria,
      observaciones: servicio.observaciones,
    })
    setEditTargetId(servicio.id)
  }

  function handleGuardar() {
    setFormError(null)
    startTransition(async () => {
      const result = editTargetId
        ? await updateServicio(editTargetId, formValues)
        : await createServicio(formValues)

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
    const servicioId = confirmTargetId
    setConfirmTargetId(null)
    setGlobalError(null)
    startTransition(async () => {
      const result = await setServicioEstado(servicioId, 'inactivo')
      if (result.error) {
        setGlobalError(result.error)
        return
      }
      router.refresh()
    })
  }

  function activar(servicioId: string) {
    setGlobalError(null)
    startTransition(async () => {
      const result = await setServicioEstado(servicioId, 'activo')
      if (result.error) setGlobalError(result.error)
      else router.refresh()
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
        <TextField
          label="Categoría"
          size="small"
          value={filtroCategoria}
          onChange={(event) => setFiltroCategoria(event.target.value)}
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
            Crear servicio
          </Button>
        ) : null}
      </Box>

      <Paper sx={{ p: 3 }}>
        {servicios.length === 0 ? (
          <Typography color="text.secondary">
            No hay servicios que coincidan con los filtros aplicados.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Estado</TableCell>
                {canManage ? <TableCell>Acciones</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {servicios.map((servicio) => (
                <TableRow key={servicio.id} hover>
                  <TableCell>{servicio.nombre}</TableCell>
                  <TableCell>{servicio.categoria}</TableCell>
                  <TableCell>{servicio.descripcion || '—'}</TableCell>
                  <TableCell>
                    <StatusChip status={servicio.estado} />
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Editar servicio">
                          <span>
                            <IconButton
                              size="small"
                              disabled={isPending}
                              onClick={() => abrirEdicion(servicio)}
                              aria-label="Editar servicio"
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        {servicio.estado === 'activo' ? (
                          <Tooltip title="Desactivar">
                            <span>
                              <IconButton
                                size="small"
                                disabled={isPending}
                                onClick={() => setConfirmTargetId(servicio.id)}
                                aria-label="Desactivar servicio"
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
                                onClick={() => activar(servicio.id)}
                                aria-label="Activar servicio"
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
        <DialogTitle>{editTargetId ? 'Editar servicio' : 'Crear servicio'}</DialogTitle>
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
            label="Categoría"
            value={formValues.categoria}
            onChange={(event) => setFormValues({ ...formValues, categoria: event.target.value })}
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
          <TextField
            label="Observaciones internas"
            value={formValues.observaciones}
            onChange={(event) =>
              setFormValues({ ...formValues, observaciones: event.target.value })
            }
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
            disabled={isPending || !formValues.nombre.trim() || !formValues.categoria.trim()}
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
            ¿Seguro que deseas desactivar este servicio? Los clientes que ya lo tienen contratado no
            se ven afectados; solo dejará de estar disponible para nuevas asignaciones.
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
