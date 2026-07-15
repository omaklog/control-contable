'use client'

import { LoginForm, type LoginFormValues } from '@control-contable/ui'
import { createBrowserSupabaseClient } from '@control-contable/supabase-client/browser'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  async function handleSubmit(values: LoginFormValues): Promise<string | null> {
    const supabase = createBrowserSupabaseClient()
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    // FR-012: mensaje genérico, nunca revelar si el correo existe.
    if (error) {
      return 'Correo o contraseña incorrectos.'
    }

    return null
  }

  function handleSuccess() {
    router.push('/')
    router.refresh()
  }

  return (
    <LoginForm
      title="Panel Administrativo — Iniciar sesión"
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
    />
  )
}
