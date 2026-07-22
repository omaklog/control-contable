'use client'

import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Pagination from '@mui/material/Pagination'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import DownloadIcon from '@mui/icons-material/Download'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState, useTransition } from 'react'

import { obtenerUrlFirmadaDocumento } from '../clientes/[clienteId]/actions'

export interface DocumentoFiscalRow {
  id: string
  nombreOriginal: string
  clienteId: string
  clienteNombre: string
  clienteRfc: string
  categoriaNombre: string | null
  periodoAnio: number | null
  periodoEtiqueta: string | null
  obligacionNombre: string
  tamanoBytes: number
  rutaAlmacenamiento: string
  fechaCarga: string
  usuarioNombre: string
}

function formatearTamano(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * Vista global de Expedientes (016-expediente-fiscal, US3): búsqueda y
 * filtrado transversal entre clientes (FR-017/FR-018), con acceso al
 * expediente del cliente correspondiente desde cada resultado (FR-019).
 */
export function DocumentosFiscalesClient({
  documentos,
  totalPaginas,
  paginaActual,
  cliente,
  rfc,
  tipo,
  anio,
  periodo,
  obligacion,
  cumplimiento,
  fechaAlta,
  usuario,
}: {
  documentos: DocumentoFiscalRow[]
  totalPaginas: number
  paginaActual: number
  cliente: string
  rfc: string
  tipo: string
  anio: string
  periodo: string
  obligacion: string
  cumplimiento: string
  fechaAlta: string
  usuario: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [globalError, setGlobalError] = useState<string | null>(null)

  const [filtroCliente, setFiltroCliente] = useState(cliente)
  const [filtroRfc, setFiltroRfc] = useState(rfc)
  const [filtroTipo, setFiltroTipo] = useState(tipo)
  const [filtroAnio, setFiltroAnio] = useState(anio)
  const [filtroPeriodo, setFiltroPeriodo] = useState(periodo)
  const [filtroObligacion, setFiltroObligacion] = useState(obligacion)
  const [filtroCumplimiento, setFiltroCumplimiento] = useState(cumplimiento)
  const [filtroFechaAlta, setFiltroFechaAlta] = useState(fechaAlta)
  const [filtroUsuario, setFiltroUsuario] = useState(usuario)

  function irAPagina(pagina: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(pagina))
    router.push(`/documentos-fiscales?${params.toString()}`)
  }

  function aplicarFiltros() {
    const params = new URLSearchParams()
    if (filtroCliente.trim()) params.set('cliente', filtroCliente.trim())
    if (filtroRfc.trim()) params.set('rfc', filtroRfc.trim())
    if (filtroTipo.trim()) params.set('tipo', filtroTipo.trim())
    if (filtroAnio.trim()) params.set('anio', filtroAnio.trim())
    if (filtroPeriodo.trim()) params.set('periodo', filtroPeriodo.trim())
    if (filtroObligacion.trim()) params.set('obligacion', filtroObligacion.trim())
    if (filtroCumplimiento.trim()) params.set('cumplimiento', filtroCumplimiento.trim())
    if (filtroFechaAlta.trim()) params.set('fechaAlta', filtroFechaAlta.trim())
    if (filtroUsuario.trim()) params.set('usuario', filtroUsuario.trim())
    params.set('page', '1')
    router.push(`/documentos-fiscales?${params.toString()}`)
  }

  function limpiarFiltros() {
    setFiltroCliente('')
    setFiltroRfc('')
    setFiltroTipo('')
    setFiltroAnio('')
    setFiltroPeriodo('')
    setFiltroObligacion('')
    setFiltroCumplimiento('')
    setFiltroFechaAlta('')
    setFiltroUsuario('')
    router.push('/documentos-fiscales')
  }

  function verDocumento(rutaAlmacenamiento: string) {
    startTransition(async () => {
      const { url, error } = await obtenerUrlFirmadaDocumento(rutaAlmacenamiento)
      if (error || !url) {
        setGlobalError(error ?? 'No se pudo abrir el documento.')
        return
      }
      window.open(url, '_blank', 'noopener,noreferrer')
    })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {globalError ? <Alert severity="error">{globalError}</Alert> : null}

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
          label="Tipo de Documento"
          size="small"
          value={filtroTipo}
          onChange={(event) => setFiltroTipo(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && aplicarFiltros()}
        />
        <TextField
          label="Año"
          size="small"
          value={filtroAnio}
          onChange={(event) => setFiltroAnio(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && aplicarFiltros()}
        />
        <TextField
          label="Periodo"
          size="small"
          value={filtroPeriodo}
          onChange={(event) => setFiltroPeriodo(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && aplicarFiltros()}
        />
        <TextField
          label="Obligación"
          size="small"
          value={filtroObligacion}
          onChange={(event) => setFiltroObligacion(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && aplicarFiltros()}
        />
        <TextField
          label="Cumplimiento"
          size="small"
          value={filtroCumplimiento}
          onChange={(event) => setFiltroCumplimiento(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && aplicarFiltros()}
        />
        <TextField
          label="Fecha de alta"
          type="date"
          size="small"
          value={filtroFechaAlta}
          onChange={(event) => setFiltroFechaAlta(event.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          label="Usuario"
          size="small"
          value={filtroUsuario}
          onChange={(event) => setFiltroUsuario(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && aplicarFiltros()}
        />
        <Button variant="contained" size="small" onClick={aplicarFiltros}>
          Buscar
        </Button>
        <Button size="small" onClick={limpiarFiltros}>
          Limpiar
        </Button>
      </Box>

      {documentos.length === 0 ? (
        <Alert severity="info">No se encontraron documentos con estos criterios.</Alert>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Documento</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Periodo</TableCell>
              <TableCell>Obligación</TableCell>
              <TableCell>Tamaño</TableCell>
              <TableCell>Fecha de alta</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documentos.map((documento) => (
              <TableRow key={documento.id} hover>
                <TableCell>
                  <Link href={`/clientes/${documento.clienteId}`}>{documento.nombreOriginal}</Link>
                </TableCell>
                <TableCell>
                  {documento.clienteNombre} ({documento.clienteRfc})
                </TableCell>
                <TableCell>{documento.categoriaNombre ?? 'Sin clasificar'}</TableCell>
                <TableCell>{documento.periodoEtiqueta ?? 'General'}</TableCell>
                <TableCell>{documento.obligacionNombre || '—'}</TableCell>
                <TableCell>{formatearTamano(documento.tamanoBytes)}</TableCell>
                <TableCell>{new Date(documento.fechaCarga).toLocaleDateString('es-MX')}</TableCell>
                <TableCell>{documento.usuarioNombre || '—'}</TableCell>
                <TableCell>
                  <Tooltip title="Ver / descargar">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => verDocumento(documento.rutaAlmacenamiento)}
                        aria-label="Ver o descargar documento"
                      >
                        <DownloadIcon fontSize="small" />
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
        />
      ) : null}
    </Box>
  )
}
