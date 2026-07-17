'use server'

import { type AppRole, type Capability, requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import { revalidatePath } from 'next/cache'

import { createServiceRoleClient } from '@/lib/supabase/serviceRole'

import { wouldRemoveLastActiveAdministrador } from './lastAdminGuard'
import { generateTemporaryPassword } from './passwordGenerator'

const LAST_ADMIN_ERROR_MESSAGE = 'No puedes dejar el sistema sin ningún Administrador activo.'

export interface ActionResult {
  error: string | null
}

export interface CreateAccountInput {
  fullName: string
  email: string
  role: AppRole
}

export interface CreateAccountResult extends ActionResult {
  temporaryPassword: string | null
}

export interface ChangeUserRoleInput {
  profileId: string
  newRole: AppRole
}

export interface SetAccountActiveInput {
  profileId: string
  isActive: boolean
}

export interface AssignTemporaryPasswordResult extends ActionResult {
  temporaryPassword: string | null
}

export interface SetPermissionOverrideInput {
  profileId: string
  capability: Capability
  granted: boolean
}

export interface UpdateFullNameInput {
  profileId: string
  fullName: string
}

async function countActiveAdministradores(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
): Promise<number> {
  const { count } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('role', 'administrador')
    .eq('is_active', true)
  return count ?? 0
}

function mapUpdateError(error: { message: string }): string {
  if (error.message.includes('ningún Administrador activo')) {
    return LAST_ADMIN_ERROR_MESSAGE
  }
  return 'No se pudo actualizar la cuenta. Inténtalo de nuevo.'
}

/**
 * Da de alta una cuenta de personal de forma manual, sin invitación por
 * correo (FR-010): genera una contraseña temporal con el mismo mecanismo que
 * `assignTemporaryPassword` (research.md #11), la aplica vía `service_role`
 * (`auth.admin.createUser`), y marca `must_change_password = true` para que
 * el usuario deba establecerla en su primer inicio de sesión. La contraseña
 * se devuelve al llamador para mostrarla una sola vez. El nombre completo es
 * obligatorio (FR-015): sin él, la tabla de usuarios no tendría forma de
 * identificar la cuenta más allá de su identificador interno.
 */
export async function createAccount(input: CreateAccountInput): Promise<CreateAccountResult> {
  const fullName = input.fullName.trim()
  if (!fullName) {
    return { error: 'El nombre completo es obligatorio.', temporaryPassword: null }
  }

  const currentProfile = await requireCapability('manage_users')
  const service = createServiceRoleClient()

  const temporaryPassword = generateTemporaryPassword()

  const { data: userData, error: userError } = await service.auth.admin.createUser({
    email: input.email,
    password: temporaryPassword,
    email_confirm: true,
  })
  if (userError || !userData.user) {
    return {
      error: 'No se pudo crear la cuenta. Verifica el correo e inténtalo de nuevo.',
      temporaryPassword: null,
    }
  }

  const { error: profileError } = await service.from('profiles').insert({
    id: userData.user.id,
    full_name: fullName,
    role: input.role,
    is_active: true,
    must_change_password: true,
    created_by: currentProfile.id,
  })
  if (profileError) {
    return {
      error: 'La cuenta se creó pero no se pudo crear su perfil. Contacta a soporte.',
      temporaryPassword: null,
    }
  }

  revalidatePath('/usuarios')
  return { error: null, temporaryPassword }
}

export async function changeUserRole(input: ChangeUserRoleInput): Promise<ActionResult> {
  await requireCapability('manage_users')
  const supabase = await createServerSupabaseClient()

  const { data: target, error: fetchError } = await supabase
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', input.profileId)
    .single()
  if (fetchError || !target) {
    return { error: 'No se encontró la cuenta indicada.' }
  }

  const activeAdminCount = await countActiveAdministradores(supabase)
  const isTargetActiveAdmin = target.role === 'administrador' && target.is_active
  if (
    wouldRemoveLastActiveAdministrador(
      activeAdminCount,
      isTargetActiveAdmin,
      input.newRole,
      target.is_active,
    )
  ) {
    return { error: LAST_ADMIN_ERROR_MESSAGE }
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: input.newRole })
    .eq('id', input.profileId)

  if (updateError) {
    return { error: mapUpdateError(updateError) }
  }

  revalidatePath('/usuarios')
  return { error: null }
}

