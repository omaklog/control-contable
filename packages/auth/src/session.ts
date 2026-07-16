import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import { redirect } from 'next/navigation'

import {
  type AppName,
  type AppRole,
  type Capability,
  canAccessApp,
  roleDefaultCapabilities,
} from './roles'

export interface CurrentProfile {
  id: string
  role: AppRole
  isActive: boolean
  fullName: string | null
  mustChangePassword: boolean
  /** Plantilla del rol + permission_overrides del usuario ya resueltos (research.md #13). */
  capabilities: Capability[]
  /** Correo de auth.getUser() — respaldo del avatar cuando no hay fullName (004-portal-main-layout). */
  email: string
}

/**
 * Combina la plantilla de capacidades por defecto de un rol con los ajustes
 * individuales de `permission_overrides` de un usuario (FR-014, research.md
 * #13): `granted=true` agrega una capacidad fuera de la plantilla,
 * `granted=false` retira una que la plantilla sí incluiría. Función pura,
 * sin I/O — testeable sin base de datos.
 */
export function resolveCapabilities(
  role: AppRole,
  overrides: { capability: string; granted: boolean }[],
): Capability[] {
  const capabilities = new Set<Capability>(roleDefaultCapabilities(role))
  for (const override of overrides) {
    const capability = override.capability as Capability
    if (override.granted) {
      capabilities.add(capability)
    } else {
      capabilities.delete(capability)
    }
  }
  return Array.from(capabilities)
}

/**
 * Perfil de negocio del usuario autenticado en la sesión actual, o `null` si
 * no hay sesión, no existe perfil, o el perfil está desactivado. El rol se
 * lee de `profiles` en cada llamada (nunca de un claim cacheado del JWT) para
 * que un cambio de rol/desactivación surta efecto de inmediato — ver
 * specs/003-supabase-auth-roles/research.md #2. Las capacidades efectivas se
 * resuelven combinando la plantilla del rol con los ajustes individuales de
 * `permission_overrides` (research.md #13).
 */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, is_active, full_name, must_change_password')
    .eq('id', user.id)
    .single()

  if (!profile || !profile.is_active) {
    return null
  }

  const { data: overrides } = await supabase
    .from('permission_overrides')
    .select('capability, granted')
    .eq('profile_id', user.id)

  return {
    id: profile.id,
    role: profile.role,
    isActive: profile.is_active,
    fullName: profile.full_name,
    mustChangePassword: profile.must_change_password,
    capabilities: resolveCapabilities(profile.role, overrides ?? []),
    email: user.email ?? '',
  }
}

/**
 * Exige que la sesión actual pertenezca a un rol con acceso a la aplicación
 * indicada (`admin` exclusiva de Administrador; `portal` para los 3 roles de
 * personal — research.md #12). Redirige a /login si no hay sesión, a
 * /cambiar-contrasena si el usuario debe establecer una nueva contraseña
 * antes de continuar (FR-013, research.md #10), o a /unauthorized si el rol
 * no tiene acceso a esa aplicación.
 */
export async function requireApp(app: AppName): Promise<CurrentProfile> {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile.mustChangePassword) {
    redirect('/cambiar-contrasena')
  }

  if (!canAccessApp(profile.role, app)) {
    redirect('/unauthorized')
  }

  return profile
}

/**
 * Exige que la sesión actual tenga la capacidad indicada, ya resuelta
 * (plantilla del rol + ajustes individuales — research.md #13). Redirige a
 * /login si no hay sesión, a /cambiar-contrasena si el usuario debe
 * establecer una nueva contraseña antes de continuar (FR-013, research.md
 * #10), o a /unauthorized si no tiene la capacidad.
 */
export async function requireCapability(capability: Capability): Promise<CurrentProfile> {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile.mustChangePassword) {
    redirect('/cambiar-contrasena')
  }

  if (!profile.capabilities.includes(capability)) {
    redirect('/unauthorized')
  }

  return profile
}
