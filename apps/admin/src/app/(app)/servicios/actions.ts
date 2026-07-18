'use server'

import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import { mapearErrorServicioAMensaje, type ServicioFormValues } from '@control-contable/utils'
import { revalidatePath } from 'next/cache'

export interface ActionResult {
  error: string | null
}

/**
 * Alta de un Servicio en el catálogo (011-gestion-servicios, FR-002).
 * Requiere `manage_catalogs` — mismo gate que el resto de catálogos del
 * sistema (régimen fiscal, categorías de documento).
 */
export async function createServicio(values: ServicioFormValues): Promise<ActionResult> {
  await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('servicios').insert({
    nombre: values.nombre.trim(),
    descripcion: values.descripcion.trim() || null,
    categoria: values.categoria.trim(),
    observaciones: values.observaciones.trim() || null,
  })

  if (error) {
    return { error: mapearErrorServicioAMensaje(error) }
  }

  revalidatePath('/servicios')
  return { error: null }
}

/**
 * Edición de un Servicio ya existente del catálogo (FR-002). No cambia el
 * `estado` como efecto secundario — ver setServicioEstado.
 */
export async function updateServicio(
  servicioId: string,
  values: ServicioFormValues,
): Promise<ActionResult> {
  await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('servicios')
    .update({
      nombre: values.nombre.trim(),
      descripcion: values.descripcion.trim() || null,
      categoria: values.categoria.trim(),
      observaciones: values.observaciones.trim() || null,
    })
    .eq('id', servicioId)

  if (error) {
    return { error: mapearErrorServicioAMensaje(error) }
  }

  revalidatePath('/servicios')
  return { error: null }
}

/**
 * Activa o desactiva un Servicio del catálogo (FR-002). Desactivar solo
 * impide nuevas asignaciones — no afecta los servicios ya contratados con
 * ese servicio (FR-012).
 */
export async function setServicioEstado(
  servicioId: string,
  estado: 'activo' | 'inactivo',
): Promise<ActionResult> {
  await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('servicios').update({ estado }).eq('id', servicioId)

  if (error) {
    return { error: 'No se pudo actualizar el estado del servicio. Inténtalo de nuevo.' }
  }

  revalidatePath('/servicios')
  return { error: null }
}
