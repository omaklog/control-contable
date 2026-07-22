'use server'

import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import {
  mapearErrorDocumentoEsperadoAMensaje,
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

export interface DocumentoEsperadoRow {
  id: string
  categoriaDocumentoId: string
  categoriaNombre: string
}

/**
 * Documentos Esperados vigentes de una obligación fiscal
 * (016-expediente-fiscal, US5, FR-010): solo la configuración activa —
 * desactivar en vez de borrar conserva el historial.
 */
export async function obtenerDocumentosEsperadosObligacion(
  obligacionFiscalId: string,
): Promise<{ esperados: DocumentoEsperadoRow[]; error: string | null }> {
  await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('documentos_esperados_obligacion')
    .select('id, categoria_documento_id, categorias_documento(nombre)')
    .eq('obligacion_fiscal_id', obligacionFiscalId)
    .eq('activo', true)
    .order('created_at', { ascending: true })

  if (error) {
    return { esperados: [], error: 'No se pudieron cargar los Documentos Esperados.' }
  }

  return {
    esperados: (data ?? []).map((row) => ({
      id: row.id,
      categoriaDocumentoId: row.categoria_documento_id,
      categoriaNombre: row.categorias_documento?.nombre ?? '',
    })),
    error: null,
  }
}

/**
 * Agrega un Documento Esperado a una obligación fiscal (FR-010). Los
 * cumplimientos ya generados no se ven afectados — solo los que se generen
 * después usarán esta configuración (FR-011, snapshot por trigger).
 */
export async function agregarDocumentoEsperado(
  obligacionFiscalId: string,
  categoriaDocumentoId: string,
): Promise<ActionResult> {
  await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('documentos_esperados_obligacion').insert({
    obligacion_fiscal_id: obligacionFiscalId,
    categoria_documento_id: categoriaDocumentoId,
  })

  if (error) {
    return { error: mapearErrorDocumentoEsperadoAMensaje(error) }
  }

  revalidatePath('/catalogos/obligaciones-fiscales')
  return { error: null }
}

/**
 * Retira un Documento Esperado de la configuración vigente de una obligación
 * (FR-010): desactiva la fila en vez de borrarla físicamente, conservando el
 * historial de la configuración.
 */
export async function quitarDocumentoEsperado(documentoEsperadoId: string): Promise<ActionResult> {
  await requireCapability('manage_catalogs')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('documentos_esperados_obligacion')
    .update({ activo: false })
    .eq('id', documentoEsperadoId)

  if (error) {
    return { error: 'No se pudo quitar el Documento Esperado. Inténtalo de nuevo.' }
  }

  revalidatePath('/catalogos/obligaciones-fiscales')
  return { error: null }
}
