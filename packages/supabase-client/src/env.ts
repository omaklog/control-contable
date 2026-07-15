function requireEnv(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Variable de entorno requerida no configurada: ${name}. Copia el .env.local.example de la app y completa los valores.`,
    )
  }
  return value
}

// Next.js inlina NEXT_PUBLIC_* en el bundle del navegador solo cuando el
// acceso es literal (`process.env.NEXT_PUBLIC_X`), no vía notación dinámica
// (`process.env[name]`) — por eso cada variable se lee de forma explícita
// aquí en vez de a través de un helper genérico con bracket access.
export function getSupabaseUrl(): string {
  return requireEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
}

export function getSupabaseAnonKey(): string {
  return requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}
