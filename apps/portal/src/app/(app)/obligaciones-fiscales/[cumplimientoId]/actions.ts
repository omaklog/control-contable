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

export interface DocumentoEsperadoEstado {
  categoriaDocumentoId: string
  categoriaNombre: string
  disponible: boolean
}

export interface DocumentoAdicionalRow {
  id: string
  nombreOriginal: string
  categoriaNombre: string | null
  rutaAlmacenamiento: string
}

/**
 * Documentos Esperados de un cumplimiento (016-expediente-fiscal, US2):
 * lee el snapshot inmutable `cumplimiento_documentos_esperados` (fijado por
 * trigger al generarse el cumplimiento, nunca por esta función) y calcula,
 * de forma puramente informativa, cuáles ya están disponibles entre los
 * documentos asociados a este cumplimiento (FR-012/FR-013 — nunca bloquea
 * nada). Los documentos asociados cuyo Tipo de Documento no está en la lista
 * de esperados se devuelven como "Documentos Adicionales" (FR-014).
 */
export async function obtenerDocumentosEsperados(cumplimientoId: string): Promise<{
  esperados: DocumentoEsperadoEstado[]
  documentosAdicionales: DocumentoAdicionalRow[]
  error: string | null
}> {
  await requireCapability('view_clients')
  const supabase = await createServerSupabaseClient()

  const [{ data: esperadosData, error: esperadosError }, { data: asociadosData }] =
    await Promise.all([
      supabase
        .from('cumplimiento_documentos_esperados')
        .select('categoria_documento_id, categorias_documento(nombre)')
        .eq('cumplimiento_id', cumplimientoId),
      supabase
        .from('cumplimiento_fiscal_documentos')
        .select(
          'documento_id, documentos(categoria_id, nombre_original, ruta_almacenamiento, estado, categorias_documento(nombre))',
        )
        .eq('cumplimiento_id', cumplimientoId),
    ])

  if (esperadosError) {
    return {
      esperados: [],
      documentosAdicionales: [],
      error: 'No se pudieron cargar los Documentos Esperados. Inténtalo de nuevo.',
    }
  }

  const documentosAsociadosActivos = (asociadosData ?? [])
    .map((row) => row.documentos)
    .filter((documento): documento is NonNullable<typeof documento> => Boolean(documento))
    .filter((documento) => documento.estado !== 'eliminado')

  const categoriasDisponibles = new Set(
    documentosAsociadosActivos
      .map((documento) => documento.categoria_id)
      .filter(Boolean) as string[],
  )

  const esperados = (esperadosData ?? []).map((row) => ({
    categoriaDocumentoId: row.categoria_documento_id,
    categoriaNombre: row.categorias_documento?.nombre ?? '',
    disponible: categoriasDisponibles.has(row.categoria_documento_id),
  }))

  const categoriasEsperadas = new Set(esperados.map((esperado) => esperado.categoriaDocumentoId))

  const documentosAdicionales = (asociadosData ?? [])
    .filter((row) => {
      const documento = row.documentos
      if (!documento || documento.estado === 'eliminado') return false
      return !documento.categoria_id || !categoriasEsperadas.has(documento.categoria_id)
    })
    .map((row) => ({
      id: row.documento_id,
      nombreOriginal: row.documentos!.nombre_original,
      categoriaNombre: row.documentos!.categorias_documento?.nombre ?? null,
      rutaAlmacenamiento: row.documentos!.ruta_almacenamiento,
    }))

  return { esperados, documentosAdicionales, error: null }
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
