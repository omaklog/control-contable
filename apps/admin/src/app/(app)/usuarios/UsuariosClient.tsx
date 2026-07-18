'use client'

import type { AppRole, Capability } from '@control-contable/auth'
import EditIcon from '@mui/icons-material/Edit'
import LockResetIcon from '@mui/icons-material/LockReset'
import ToggleOffIcon from '@mui/icons-material/ToggleOff'
import ToggleOnIcon from '@mui/icons-material/ToggleOn'
import TuneIcon from '@mui/icons-material/Tune'
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
import MenuItem from '@mui/material/MenuItem'
import Select, { type SelectChangeEvent } from '@mui/material/Select'
import { alpha } from '@mui/material/styles'
import Switch from '@mui/material/Switch'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TextField from '@mui/material/TextField'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useState, useTransition } from 'react'

import {
  assignTemporaryPassword,
  changeUserRole,
  createAccount,
  setAccountActive,
  setPermissionOverride,
  updateUserFullName,
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
  'manage_clients',
  'view_clients',
  'manage_billing',
  'view_billing',
  'manage_documents',
  'view_documents',
  'manage_catalogs',
]

const CAPABILITY_LABELS: Record<Capability, string> = {
  manage_users: 'Gestionar usuarios (alta, roles, activar/desactivar)',
  view_auth_audit_log: 'Consultar auditoría de autenticación',
  manage_user_permissions: 'Ajustar permisos individuales de otros usuarios',
  manage_clients: 'Gestionar clientes (alta, edición, baja)',
  view_clients: 'Consultar clientes',
  manage_billing: 'Gestionar cobranza (cargos y pagos)',
  view_billing: 'Consultar cobranza',
  manage_documents: 'Gestionar documentos del expediente',
  view_documents: 'Consultar documentos del expediente',
  manage_catalogs: 'Administrar catálogos (categorías, métodos de pago, etc.)',
}

export interface UsuarioRow {
  id: string
  role: AppRole
  isActive: boolean
  fullName: string | null
  email: string
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
  const [createFullName, setCreateFullName] = useState('')
  const [createEmail, setCreateEmail] = useState('')
  const [createRole, setCreateRole] = useState<AppRole>('auxiliar')
  const [confirmTarget, setConfirmTarget] = useState<{ id: string; nextActive: boolean } | null>(
    null,
  )
  const [tempPasswordTarget, setTempPasswordTarget] = useState<string | null>(null)
  const [tempPasswordResult, setTempPasswordResult] = useState<string | null>(null)
  const [permissionsTargetId, setPermissionsTargetId] = useState<string | null>(null)
  const permissionsTarget = profiles.find((profile) => profile.id === permissionsTargetId) ?? null
  const [editNameTargetId, setEditNameTargetId] = useState<string | null>(null)
  const [editNameValue, setEditNameValue] = useState('')
  const editNameTarget = profiles.find((profile) => profile.id === editNameTargetId) ?? null

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
      const result = await createAccount({
        fullName: createFullName,
        email: createEmail,
        role: createRole,
      })
      if (result.error || !result.temporaryPassword) {
        setGlobalError(result.error ?? 'No se pudo crear la cuenta.')
        return
      }
      setCreateOpen(false)
      setCreateFullName('')
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

  function openEditName(profile: UsuarioRow) {
    setEditNameValue(profile.fullName ?? '')
    setEditNameTargetId(profile.id)
  }

  function handleEditNameSubmit() {
    if (!editNameTargetId) return
    const profileId = editNameTargetId
    setGlobalError(null)
    startTransition(async () => {
      const result = await updateUserFullName({ profileId, fullName: editNameValue })
      if (result.error) {
        setGlobalError(result.error)
        return
      }
      setEditNameTargetId(null)
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
              <TableCell>Correo electrónico</TableCell>
              <TableCell>Rol</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {profiles.map((profile) => (
              <TableRow key={profile.id} hover>
                <TableCell>{profile.fullName ?? profile.id}</TableCell>
                <TableCell>{profile.email}</TableCell>
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
                <TableCell>
                  <Chip
                    label={profile.isActive ? 'Activa' : 'Desactivada'}
                    size="small"
                    sx={(theme) => ({
                      bgcolor: alpha(
                        profile.isActive
                          ? theme.palette.secondary.main
                          : theme.palette.text.secondary,
                        0.1,
                      ),
                      color: profile.isActive
                        ? theme.palette.secondary.main
                        : theme.palette.text.secondary,
                      fontWeight: 600,
                    })}
                  />
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Tooltip title="Editar nombre">
                      <span>
                        <IconButton
                          size="small"
                          aria-label="Editar nombre"
                          disabled={isPending}
                          onClick={() => openEditName(profile)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title={profile.isActive ? 'Desactivar cuenta' : 'Activar cuenta'}>
                      <span>
                        <IconButton
                          size="small"
                          aria-label={profile.isActive ? 'Desactivar cuenta' : 'Activar cuenta'}
                          color={profile.isActive ? 'error' : 'success'}
                          disabled={isPending || profile.id === currentProfileId}
                          onClick={() =>
                            setConfirmTarget({ id: profile.id, nextActive: !profile.isActive })
                          }
                        >
                          {profile.isActive ? (
                            <ToggleOnIcon fontSize="small" />
                          ) : (
                            <ToggleOffIcon fontSize="small" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Asignar contraseña temporal">
                      <span>
                        <IconButton
                          size="small"
                          aria-label="Asignar contraseña temporal"
                          disabled={isPending}
                          onClick={() => setTempPasswordTarget(profile.id)}
                        >
                          <LockResetIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Ajustar permisos individuales">
                      <span>
                        <IconButton
                          size="small"
                          aria-label="Ajustar permisos individuales"
                          disabled={isPending}
                          onClick={() => setPermissionsTargetId(profile.id)}
                        >
                          <TuneIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
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
            label="Nombre completo"
            value={createFullName}
            onChange={(event) => setCreateFullName(event.target.value)}
            required
            fullWidth
          />
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
            disabled={isPending || !createFullName.trim() || !createEmail}
            onClick={handleCreateSubmit}
          >
            Crear cuenta
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(editNameTarget)} onClose={() => setEditNameTargetId(null)}>
        <DialogTitle>Editar nombre</DialogTitle>
        <DialogContent
          sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1, minWidth: 320 }}
        >
          <TextField
            label="Nombre completo"
            value={editNameValue}
            onChange={(event) => setEditNameValue(event.target.value)}
            required
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditNameTargetId(null)}>Cancelar</Button>
          <Button
            variant="contained"
            disabled={isPending || !editNameValue.trim()}
            onClick={handleEditNameSubmit}
          >
            Guardar
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
