'use client'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import Pagination from '@mui/material/Pagination'
import Paper from '@mui/material/Paper'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import type { ClienteFormValues, RegimenFiscalOption } from '@control-contable/utils'
import { ClienteForm, StatusChip } from '@control-contable/ui'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

import { setClienteEstado, updateCliente } from './actions'

export interface ClienteRow extends ClienteFormValues {
  id: string
  regimenFiscalDescripcion: string
  estado: 'activo' | 'inactivo'
}

export function ClientesClient({
  clientes,
  regimenesFiscales,
  totalPaginas,
  paginaActual,
  mostrarInactivos,
  canManage,
}: {
  clientes: ClienteRow[]
  regimenesFiscales: RegimenFiscalOption[]
  totalPaginas: number
  paginaActual: number
  mostrarInactivos: boolean
  canManage: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [editTargetId, setEditTargetId] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmTargetId, setConfirmTargetId] = useState<string | null>(null)

  const editTarget = clientes.find((cliente) => cliente.id === editTargetId) ?? null

  function irAPagina(pagina: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(pagina))
    router.push(`/clientes?${params.toString()}`)
  }

  function alternarMostrarInactivos(checked: boolean) {
    const params = new URLSearchParams(searchParams.toString())
    if (checked) params.set('mostrarInactivos', 'true')
    else params.delete('mostrarInactivos')
    params.set('page', '1')
    router.push(`/clientes?${params.toString()}`)
  }

  function abrirEdicion(cliente: ClienteRow) {
    setFormError(null)
    setEditTargetId(cliente.id)
  }

  function handleGuardarEdicion(values: ClienteFormValues) {
    if (!editTargetId) return
    setFormError(null)
    startTransition(async () => {
      const result = await updateCliente(editTargetId, values)
      if (result.error) {
        setFormError(result.error)
        return
      }
      setEditTargetId(null)
      router.refresh()
    })
  }

  function confirmarBaja() {
    if (!confirmTargetId) return
    const clienteId = confirmTargetId
    setConfirmTargetId(null)
    setGlobalError(null)
    startTransition(async () => {
      const result = await setClienteEstado(clienteId, 'inactivo')
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
        <FormControlLabel
          control={
            <Switch
              checked={mostrarInactivos}
              onChange={(event) => alternarMostrarInactivos(event.target.checked)}
            />
          }
          label="Mostrar inactivos"
          sx={{ mb: 2 }}
        />

        {clientes.length === 0 ? (
          <Typography color="text.secondary">
            No hay clientes {mostrarInactivos ? '' : 'activos '}registrados todavía.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>RFC</TableCell>
                <TableCell>Correo</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Detalle</TableCell>
                {canManage ? <TableCell>Acciones</TableCell> : null}
              </TableRow>
            </TableHead>
            <TableBody>
              {clientes.map((cliente) => (
                <TableRow key={cliente.id} hover>
                  <TableCell>{cliente.nombre}</TableCell>
                  <TableCell>{cliente.rfc}</TableCell>
                  <TableCell>{cliente.correo}</TableCell>
                  <TableCell>
                    <StatusChip status={cliente.estado} />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Ver detalle">
                      <span>
                        <IconButton
                          size="small"
                          component={Link}
                          href={`/clientes/${cliente.id}`}
                          aria-label="Ver detalle"
                        >
                          <VisibilityOutlinedIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                  {canManage ? (
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Tooltip title="Editar cliente">
                          <span>
                            <IconButton
                              size="small"
                              disabled={isPending}
                              onClick={() => abrirEdicion(cliente)}
                              aria-label="Editar cliente"
                            >
                              <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Dar de baja">
                          <span>
                            <IconButton
                              size="small"
                              color="error"
                              disabled={isPending || cliente.estado === 'inactivo'}
                              onClick={() => setConfirmTargetId(cliente.id)}
                              aria-label="Dar de baja"
                            >
                              <DeleteOutlineIcon fontSize="small" />
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

        {totalPaginas > 1 ? (
          <Pagination
            count={totalPaginas}
            page={paginaActual}
            onChange={(_event, pagina) => irAPagina(pagina)}
            sx={{ mt: 2 }}
          />
        ) : null}
      </Paper>

      <ClienteForm
        open={Boolean(editTarget)}
        cliente={editTarget ?? undefined}
        regimenesFiscales={regimenesFiscales}
        error={formError}
        onClose={() => setEditTargetId(null)}
        onSubmit={handleGuardarEdicion}
      />

      <Dialog open={Boolean(confirmTargetId)} onClose={() => setConfirmTargetId(null)}>
        <DialogTitle>Confirmar baja de cliente</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Seguro que deseas dar de baja a este cliente? No se eliminará su información, pero
            dejará de aparecer en el listado por defecto.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmTargetId(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmarBaja}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
