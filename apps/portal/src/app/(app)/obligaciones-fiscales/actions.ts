'use server'

import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import {
  mapearErrorCumplimientoFiscalAMensaje,
  type CumplimientoExtraordinarioFormValues,
} from '@control-contable/utils'
import { revalidatePath } from 'next/cache'

export interface ActionResult {
  error: string | null
}

/**
 * Generación de cumplimientos fiscales (015-control-cumplimiento-fiscal,
 * Historia 1, FR-001 a FR-003). Invoca el mismo RPC `security definer` que
 * ejecuta `pg_cron` el primer día de cada mes (research.md #5) — la
 * generación manual usa exactamente las mismas reglas.
 */
export async function generarCumplimientos(): Promise<ActionResult & { generados?: number }> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.rpc('generar_cumplimientos_fiscales')

  if (error) {
    return { error: 'No se pudo ejecutar la generación de cumplimientos. Inténtalo de nuevo.' }
  }

  revalidatePath('/obligaciones-fiscales')
  return { error: null, generados: data ?? 0 }
}

/**
 * Alta de un cumplimiento extraordinario (Historia 4, FR-012/FR-013) — no
 * deriva de la configuración fiscal habitual del cliente
 * (`obligacion_fiscal_cliente_id` queda en null, ver el check constraint de
 * `cumplimientos_fiscales`).
 */
export async function crearCumplimientoExtraordinario(
  clienteId: string,
  values: CumplimientoExtraordinarioFormValues,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const periodoInicioDate = new Date(`${values.periodoInicio}T00:00:00`)
  const periodoEtiqueta = periodoInicioDate.toLocaleDateString('es-MX', {
    month: 'long',
    year: 'numeric',
  })

  const { error } = await supabase.from('cumplimientos_fiscales').insert({
    cliente_id: clienteId,
    es_extraordinario: true,
    obligacion_fiscal_id: values.obligacionFiscalId || null,
    descripcion: values.descripcion.trim() || null,
    periodo_inicio: values.periodoInicio,
    periodo_fin: values.periodoFin,
    periodo_etiqueta: periodoEtiqueta,
    fecha_limite: values.fechaLimite,
    responsable_id: values.responsableId || null,
  })

  if (error) {
    return { error: mapearErrorCumplimientoFiscalAMensaje(error) }
  }

  revalidatePath('/obligaciones-fiscales')
  return { error: null }
}
