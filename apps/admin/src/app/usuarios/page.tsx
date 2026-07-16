import { type Capability, requireCapability, roleDefaultCapabilities } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

import { createServiceRoleClient } from '@/lib/supabase/serviceRole'

import { UsuariosClient } from './UsuariosClient'

/**
 * Historia 3: alta manual (sin invitación), cambio de rol y
 * activación/desactivación — reemplaza el placeholder de la Historia 1.
 * Historia 2: ajuste de permisos individuales por usuario, por encima de la
 * plantilla por defecto de su rol (FR-014, research.md #13).
 */
export default async function UsuariosPage() {
  const currentProfile = await requireCapability('manage_users')
  const supabase = await createServerSupabaseClient()

  // El correo vive únicamente en auth.users (profiles no lo duplica, FR-019,
  // research.md/spec.md Assumptions) — se obtiene server-side con
  // service_role, nunca expuesta al navegador.
  const service = createServiceRoleClient()

  const [{ data: profilesData }, { data: overridesData }, { data: usersData }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, role, is_active, full_name')
      .order('created_at', { ascending: true }),
    supabase.from('permission_overrides').select('profile_id, capability, granted'),
    service.auth.admin.listUsers({ perPage: 1000 }),
  ])

  const emailById = new Map(usersData?.users.map((user) => [user.id, user.email ?? '']) ?? [])

  const overridesByProfile = new Map<string, { capability: Capability; granted: boolean }[]>()
  for (const override of overridesData ?? []) {
    const capability = override.capability as Capability
    const list = overridesByProfile.get(override.profile_id) ?? []
    list.push({ capability, granted: override.granted })
    overridesByProfile.set(override.profile_id, list)
  }

  const profiles = (profilesData ?? []).map((row) => {
    const overrides = overridesByProfile.get(row.id) ?? []
    const capabilities = new Set(roleDefaultCapabilities(row.role))
    for (const override of overrides) {
      if (override.granted) capabilities.add(override.capability)
      else capabilities.delete(override.capability)
    }
    return {
      id: row.id,
      role: row.role,
      isActive: row.is_active,
      fullName: row.full_name,
      email: emailById.get(row.id) ?? '',
      capabilities: Array.from(capabilities),
      overrides: Object.fromEntries(overrides.map((o) => [o.capability, o.granted])) as Partial<
        Record<Capability, boolean>
      >,
    }
  })

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Gestión de usuarios
      </Typography>
      <UsuariosClient profiles={profiles} currentProfileId={currentProfile.id} />
    </Container>
  )
}
