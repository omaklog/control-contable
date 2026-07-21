'use client'

import type { CumplimientoExtraordinarioFormValues } from '@control-contable/utils'
import AddIcon from '@mui/icons-material/Add'
import AutorenewIcon from '@mui/icons-material/Autorenew'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
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
import Typography from '@mui/material/Typography'
import { StatusChip } from '@control-contable/ui'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useState, useTransition } from 'react'

import { crearCumplimientoExtraordinario, generarCumplimientos } from './actions'

export interface CumplimientoFiscalRow {
  id: string
  clienteId: string
  clienteNombre: string
  clienteRfc: string
  obligacionNombre: string
  periodoEtiqueta: string
  periodoInicio: string
  fechaLimite: string
  estado: 'pendiente' | 'en_proceso' | 'presentada' | 'no_aplica'
  vencida: boolean
  responsableId: string | null
  responsableNombre: string
  esExtraordinario: boolean
  totalDocumentos: number
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

const VALORES_EXTRAORDINARIO_VACIOS: CumplimientoExtraordinarioFormValues = {
  obligacionFiscalId: '',
  descripcion: '',
  periodoInicio: '',
  periodoFin: '',
  fechaLimite: '',
  responsableId: '',
}

interface OpcionCliente {
  id: string
  nombre: string
  rfc: string
}

interface OpcionCatalogo {
  id: string
  nombre: string
}

/**
 * Historia 1 (bandeja + generación) e Historia 4 (extraordinarios) de
 * 015-control-cumplimiento-fiscal. "Vencida" ya llega calculada desde
 * page.tsx (Clarifications) — este componente solo la muestra.
 */
export function ObligacionesFiscalesClient({
  cumplimientos,
  clientesActivos,
  obligacionesActivas,
  responsablesActivos,
  totalPaginas,
  paginaActual,
  cliente,
  rfc,
  obligacion,
  periodo,
  estado,
  responsable,
  canManage,
}: {
  cumplimientos: CumplimientoFiscalRow[]
  clientesActivos: OpcionCliente[]
  obligacionesActivas: OpcionCatalogo[]
  responsablesActivos: OpcionCatalogo[]
  totalPaginas: number
  paginaActual: number
  cliente: string
  rfc: string
  obligacion: string
  periodo: string
  estado: string
  responsable: string
  canManage: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [globalMensaje, setGlobalMensaje] = useState<string | null>(null)

  const [filtroCliente, setFiltroCliente] = useState(cliente)
  const [filtroRfc, setFiltroRfc] = useState(rfc)
  const [filtroObligacion, setFiltroObligacion] = useState(obligacion)
  const [filtroPeriodo, setFiltroPeriodo] = useState(periodo)
  const [filtroEstado, setFiltroEstado] = useState(estado)
  const [filtroResponsable, setFiltroResponsable] = useState(responsable)

  const [extraordinarioOpen, setExtraordinarioOpen] = useState(false)
  const [extraordinarioValues, setExtraordinarioValues] = useState(VALORES_EXTRAORDINARIO_VACIOS)
  const [extraordinarioError, setExtraordinarioError] = useState<string | null>(null)
  const [extraordinarioClienteId, setExtraordinarioClienteId] = useState('')

  function irAPagina(pagina: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(pagina))
    router.push(`/obligaciones-fiscales?${params.toString()}`)
  }

  function aplicarFiltros() {
    const params = new URLSearchParams()
    if (filtroCliente.trim()) params.set('cliente', filtroCliente.trim())
    if (filtroRfc.trim()) params.set('rfc', filtroRfc.trim())
    if (filtroObligacion.trim()) params.set('obligacion', filtroObligacion.trim())
    if (filtroPeriodo.trim()) params.set('periodo', filtroPeriodo.trim())
    if (filtroEstado) params.set('estado', filtroEstado)
    if (filtroResponsable.trim()) params.set('responsable', filtroResponsable.trim())
    params.set('page', '1')
    router.push(`/obligaciones-fiscales?${params.toString()}`)
  }

  function limpiarFiltros() {
    setFiltroCliente('')
    setFiltroRfc('')
    setFiltroObligacion('')
    setFiltroPeriodo('')
    setFiltroEstado('')
    setFiltroResponsable('')
    router.push('/obligaciones-fiscales')
  }

  function ejecutarGeneracion() {
    setGlobalError(null)
    setGlobalMensaje(null)
    startTransition(async () => {
      const result = await generarCumplimientos()
      if (result.error) {
        setGlobalError(result.error)
        return
      }
      setGlobalMensaje(`Se generaron ${result.generados ?? 0} cumplimientos nuevos.`)
      router.refresh()
    })
  }

  function abrirExtraordinario() {
    setExtraordinarioError(null)
    setExtraordinarioValues(VALORES_EXTRAORDINARIO_VACIOS)
    setExtraordinarioClienteId('')
    setExtraordinarioOpen(true)
  }

  function guardarExtraordinario() {
    if (!extraordinarioClienteId) {
      setExtraordinarioError('Selecciona el cliente.')
      return
    }
    setExtraordinarioError(null)
    startTransition(async () => {
      const result = await crearCumplimientoExtraordinario(
        extraordinarioClienteId,
        extraordinarioValues,
      )
      if (result.error) {
        setExtraordinarioError(result.error)
        return
      }
      setExtraordinarioOpen(false)
      router.refresh()
    })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {globalError ? <Alert severity="error">{globalError}</Alert> : null}
      {globalMensaje ? <Alert severity="success">{globalMensaje}</Alert> : null}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        <TextField
          label="Cliente"
          size="small"
          value={filtroCliente}
          onChange={(event) => setFiltroCliente(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') aplicarFiltros()
          }}
        />
        <TextField
          label="RFC"
          size="small"
          value={filtroRfc}
          onChange={(event) => setFiltroRfc(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') aplicarFiltros()
          }}
        />
        <TextField
          label="Obligación"
          size="small"
          value={filtroObligacion}
          onChange={(event) => setFiltroObligacion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') aplicarFiltros()
          }}
        />
        <TextField
          label="Periodo"
          size="small"
          value={filtroPeriodo}
          onChange={(event) => setFiltroPeriodo(event.target.value)}
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
          <MenuItem value="vencida">Vencida</MenuItem>
          <MenuItem value="pendiente">Pendiente</MenuItem>
          <MenuItem value="en_proceso">En proceso</MenuItem>
          <MenuItem value="presentada">Presentada</MenuItem>
          <MenuItem value="no_aplica">No aplica</MenuItem>
        </Select>
        <TextField
          label="Responsable"
          size="small"
          value={filtroResponsable}
          onChange={(event) => setFiltroResponsable(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') aplicarFiltros()
          }}
        />
        <Button variant="outlined" onClick={aplicarFiltros}>
          Buscar
        </Button>
        <Button onClick={limpiarFiltros}>Limpiar filtros</Button>

        <Box sx={{ flexGrow: 1 }} />

        {canManage ? (
          <>
            <Button
              variant="outlined"
              startIcon={<AutorenewIcon />}
              disabled={isPending}
              onClick={ejecutarGeneracion}
            >
              Generar cumplimientos
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={abrirExtraordinario}>
              Registrar extraordinario
            </Button>
          </>
        ) : null}
      </Box>

      <Paper sx={{ p: 3 }}>
        {cumplimientos.length === 0 ? (
          <Typography color="text.secondary">
            No hay cumplimientos que coincidan con los filtros aplicados.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>RFC</TableCell>
                <TableCell>Obligación</TableCell>
                <TableCell>Periodo</TableCell>
                <TableCell>Fecha límite</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Responsable</TableCell>
                <TableCell>Documentos</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cumplimientos.map((cumplimiento) => {
                const estadoMostrado = cumplimiento.vencida ? 'vencida' : cumplimiento.estado
                return (
                  <TableRow
                    key={cumplimiento.id}
                    hover
                    component={Link}
                    href={`/obligaciones-fiscales/${cumplimiento.id}`}
                    sx={{ textDecoration: 'none', cursor: 'pointer' }}
                  >
                    <TableCell>{cumplimiento.clienteNombre}</TableCell>
                    <TableCell>{cumplimiento.clienteRfc}</TableCell>
                    <TableCell>{cumplimiento.obligacionNombre || '—'}</TableCell>
                    <TableCell>{cumplimiento.periodoEtiqueta}</TableCell>
                    <TableCell>{cumplimiento.fechaLimite}</TableCell>
                    <TableCell>
                      <StatusChip
                        status={estadoMostrado}
                        variant={VARIANTE_ESTADO[estadoMostrado] ?? 'neutro'}
                        label={ETIQUETA_ESTADO[estadoMostrado] ?? estadoMostrado}
                      />
                    </TableCell>
                    <TableCell>{cumplimiento.responsableNombre || '—'}</TableCell>
                    <TableCell>{cumplimiento.totalDocumentos}</TableCell>
                  </TableRow>
                )
              })}
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
        open={extraordinarioOpen}
        onClose={() => setExtraordinarioOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Registrar cumplimiento extraordinario</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {extraordinarioError ? <Alert severity="error">{extraordinarioError}</Alert> : null}
          <Autocomplete
            options={clientesActivos}
            getOptionLabel={(option) => `${option.nombre} (${option.rfc})`}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={clientesActivos.find((option) => option.id === extraordinarioClienteId) ?? null}
            onChange={(_event, value) => setExtraordinarioClienteId(value?.id ?? '')}
            renderInput={({ InputLabelProps, InputProps, size: _size, ...rest }) => (
              <TextField
                {...rest}
                slotProps={{ inputLabel: InputLabelProps, input: InputProps }}
                label="Cliente"
                required
                fullWidth
              />
            )}
          />
          <Autocomplete
            options={obligacionesActivas}
            getOptionLabel={(option) => option.nombre}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={
              obligacionesActivas.find(
                (option) => option.id === extraordinarioValues.obligacionFiscalId,
              ) ?? null
            }
            onChange={(_event, value) =>
              setExtraordinarioValues({
                ...extraordinarioValues,
                obligacionFiscalId: value?.id ?? '',
              })
            }
            renderInput={({ InputLabelProps, InputProps, size: _size, ...rest }) => (
              <TextField
                {...rest}
                slotProps={{ inputLabel: InputLabelProps, input: InputProps }}
                label="Obligación del catálogo (opcional)"
                fullWidth
              />
            )}
          />
          <TextField
            label="Descripción"
            helperText="Obligatoria si no seleccionas una obligación del catálogo"
            value={extraordinarioValues.descripcion}
            onChange={(event) =>
              setExtraordinarioValues({ ...extraordinarioValues, descripcion: event.target.value })
            }
            multiline
            minRows={2}
            fullWidth
          />
          <TextField
            label="Periodo — inicio"
            type="date"
            value={extraordinarioValues.periodoInicio}
            onChange={(event) =>
              setExtraordinarioValues({
                ...extraordinarioValues,
                periodoInicio: event.target.value,
              })
            }
            slotProps={{ inputLabel: { shrink: true } }}
            required
            fullWidth
          />
          <TextField
            label="Periodo — fin"
            type="date"
            value={extraordinarioValues.periodoFin}
            onChange={(event) =>
              setExtraordinarioValues({ ...extraordinarioValues, periodoFin: event.target.value })
            }
            slotProps={{ inputLabel: { shrink: true } }}
            required
            fullWidth
          />
          <TextField
            label="Fecha límite"
            type="date"
            value={extraordinarioValues.fechaLimite}
            onChange={(event) =>
              setExtraordinarioValues({ ...extraordinarioValues, fechaLimite: event.target.value })
            }
            slotProps={{ inputLabel: { shrink: true } }}
            required
            fullWidth
          />
          <Autocomplete
            options={responsablesActivos}
            getOptionLabel={(option) => option.nombre}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={
              responsablesActivos.find(
                (option) => option.id === extraordinarioValues.responsableId,
              ) ?? null
            }
            onChange={(_event, value) =>
              setExtraordinarioValues({ ...extraordinarioValues, responsableId: value?.id ?? '' })
            }
            renderInput={({ InputLabelProps, InputProps, size: _size, ...rest }) => (
              <TextField
                {...rest}
                slotProps={{ inputLabel: InputLabelProps, input: InputProps }}
                label="Responsable (opcional)"
                fullWidth
              />
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExtraordinarioOpen(false)}>Cancelar</Button>
          <Button variant="contained" disabled={isPending} onClick={guardarExtraordinario}>
            {isPending ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
