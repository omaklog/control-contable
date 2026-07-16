import type { Database } from '@control-contable/types'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { env } from '@/lib/env'

/**
 * Cliente de Supabase con la `service_role` key — server-only, nunca se
 * expone al navegador. Compartido entre Server Actions (`actions.ts`) y
 * Server Components (p. ej. `page.tsx` para leer `auth.users.email`, FR-019)
 * que necesiten operaciones fuera del alcance de RLS del usuario autenticado.
 */
export function createServiceRoleClient(): SupabaseClient<Database> {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY no está configurada.')
  }
  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
