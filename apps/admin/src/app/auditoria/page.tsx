import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import Container from '@mui/material/Container'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'

interface AuditLogEntry {
  created_at?: string
  payload?: {
    action?: string
    actor_username?: string
  }
}

/**
 * Historia de auditoría de autenticación (FR-009, SC-006). Lee
 * `auth.audit_log_entries` (login/logout/fallos) a través de la función
 * `get_auth_audit_log()`, restringida a Administradores — ver
 * contracts/db-functions-rls.md. Los cambios de rol/estado se auditan por
 * separado en `profile_change_history` (visibles desde /usuarios).
 */
export default async function AuditoriaPage() {
  await requireCapability('view_auth_audit_log')
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.rpc('get_auth_audit_log', { limit_rows: 200 })
  const entries = (error ? [] : ((data ?? []) as AuditLogEntry[])).filter(Boolean)

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Auditoría de autenticación
      </Typography>
      {error ? (
        <Typography color="error">No se pudo cargar el registro de auditoría.</Typography>
      ) : (
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Evento</TableCell>
              <TableCell>Usuario</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry, index) => (
              // Sin id estable expuesto por get_auth_audit_log(); el índice es aceptable en una lista de solo lectura que no se reordena.
              <TableRow key={index}>
                <TableCell>
                  {entry.created_at ? new Date(entry.created_at).toLocaleString('es-MX') : '—'}
                </TableCell>
                <TableCell>{entry.payload?.action ?? '—'}</TableCell>
                <TableCell>{entry.payload?.actor_username ?? '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Container>
  )
}
