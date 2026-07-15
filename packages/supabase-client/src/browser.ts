import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@control-contable/types'

import { getSupabaseAnonKey, getSupabaseUrl } from './env'

export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(getSupabaseUrl(), getSupabaseAnonKey())
}
