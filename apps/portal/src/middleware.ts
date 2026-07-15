import { refreshSupabaseSession } from '@control-contable/supabase-client/middleware'
import type { NextRequest } from 'next/server'

/**
 * Solo refresca la sesión de Supabase. El chequeo de acceso a esta app
 * (`requireApp('portal')`) vive en las páginas/layouts de Server Component
 * protegidos, de `@control-contable/auth` — ver apps/admin/src/middleware.ts
 * para la misma decisión de diseño.
 */
export async function middleware(request: NextRequest) {
  return refreshSupabaseSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
