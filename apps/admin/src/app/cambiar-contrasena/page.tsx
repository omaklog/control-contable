import { getCurrentProfile } from '@control-contable/auth'
import { redirect } from 'next/navigation'

import { CambiarContrasenaClient } from './CambiarContrasenaClient'

/**
 * Destino forzado cuando `mustChangePassword` es true (FR-013). Llama a
 * `getCurrentProfile()` directamente, no a `requireApp`/
 * `requireCapability` — usarlas aquí redirigiría de vuelta a esta misma
 * página en un bucle (ver contracts/package-api.md).
 */
export default async function CambiarContrasenaPage() {
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  return <CambiarContrasenaClient />
}
