'use client'

import type { ClienteFormValues, RegimenFiscalOption } from '@control-contable/utils'
import { ClienteForm, StatusChip } from '@control-contable/ui'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import FormControlLabel from '@mui/material/FormControlLabel'
import IconButton from '@mui/material/IconButton'
import Pagination from '@mui/material/Pagination'
import Paper from '@mui/material/Paper'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import AddIcon from '@mui/icons-material/Add'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

import { createCliente } from './actions'

export interface ClienteListItem {
  id: string
  nombre: string
  rfc: string
  correo: string
  estado: 'activo' | 'inactivo'
}

/**
 * Historia 1 (listado paginado + filtro por nombre/RFC) e Historia 2 (alta
 * vía modal) de 007-alta-cliente-portal (segunda iteración). El botón
 * "Agregar cliente" se oculta cuando canManage es false (Historia 3).
 */
export function ClientesPortalClient({
  clientes,
  regimenesFiscales,
  totalPaginas,
  paginaActual,
  mostrarInactivos,
  q,
  canManage,
}: {
  clientes: ClienteListItem[]
  regimenesFiscales: RegimenFiscalOption[]
  totalPaginas: number
  paginaActual: number
  mostrarInactivos: boolean
  q: string
  canManage: boolean
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [busqueda, setBusqueda] = useState(q)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

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

  function aplicarBusqueda() {
    const params = new URLSearchParams(searchParams.toString())
    if (busqueda.trim()) params.set('q', busqueda.trim())
    else params.delete('q')
    params.set('page', '1')
    router.push(`/clientes?${params.toString()}`)
  }

  function abrirModal() {
    setFormError(null)
    setModalAbierto(true)
  }

  function handleCrear(values: ClienteFormValues) {
    setFormError(null)
    startTransition(async () => {
      const result = await createCliente(values)
      if (result.error) {
        setFormError(result.error)
        return
      }
      setModalAbierto(false)
      setSuccessMessage(`Cliente "${values.nombre}" dado de alta con éxito.`)
      router.refresh()
    })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {successMessage ? <Alert severity="success">{successMessage}</Alert> : null}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        <TextField
          label="Buscar por nombre o RFC"
          size="small"
          value={busqueda}
          onChange={(event) => setBusqueda(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') aplicarBusqueda()
          }}
          sx={{ minWidth: 260 }}
        />
        <Button variant="outlined" onClick={aplicarBusqueda}>
          Buscar
        </Button>

        <FormControlLabel
          control={
            <Switch
              checked={mostrarInactivos}
              onChange={(event) => alternarMostrarInactivos(event.target.checked)}
            />
          }
          label="Mostrar inactivos"
        />

        <Box sx={{ flexGrow: 1 }} />

        {canManage ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={abrirModal}>
            Agregar cliente
          </Button>
        ) : null}
      </Box>

      <Paper sx={{ p: 3 }}>
        {clientes.length === 0 ? (
          <Typography color="text.secondary">
            No se encontraron clientes {mostrarInactivos ? '' : 'activos '}
            {q ? 'que coincidan con la búsqueda.' : 'registrados todavía.'}
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
        open={modalAbierto}
        regimenesFiscales={regimenesFiscales}
        error={formError}
        onClose={() => setModalAbierto(false)}
        onSubmit={handleCrear}
        title="Agregar cliente"
        submitLabel={isPending ? 'Guardando…' : 'Guardar'}
      />
    </Box>
  )
}
