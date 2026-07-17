'use server'

import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import { mapearErrorClienteAMensaje, type ClienteFormValues } from '@control-contable/utils'

export interface ActionResult {
  error: string | null
  clienteId?: string
}

/**
 * Da de alta un nuevo Cliente desde el portal (007-alta-cliente-portal,
 * FR-003). Queda con estado = 'activo' (default de la base de datos) y es
 * consultable de inmediato desde apps/admin (FR-005) — no hay ningún paso
 * de sincronización adicional, ambas apps leen la misma tabla `clientes`.
 */
export async function createCliente(values: ClienteFormValues): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('clientes')
    .insert({
      nombre: values.nombre.trim(),
      tipo_persona: values.tipoPersona,
      rfc: values.rfc.trim(),
      regimen_fiscal_codigo: values.regimenFiscalCodigo,
      correo: values.correo.trim(),
      telefono: values.telefono.trim() || null,
      direccion_fiscal: values.direccionFiscal.trim() || null,
    })
    .select('id')
    .single()

  if (error) {
    return { error: mapearErrorClienteAMensaje(error) }
  }

  return { error: null, clienteId: data.id }
}
