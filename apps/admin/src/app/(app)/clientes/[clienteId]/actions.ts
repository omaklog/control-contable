'use server'

import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import {
  mapearErrorContactoAMensaje,
  mapearErrorServicioContratadoAMensaje,
  type ContactoFormValues,
  type ServicioContratadoFormValues,
} from '@control-contable/utils'
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

/**
 * Gestión de Servicios Contratados desde la página de detalle de Cliente
 * (011-gestion-servicios, Historias 2-4). Como máximo un servicio contratado
 * por combinación cliente+servicio (FR-005, restricción `UNIQUE` en base de
 * datos) — suspender/reactivar/finalizar siempre actualizan el mismo
 * registro, nunca crean uno nuevo (Clarifications Q1).
 */
export async function agregarServicioContratado(
  clienteId: string,
  values: ServicioContratadoFormValues,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('servicios_contratados').insert({
    cliente_id: clienteId,
    servicio_id: values.servicioId,
    precio_acordado: Number(values.precioAcordado),
    fecha_inicio: values.fechaInicio,
    observaciones: values.observaciones.trim() || null,
  })

  if (error) {
    return { error: mapearErrorServicioContratadoAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Cambia el precio acordado de un servicio contratado (Historia 3, FR-006).
 * El cambio aplica de inmediato hacia adelante; no altera información ya
 * generada antes del cambio (el evento de auditoría conserva el precio
 * anterior, ver trg_servicios_contratados_audit_fn()).
 */
export async function cambiarPrecioServicioContratado(
  clienteId: string,
  servicioContratadoId: string,
  precioAcordado: number,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('servicios_contratados')
    .update({ precio_acordado: precioAcordado })
    .eq('id', servicioContratadoId)

  if (error) {
    return { error: mapearErrorServicioContratadoAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Suspende un servicio contratado (Historia 4): permanece registrado pero se
 * excluye de cualquier proceso que solo considere servicios Activos.
 */
export async function suspenderServicioContratado(
  clienteId: string,
  servicioContratadoId: string,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('servicios_contratados')
    .update({ estado: 'suspendido' })
    .eq('id', servicioContratadoId)

  if (error) {
    return { error: mapearErrorServicioContratadoAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Reactiva un servicio contratado Suspendido o Finalizado (Historia 4):
 * vuelve a Activo sobre el mismo registro, limpiando su fecha de fin si la
 * tenía (Clarifications Q1) — nunca crea un servicio contratado nuevo.
 */
export async function reactivarServicioContratado(
  clienteId: string,
  servicioContratadoId: string,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('servicios_contratados')
    .update({ estado: 'activo', fecha_fin: null })
    .eq('id', servicioContratadoId)

  if (error) {
    return { error: mapearErrorServicioContratadoAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Finaliza un servicio contratado Activo o Suspendido (Historia 4): registra
 * su fecha de fin. Permanece disponible para reactivarse más adelante sobre
 * el mismo registro (Clarifications Q1).
 */
export async function finalizarServicioContratado(
  clienteId: string,
  servicioContratadoId: string,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('servicios_contratados')
    .update({ estado: 'finalizado', fecha_fin: new Date().toISOString().slice(0, 10) })
    .eq('id', servicioContratadoId)

  if (error) {
    return { error: mapearErrorServicioContratadoAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Historial de un servicio contratado (Historia 5): eventos de
 * business_audit_log filtrados por ese registro, en orden cronológico
 * (research.md #2 — misma fuente que la Auditoría de negocio ya existente).
 */
export async function obtenerHistorialServicioContratado(
  servicioContratadoId: string,
): Promise<{ eventos: HistorialEvento[]; error: string | null }> {
  await requireCapability('view_clients')
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('business_audit_log')
    .select('accion, detalle, creado_en')
    .eq('entidad', 'servicio_contratado')
    .eq('entidad_id', servicioContratadoId)
    .order('creado_en', { ascending: true })

  if (error) {
    return { eventos: [], error: 'No se pudo cargar el historial. Inténtalo de nuevo.' }
  }

  return {
    eventos: (data ?? []).map((row) => ({
      accion: row.accion,
      detalle: row.detalle,
      creadoEn: row.creado_en,
    })),
    error: null,
  }
}

export interface HistorialEvento {
  accion: string
  detalle: unknown
  creadoEn: string
}
