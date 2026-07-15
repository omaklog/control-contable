import { refreshSupabaseSession } from '@control-contable/supabase-client/middleware'
import type { NextRequest } from 'next/server'

/**
 * Solo refresca la sesión de Supabase (renueva cookies si hace falta). El
 * chequeo de acceso a esta app/capacidad vive en las páginas/layouts de
 * Server Component protegidos (`requireApp`/`requireCapability` de
 * `@control-contable/auth`), no aquí: ese código usa `next/headers`,
 * incompatible con el runtime Edge en el que corre el middleware — ver
 * contracts/package-api.md.
 */
export async function middleware(request: NextRequest) {
  return refreshSupabaseSession(request)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
