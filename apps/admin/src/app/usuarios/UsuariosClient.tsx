'use client'

import type { AppRole, Capability } from '@control-contable/auth'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import FormControlLabel from '@mui/material/FormControlLabel'
import MenuItem from '@mui/material/MenuItem'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Typography from '@mui/material/Typography'
import { useState, useTransition } from 'react'

import {
  assignTemporaryPassword,
  changeUserRole,
  createAccount,
  setAccountActive,
  setPermissionOverride,
} from './actions'

// Listas locales (no importadas como valores desde '@control-contable/auth'):
// ese paquete re-exporta session.ts, que usa `next/headers` — importar un
// valor runtime de su barrel desde un Client Component rompe el bundle del
// navegador. Los imports `import type` de arriba sí son seguros (se borran en
// tiempo de compilación). Mismo patrón que ya usaba STAFF_ROLES antes de este
// rework.
const ALL_ROLES: readonly AppRole[] = ['administrador', 'contador', 'auxiliar']
const ALL_CAPABILITIES: readonly Capability[] = [
  'manage_users',
  'view_auth_audit_log',
  'manage_user_permissions',
]

const CAPABILITY_LABELS: Record<Capability, string> = {
  manage_users: 'Gestionar usuarios (alta, roles, activar/desactivar)',
  view_auth_audit_log: 'Consultar auditoría de autenticación',
  manage_user_permissions: 'Ajustar permisos individuales de otros usuarios',
}

export interface UsuarioRow {
  id: string
  role: AppRole
  isActive: boolean
  fullName: string | null
  capabilities: Capability[]
  overrides: Partial<Record<Capability, boolean>>
}

