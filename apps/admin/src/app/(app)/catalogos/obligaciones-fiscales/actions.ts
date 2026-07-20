'use server'

import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import {
  mapearErrorObligacionFiscalAMensaje,
  type ObligacionFiscalFormValues,
} from '@control-contable/utils'
import { revalidatePath } from 'next/cache'

export interface ActionResult {
  error: string | null
}

/**
 * Alta de una Obligación Fiscal en el catálogo (013-catalogo-obligaciones-fiscales,
 * FR-002). Requiere `manage_catalogs` — mismo gate que el resto de catálogos
 * del sistema.
 */
export async function createObligacionFiscal(
  values: ObligacionFiscalFormValues,
): Promise<ActionResult> {
  await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('obligaciones_fiscales').insert({
    nombre: values.nombre.trim(),
    descripcion: values.descripcion.trim() || null,
    periodicidad_id: values.periodicidadId,
    prioridad: Number(values.prioridad),
  })

  if (error) {
    return { error: mapearErrorObligacionFiscalAMensaje(error) }
  }

  revalidatePath('/catalogos/obligaciones-fiscales')
  return { error: null }
}

/**
 * Edición de una Obligación Fiscal ya existente del catálogo (FR-002).
 * Permite cambiar la periodicidad (Historia 2) — validada como activa por el
 * trigger `trg_obligaciones_fiscales_validar_periodicidad`. No cambia el
 * `estado` como efecto secundario — ver setObligacionFiscalEstado.
 */
export async function updateObligacionFiscal(
  obligacionId: string,
  values: ObligacionFiscalFormValues,
): Promise<ActionResult> {
  await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('obligaciones_fiscales')
    .update({
      nombre: values.nombre.trim(),
      descripcion: values.descripcion.trim() || null,
      periodicidad_id: values.periodicidadId,
      prioridad: Number(values.prioridad),
    })
    .eq('id', obligacionId)

  if (error) {
    return { error: mapearErrorObligacionFiscalAMensaje(error) }
  }

  revalidatePath('/catalogos/obligaciones-fiscales')
  return { error: null }
}

/**
 * Activa o desactiva una Obligación Fiscal del catálogo (FR-003). Desactivar
 * solo impide agregarla a nueva información — no afecta dónde ya se usó
 * (FR-005).
 */
export async function setObligacionFiscalEstado(
  obligacionId: string,
  estado: 'activo' | 'inactivo',
): Promise<ActionResult> {
  await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('obligaciones_fiscales')
    .update({ estado })
    .eq('id', obligacionId)

  if (error) {
    return { error: 'No se pudo actualizar el estado de la obligación fiscal. Inténtalo de nuevo.' }
  }

  revalidatePath('/catalogos/obligaciones-fiscales')
  return { error: null }
}
