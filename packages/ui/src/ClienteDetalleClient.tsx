'use client'

import type { ContactoFormValues, ServicioContratadoFormValues } from '@control-contable/utils'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Paper from '@mui/material/Paper'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import AttachMoneyIcon from '@mui/icons-material/AttachMoney'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import HistoryIcon from '@mui/icons-material/History'
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline'
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline'
import StarOutlineIcon from '@mui/icons-material/StarOutline'
import StopCircleOutlinedIcon from '@mui/icons-material/StopCircleOutlined'
import BlockIcon from '@mui/icons-material/Block'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { ContactoForm } from './ContactoForm'
import { ServicioContratadoForm, type ServicioOption } from './ServicioContratadoForm'
import { ServicioHistorialDialog, type HistorialEvento } from './ServicioHistorialDialog'
import { StatusChip } from './StatusChip'

export interface ClienteDetalle {
  id: string
  nombre: string
  tipoPersona: 'fisica' | 'moral'
  rfc: string
  regimenFiscalDescripcion: string
  correo: string
  telefono: string
  direccionFiscal: string
  estado: 'activo' | 'inactivo'
}

export interface ContactoRow {
  id: string
  nombre: string
  telefono: string
  email: string | null
  estado: 'activo' | 'obsoleto'
  esPrincipal: boolean
}

export interface ServicioContratadoRow {
  id: string
  servicioId: string
  servicioNombre: string
  precioAcordado: number
  fechaInicio: string
  fechaFin: string | null
  estado: 'activo' | 'suspendido' | 'finalizado'
  observaciones: string | null
}

interface ActionResult {
  error: string | null
}

/**
 * Página de detalle de Cliente, compartida por apps/admin y apps/portal
 * desde el día uno (008-contactos-y-detalle-cliente, research.md Decisión
 * 1): datos generales del Cliente, gestión completa de sus Contactos
 * (Historias 1 y 2) y una sección "Pagos pendientes" reservada (Historia 3).
 * Las Server Actions se reciben como props — inyectadas por el page.tsx de
 * cada app — para no acoplar este componente compartido a la ruta de una
 * app concreta (contracts/server-actions.md).
 */
