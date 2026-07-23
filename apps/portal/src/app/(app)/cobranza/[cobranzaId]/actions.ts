'use server'

import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import {
  mapearErrorModificarPagoAMensaje,
  mapearErrorPagoCobranzaAMensaje,
  mapearErrorRevertirPagoAMensaje,
  type ModificarPagoFormValues,
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
 * Modifica los campos editables de un pago existente (018-gestion-pagos,
 * US1, FR-004/FR-012). El trigger `validar_pago_cobranza` revalida el saldo
 * si el monto cambia, y `trg_pagos_audit_fn` registra campo por campo lo que
 * cambió (contracts/db-functions-rls.md Secciones C y E) — esta acción solo
 * traduce el rechazo a un mensaje claro.
 */
export async function modificarPago(
  cobranzaId: string,
  pagoId: string,
  values: ModificarPagoFormValues,
): Promise<ActionResult> {
  await requireCapability('manage_billing')
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No se pudo identificar al usuario actual.' }
  }

  const { error } = await supabase
    .from('pagos')
    .update({
      monto: Number(values.monto),
      metodo_pago_id: values.metodoPagoId,
      fecha_pago: values.fechaPago,
      comentario: values.comentario.trim() || null,
      updated_by: user.id,
    })
    .eq('id', pagoId)

  if (error) {
    return { error: mapearErrorModificarPagoAMensaje(error) }
  }

  revalidatePath(`/cobranza/${cobranzaId}`)
  revalidatePath('/pagos')
  return { error: null }
}

/**
 * Revierte un pago exigiendo un motivo obligatorio (018-gestion-pagos, US2,
 * FR-015/FR-016): conserva el registro histórico, cambia su estado a
 * "Revertido" y lo excluye del saldo. El trigger `validar_transicion_pago`
 * rechaza revertir un pago que ya sea un estado final.
 */
export async function revertirPago(
  cobranzaId: string,
  pagoId: string,
  motivoReversion: string,
): Promise<ActionResult> {
  await requireCapability('manage_billing')
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No se pudo identificar al usuario actual.' }
  }

  const { error } = await supabase
    .from('pagos')
    .update({ estado: 'revertido', motivo_reversion: motivoReversion, updated_by: user.id })
    .eq('id', pagoId)

  if (error) {
    return { error: mapearErrorRevertirPagoAMensaje(error) }
  }

  revalidatePath(`/cobranza/${cobranzaId}`)
  revalidatePath('/pagos')
  return { error: null }
}

/**
 * Elimina lógicamente un pago (018-gestion-pagos, US3, FR-006/FR-013): lo
 * excluye de las consultas operativas normales y del cálculo del saldo, sin
 * borrar el registro físico. El trigger `validar_transicion_pago` rechaza
 * eliminar un pago que ya sea un estado final.
 */
export async function eliminarPago(cobranzaId: string, pagoId: string): Promise<ActionResult> {
  await requireCapability('manage_billing')
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No se pudo identificar al usuario actual.' }
  }

  const { error } = await supabase
    .from('pagos')
    .update({ estado: 'eliminado', updated_by: user.id })
    .eq('id', pagoId)

  if (error) {
    return { error: 'No se pudo eliminar el pago. Intenta de nuevo.' }
  }

  revalidatePath(`/cobranza/${cobranzaId}`)
  revalidatePath('/pagos')
  return { error: null }
}

const BUCKET_COMPROBANTES_PAGO = 'comprobantes-pago'

/**
 * Adjunta uno o varios comprobantes a un pago (018-gestion-pagos, US4,
 * FR-008/FR-009/FR-010): sin límite de cantidad ni validación de duplicidad.
 * Sube primero el archivo al bucket dedicado y solo si eso tiene éxito
 * inserta la fila de metadata (contracts/db-functions-rls.md Sección F/G).
 */
export async function adjuntarComprobante(
  cobranzaId: string,
  pagoId: string,
  formData: FormData,
): Promise<ActionResult> {
  await requireCapability('manage_billing')
  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No se pudo identificar al usuario actual.' }
  }

  const archivos = formData
    .getAll('archivos')
    .filter((entry): entry is File => entry instanceof File)
  if (archivos.length === 0) {
    return { error: 'Selecciona al menos un archivo.' }
  }

  for (const archivo of archivos) {
    const ruta = `${pagoId}/${crypto.randomUUID()}-${archivo.name}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_COMPROBANTES_PAGO)
      .upload(ruta, archivo, { contentType: archivo.type })

    if (uploadError) {
      return { error: 'No se pudo subir el comprobante. Intenta de nuevo.' }
    }

    const { error: insertError } = await supabase.from('comprobantes_pago').insert({
      pago_id: pagoId,
      nombre_original: archivo.name,
      tipo_archivo: archivo.type,
      tamano_bytes: archivo.size,
      ruta_almacenamiento: ruta,
      created_by: user.id,
    })

    if (insertError) {
      await supabase.storage.from(BUCKET_COMPROBANTES_PAGO).remove([ruta])
      return { error: 'No se pudo registrar el comprobante. Intenta de nuevo.' }
    }
  }

  revalidatePath(`/cobranza/${cobranzaId}`)
  return { error: null }
}

/**
 * Elimina un comprobante de forma independiente del pago al que pertenece
 * (018-gestion-pagos, US4, FR-011/FR-012): borra primero el archivo del
 * Storage y solo si eso tiene éxito borra la fila de metadata — el pago
 * asociado permanece intacto.
 */
export async function eliminarComprobante(
  cobranzaId: string,
  comprobanteId: string,
  rutaAlmacenamiento: string,
): Promise<ActionResult> {
  await requireCapability('manage_billing')
  const supabase = await createServerSupabaseClient()

  const { error: removeError } = await supabase.storage
    .from(BUCKET_COMPROBANTES_PAGO)
    .remove([rutaAlmacenamiento])

  if (removeError) {
    return { error: 'No se pudo eliminar el archivo del almacenamiento. Intenta de nuevo.' }
  }

  const { error } = await supabase.from('comprobantes_pago').delete().eq('id', comprobanteId)

  if (error) {
    return { error: 'No se pudo eliminar el comprobante. Intenta de nuevo.' }
  }

  revalidatePath(`/cobranza/${cobranzaId}`)
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
