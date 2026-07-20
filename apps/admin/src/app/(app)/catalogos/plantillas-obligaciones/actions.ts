'use server'

import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import {
  mapearErrorPlantillaItemAMensaje,
  mapearErrorPlantillaObligacionesAMensaje,
  type PlantillaItemFormValues,
  type PlantillaObligacionesFormValues,
} from '@control-contable/utils'
import { revalidatePath } from 'next/cache'

export interface ActionResult {
  error: string | null
}

/**
 * Alta de una Plantilla de Obligaciones (014-obligaciones-fiscales-cliente,
 * Historia 2). Requiere `manage_catalogs` — mismo gate que el resto de
 * catálogos del sistema.
 */
export async function createPlantillaObligaciones(
  values: PlantillaObligacionesFormValues,
): Promise<ActionResult> {
  await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('plantillas_obligaciones').insert({
    nombre: values.nombre.trim(),
    descripcion: values.descripcion.trim() || null,
  })

  if (error) {
    return { error: mapearErrorPlantillaObligacionesAMensaje(error) }
  }

  revalidatePath('/catalogos/plantillas-obligaciones')
  return { error: null }
}

export async function updatePlantillaObligaciones(
  plantillaId: string,
  values: PlantillaObligacionesFormValues,
): Promise<ActionResult> {
  await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('plantillas_obligaciones')
    .update({
      nombre: values.nombre.trim(),
      descripcion: values.descripcion.trim() || null,
    })
    .eq('id', plantillaId)

  if (error) {
    return { error: mapearErrorPlantillaObligacionesAMensaje(error) }
  }

  revalidatePath('/catalogos/plantillas-obligaciones')
  return { error: null }
}

export async function setPlantillaObligacionesEstado(
  plantillaId: string,
  estado: 'activo' | 'inactivo',
): Promise<ActionResult> {
  await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('plantillas_obligaciones')
    .update({ estado })
    .eq('id', plantillaId)

  if (error) {
    return { error: 'No se pudo actualizar el estado de la plantilla. Inténtalo de nuevo.' }
  }

  revalidatePath('/catalogos/plantillas-obligaciones')
  return { error: null }
}

export interface PlantillaItemRow {
  id: string
  obligacionFiscalId: string
  obligacionFiscalNombre: string
  periodicidadId: string
  periodicidadNombre: string
  orden: number
}

/**
 * Ítems de una plantilla (Historia 2, FR-013), consultados bajo demanda al
 * abrir su edición — evita precargar el detalle de todas las plantillas del
 * listado, mismo patrón que obtenerHistorialServicioContratado (011).
 */
export async function obtenerItemsPlantilla(
  plantillaId: string,
): Promise<{ items: PlantillaItemRow[]; error: string | null }> {
  await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('plantilla_obligaciones_items')
    .select(
      'id, obligacion_fiscal_id, periodicidad_id, orden, obligaciones_fiscales(nombre), periodicidades(nombre)',
    )
    .eq('plantilla_id', plantillaId)
    .order('orden', { ascending: true })

  if (error) {
    return {
      items: [],
      error: 'No se pudieron cargar los ítems de la plantilla. Intenta de nuevo.',
    }
  }

  return {
    items: (data ?? []).map((row) => ({
      id: row.id,
      obligacionFiscalId: row.obligacion_fiscal_id,
      obligacionFiscalNombre: row.obligaciones_fiscales?.nombre ?? '',
      periodicidadId: row.periodicidad_id,
      periodicidadNombre: row.periodicidades?.nombre ?? '',
      orden: row.orden,
    })),
    error: null,
  }
}

export async function agregarItemPlantilla(
  plantillaId: string,
  values: PlantillaItemFormValues,
): Promise<ActionResult> {
  await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('plantilla_obligaciones_items').insert({
    plantilla_id: plantillaId,
    obligacion_fiscal_id: values.obligacionFiscalId,
    periodicidad_id: values.periodicidadId,
    orden: Number(values.orden),
  })

  if (error) {
    return { error: mapearErrorPlantillaItemAMensaje(error) }
  }

  revalidatePath('/catalogos/plantillas-obligaciones')
  return { error: null }
}

export async function quitarItemPlantilla(itemId: string): Promise<ActionResult> {
  await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('plantilla_obligaciones_items').delete().eq('id', itemId)

  if (error) {
    return { error: 'No se pudo quitar el ítem de la plantilla. Intenta de nuevo.' }
  }

  revalidatePath('/catalogos/plantillas-obligaciones')
  return { error: null }
}
