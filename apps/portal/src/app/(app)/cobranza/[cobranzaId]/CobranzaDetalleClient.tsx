'use client'

import {
  modificarPagoFormSchema,
  pagoCobranzaFormSchema,
  revertirPagoFormSchema,
  type ModificarPagoFormValues,
  type PagoCobranzaFormValues,
  type RevertirPagoFormValues,
} from '@control-contable/utils'
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
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemText from '@mui/material/ListItemText'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AttachFileIcon from '@mui/icons-material/AttachFile'
import BlockIcon from '@mui/icons-material/Block'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditIcon from '@mui/icons-material/Edit'
import UndoIcon from '@mui/icons-material/Undo'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'

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

export interface ComprobanteRow {
  id: string
  nombreOriginal: string
  tipoArchivo: string
  tamanoBytes: number
  rutaAlmacenamiento: string
}

export interface PagoRow {
  id: string
  monto: number
  fechaPago: string
  metodoPagoId: string
  comentario: string | null
  metodoPagoNombre: string
  estado: 'activo' | 'revertido' | 'eliminado'
  motivoReversion: string | null
  comprobantes: ComprobanteRow[]
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

const ETIQUETA_ESTADO_PAGO_ROW: Record<string, string> = {
  activo: 'Activo',
  revertido: 'Revertido',
  eliminado: 'Eliminado',
}

const VARIANTE_ESTADO_PAGO_ROW: Record<string, 'positivo' | 'negativo' | 'neutro'> = {
  activo: 'positivo',
  revertido: 'negativo',
  eliminado: 'neutro',
}

function formatearMoneda(monto: number): string {
  return monto.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
}

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const VALORES_PAGO_VACIOS: PagoCobranzaFormValues = {
  monto: '',
  metodoPagoId: '',
  fechaPago: new Date().toISOString().slice(0, 10),
  comentario: '',
}

const VALORES_REVERSION_VACIOS: RevertirPagoFormValues = { motivoReversion: '' }

/**
 * Detalle de una Cobranza (017-cobranza, US2; extendido en 018-gestion-pagos
 * US1/US2/US3/US4/US6): conceptos congelados, historial de pagos con estado
 * (Activo/Revertido/Eliminado) y comprobantes, saldo y estados (siempre
 * recibidos ya calculados desde `cobranzas_resumen`, page.tsx). Las acciones
 * de modificar/revertir/eliminar solo se muestran sobre pagos activos —
 * revertido/eliminado son estados finales (contracts/db-functions-rls.md
 * Sección B).
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
  onModificarPago,
  onRevertirPago,
  onEliminarPago,
  onAdjuntarComprobante,
  onEliminarComprobante,
}: {
  cobranza: CobranzaDetalle
  conceptos: ConceptoRow[]
  pagos: PagoRow[]
  metodosPagoDisponibles: OpcionMetodoPago[]
  canManage: boolean
  onRegistrarPago: (values: PagoCobranzaFormValues) => Promise<ActionResult>
  onEliminarCobranza: () => Promise<ActionResult>
  onCancelarCobranza: () => Promise<ActionResult>
  onModificarPago: (pagoId: string, values: ModificarPagoFormValues) => Promise<ActionResult>
  onRevertirPago: (pagoId: string, motivoReversion: string) => Promise<ActionResult>
  onEliminarPago: (pagoId: string) => Promise<ActionResult>
  onAdjuntarComprobante: (pagoId: string, formData: FormData) => Promise<ActionResult>
  onEliminarComprobante: (
    comprobanteId: string,
    rutaAlmacenamiento: string,
  ) => Promise<ActionResult>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [formValues, setFormValues] = useState<PagoCobranzaFormValues>(VALORES_PAGO_VACIOS)
  const [formError, setFormError] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [confirmEliminar, setConfirmEliminar] = useState(false)
  const [confirmCancelar, setConfirmCancelar] = useState(false)

  const [pagoEnEdicion, setPagoEnEdicion] = useState<PagoRow | null>(null)
  const [valoresEdicion, setValoresEdicion] = useState<ModificarPagoFormValues>(VALORES_PAGO_VACIOS)
  const [errorEdicion, setErrorEdicion] = useState<string | null>(null)

  const [pagoARevertir, setPagoARevertir] = useState<PagoRow | null>(null)
  const [valoresReversion, setValoresReversion] =
    useState<RevertirPagoFormValues>(VALORES_REVERSION_VACIOS)
  const [errorReversion, setErrorReversion] = useState<string | null>(null)

  const [pagoAEliminar, setPagoAEliminar] = useState<PagoRow | null>(null)

  const [pagoComprobantesId, setPagoComprobantesId] = useState<string | null>(null)
  const pagoComprobantes = pagos.find((pago) => pago.id === pagoComprobantesId) ?? null
  const [errorComprobantes, setErrorComprobantes] = useState<string | null>(null)
  const inputArchivoRef = useRef<HTMLInputElement | null>(null)

  const metodoSeleccionado =
    metodosPagoDisponibles.find((m) => m.id === formValues.metodoPagoId) ?? null
  const metodoEdicionSeleccionado =
    metodosPagoDisponibles.find((m) => m.id === valoresEdicion.metodoPagoId) ?? null
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

  function abrirEdicion(pago: PagoRow) {
    setPagoEnEdicion(pago)
    setErrorEdicion(null)
    setValoresEdicion({
      monto: String(pago.monto),
      metodoPagoId: pago.metodoPagoId,
      fechaPago: pago.fechaPago.slice(0, 10),
      comentario: pago.comentario ?? '',
    })
  }

  function guardarEdicion() {
    if (!pagoEnEdicion) return
    setErrorEdicion(null)
    modificarPagoFormSchema
      .validate(valoresEdicion)
      .then(() => {
        startTransition(async () => {
          const result = await onModificarPago(pagoEnEdicion.id, valoresEdicion)
          if (result.error) {
            setErrorEdicion(result.error)
            return
          }
          setPagoEnEdicion(null)
          router.refresh()
        })
      })
      .catch((validationError: Error) => setErrorEdicion(validationError.message))
  }

  function abrirReversion(pago: PagoRow) {
    setPagoARevertir(pago)
    setErrorReversion(null)
    setValoresReversion(VALORES_REVERSION_VACIOS)
  }

  function confirmarReversion() {
    if (!pagoARevertir) return
    setErrorReversion(null)
    revertirPagoFormSchema
      .validate(valoresReversion)
      .then(() => {
        startTransition(async () => {
          const result = await onRevertirPago(pagoARevertir.id, valoresReversion.motivoReversion)
          if (result.error) {
            setErrorReversion(result.error)
            return
          }
          setPagoARevertir(null)
          router.refresh()
        })
      })
      .catch((validationError: Error) => setErrorReversion(validationError.message))
  }

  function confirmarEliminarPago() {
    if (!pagoAEliminar) return
    startTransition(async () => {
      const result = await onEliminarPago(pagoAEliminar.id)
      setPagoAEliminar(null)
      if (result.error) {
        setGlobalError(result.error)
        return
      }
      router.refresh()
    })
  }

  function subirComprobantes(archivos: FileList | null) {
    if (!pagoComprobantes || !archivos || archivos.length === 0) return
    setErrorComprobantes(null)
    const formData = new FormData()
    for (const archivo of Array.from(archivos)) {
      formData.append('archivos', archivo)
    }
    startTransition(async () => {
      const result = await onAdjuntarComprobante(pagoComprobantes.id, formData)
      if (result.error) {
        setErrorComprobantes(result.error)
        return
      }
      if (inputArchivoRef.current) inputArchivoRef.current.value = ''
      router.refresh()
    })
  }

  function eliminarComprobante(comprobanteId: string, ruta: string) {
    setErrorComprobantes(null)
    startTransition(async () => {
      const result = await onEliminarComprobante(comprobanteId, ruta)
      if (result.error) {
        setErrorComprobantes(result.error)
        return
      }
      router.refresh()
    })
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
                <TableCell>Estado</TableCell>
                <TableCell>Comprobantes</TableCell>
                {canManage ? <TableCell align="right">Acciones</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {pagos.map((pago) => (
                <TableRow key={pago.id} hover>
                  <TableCell>{new Date(pago.fechaPago).toLocaleDateString('es-MX')}</TableCell>
                  <TableCell>{pago.metodoPagoNombre}</TableCell>
                  <TableCell>{formatearMoneda(pago.monto)}</TableCell>
                  <TableCell>{pago.comentario ?? '—'}</TableCell>
                  <TableCell>
                    <Tooltip
                      title={pago.motivoReversion ?? ''}
                      disableHoverListener={!pago.motivoReversion}
                    >
                      <span>
                        <StatusChip
                          status={pago.estado}
                          variant={VARIANTE_ESTADO_PAGO_ROW[pago.estado] ?? 'neutro'}
                          label={ETIQUETA_ESTADO_PAGO_ROW[pago.estado] ?? pago.estado}
                        />
                      </span>
                    </Tooltip>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      startIcon={<AttachFileIcon fontSize="small" />}
                      onClick={() => {
                        setErrorComprobantes(null)
                        setPagoComprobantesId(pago.id)
                      }}
                    >
                      {pago.comprobantes.length}
                    </Button>
                  </TableCell>
                  {canManage ? (
                    <TableCell align="right">
                      {pago.estado === 'activo' ? (
                        <>
                          <Tooltip title="Modificar pago">
                            <span>
                              <IconButton
                                size="small"
                                disabled={isPending}
                                onClick={() => abrirEdicion(pago)}
                                aria-label="Modificar pago"
                              >
                                <EditIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Revertir pago">
                            <span>
                              <IconButton
                                size="small"
                                color="warning"
                                disabled={isPending}
                                onClick={() => abrirReversion(pago)}
                                aria-label="Revertir pago"
                              >
                                <UndoIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          <Tooltip title="Eliminar pago">
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={isPending}
                                onClick={() => setPagoAEliminar(pago)}
                                aria-label="Eliminar pago"
                              >
                                <DeleteOutlineIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        </>
                      ) : null}
                    </TableCell>
                  ) : null}
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

      <Dialog open={pagoEnEdicion !== null} onClose={() => setPagoEnEdicion(null)}>
        <DialogTitle>Modificar pago</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          {errorEdicion ? <Alert severity="error">{errorEdicion}</Alert> : null}
          <TextField
            label="Monto"
            type="number"
            size="small"
            value={valoresEdicion.monto}
            onChange={(event) =>
              setValoresEdicion({ ...valoresEdicion, monto: event.target.value })
            }
          />
          <Autocomplete
            options={metodosPagoDisponibles}
            getOptionLabel={(option) => option.nombre}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            value={metodoEdicionSeleccionado}
            onChange={(_event, value) =>
              setValoresEdicion({ ...valoresEdicion, metodoPagoId: value?.id ?? '' })
            }
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
            value={valoresEdicion.fechaPago}
            onChange={(event) =>
              setValoresEdicion({ ...valoresEdicion, fechaPago: event.target.value })
            }
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="Comentario"
            size="small"
            value={valoresEdicion.comentario}
            onChange={(event) =>
              setValoresEdicion({ ...valoresEdicion, comentario: event.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPagoEnEdicion(null)}>Cancelar</Button>
          <Button variant="contained" disabled={isPending} onClick={guardarEdicion}>
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pagoARevertir !== null} onClose={() => setPagoARevertir(null)}>
        <DialogTitle>Revertir pago</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <Typography>
            El pago conservará su registro histórico, pero dejará de contarse en el saldo. Esta
            acción requiere un motivo y no puede deshacerse.
          </Typography>
          {errorReversion ? <Alert severity="error">{errorReversion}</Alert> : null}
          <TextField
            label="Motivo de la reversión"
            size="small"
            multiline
            minRows={2}
            value={valoresReversion.motivoReversion}
            onChange={(event) => setValoresReversion({ motivoReversion: event.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPagoARevertir(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color="warning"
            disabled={isPending}
            onClick={confirmarReversion}
          >
            Revertir
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={pagoAEliminar !== null} onClose={() => setPagoAEliminar(null)}>
        <DialogTitle>Eliminar pago</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Seguro que deseas eliminar lógicamente este pago? Dejará de contarse en el saldo, pero
            su registro se conservará para auditoría.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPagoAEliminar(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmarEliminarPago}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={pagoComprobantes !== null}
        onClose={() => setPagoComprobantesId(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Comprobantes del pago</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {errorComprobantes ? <Alert severity="error">{errorComprobantes}</Alert> : null}
          {pagoComprobantes && pagoComprobantes.comprobantes.length === 0 ? (
            <Typography color="text.secondary">Este pago no tiene comprobantes.</Typography>
          ) : (
            <List dense>
              {pagoComprobantes?.comprobantes.map((comprobante) => (
                <ListItem
                  key={comprobante.id}
                  secondaryAction={
                    canManage ? (
                      <IconButton
                        size="small"
                        color="error"
                        disabled={isPending}
                        aria-label="Eliminar comprobante"
                        onClick={() =>
                          eliminarComprobante(comprobante.id, comprobante.rutaAlmacenamiento)
                        }
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    ) : null
                  }
                >
                  <ListItemText
                    primary={comprobante.nombreOriginal}
                    secondary={formatearTamano(comprobante.tamanoBytes)}
                  />
                </ListItem>
              ))}
            </List>
          )}
          {canManage ? (
            <Button component="label" variant="outlined" disabled={isPending}>
              Adjuntar comprobantes
              <input
                ref={inputArchivoRef}
                type="file"
                multiple
                hidden
                onChange={(event) => subirComprobantes(event.target.files)}
              />
            </Button>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPagoComprobantesId(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
