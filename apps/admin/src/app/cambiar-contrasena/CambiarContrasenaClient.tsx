'use client'

import { createBrowserSupabaseClient } from '@control-contable/supabase-client/browser'
import { SetNewPasswordForm } from '@control-contable/ui'
import { useRouter } from 'next/navigation'

export function CambiarContrasenaClient() {
  const router = useRouter()

  async function handleSubmit(password: string): Promise<string | null> {
    const supabase = createBrowserSupabaseClient()

    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      return 'No se pudo actualizar la contraseña. Inténtalo de nuevo.'
    }

    const { error: rpcError } = await supabase.rpc('clear_must_change_password')
    if (rpcError) {
      return 'La contraseña se actualizó pero no se pudo completar el proceso. Contacta a soporte.'
    }

    return null
  }

  function handleSuccess() {
    router.push('/')
    router.refresh()
  }

  return (
    <SetNewPasswordForm
      title="Debes establecer una nueva contraseña"
      onSubmit={handleSubmit}
      onSuccess={handleSuccess}
    />
  )
}
