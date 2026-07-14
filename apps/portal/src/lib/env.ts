const required = {
  NEXT_PUBLIC_SUPABASE_URL: process.env['NEXT_PUBLIC_SUPABASE_URL'],
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'],
  NEXT_PUBLIC_APP_URL: process.env['NEXT_PUBLIC_APP_URL'],
} as const

const serverOnly = {
  SUPABASE_SERVICE_ROLE_KEY: process.env['SUPABASE_SERVICE_ROLE_KEY'],
} as const

function validateEnv() {
  const missing: string[] = []

  for (const [key, value] of Object.entries(required)) {
    if (!value) missing.push(key)
  }

  if (missing.length > 0) {
    throw new Error(
      `Variables de entorno requeridas no configuradas:\n${missing.map((k) => `  - ${k}`).join('\n')}\n\nCopia apps/portal/.env.local.example a apps/portal/.env.local y completa los valores.`,
    )
  }
}

validateEnv()

export const env = {
  ...required,
  ...serverOnly,
} as {
  NEXT_PUBLIC_SUPABASE_URL: string
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string
  NEXT_PUBLIC_APP_URL: string
  SUPABASE_SERVICE_ROLE_KEY: string | undefined
}