export function UsuariosClient({
  profiles,
  currentProfileId,
}: {
  profiles: UsuarioRow[]
  currentProfileId: string
}) {
  const [isPending, startTransition] = useTransition()
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createEmail, setCreateEmail] = useState('')
  const [createRole, setCreateRole] = useState<AppRole>('auxiliar')
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; nextActive: boolean } | null>(
    null,
  )
  const [tempPasswordTarget, setTempPasswordTarget] = useState<string | null>(null)
  const [tempPasswordResult, setTempPasswordResult] = useState<string | null>(null)
  const [permissionsTargetId, setPermissionsTargetId] = useState<string | null>(null)
  const permissionsTarget = profiles.find((profile) => profile.id === permissionsTargetId) ?? null

  function handleRoleChange(profileId: string, event: SelectChangeEvent) {
    const newRole = event.target.value as AppRole
    setGlobalError(null)
    startTransition(async () => {
      const result = await changeUserRole({ profileId, newRole })
      if (result.error) setGlobalError(result.error)
    })
  }

  function confirmToggleActive() {
    if (!confirmTarget) return
    const { id, nextActive } = confirmTarget
    setConfirmTarget(null)
    setGlobalError(null)
    startTransition(async () => {
      const result = await setAccountActive({ profileId: id, isActive: nextActive })
      if (result.error) setGlobalError(result.error)
    })
  }

  function handleCreateSubmit() {
    setGlobalError(null)
    startTransition(async () => {
      const result = await createAccount({ email: createEmail, role: createRole })
      if (result.error || !result.temporaryPassword) {
        setGlobalError(result.error ?? 'No se pudo crear la cuenta.')
        return
      }
      setCreateOpen(false)
      setCreateEmail('')
      setTempPasswordResult(result.temporaryPassword)
    })
  }

  function confirmAssignTemporaryPassword() {
    if (!tempPasswordTarget) return
    const profileId = tempPasswordTarget
    setTempPasswordTarget(null)
    setGlobalError(null)
    startTransition(async () => {
      const result = await assignTemporaryPassword(profileId)
      if (result.error || !result.temporaryPassword) {
        setGlobalError(result.error ?? 'No se pudo asignar la contraseña temporal.')
        return
      }
      setTempPasswordResult(result.temporaryPassword)
    })
  }

  function handleTogglePermission(profileId: string, capability: Capability, granted: boolean) {
    setGlobalError(null)
    startTransition(async () => {
      const result = await setPermissionOverride({ profileId, capability, granted })
      if (result.error) setGlobalError(result.error)
    })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {globalError ? <Alert severity="error">{globalError}</Alert> : null}

      <Box>
        <Button variant="contained" onClick={() => setCreateOpen(true)}>
          Crear cuenta
        </Button>
      </Box>

      <Box>
        <Typography variant="h6" gutterBottom>
          Cuentas
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell>{profile.fullName ?? profile.id}</TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={profile.role}
                    disabled={isPending}
                    onChange={(event) => handleRoleChange(profile.id, event)}
                  >
                    {ALL_ROLES.map((role) => (
                      <MenuItem key={role} value={role}>
                        {role}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell>{profile.isActive ? 'Activa' : 'Desactivada'}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    <Button
                      size="small"
                      color={profile.isActive ? 'error' : 'success'}
                      disabled={isPending || profile.id === currentProfileId}
                      onClick={() =>
                        setConfirmTarget({ id: profile.id, nextActive: !profile.isActive })
                      }
                    >
                      {profile.isActive ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button
                      size="small"
                      disabled={isPending}
                      onClick={() => setTempPasswordTarget(profile.id)}
                    >
                      Contraseña temporal
                    </Button>
                    <Button
                      size="small"
                      disabled={isPending}
                      onClick={() => setPermissionsTargetId(profile.id)}
                    >
                      Permisos
                    </Button>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)}>
        <DialogTitle>Crear cuenta</DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1, minWidth: 320 }}
        >
          <Typography variant="body2" color="text.secondary">
            La cuenta se crea de inmediato, sin invitación por correo. El sistema genera una
            contraseña temporal que deberás entregar al usuario por un canal seguro.
          </Typography>
          <TextField
            label="Correo electrónico"
            type="email"
            value={createEmail}
            onChange={(event) => setCreateEmail(event.target.value)}
            fullWidth
          />
          <Select
            value={createRole}
            onChange={(event) => setCreateRole(event.target.value as AppRole)}
          >
            {ALL_ROLES.map((role) => (
              <MenuItem key={role} value={role}>
                {role}
              </MenuItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={isPending || !createEmail}
            onClick={handleCreateSubmit}
          >
            Crear cuenta
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(confirmTarget)} onClose={() => setConfirmTarget(null)}>
        <DialogTitle>Confirmar</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Seguro que deseas {confirmTarget?.nextActive ? 'activar' : 'desactivar'} esta cuenta?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmTarget(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={confirmToggleActive}>
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(tempPasswordTarget)} onClose={() => setTempPasswordTarget(null)}>
        <DialogTitle>Asignar contraseña temporal</DialogTitle>
        <DialogContent>
          <Typography>
            Se generará una contraseña temporal y la contraseña actual de esta cuenta dejará de
            funcionar de inmediato. El usuario deberá establecer una nueva contraseña en su próximo
            inicio de sesión.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTempPasswordTarget(null)}>Cancelar</Button>
          <Button variant="contained" onClick={confirmAssignTemporaryPassword}>
            Generar contraseña temporal
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(tempPasswordResult)} onClose={() => setTempPasswordResult(null)}>
        <DialogTitle>Contraseña temporal generada</DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1, minWidth: 320 }}
        >
          <Alert severity="warning">
            Esta contraseña solo se muestra una vez. Entrégala al usuario por un canal seguro; no
            queda registrada en ningún otro lugar del sistema.
          </Alert>
          <TextField
            label="Contraseña temporal"
            value={tempPasswordResult ?? ''}
            slotProps={{ input: { readOnly: true } }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setTempPasswordResult(null)}>
            Ya la entregué, cerrar
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(permissionsTarget)} onClose={() => setPermissionsTargetId(null)}>
        <DialogTitle>
          Permisos de {permissionsTarget?.fullName ?? permissionsTarget?.id}
        </DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1, minWidth: 360 }}
        >
          <Typography variant="body2" color="text.secondary">
            Por defecto cada capacidad viene de la plantilla del rol ({permissionsTarget?.role}).
            Puedes activarla o desactivarla solo para este usuario, sin afectar a otros con el mismo
            rol.
          </Typography>
          {ALL_CAPABILITIES.map((capability) => {
            const checked = permissionsTarget?.capabilities.includes(capability) ?? false
            const isOverride = permissionsTarget ? capability in permissionsTarget.overrides : false
            return (
              <FormControlLabel
                key={capability}
                control={
                  <Switch
                    checked={checked}
                    disabled={isPending}
                    onChange={(event) => {
                      if (!permissionsTarget) return
                      handleTogglePermission(permissionsTarget.id, capability, event.target.checked)
                    }}
                  />
                }
                label={`${CAPABILITY_LABELS[capability]}${isOverride ? ' (ajuste individual)' : ''}`}
              />
            )
          })}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setPermissionsTargetId(null)}>
            Cerrar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
