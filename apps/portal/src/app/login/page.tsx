'use client'

import { LoginForm, type LoginFormValues } from '@control-contable/ui'
import { createBrowserSupabaseClient } from '@control-contable/supabase-client/browser'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()

  async function handleSubmit(values: LoginFormValues): Promise<string | null> {
    const supabase = createBrowserSupabaseClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    })

    // FR-012: mensaje genérico, nunca revelar si el correo existe.
    if (error || !data.user) {
      return 'Correo o contraseña incorrectos.'
    }

    // Historia 2, Acceptance Scenario 3: cuenta inactiva/suspendida — a
    // diferencia de credenciales inválidas, aquí sí se informa explícitamente
    // que la cuenta no está activa (GoTrue no conoce profiles.is_active).
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', data.user.id)
      .single()

    if (!profile || !profile.is_active) {
      await supabase.auth.signOut()
      return 'Esta cuenta no está activa. Contacta al despacho para más información.'
    }

    return null
  }

  function handleSuccess() {
    router.push('/')
    router.refresh()
  }

  return (
    <LoginForm
      title="Portal de Clientes — Iniciar sesión"
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
    />
  )
}
