'use server'

import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import {
  mapearErrorCargoExtraordinarioAMensaje,
  type CargoExtraordinarioFormValues,
  type ConfiguracionCobranzaFormValues,
} from '@control-contable/utils'
import { revalidatePath } from 'next/cache'

export interface ActionResult {
  error: string | null
}

/**
 * Generación manual de cobranzas (017-cobranza, US1, FR-003): usa las mismas
 * reglas que la generación automática (idempotente, `generar_cobranzas`
 * security definer) pero omite la verificación del día configurado
 * (`p_forzar = true`). El propio RPC registra el evento de auditoría de la
 * invocación manual (contracts/db-functions-rls.md Sección G).
 */
export async function generarCobranzas(): Promise<ActionResult & { generadas?: number }> {
  await requireCapability('manage_billing')
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.rpc('generar_cobranzas', { p_forzar: true })

  if (error) {
    return { error: 'No se pudieron generar las cobranzas. Inténtalo de nuevo.' }
  }

  revalidatePath('/cobranza')
  return { error: null, generadas: data ?? 0 }
}

/**
 * Registra un Cargo Extraordinario (017-cobranza, US3, FR-008): queda
 * "pendiente" hasta que se genere/regenere la cobranza de su periodo
 * objetivo, momento en el que el propio `generar_cobranzas` lo incorpora
 * como concepto (contracts/db-functions-rls.md Sección G).
 */
export async function registrarCargoExtraordinario(
  clienteId: string,
  values: CargoExtraordinarioFormValues,
): Promise<ActionResult> {
  await requireCapability('manage_billing')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('cargos_extraordinarios').insert({
    cliente_id: clienteId,
    descripcion: values.descripcion.trim(),
    monto: Number(values.monto),
    periodo_mes: Number(values.periodoMes),
    periodo_anio: Number(values.periodoAnio),
  })

  if (error) {
    return { error: mapearErrorCargoExtraordinarioAMensaje(error) }
  }

  revalidatePath('/cobranza')
  return { error: null }
}

/**
 * Elimina un Cargo Extraordinario "pendiente" (FR-010) — la política RLS
 * `cargos_extraordinarios_delete_pendiente` es la autoridad real que
 * bloquea en silencio (0 filas, sin error) la eliminación de uno ya
 * incorporado; por eso se verifica `count` explícitamente.
 */
export async function eliminarCargoExtraordinario(cargoId: string): Promise<ActionResult> {
  await requireCapability('manage_billing')
  const supabase = await createServerSupabaseClient()

  const { error, count } = await supabase
    .from('cargos_extraordinarios')
    .delete({ count: 'exact' })
    .eq('id', cargoId)

  if (error) {
    return { error: mapearErrorCargoExtraordinarioAMensaje(error) }
  }
  if (!count) {
    return { error: 'No se puede eliminar: este cargo ya fue incorporado a una cobranza.' }
  }

  revalidatePath('/cobranza')
  return { error: null }
}

/**
 * Actualiza el día de generación automática y el día límite de pago
 * (017-cobranza, US6, FR-018). Reservada a Administrador (research.md
 * Decisión 7): `manage_billing` también la comparte Contador, pero el spec
 * fuente reserva esta configuración explícitamente al Administrador — se
 * verifica el rol directamente, igual que otras reglas finas del sistema
 * que no ameritan una capacidad nueva. Los cambios son prospectivos: cada
 * cobranza ya generada conserva su propia `fecha_limite` congelada.
 */
export async function actualizarConfiguracionCobranza(
  values: ConfiguracionCobranzaFormValues,
): Promise<ActionResult> {
  const currentProfile = await requireCapability('manage_billing')

  if (currentProfile.role !== 'administrador') {
    return { error: 'Solo un Administrador puede modificar esta configuración.' }
  }

  const supabase = await createServerSupabaseClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('configuracion_cobranza')
    .update({
      dia_generacion: Number(values.diaGeneracion),
      dia_limite_pago: Number(values.diaLimitePago),
      updated_by: user?.id ?? null,
    })
    .eq('id', true)

  if (error) {
    return { error: 'No se pudo actualizar la configuración. Inténtalo de nuevo.' }
  }

  revalidatePath('/cobranza')
  return { error: null }
}
