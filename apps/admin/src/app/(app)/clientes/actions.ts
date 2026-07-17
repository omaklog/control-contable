'use server'

import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import { mapearErrorClienteAMensaje, type ClienteFormValues } from '@control-contable/utils'
import { revalidatePath } from 'next/cache'

export interface ActionResult {
  error: string | null
}

/**
 * Actualiza los campos propios de un Cliente ya existente (FR-009) — nunca
 * cambia `estado` como efecto secundario. La alta (creación) de clientes no
 * forma parte de este módulo (ver spec.md, Clarifications); esta feature
 * solo edita y da de baja clientes ya existentes.
 */
export async function updateCliente(
  clienteId: string,
  values: ClienteFormValues,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('clientes')
    .update({
      nombre: values.nombre.trim(),
      tipo_persona: values.tipoPersona,
      rfc: values.rfc.trim(),
      regimen_fiscal_codigo: values.regimenFiscalCodigo,
      correo: values.correo.trim(),
      telefono: values.telefono.trim() || null,
      direccion_fiscal: values.direccionFiscal.trim() || null,
    })
    .eq('id', clienteId)

  if (error) {
    return { error: mapearErrorClienteAMensaje(error) }
  }

  revalidatePath('/clientes')
  return { error: null }
}

/**
 * Cambia únicamente el estado (activo/inactivo) de un Cliente — soft-delete
 * al pasar a 'inactivo', reactivación al pasar a 'activo' (FR-008). Nunca
 * ejecuta un DELETE físico. Se invoca solo después de que la UI confirme el
 * diálogo de advertencia (FR-007) — esta acción no vuelve a pedir confirmación.
 */
export async function setClienteEstado(
  clienteId: string,
  estado: 'activo' | 'inactivo',
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('clientes')
    .update({ estado, fecha_baja: estado === 'inactivo' ? new Date().toISOString() : null })
    .eq('id', clienteId)

  if (error) {
    return { error: 'No se pudo actualizar el estado del cliente. Inténtalo de nuevo.' }
  }

  revalidatePath('/clientes')
  return { error: null }
}
