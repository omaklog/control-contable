'use client'

import {
  cargoExtraordinarioFormSchema,
  configuracionCobranzaFormSchema,
  type CargoExtraordinarioFormValues,
  type ConfiguracionCobranzaFormValues,
} from '@control-contable/utils'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
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
import AutorenewIcon from '@mui/icons-material/Autorenew'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { StatusChip } from '@control-contable/ui'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

import {
  actualizarConfiguracionCobranza,
  eliminarCargoExtraordinario,
  generarCobranzas,
  registrarCargoExtraordinario,
} from './actions'

export interface CobranzaRow {
  id: string
  clienteId: string
  clienteNombre: string
  clienteRfc: string
  periodoMes: number
  periodoAnio: number
  fechaLimite: string
  totalConceptos: number
  totalPagado: number
  saldo: number
  estadoPago: 'pendiente' | 'parcial' | 'pagada'
  estadoVencimiento: 'vigente' | 'vencida'
}

export interface ClienteOption {
  id: string
  nombre: string
  rfc: string
}

export interface CargoExtraordinarioRow {
  id: string
  descripcion: string
  monto: number
  periodoMes: number
  periodoAnio: number
  clienteNombre: string
}

const ETIQUETA_ESTADO_PAGO: Record<string, string> = {
  pendiente: 'Pendiente',
  parcial: 'Pago Parcial',
  pagada: 'Pagada',
}

const VARIANTE_ESTADO_PAGO: Record<string, 'positivo' | 'negativo' | 'neutro'> = {
  pendiente: 'neutro',
  parcial: 'neutro',
  pagada: 'positivo',
}

const ETIQUETA_ESTADO_VENCIMIENTO: Record<string, string> = {
  vigente: 'Vigente',
  vencida: 'Vencida',
}

const VARIANTE_ESTADO_VENCIMIENTO: Record<string, 'positivo' | 'negativo' | 'neutro'> = {
  vigente: 'neutro',
  vencida: 'negativo',
}

const MESES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

