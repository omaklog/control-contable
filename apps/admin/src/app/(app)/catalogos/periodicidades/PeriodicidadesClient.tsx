'use client'

import Autocomplete from '@mui/material/Autocomplete'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Pagination from '@mui/material/Pagination'
import Paper from '@mui/material/Paper'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { StatusChip } from '@control-contable/ui'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

export interface PeriodicidadRow {
  id: string
  nombre: string
  descripcion: string
  estado: 'activo' | 'inactivo'
}

/**
 * Historia 3 y 4 de 012-administracion-catalogos: tabla de solo lectura —
 * sin ningún botón ni acción de alta/edición/activación/inactivación (FR-014).
 * La búsqueda usa `Autocomplete` de MUI (research.md #2) — no hay un
 * componente compartido de catálogo todavía (Structure Decision, plan.md);
 * cuando un segundo catálogo lo necesite es el momento de extraerlo.
 */
export function PeriodicidadesClient({
  periodicidades,
  nombresDisponibles,
  totalPaginas,
  paginaActual,
  buscar,
}: {
  periodicidades: PeriodicidadRow[]
  nombresDisponibles: string[]
  totalPaginas: number
  paginaActual: number
  buscar: string
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [filtroBuscar, setFiltroBuscar] = useState(buscar)

  function irAPagina(pagina: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(pagina))
    router.push(`/catalogos/periodicidades?${params.toString()}`)
  }

  function buscarPor(valor: string) {
    const params = new URLSearchParams()
    if (valor.trim()) params.set('buscar', valor.trim())
    params.set('page', '1')
    router.push(`/catalogos/periodicidades?${params.toString()}`)
  }

  function limpiarBusqueda() {
    setFiltroBuscar('')
    router.push('/catalogos/periodicidades')
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        <Autocomplete
          freeSolo
          options={nombresDisponibles}
          inputValue={filtroBuscar}
          onInputChange={(_event, value) => setFiltroBuscar(value)}
          onChange={(_event, value) => buscarPor(value ?? '')}
          sx={{ minWidth: 260 }}
          renderInput={({ InputLabelProps, InputProps, ...rest }) => (
            <TextField
              {...rest}
              slotProps={{ inputLabel: InputLabelProps, input: InputProps }}
              label="Buscar periodicidad"
              size="small"
              onKeyDown={(event) => {
                if (event.key === 'Enter') buscarPor(filtroBuscar)
              }}
            />
          )}
        />
        <Button variant="outlined" onClick={() => buscarPor(filtroBuscar)}>
          Buscar
        </Button>
        <Button onClick={limpiarBusqueda}>Limpiar</Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        {periodicidades.length === 0 ? (
          <Typography color="text.secondary">
            No hay periodicidades que coincidan con la búsqueda.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nombre</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Estado</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {periodicidades.map((periodicidad) => (
                <TableRow key={periodicidad.id} hover>
                  <TableCell>{periodicidad.nombre}</TableCell>
                  <TableCell>{periodicidad.descripcion || '—'}</TableCell>
                  <TableCell>
                    <StatusChip status={periodicidad.estado} />
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
    </Box>
  )
}
