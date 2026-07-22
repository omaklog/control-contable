'use client'

import { pagoCobranzaFormSchema, type PagoCobranzaFormValues } from '@control-contable/utils'
import { StatusChip } from '@control-contable/ui'
import Alert from '@mui/material/Alert'
import Autocomplete from '@mui/material/Autocomplete'
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
import BlockIcon from '@mui/icons-material/Block'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export interface CobranzaDetalle {
  id: string
  clienteNombre: string
  clienteRfc: string
  periodoMes: number
  periodoAnio: number
  fechaLimite: string
  estado: 'vigente' | 'cancelada' | 'eliminada'
  totalConceptos: number
  totalPagado: number
  saldo: number
  estadoPago: 'pendiente' | 'parcial' | 'pagada'
  estadoVencimiento: 'vigente' | 'vencida'
}

export interface ConceptoRow {
  id: string
  descripcion: string
  monto: number
  tipo: 'servicio_recurrente' | 'cargo_extraordinario'
  fechaIncorporacion: string
}

export interface PagoRow {
  id: string
  monto: number
  fechaPago: string
  comentario: string | null
  metodoPagoNombre: string
}

interface OpcionMetodoPago {
  id: string
  nombre: string
}

interface ActionResult {
  error: string | null
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

const ETIQUETA_TIPO_CONCEPTO: Record<string, string> = {
  servicio_recurrente: 'Servicio recurrente',
  cargo_extraordinario: 'Cargo extraordinario',
}

function formatearMoneda(monto: number): string {
  return monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

const VALORES_PAGO_VACIOS: PagoCobranzaFormValues = {
  monto: '',
  metodoPagoId: '',
  fechaPago: new Date().toISOString().slice(0, 10),
  comentario: '',
}

/**
 * Detalle de una Cobranza (017-cobranza, US2): conceptos congelados, pagos
 * registrados, saldo y estados (siempre recibidos ya calculados desde
 * `cobranzas_resumen`, page.tsx). El formulario de pago solo se muestra
 * cuando la cobranza está vigente.
 */
export function CobranzaDetalleClient({
  cobranza,
  conceptos,
  pagos,
  metodosPagoDisponibles,
  canManage,
  onRegistrarPago,
  onEliminarCobranza,
  onCancelarCobranza,
}: {
  cobranza: CobranzaDetalle
  conceptos: ConceptoRow[]
  pagos: PagoRow[]
  metodosPagoDisponibles: OpcionMetodoPago[]
  canManage: boolean
  onRegistrarPago: (values: PagoCobranzaFormValues) => Promise<ActionResult>
  onEliminarCobranza: () => Promise<ActionResult>
  onCancelarCobranza: () => Promise<ActionResult>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formValues, setFormValues] = useState<PagoCobranzaFormValues>(VALORES_PAGO_VACIOS)
  const [formError, setFormError] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [confirmEliminar, setConfirmEliminar] = useState(false)
  const [confirmCancelar, setConfirmCancelar] = useState(false)

  const metodoSeleccionado =
    metodosPagoDisponibles.find((m) => m.id === formValues.metodoPagoId) ?? null
  const sinPagos = pagos.length === 0

  function registrarPago() {
    setFormError(null)
    pagoCobranzaFormSchema
      .validate(formValues)
      .then(() => {
        startTransition(async () => {
          const result = await onRegistrarPago(formValues)
          if (result.error) {
            setFormError(result.error)
            return
          }
          setFormValues(VALORES_PAGO_VACIOS)
          router.refresh()
        })
      })
      .catch((validationError: Error) => setFormError(validationError.message))
  }

  function confirmarEliminar() {
    setConfirmEliminar(false)
    setGlobalError(null)
    startTransition(async () => {
      const result = await onEliminarCobranza()
      if (result.error) {
        setGlobalError(result.error)
        return
      }
      router.refresh()
    })
  }

  function confirmarCancelar() {
    setConfirmCancelar(false)
    setGlobalError(null)
    startTransition(async () => {
      const result = await onCancelarCobranza()
      if (result.error) {
        setGlobalError(result.error)
        return
      }
      router.refresh()
    })
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
              status={cobranza.estadoPago}
              variant={VARIANTE_ESTADO_PAGO[cobranza.estadoPago] ?? 'neutro'}
              label={ETIQUETA_ESTADO_PAGO[cobranza.estadoPago] ?? cobranza.estadoPago}
            />
            <StatusChip
              status={cobranza.estadoVencimiento}
              variant={VARIANTE_ESTADO_VENCIMIENTO[cobranza.estadoVencimiento] ?? 'neutro'}
              label={
                ETIQUETA_ESTADO_VENCIMIENTO[cobranza.estadoVencimiento] ??
                cobranza.estadoVencimiento
              }
            />
            {cobranza.estado !== 'vigente' ? (
              <StatusChip
                status={cobranza.estado}
                variant="neutro"
                label={cobranza.estado === 'cancelada' ? 'Cancelada' : 'Eliminada'}
              />
            ) : null}
            {canManage && cobranza.estado === 'vigente' ? (
              <>
                {sinPagos ? (
                  <Tooltip title="Eliminar cobranza">
                    <span>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={isPending}
                        onClick={() => setConfirmEliminar(true)}
                        aria-label="Eliminar cobranza"
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                ) : null}
                <Tooltip title="Cancelar / anular cobranza">
                  <span>
                    <IconButton
                      size="small"
                      color="error"
                      disabled={isPending}
                      onClick={() => setConfirmCancelar(true)}
                      aria-label="Cancelar cobranza"
                    >
                      <BlockIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </>
            ) : null}
          </Box>
        </Box>

        <Box
          sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Cliente
            </Typography>
            <Typography>
              {cobranza.clienteNombre} ({cobranza.clienteRfc})
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Fecha límite
            </Typography>
            <Typography>{cobranza.fechaLimite}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Saldo pendiente
            </Typography>
            <Typography>{formatearMoneda(cobranza.saldo)}</Typography>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Conceptos
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Descripción</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Monto</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {conceptos.map((concepto) => (
              <TableRow key={concepto.id} hover>
                <TableCell>{concepto.descripcion}</TableCell>
                <TableCell>{ETIQUETA_TIPO_CONCEPTO[concepto.tipo] ?? concepto.tipo}</TableCell>
                <TableCell>{formatearMoneda(concepto.monto)}</TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell colSpan={2}>
                <strong>Total</strong>
              </TableCell>
              <TableCell>
                <strong>{formatearMoneda(cobranza.totalConceptos)}</strong>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Pagos
        </Typography>
        {pagos.length === 0 ? (
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Esta cobranza no tiene pagos registrados todavía.
          </Typography>
        ) : (
          <Table size="small" sx={{ mb: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Método</TableCell>
                <TableCell>Monto</TableCell>
                <TableCell>Comentario</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagos.map((pago) => (
                <TableRow key={pago.id} hover>
                  <TableCell>{new Date(pago.fechaPago).toLocaleDateString('es-MX')}</TableCell>
                  <TableCell>{pago.metodoPagoNombre}</TableCell>
                  <TableCell>{formatearMoneda(pago.monto)}</TableCell>
                  <TableCell>{pago.comentario ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {canManage && cobranza.estado === 'vigente' ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {formError ? <Alert severity="error">{formError}</Alert> : null}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <TextField
                label="Monto"
                type="number"
                size="small"
                value={formValues.monto}
                onChange={(event) => setFormValues({ ...formValues, monto: event.target.value })}
              />
              <Autocomplete
                options={metodosPagoDisponibles}
                getOptionLabel={(option) => option.nombre}
                isOptionEqualToValue={(option, value) => option.id === value.id}
                value={metodoSeleccionado}
                onChange={(_event, value) =>
                  setFormValues({ ...formValues, metodoPagoId: value?.id ?? '' })
                }
                sx={{ minWidth: 200 }}
                renderInput={({ InputLabelProps, InputProps, size: _size, ...rest }) => (
                  <TextField
                    {...rest}
                    slotProps={{ inputLabel: InputLabelProps, input: InputProps }}
                    label="Método de pago"
                    size="small"
                  />
                )}
              />
              <TextField
                label="Fecha de pago"
                type="date"
                size="small"
                value={formValues.fechaPago}
                onChange={(event) =>
                  setFormValues({ ...formValues, fechaPago: event.target.value })
                }
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Comentario"
                size="small"
                value={formValues.comentario}
                onChange={(event) =>
                  setFormValues({ ...formValues, comentario: event.target.value })
                }
              />
              <Button variant="contained" disabled={isPending} onClick={registrarPago}>
                {isPending ? 'Registrando…' : 'Registrar pago'}
              </Button>
            </Box>
          </Box>
        ) : null}
      </Paper>

      <Dialog open={confirmEliminar} onClose={() => setConfirmEliminar(false)}>
        <DialogTitle>Eliminar cobranza</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Seguro que deseas eliminar esta cobranza? Dejará de aparecer en la bandeja operativa,
            pero se conservará para auditoría. Esta acción solo está disponible mientras no tenga
            pagos registrados.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmEliminar(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmarEliminar}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={confirmCancelar} onClose={() => setConfirmCancelar(false)}>
        <DialogTitle>Cancelar / anular cobranza</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Seguro que deseas cancelar o anular esta cobranza? La cobranza, sus conceptos y sus
            pagos permanecerán disponibles como historial, pero dejará de considerarse vigente y no
            admitirá nuevos pagos.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmCancelar(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmarCancelar}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