function formatearMoneda(monto: number): string {
  return monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

/**
 * Bandeja de Cobranza (017-cobranza, US1): lista las cobranzas vigentes con
 * su estado de pago y de vencimiento, ya calculados por la vista
 * `cobranzas_resumen`. La generación manual reutiliza exactamente las mismas
 * reglas que la automática (research.md Decisión 5).
 */
const VALORES_CARGO_VACIOS: CargoExtraordinarioFormValues = {
  descripcion: '',
  monto: '',
  periodoMes: String(new Date().getMonth() + 1),
  periodoAnio: String(new Date().getFullYear()),
}

export interface ConfiguracionCobranza {
  diaGeneracion: number
  diaLimitePago: number
}

export function CobranzaClient({
  cobranzas,
  canManage,
  esAdministrador,
  clientesActivos,
  cargosExtraordinariosPendientes,
  totalPaginas,
  paginaActual,
  rfc,
  cliente,
  mes,
  anio,
  estadoPago,
  estadoVencimiento,
  filtroInicialAsignadoActivo,
  configuracion,
}: {
  cobranzas: CobranzaRow[]
  canManage: boolean
  esAdministrador: boolean
  clientesActivos: ClienteOption[]
  cargosExtraordinariosPendientes: CargoExtraordinarioRow[]
  totalPaginas: number
  paginaActual: number
  rfc: string
  cliente: string
  mes: string
  anio: string
  estadoPago: string
  estadoVencimiento: string
  filtroInicialAsignadoActivo: boolean
  configuracion: ConfiguracionCobranza
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [clienteSeleccionado, setClienteSeleccionado] = useState<ClienteOption | null>(null)
  const [cargoValues, setCargoValues] =
    useState<CargoExtraordinarioFormValues>(VALORES_CARGO_VACIOS)
  const [cargoError, setCargoError] = useState<string | null>(null)

  const [configValues, setConfigValues] = useState<ConfiguracionCobranzaFormValues>({
    diaGeneracion: String(configuracion.diaGeneracion),
    diaLimitePago: String(configuracion.diaLimitePago),
  })
  const [configError, setConfigError] = useState<string | null>(null)
  const [configMensaje, setConfigMensaje] = useState<string | null>(null)

  const [filtroRfc, setFiltroRfc] = useState(rfc)
  const [filtroCliente, setFiltroCliente] = useState(cliente)
  const [filtroMes, setFiltroMes] = useState(mes)
  const [filtroAnio, setFiltroAnio] = useState(anio)
  const [filtroEstadoPago, setFiltroEstadoPago] = useState(estadoPago)
  const [filtroEstadoVencimiento, setFiltroEstadoVencimiento] = useState(estadoVencimiento)

  function irAPagina(pagina: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(pagina))
    router.push(`/cobranza?${params.toString()}`)
  }

  function aplicarFiltros() {
    const params = new URLSearchParams()
    if (filtroRfc.trim()) params.set('rfc', filtroRfc.trim())
    if (filtroCliente.trim()) params.set('cliente', filtroCliente.trim())
    if (filtroMes) params.set('mes', filtroMes)
    if (filtroAnio) params.set('anio', filtroAnio)
    if (filtroEstadoPago) params.set('estadoPago', filtroEstadoPago)
    if (filtroEstadoVencimiento) params.set('estadoVencimiento', filtroEstadoVencimiento)
    if (
      !filtroRfc.trim() &&
      !filtroCliente.trim() &&
      !filtroMes &&
      !filtroAnio &&
      !filtroEstadoPago &&
      !filtroEstadoVencimiento
    ) {
      params.set('todos', '1')
    }
    params.set('page', '1')
    router.push(`/cobranza?${params.toString()}`)
  }

  function limpiarFiltros() {
    setFiltroRfc('')
    setFiltroCliente('')
    setFiltroMes('')
    setFiltroAnio('')
    setFiltroEstadoPago('')
    setFiltroEstadoVencimiento('')
    router.push('/cobranza?todos=1')
  }

  function ejecutarGeneracion() {
    setError(null)
    setMensaje(null)
    startTransition(async () => {
      const result = await generarCobranzas()
      if (result.error) {
        setError(result.error)
        return
      }
      setMensaje(`Se generaron ${result.generadas ?? 0} cobranzas nuevas.`)
      router.refresh()
    })
  }

  function guardarCargoExtraordinario() {
    setCargoError(null)
    if (!clienteSeleccionado) {
      setCargoError('Selecciona el cliente.')
      return
    }
    cargoExtraordinarioFormSchema
      .validate(cargoValues)
      .then(() => {
        startTransition(async () => {
          const result = await registrarCargoExtraordinario(clienteSeleccionado.id, cargoValues)
          if (result.error) {
            setCargoError(result.error)
            return
          }
          setClienteSeleccionado(null)
          setCargoValues(VALORES_CARGO_VACIOS)
          router.refresh()
        })
      })
      .catch((validationError: Error) => setCargoError(validationError.message))
  }

  function quitarCargoExtraordinario(cargoId: string) {
    setCargoError(null)
    startTransition(async () => {
      const result = await eliminarCargoExtraordinario(cargoId)
      if (result.error) {
        setCargoError(result.error)
        return
      }
      router.refresh()
    })
  }

  function guardarConfiguracion() {
    setConfigError(null)
    setConfigMensaje(null)
    configuracionCobranzaFormSchema
      .validate(configValues)
      .then(() => {
        startTransition(async () => {
          const result = await actualizarConfiguracionCobranza(configValues)
          if (result.error) {
            setConfigError(result.error)
            return
          }
          setConfigMensaje('Configuración actualizada. Aplica solo hacia adelante.')
          router.refresh()
        })
      })
      .catch((validationError: Error) => setConfigError(validationError.message))
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {error ? <Alert severity="error">{error}</Alert> : null}
      {mensaje ? <Alert severity="success">{mensaje}</Alert> : null}

      {filtroInicialAsignadoActivo ? (
        <Alert severity="info">
          Mostrando tus clientes asignados con cobranzas pendientes de pago.{' '}
          <Box
            component="span"
            sx={{ cursor: 'pointer', textDecoration: 'underline' }}
            onClick={limpiarFiltros}
          >
            Ver todas las cobranzas que puedo consultar
          </Box>
          .
        </Alert>
      ) : null}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        <TextField
          label="RFC"
          size="small"
          value={filtroRfc}
          onChange={(event) => setFiltroRfc(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && aplicarFiltros()}
        />
        <TextField
          label="Cliente"
          size="small"
          value={filtroCliente}
          onChange={(event) => setFiltroCliente(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && aplicarFiltros()}
        />
        <Select
          size="small"
          displayEmpty
          value={filtroMes}
          onChange={(event) => setFiltroMes(event.target.value)}
        >
          <MenuItem value="">Todos los meses</MenuItem>
          {MESES.map((nombreMes, indice) => (
            <MenuItem key={nombreMes} value={String(indice + 1)}>
              {nombreMes}
            </MenuItem>
          ))}
        </Select>
        <TextField
          label="Año"
          size="small"
          value={filtroAnio}
          onChange={(event) => setFiltroAnio(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && aplicarFiltros()}
        />
        <Select
          size="small"
          displayEmpty
          value={filtroEstadoPago}
          onChange={(event) => setFiltroEstadoPago(event.target.value)}
        >
          <MenuItem value="">Todos los estados de pago</MenuItem>
          <MenuItem value="pendiente">Pendiente</MenuItem>
          <MenuItem value="parcial">Pago Parcial</MenuItem>
          <MenuItem value="pagada">Pagada</MenuItem>
        </Select>
        <Select
          size="small"
          displayEmpty
          value={filtroEstadoVencimiento}
          onChange={(event) => setFiltroEstadoVencimiento(event.target.value)}
        >
          <MenuItem value="">Todos los vencimientos</MenuItem>
          <MenuItem value="vigente">Vigente</MenuItem>
          <MenuItem value="vencida">Vencida</MenuItem>
        </Select>
        <Button variant="outlined" size="small" onClick={aplicarFiltros}>
          Buscar
        </Button>
        <Button size="small" onClick={limpiarFiltros}>
          Limpiar
        </Button>
      </Box>

      {canManage ? (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            startIcon={<AutorenewIcon />}
            disabled={isPending}
            onClick={ejecutarGeneracion}
          >
            Generar cobranzas
          </Button>
        </Box>
      ) : null}

      {cobranzas.length === 0 ? (
        <Typography color="text.secondary">No hay cobranzas para mostrar.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Cliente</TableCell>
              <TableCell>Periodo</TableCell>
              <TableCell>Total</TableCell>
              <TableCell>Pagado</TableCell>
              <TableCell>Saldo</TableCell>
              <TableCell>Estado de pago</TableCell>
              <TableCell>Vencimiento</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {cobranzas.map((cobranza) => (
              <TableRow key={cobranza.id} hover>
                <TableCell>
                  <Link href={`/cobranza/${cobranza.id}`}>
                    {cobranza.clienteNombre} ({cobranza.clienteRfc})
                  </Link>
                </TableCell>
                <TableCell>
                  {MESES[cobranza.periodoMes - 1]} {cobranza.periodoAnio}
                </TableCell>
                <TableCell>{formatearMoneda(cobranza.totalConceptos)}</TableCell>
                <TableCell>{formatearMoneda(cobranza.totalPagado)}</TableCell>
                <TableCell>{formatearMoneda(cobranza.saldo)}</TableCell>
                <TableCell>
                  <StatusChip
                    status={cobranza.estadoPago}
                    variant={VARIANTE_ESTADO_PAGO[cobranza.estadoPago] ?? 'neutro'}
                    label={ETIQUETA_ESTADO_PAGO[cobranza.estadoPago] ?? cobranza.estadoPago}
                  />
                </TableCell>
                <TableCell>
                  <StatusChip
                    status={cobranza.estadoVencimiento}
                    variant={VARIANTE_ESTADO_VENCIMIENTO[cobranza.estadoVencimiento] ?? 'neutro'}
                    label={
                      ETIQUETA_ESTADO_VENCIMIENTO[cobranza.estadoVencimiento] ??
                      cobranza.estadoVencimiento
                    }
                  />
                </TableCell>
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
        />
      ) : null}

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Cargos Extraordinarios pendientes
        </Typography>
        {cargoError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {cargoError}
          </Alert>
        ) : null}

        {cargosExtraordinariosPendientes.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            No hay cargos extraordinarios pendientes de incorporar.
          </Typography>
        ) : (
          <Table size="small" sx={{ mb: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Monto</TableCell>
                <TableCell>Periodo objetivo</TableCell>
                {canManage ? <TableCell>Acciones</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {cargosExtraordinariosPendientes.map((cargo) => (
                <TableRow key={cargo.id} hover>
                  <TableCell>{cargo.clienteNombre}</TableCell>
                  <TableCell>{cargo.descripcion}</TableCell>
                  <TableCell>{formatearMoneda(cargo.monto)}</TableCell>
                  <TableCell>
                    {MESES[cargo.periodoMes - 1]} {cargo.periodoAnio}
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <Tooltip title="Eliminar">
                        <span>
                          <IconButton
                            size="small"
                            disabled={isPending}
                            onClick={() => quitarCargoExtraordinario(cargo.id)}
                            aria-label="Eliminar cargo extraordinario"
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
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Autocomplete
              options={clientesActivos}
              getOptionLabel={(option) => `${option.nombre} (${option.rfc})`}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              value={clienteSeleccionado}
              onChange={(_event, value) => setClienteSeleccionado(value)}
              sx={{ minWidth: 240 }}
              renderInput={({ InputLabelProps, InputProps, size: _size, ...rest }) => (
                <TextField
                  {...rest}
                  slotProps={{ inputLabel: InputLabelProps, input: InputProps }}
                  label="Cliente"
                  size="small"
                />
              )}
            />
            <TextField
              label="Descripción"
              size="small"
              value={cargoValues.descripcion}
              onChange={(event) =>
                setCargoValues({ ...cargoValues, descripcion: event.target.value })
              }
            />
            <TextField
              label="Monto"
              type="number"
              size="small"
              value={cargoValues.monto}
              onChange={(event) => setCargoValues({ ...cargoValues, monto: event.target.value })}
            />
            <TextField
              label="Mes objetivo"
              type="number"
              size="small"
              value={cargoValues.periodoMes}
              onChange={(event) =>
                setCargoValues({ ...cargoValues, periodoMes: event.target.value })
              }
              sx={{ width: 120 }}
            />
            <TextField
              label="Año objetivo"
              type="number"
              size="small"
              value={cargoValues.periodoAnio}
              onChange={(event) =>
                setCargoValues({ ...cargoValues, periodoAnio: event.target.value })
              }
              sx={{ width: 120 }}
            />
            <Button variant="outlined" disabled={isPending} onClick={guardarCargoExtraordinario}>
              Registrar cargo
            </Button>
          </Box>
        ) : null}
      </Paper>

      {esAdministrador ? (
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Configuración de Cobranza
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Los cambios aplican solo hacia adelante — no alteran cobranzas ya generadas.
          </Typography>
          {configError ? (
            <Alert severity="error" sx={{ mb: 2 }}>
              {configError}
            </Alert>
          ) : null}
          {configMensaje ? (
            <Alert severity="success" sx={{ mb: 2 }}>
              {configMensaje}
            </Alert>
          ) : null}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <TextField
              label="Día de generación automática"
              type="number"
              size="small"
              value={configValues.diaGeneracion}
              onChange={(event) =>
                setConfigValues({ ...configValues, diaGeneracion: event.target.value })
              }
            />
            <TextField
              label="Día límite de pago"
              type="number"
              size="small"
              value={configValues.diaLimitePago}
              onChange={(event) =>
                setConfigValues({ ...configValues, diaLimitePago: event.target.value })
              }
            />
            <Button variant="outlined" disabled={isPending} onClick={guardarConfiguracion}>
              Guardar configuración
            </Button>
          </Box>
        </Paper>
      ) : null}
    </Box>
  )
}
