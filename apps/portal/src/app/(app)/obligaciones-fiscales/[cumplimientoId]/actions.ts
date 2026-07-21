'use server'

import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import { mapearErrorCumplimientoFiscalAMensaje } from '@control-contable/utils'
import { revalidatePath } from 'next/cache'

export interface ActionResult {
  error: string | null
}

/**
 * Seguimiento de un Cumplimiento Fiscal (015-control-cumplimiento-fiscal,
 * Historias 2-5). "Vencida" nunca se escribe aquí — solo se calcula al leer
 * (Clarifications, FR-004/FR-005).
 */
export async function cambiarEstadoCumplimiento(
  cumplimientoId: string,
  estado: 'pendiente' | 'en_proceso' | 'presentada' | 'no_aplica',
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('cumplimientos_fiscales')
    .update({ estado })
    .eq('id', cumplimientoId)

  if (error) {
    return { error: mapearErrorCumplimientoFiscalAMensaje(error) }
  }

  revalidatePath(`/obligaciones-fiscales/${cumplimientoId}`)
  revalidatePath('/obligaciones-fiscales')
  return { error: null }
}

/**
 * Modifica la fecha límite de un cumplimiento individual (Historia 3,
 * FR-010) — nunca afecta otros registros del mismo cliente ni de otros
 * clientes.
 */
export async function cambiarFechaLimiteCumplimiento(
  cumplimientoId: string,
  fechaLimite: string,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('cumplimientos_fiscales')
    .update({ fecha_limite: fechaLimite })
    .eq('id', cumplimientoId)

  if (error) {
    return { error: mapearErrorCumplimientoFiscalAMensaje(error) }
  }

  revalidatePath(`/obligaciones-fiscales/${cumplimientoId}`)
  revalidatePath('/obligaciones-fiscales')
  return { error: null }
}

/**
 * Reasigna el responsable de un cumplimiento individual (Historia 3,
 * FR-011) — no altera el responsable del cliente ni el de otros
 * cumplimientos ya generados.
 */
export async function cambiarResponsableCumplimiento(
  cumplimientoId: string,
  responsableId: string | null,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('cumplimientos_fiscales')
    .update({ responsable_id: responsableId })
    .eq('id', cumplimientoId)

  if (error) {
    return { error: mapearErrorCumplimientoFiscalAMensaje(error) }
  }

  revalidatePath(`/obligaciones-fiscales/${cumplimientoId}`)
  revalidatePath('/obligaciones-fiscales')
  return { error: null }
}

/**
 * Asocia un documento del Expediente Fiscal del mismo cliente como
 * evidencia (Historia 2, FR-008) — el trigger
 * validar_documento_mismo_cliente_cumplimiento (FR-009) rechaza documentos
 * de otro cliente.
 */
export async function asociarDocumentoCumplimiento(
  cumplimientoId: string,
  documentoId: string,
  esAcuse: boolean,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('cumplimiento_fiscal_documentos').insert({
    cumplimiento_id: cumplimientoId,
    documento_id: documentoId,
    es_acuse: esAcuse,
  })

  if (error) {
    return { error: mapearErrorCumplimientoFiscalAMensaje(error) }
  }

  revalidatePath(`/obligaciones-fiscales/${cumplimientoId}`)
  return { error: null }
}

/**
 * Desasocia un documento (Historia 5, FR-014) — solo quita la referencia;
 * el documento sigue existiendo en el Expediente Fiscal.
 */
export async function desasociarDocumentoCumplimiento(
  cumplimientoId: string,
  cumplimientoFiscalDocumentoId: string,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('cumplimiento_fiscal_documentos')
    .delete()
    .eq('id', cumplimientoFiscalDocumentoId)

  if (error) {
    return { error: 'No se pudo desasociar el documento. Intenta de nuevo.' }
  }

  revalidatePath(`/obligaciones-fiscales/${cumplimientoId}`)
  return { error: null }
}

export interface HistorialEvento {
  accion: string
  detalle: unknown
  creadoEn: string
  actorNombre: string
}

/**
 * Historial de un cumplimiento (Historia 5, FR-014): eventos de
 * business_audit_log filtrados por ese registro, en orden cronológico,
 * resolviendo el nombre del usuario vía profiles (mismo patrón que
 * obtenerHistorialServicioContratado, 011, extendido para incluir el
 * usuario que realizó el cambio).
 */
export async function obtenerHistorialCumplimiento(
  cumplimientoId: string,
): Promise<{ eventos: HistorialEvento[]; error: string | null }> {
  await requireCapability('view_clients')
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('business_audit_log')
    .select('accion, detalle, creado_en, actor_id')
    .eq('entidad', 'cumplimiento_fiscal')
    .eq('entidad_id', cumplimientoId)
    .order('creado_en', { ascending: true })

  if (error) {
    return { eventos: [], error: 'No se pudo cargar el historial. Inténtalo de nuevo.' }
  }

  const actorIds = Array.from(
    new Set((data ?? []).map((row) => row.actor_id).filter(Boolean)),
  ) as string[]

  const { data: actoresData } =
    actorIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', actorIds)
      : { data: [] as { id: string; full_name: string | null }[] }
  const nombrePorActorId = new Map((actoresData ?? []).map((row) => [row.id, row.full_name ?? '']))

  return {
    eventos: (data ?? []).map((row) => ({
      accion: row.accion,
      detalle: row.detalle,
      creadoEn: row.creado_en,
      actorNombre: row.actor_id ? (nombrePorActorId.get(row.actor_id) ?? '') : '',
    })),
    error: null,
  }
}
