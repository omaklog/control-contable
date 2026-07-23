'use client'

import { StatusChip } from '@control-contable/ui'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Pagination from '@mui/material/Pagination'
import Select from '@mui/material/Select'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export interface PagoGlobalRow {
  id: string
  clienteNombre: string
  clienteRfc: string
  cobranzaId: string
  periodoMes: number
  periodoAnio: number
  fechaPago: string
  metodoPagoId: string
  metodoPagoNombre: string
  monto: number
  comentario: string | null
  estado: 'activo' | 'revertido' | 'eliminado'
  usuarioNombre: string
}

export interface MetodoPagoOption {
  id: string
  nombre: string
}

const ETIQUETA_ESTADO: Record<string, string> = {
  activo: 'Activo',
  revertido: 'Revertido',
  eliminado: 'Eliminado',
}

const VARIANTE_ESTADO: Record<string, 'positivo' | 'negativo' | 'neutro'> = {
  activo: 'positivo',
  revertido: 'negativo',
  eliminado: 'neutro',
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
 * Vista global de pagos (018-gestion-pagos, US5): filtros combinables por
 * cliente, RFC, rango de fecha de pago, método, estado, periodo (cobranza) y
 * usuario que registró. El estado por defecto es "activo".
 */
export function PagosClient({
  pagos,
  metodosPago,
  totalPaginas,
  paginaActual,
  cliente,
  rfc,
  fechaInicial,
  fechaFinal,
  metodoPagoId,
  estado,
  periodo,
  usuario,
}: {
  pagos: PagoGlobalRow[]
  metodosPago: MetodoPagoOption[]
  totalPaginas: number
  paginaActual: number
  cliente: string
  rfc: string
  fechaInicial: string
  fechaFinal: string
  metodoPagoId: string
  estado: string
  periodo: string
  usuario: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filtroCliente, setFiltroCliente] = useState(cliente)
  const [filtroRfc, setFiltroRfc] = useState(rfc)
  const [filtroFechaInicial, setFiltroFechaInicial] = useState(fechaInicial)
  const [filtroFechaFinal, setFiltroFechaFinal] = useState(fechaFinal)
  const [filtroMetodoPagoId, setFiltroMetodoPagoId] = useState(metodoPagoId)
  const [filtroEstado, setFiltroEstado] = useState(estado)
  const [filtroPeriodo, setFiltroPeriodo] = useState(periodo)
  const [filtroUsuario, setFiltroUsuario] = useState(usuario)

  function irAPagina(pagina: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(pagina))
    router.push(`/pagos?${params.toString()}`)
  }

  function aplicarFiltros() {
    const params = new URLSearchParams()
    if (filtroCliente.trim()) params.set('cliente', filtroCliente.trim())
    if (filtroRfc.trim()) params.set('rfc', filtroRfc.trim())
    if (filtroFechaInicial) params.set('fechaInicial', filtroFechaInicial)
    if (filtroFechaFinal) params.set('fechaFinal', filtroFechaFinal)
    if (filtroMetodoPagoId) params.set('metodoPagoId', filtroMetodoPagoId)
    if (filtroEstado) params.set('estado', filtroEstado)
    if (filtroPeriodo.trim()) params.set('periodo', filtroPeriodo.trim())
    if (filtroUsuario.trim()) params.set('usuario', filtroUsuario.trim())
    params.set('page', '1')
    router.push(`/pagos?${params.toString()}`)
  }

  function limpiarFiltros() {
    setFiltroCliente('')
    setFiltroRfc('')
    setFiltroFechaInicial('')
    setFiltroFechaFinal('')
    setFiltroMetodoPagoId('')
    setFiltroEstado('activo')
    setFiltroPeriodo('')
    setFiltroUsuario('')
    router.push('/pagos')
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        <TextField
          label="Cliente"
          size="small"
          value={filtroCliente}
          onChange={(event) => setFiltroCliente(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && aplicarFiltros()}
        />
        <TextField
          label="RFC"
          size="small"
          value={filtroRfc}
          onChange={(event) => setFiltroRfc(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && aplicarFiltros()}
        />
        <TextField
          label="Fecha de pago desde"
          type="date"
          size="small"
          value={filtroFechaInicial}
          onChange={(event) => setFiltroFechaInicial(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Fecha de pago hasta"
          type="date"
          size="small"
          value={filtroFechaFinal}
          onChange={(event) => setFiltroFechaFinal(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <Select
          size="small"
          displayEmpty
          value={filtroMetodoPagoId}
          onChange={(event) => setFiltroMetodoPagoId(event.target.value)}
        >
          <MenuItem value="">Todos los métodos</MenuItem>
          {metodosPago.map((metodo) => (
            <MenuItem key={metodo.id} value={metodo.id}>
              {metodo.nombre}
            </MenuItem>
          ))}
        </Select>
        <Select
          size="small"
          value={filtroEstado}
          onChange={(event) => setFiltroEstado(event.target.value)}
        >
          <MenuItem value="activo">Activo</MenuItem>
          <MenuItem value="revertido">Revertido</MenuItem>
          <MenuItem value="eliminado">Eliminado</MenuItem>
          <MenuItem value="todos">Todos los estados</MenuItem>
        </Select>
        <TextField
          label="Periodo / cobranza"
          size="small"
          placeholder="ej. 7/2026"
          value={filtroPeriodo}
          onChange={(event) => setFiltroPeriodo(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && aplicarFiltros()}
        />
        <TextField
          label="Usuario que registró"
          size="small"
          value={filtroUsuario}
          onChange={(event) => setFiltroUsuario(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && aplicarFiltros()}
        />
        <Button variant="outlined" size="small" onClick={aplicarFiltros}>
          Buscar
        </Button>
        <Button size="small" onClick={limpiarFiltros}>
          Limpiar
        </Button>
      </Box>

      {pagos.length === 0 ? (
        <Typography color="text.secondary">No hay pagos para mostrar.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Cliente</TableCell>
              <TableCell>Cobranza</TableCell>
              <TableCell>Fecha de pago</TableCell>
              <TableCell>Método</TableCell>
              <TableCell>Monto</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Registrado por</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagos.map((pago) => (
              <TableRow key={pago.id} hover>
                <TableCell>
                  {pago.clienteNombre} ({pago.clienteRfc})
                </TableCell>
                <TableCell>
                  <Link href={`/cobranza/${pago.cobranzaId}`}>
                    {MESES[pago.periodoMes - 1]} {pago.periodoAnio}
                  </Link>
                </TableCell>
                <TableCell>{new Date(pago.fechaPago).toLocaleDateString('es-MX')}</TableCell>
                <TableCell>{pago.metodoPagoNombre}</TableCell>
                <TableCell>{formatearMoneda(pago.monto)}</TableCell>
                <TableCell>
                  <StatusChip
                    status={pago.estado}
                    variant={VARIANTE_ESTADO[pago.estado] ?? 'neutro'}
                    label={ETIQUETA_ESTADO[pago.estado] ?? pago.estado}
                  />
                </TableCell>
                <TableCell>{pago.usuarioNombre || '—'}</TableCell>
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
    </Box>
  )
}
