import { createServerClient, type SetAllCookies } from '@supabase/ssr'
import type { Database } from '@control-contable/types'
import { cookies } from 'next/headers'

import { getSupabaseAnonKey, getSupabaseUrl } from './env'

/**
 * Cliente de Supabase para Server Components, Route Handlers y Server Actions.
 * `setAll` puede fallar cuando se invoca desde un Server Component puro (no
 * puede escribir cookies); se ignora a propósito porque el middleware de cada
 * app (`refreshSupabaseSession`) ya se encarga de refrescar la sesión.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll: ((cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // Server Component: no puede escribir cookies, se ignora.
        }
      }) satisfies SetAllCookies,
    },
  })
}