export function ClienteDetalleClient({
  cliente,
  contactos,
  canManage,
  onCreateContacto,
  onUpdateContacto,
  onSetContactoEstado,
  onSetContactoPrincipal,
  servicios,
  serviciosDisponibles,
  onAgregarServicio,
  onCambiarPrecioServicio,
  onSuspenderServicio,
  onReactivarServicio,
  onFinalizarServicio,
  onObtenerHistorialServicio,
}: {
  cliente: ClienteDetalle
  contactos: ContactoRow[]
  canManage: boolean
  onCreateContacto: (values: ContactoFormValues) => Promise<ActionResult>
  onUpdateContacto: (contactoId: string, values: ContactoFormValues) => Promise<ActionResult>
  onSetContactoEstado: (contactoId: string, estado: 'activo' | 'obsoleto') => Promise<ActionResult>
  onSetContactoPrincipal: (contactoId: string) => Promise<ActionResult>
  servicios: ServicioContratadoRow[]
  serviciosDisponibles: ServicioOption[]
  onAgregarServicio: (values: ServicioContratadoFormValues) => Promise<ActionResult>
  onCambiarPrecioServicio: (servicioContratadoId: string, precio: number) => Promise<ActionResult>
  onSuspenderServicio: (servicioContratadoId: string) => Promise<ActionResult>
  onReactivarServicio: (servicioContratadoId: string) => Promise<ActionResult>
  onFinalizarServicio: (servicioContratadoId: string) => Promise<ActionResult>
  onObtenerHistorialServicio: (
    servicioContratadoId: string,
  ) => Promise<{ eventos: HistorialEvento[]; error: string | null }>
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [mostrarObsoletos, setMostrarObsoletos] = useState(false)
  const [formTarget, setFormTarget] = useState<'nuevo' | ContactoRow | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmObsoletoId, setConfirmObsoletoId] = useState<string | null>(null)
  const [globalError, setGlobalError] = useState<string | null>(null)

  const contactosVisibles = contactos.filter(
    (contacto) => mostrarObsoletos || contacto.estado === 'activo',
  )

  const contactoEnEdicion =
    formTarget && formTarget !== 'nuevo'
      ? { nombre: formTarget.nombre, telefono: formTarget.telefono, email: formTarget.email ?? '' }
      : undefined

  function abrirAlta() {
    setFormError(null)
    setFormTarget('nuevo')
  }

  function abrirEdicion(contacto: ContactoRow) {
    setFormError(null)
    setFormTarget(contacto)
  }

  function handleGuardar(values: ContactoFormValues) {
    setFormError(null)
    startTransition(async () => {
      const result =
        formTarget && formTarget !== 'nuevo'
          ? await onUpdateContacto(formTarget.id, values)
          : await onCreateContacto(values)
      if (result.error) {
        setFormError(result.error)
        return
      }
      setFormTarget(null)
      router.refresh()
    })
  }

  function confirmarObsoleto() {
    if (!confirmObsoletoId) return
    const contactoId = confirmObsoletoId
    setConfirmObsoletoId(null)
    setGlobalError(null)
    startTransition(async () => {
      const result = await onSetContactoEstado(contactoId, 'obsoleto')
      if (result.error) {
        setGlobalError(result.error)
        return
      }
      router.refresh()
    })
  }

  function reactivar(contactoId: string) {
    setGlobalError(null)
    startTransition(async () => {
      const result = await onSetContactoEstado(contactoId, 'activo')
      if (result.error) {
        setGlobalError(result.error)
        return
      }
      router.refresh()
    })
  }

  function marcarPrincipal(contactoId: string) {
    setGlobalError(null)
    startTransition(async () => {
      const result = await onSetContactoPrincipal(contactoId)
      if (result.error) {
        setGlobalError(result.error)
        return
      }
      router.refresh()
    })
  }

  const [servicioFormMode, setServicioFormMode] = useState<'agregar' | 'cambiarPrecio' | null>(null)
  const [servicioFormTarget, setServicioFormTarget] = useState<ServicioContratadoRow | null>(null)
  const [servicioFormError, setServicioFormError] = useState<string | null>(null)
  const [confirmFinalizarId, setConfirmFinalizarId] = useState<string | null>(null)
  const [historialOpen, setHistorialOpen] = useState(false)
  const [historialEventos, setHistorialEventos] = useState<HistorialEvento[]>([])
  const [historialError, setHistorialError] = useState<string | null>(null)

  function abrirAgregarServicio() {
    setServicioFormError(null)
    setServicioFormTarget(null)
    setServicioFormMode('agregar')
  }

  function abrirCambiarPrecio(servicio: ServicioContratadoRow) {
    setServicioFormError(null)
    setServicioFormTarget(servicio)
    setServicioFormMode('cambiarPrecio')
  }

  function handleGuardarServicio(values: ServicioContratadoFormValues) {
    setServicioFormError(null)
    startTransition(async () => {
      const result =
        servicioFormMode === 'cambiarPrecio' && servicioFormTarget
          ? await onCambiarPrecioServicio(servicioFormTarget.id, Number(values.precioAcordado))
          : await onAgregarServicio(values)
      if (result.error) {
        setServicioFormError(result.error)
        return
      }
      setServicioFormMode(null)
      setServicioFormTarget(null)
      router.refresh()
    })
  }

  function suspenderServicio(servicioContratadoId: string) {
    setGlobalError(null)
    startTransition(async () => {
      const result = await onSuspenderServicio(servicioContratadoId)
      if (result.error) {
        setGlobalError(result.error)
        return
      }
      router.refresh()
    })
  }

  function reactivarServicio(servicioContratadoId: string) {
    setGlobalError(null)
    startTransition(async () => {
      const result = await onReactivarServicio(servicioContratadoId)
      if (result.error) {
        setGlobalError(result.error)
        return
      }
      router.refresh()
    })
  }

  function confirmarFinalizarServicio() {
    if (!confirmFinalizarId) return
    const servicioContratadoId = confirmFinalizarId
    setConfirmFinalizarId(null)
    setGlobalError(null)
    startTransition(async () => {
      const result = await onFinalizarServicio(servicioContratadoId)
      if (result.error) {
        setGlobalError(result.error)
        return
      }
      router.refresh()
    })
  }

  async function abrirHistorial(servicioContratadoId: string) {
    setHistorialError(null)
    setHistorialEventos([])
    setHistorialOpen(true)
    const result = await onObtenerHistorialServicio(servicioContratadoId)
    if (result.error) {
      setHistorialError(result.error)
      return
    }
    setHistorialEventos(result.eventos)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Datos generales
        </Typography>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Nombre o razón social
            </Typography>
            <Typography>{cliente.nombre}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              RFC
            </Typography>
            <Typography>{cliente.rfc}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Tipo de persona
            </Typography>
            <Typography>{cliente.tipoPersona === 'fisica' ? 'Física' : 'Moral'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Régimen fiscal
            </Typography>
            <Typography>{cliente.regimenFiscalDescripcion}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Correo
            </Typography>
            <Typography>{cliente.correo}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Teléfono
            </Typography>
            <Typography>{cliente.telefono || '—'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Dirección fiscal
            </Typography>
            <Typography>{cliente.direccionFiscal || '—'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Estado
            </Typography>
            <Box sx={{ mt: 0.5 }}>
              <StatusChip status={cliente.estado} />
            </Box>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        {globalError ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {globalError}
          </Alert>
        ) : null}

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
          <Typography variant="h6">Contactos</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={mostrarObsoletos}
                  onChange={(event) => setMostrarObsoletos(event.target.checked)}
                />
              }
              label="Mostrar obsoletos"
            />
            {canManage ? (
              <Button variant="contained" startIcon={<AddIcon />} onClick={abrirAlta}>
                Agregar contacto
              </Button>
            ) : null}
          </Box>
        </Box>

        {contactosVisibles.length === 0 ? (
          <Typography color="text.secondary">
            No hay contactos {mostrarObsoletos ? '' : 'activos '}registrados todavía.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Teléfono</TableCell>
                <TableCell>Correo</TableCell>
                <TableCell>Estado</TableCell>
                {canManage ? <TableCell>Acciones</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {contactosVisibles.map((contacto) => (
                <TableRow key={contacto.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {contacto.nombre}
                      {contacto.esPrincipal ? (
                        <Chip label="Principal" size="small" color="primary" />
                      ) : null}
                    </Box>
                  </TableCell>
                  <TableCell>{contacto.telefono}</TableCell>
                  <TableCell>{contacto.email ?? '—'}</TableCell>
                  <TableCell>
                    <StatusChip status={contacto.estado} />
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Editar contacto">
                          <span>
                            <IconButton
                              size="small"
                              disabled={isPending}
                              onClick={() => abrirEdicion(contacto)}
                              aria-label="Editar contacto"
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        {contacto.estado === 'activo' ? (
                          <Tooltip title="Marcar obsoleto">
                            <span>
                              <IconButton
                                size="small"
                                color="error"
                                disabled={isPending}
                                onClick={() => setConfirmObsoletoId(contacto.id)}
                                aria-label="Marcar obsoleto"
                              >
                                <BlockIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        ) : (
                          <Tooltip title="Reactivar">
                            <span>
                              <IconButton
                                size="small"
                                disabled={isPending}
                                onClick={() => reactivar(contacto.id)}
                                aria-label="Reactivar"
                              >
                                <CheckCircleOutlineIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                        <Tooltip title="Marcar principal">
                          <span>
                            <IconButton
                              size="small"
                              disabled={isPending || contacto.esPrincipal}
                              onClick={() => marcarPrincipal(contacto.id)}
                              aria-label="Marcar principal"
                            >
                              <StarOutlineIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  ) : null}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

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
          <Typography variant="h6">Servicios</Typography>
          {canManage ? (
            <Button variant="contained" startIcon={<AddIcon />} onClick={abrirAgregarServicio}>
              Agregar servicio
            </Button>
          ) : null}
        </Box>

        {servicios.length === 0 ? (
          <Typography color="text.secondary">
            Este cliente no tiene servicios contratados todavía.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Servicio</TableCell>
                <TableCell>Precio</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Inicio</TableCell>
                <TableCell>Fin</TableCell>
                <TableCell>Observaciones</TableCell>
                {canManage ? <TableCell>Acciones</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {servicios.map((servicio) => (
                <TableRow key={servicio.id} hover>
                  <TableCell>{servicio.servicioNombre}</TableCell>
                  <TableCell>${servicio.precioAcordado.toLocaleString('es-MX')}</TableCell>
                  <TableCell>
                    <StatusChip status={servicio.estado} />
                  </TableCell>
                  <TableCell>{servicio.fechaInicio}</TableCell>
                  <TableCell>{servicio.fechaFin ?? '—'}</TableCell>
                  <TableCell>{servicio.observaciones || '—'}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Ver historial">
                        <span>
                          <IconButton
                            size="small"
                            onClick={() => abrirHistorial(servicio.id)}
                            aria-label="Ver historial"
                          >
                            <HistoryIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      {canManage ? (
                        <>
                          <Tooltip title="Cambiar precio">
                            <span>
                              <IconButton
                                size="small"
                                disabled={isPending}
                                onClick={() => abrirCambiarPrecio(servicio)}
                                aria-label="Cambiar precio"
                              >
                                <AttachMoneyIcon fontSize="small" />
                              </IconButton>
                            </span>
                          </Tooltip>
                          {servicio.estado === 'activo' ? (
                            <Tooltip title="Suspender">
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={isPending}
                                  onClick={() => suspenderServicio(servicio.id)}
                                  aria-label="Suspender servicio"
                                >
                                  <PauseCircleOutlineIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          ) : null}
                          {servicio.estado !== 'activo' ? (
                            <Tooltip title="Reactivar">
                              <span>
                                <IconButton
                                  size="small"
                                  disabled={isPending}
                                  onClick={() => reactivarServicio(servicio.id)}
                                  aria-label="Reactivar servicio"
                                >
                                  <PlayCircleOutlineIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          ) : null}
                          {servicio.estado !== 'finalizado' ? (
                            <Tooltip title="Finalizar">
                              <span>
                                <IconButton
                                  size="small"
                                  color="error"
                                  disabled={isPending}
                                  onClick={() => setConfirmFinalizarId(servicio.id)}
                                  aria-label="Finalizar servicio"
                                >
                                  <StopCircleOutlinedIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          ) : null}
                        </>
                      ) : null}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Pagos pendientes
        </Typography>
        <Alert severity="info">
          Próximamente: aquí se mostrarán los pagos pendientes de este cliente.
        </Alert>
      </Paper>

      <ContactoForm
        open={formTarget !== null}
        contacto={contactoEnEdicion}
        error={formError}
        onClose={() => setFormTarget(null)}
        onSubmit={handleGuardar}
      />

      <Dialog open={Boolean(confirmObsoletoId)} onClose={() => setConfirmObsoletoId(null)}>
        <DialogTitle>Marcar contacto como obsoleto</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Seguro que deseas marcar este contacto como obsoleto? No se eliminará su información,
            pero dejará de aparecer en la lista por defecto.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmObsoletoId(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmarObsoleto}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <ServicioContratadoForm
        open={servicioFormMode !== null}
        mode={servicioFormMode ?? 'agregar'}
        servicioNombre={servicioFormTarget?.servicioNombre}
        precioActual={servicioFormTarget?.precioAcordado}
        serviciosDisponibles={serviciosDisponibles}
        error={servicioFormError}
        onClose={() => {
          setServicioFormMode(null)
          setServicioFormTarget(null)
        }}
        onSubmit={handleGuardarServicio}
      />

      <Dialog open={Boolean(confirmFinalizarId)} onClose={() => setConfirmFinalizarId(null)}>
        <DialogTitle>Finalizar servicio</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Seguro que deseas finalizar este servicio? Podrás reactivarlo más adelante si el
            cliente vuelve a solicitarlo, conservando su historial.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmFinalizarId(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmarFinalizarServicio}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <ServicioHistorialDialog
        open={historialOpen}
        onClose={() => setHistorialOpen(false)}
        eventos={historialEventos}
        error={historialError}
      />
    </Box>
  )
}
