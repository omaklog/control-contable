'use server'

import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import {
  mapearErrorPagoCobranzaAMensaje,
  type PagoCobranzaFormValues,
} from '@control-contable/utils'
import { revalidatePath } from 'next/cache'

export interface ActionResult {
  error: string | null
}

/**
 * Registra un pago sobre una cobranza (017-cobranza, US2, FR-014). El
 * trigger `validar_pago_cobranza` es la autoridad real que rechaza pagos que
 * excedan el saldo o que se intenten sobre una cobranza no vigente
 * (contracts/db-functions-rls.md Sección F) — esta acción solo traduce ese
 * rechazo a un mensaje claro. El recibo se genera automáticamente por
 * trigger sobre `pagos` (Sección F).
 */
export async function registrarPago(
  cobranzaId: string,
  values: PagoCobranzaFormValues,
): Promise<ActionResult> {
  await requireCapability('manage_billing')
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No se pudo identificar al usuario actual.' }
  }

  const { error } = await supabase.from('pagos').insert({
    cobranza_id: cobranzaId,
    monto: Number(values.monto),
    metodo_pago_id: values.metodoPagoId,
    fecha_pago: values.fechaPago,
    comentario: values.comentario.trim() || null,
    created_by: user.id,
    updated_by: user.id,
  })

  if (error) {
    return { error: mapearErrorPagoCobranzaAMensaje(error) }
  }

  revalidatePath(`/cobranza/${cobranzaId}`)
  revalidatePath('/cobranza')
  return { error: null }
}

/**
 * Elimina lógicamente una cobranza sin pagos registrados (017-cobranza, US5,
 * FR-019). El trigger `validar_transicion_cobranza` es la autoridad real que
 * rechaza la eliminación si ya tiene pagos — esta acción solo traduce ese
 * rechazo a un mensaje claro.
 */
export async function eliminarCobranza(cobranzaId: string): Promise<ActionResult> {
  await requireCapability('manage_billing')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('cobranzas')
    .update({ estado: 'eliminada' })
    .eq('id', cobranzaId)

  if (error) {
    return {
      error: error.message.includes('pagos registrados')
        ? 'No se puede eliminar: esta cobranza ya tiene pagos registrados. Cancélala o anúlala en su lugar.'
        : 'No se pudo eliminar la cobranza. Intenta de nuevo.',
    }
  }

  revalidatePath(`/cobranza/${cobranzaId}`)
  revalidatePath('/cobranza')
  return { error: null }
}

/**
 * Cancela o anula una cobranza (017-cobranza, US5, FR-020): permitido con o
 * sin pagos registrados. La cobranza, sus conceptos y sus pagos permanecen
 * disponibles como historial; el trigger `validar_pago_cobranza` impide
 * registrar nuevos pagos una vez cancelada.
 */
export async function cancelarCobranza(cobranzaId: string): Promise<ActionResult> {
  await requireCapability('manage_billing')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('cobranzas')
    .update({ estado: 'cancelada' })
    .eq('id', cobranzaId)

  if (error) {
    return { error: 'No se pudo cancelar la cobranza. Intenta de nuevo.' }
  }

  revalidatePath(`/cobranza/${cobranzaId}`)
  revalidatePath('/cobranza')
  return { error: null }
}
