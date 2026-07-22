'use server'

import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import {
  mapearErrorTipoDocumentoAMensaje,
  type TipoDocumentoFormValues,
} from '@control-contable/utils'
import { revalidatePath } from 'next/cache'

export interface ActionResult {
  error: string | null
}

/**
 * Alta de un Tipo de Documento en el catálogo (016-expediente-fiscal, US5,
 * FR-005). Requiere `manage_catalogs` — mismo gate que el resto de catálogos
 * del sistema (012, 013).
 */
export async function createTipoDocumento(values: TipoDocumentoFormValues): Promise<ActionResult> {
  await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('categorias_documento').insert({
    nombre: values.nombre.trim(),
    descripcion: values.descripcion.trim() || null,
  })

  if (error) {
    return { error: mapearErrorTipoDocumentoAMensaje(error) }
  }

  revalidatePath('/catalogos/tipos-documento')
  return { error: null }
}

/**
 * Edición de un Tipo de Documento ya existente del catálogo (FR-005).
 */
export async function updateTipoDocumento(
  categoriaId: string,
  values: TipoDocumentoFormValues,
): Promise<ActionResult> {
  await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('categorias_documento')
    .update({
      nombre: values.nombre.trim(),
      descripcion: values.descripcion.trim() || null,
    })
    .eq('id', categoriaId)

  if (error) {
    return { error: mapearErrorTipoDocumentoAMensaje(error) }
  }

  revalidatePath('/catalogos/tipos-documento')
  return { error: null }
}

/**
 * Activa o desactiva un Tipo de Documento del catálogo (FR-005). Desactivar
 * solo impide seleccionarlo para nuevos documentos o Documentos Esperados —
 * no afecta documentos ya clasificados con él.
 */
export async function setTipoDocumentoActivo(
  categoriaId: string,
  activa: boolean,
): Promise<ActionResult> {
  await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('categorias_documento')
    .update({ activa })
    .eq('id', categoriaId)

  if (error) {
    return { error: 'No se pudo actualizar el estado del Tipo de Documento. Inténtalo de nuevo.' }
  }

  revalidatePath('/catalogos/tipos-documento')
  return { error: null }
}
