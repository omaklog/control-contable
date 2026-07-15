import { createServerClient, type SetAllCookies } from '@supabase/ssr'
import type { Database } from '@control-contable/types'
import { NextResponse, type NextRequest } from 'next/server'

import { getSupabaseAnonKey, getSupabaseUrl } from './env'

/**
 * Refresca la sesión de Supabase en cada solicitud (renueva el token si hace
 * falta) y propaga las cookies actualizadas en la respuesta. Debe llamarse
 * desde el `middleware.ts` de cada app antes de cualquier chequeo de rol —
 * es lo que garantiza que la sesión nunca quede "atascada" en un estado viejo.
 */
export async function refreshSupabaseSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll: ((cookiesToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
      }) satisfies SetAllCookies,
    },
  })

  // No eliminar: getUser() es lo que efectivamente revalida/refresca el token.
  await supabase.auth.getUser()

  return supabaseResponse
}
