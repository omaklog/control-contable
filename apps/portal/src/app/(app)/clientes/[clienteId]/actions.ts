'use server'

import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import { mapearErrorContactoAMensaje, type ContactoFormValues } from '@control-contable/utils'
import { revalidatePath } from 'next/cache'

export interface ActionResult {
  error: string | null
}

/**
 * Gestión de Contactos desde la página de detalle de Cliente
 * (008-contactos-y-detalle-cliente US2). Nunca se elimina un Contacto de
 * forma física — ver setContactoEstado (FR-006, research.md Decisión 2).
 */
export async function createContacto(
  clienteId: string,
  values: ContactoFormValues,
): Promise<ActionResult & { contactoId?: string }> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('contactos')
    .insert({
      cliente_id: clienteId,
      nombre: values.nombre.trim(),
      telefono: values.telefono.trim(),
      email: values.email.trim() || null,
    })
    .select('id')
    .single()

  if (error) {
    return { error: mapearErrorContactoAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null, contactoId: data.id }
}

export async function updateContacto(
  clienteId: string,
  contactoId: string,
  values: ContactoFormValues,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('contactos')
    .update({
      nombre: values.nombre.trim(),
      telefono: values.telefono.trim(),
      email: values.email.trim() || null,
    })
    .eq('id', contactoId)

  if (error) {
    return { error: mapearErrorContactoAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Cambia únicamente el estado (activo/obsoleto) de un Contacto — nunca
 * ejecuta un DELETE físico. Idempotente: invocarla dos veces con el mismo
 * estado no produce error. Al marcar como obsoleto, también retira la marca
 * de "principal" si la tuviera (008-contactos-y-detalle-cliente, Edge Cases:
 * "el Cliente queda temporalmente sin contacto principal marcado, hasta que
 * se designe uno nuevo") — reactivar un Contacto nunca restaura esa marca
 * automáticamente, el personal debe designar uno nuevo si lo requiere.
 */
export async function setContactoEstado(
  clienteId: string,
  contactoId: string,
  estado: 'activo' | 'obsoleto',
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('contactos')
    .update(estado === 'obsoleto' ? { estado, es_principal: false } : { estado })
    .eq('id', contactoId)

  if (error) {
    return { error: mapearErrorContactoAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Designa a un Contacto como principal del Cliente (research.md Decisión 3):
 * primero retira la marca de cualquier otro Contacto que la tuviera, luego
 * la asigna al indicado. El índice único parcial contactos_principal_unico
 * es la autoridad real ante una carrera con otra solicitud concurrente.
 */
export async function setContactoPrincipal(
  clienteId: string,
  contactoId: string,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error: unsetError } = await supabase
    .from('contactos')
    .update({ es_principal: false })
    .eq('cliente_id', clienteId)
    .eq('es_principal', true)

  if (unsetError) {
    return { error: mapearErrorContactoAMensaje(unsetError) }
  }

  const { error: setError } = await supabase
    .from('contactos')
    .update({ es_principal: true })
    .eq('id', contactoId)

  if (setError) {
    return { error: mapearErrorContactoAMensaje(setError) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}