/**
 * Asigna una contraseña temporal generada por el sistema a una cuenta
 * existente, sin depender de un proveedor SMTP (FR-008). Marca
 * `must_change_password = true` para que `packages/auth` obligue a
 * establecer una nueva contraseña antes de acceder a cualquier otra función
 * (FR-013) — ver research.md #10.
 */
export async function assignTemporaryPassword(
  profileId: string,
): Promise<AssignTemporaryPasswordResult> {
  await requireCapability('manage_users')
  const service = createServiceRoleClient()

  const temporaryPassword = generateTemporaryPassword()

  const { error: authError } = await service.auth.admin.updateUserById(profileId, {
    password: temporaryPassword,
  })
  if (authError) {
    return {
      error: 'No se pudo asignar la contraseña temporal. Inténtalo de nuevo.',
      temporaryPassword: null,
    }
  }

  const { error: profileError } = await service
    .from('profiles')
    .update({ must_change_password: true })
    .eq('id', profileId)
  if (profileError) {
    return {
      error:
        'La contraseña se asignó pero no se pudo marcar el cambio obligatorio. Contacta a soporte.',
      temporaryPassword: null,
    }
  }

  revalidatePath('/usuarios')
  return { error: null, temporaryPassword }
}

export async function setAccountActive(input: SetAccountActiveInput): Promise<ActionResult> {
  await requireCapability('manage_users')
  const supabase = await createServerSupabaseClient()

  const { data: target, error: fetchError } = await supabase
    .from('profiles')
    .select('id, role, is_active')
    .eq('id', input.profileId)
    .single()
  if (fetchError || !target) {
    return { error: 'No se encontró la cuenta indicada.' }
  }

  const activeAdminCount = await countActiveAdministradores(supabase)
  const isTargetActiveAdmin = target.role === 'administrador' && target.is_active
  if (
    wouldRemoveLastActiveAdministrador(
      activeAdminCount,
      isTargetActiveAdmin,
      target.role,
      input.isActive,
    )
  ) {
    return { error: LAST_ADMIN_ERROR_MESSAGE }
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ is_active: input.isActive })
    .eq('id', input.profileId)

  if (updateError) {
    return { error: mapUpdateError(updateError) }
  }

  revalidatePath('/usuarios')
  return { error: null }
}

/**
 * Ajusta una capacidad específica para un usuario individual, por encima de
 * la plantilla por defecto de su rol (FR-014, research.md #13). `granted`
 * explícito (true/false) siempre sobreescribe cualquier ajuste anterior para
 * ese mismo usuario y capacidad.
 */
export async function setPermissionOverride(
  input: SetPermissionOverrideInput,
): Promise<ActionResult> {
  const currentProfile = await requireCapability('manage_user_permissions')
  const service = createServiceRoleClient()

  const { error } = await service.from('permission_overrides').upsert({
    profile_id: input.profileId,
    capability: input.capability,
    granted: input.granted,
    set_by: currentProfile.id,
  })
  if (error) {
    return { error: 'No se pudo ajustar el permiso. Inténtalo de nuevo.' }
  }

  revalidatePath('/usuarios')
  return { error: null }
}

/**
 * Edita el nombre completo de una cuenta existente (FR-018) — en particular,
 * de cuentas creadas antes de que ese campo fuera obligatorio (FR-015) y que
 * por eso la tabla de usuarios sigue mostrando con su identificador interno.
 */
export async function updateUserFullName(input: UpdateFullNameInput): Promise<ActionResult> {
  const fullName = input.fullName.trim()
  if (!fullName) {
    return { error: 'El nombre completo es obligatorio.' }
  }

  await requireCapability('manage_users')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', input.profileId)
  if (error) {
    return { error: 'No se pudo actualizar el nombre. Inténtalo de nuevo.' }
  }

  revalidatePath('/usuarios')
  return { error: null }
}
