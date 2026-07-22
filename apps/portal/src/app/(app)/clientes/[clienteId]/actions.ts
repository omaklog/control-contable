'use server'

import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import {
  mapearErrorContactoAMensaje,
  mapearErrorDocumentoAMensaje,
  mapearErrorObligacionFiscalClienteAMensaje,
  mapearErrorServicioContratadoAMensaje,
  validarArchivoDocumento,
  type ContactoFormValues,
  type ObligacionFiscalClienteFormValues,
  type ServicioContratadoFormValues,
} from '@control-contable/utils'
import { revalidatePath } from 'next/cache'

export interface ActionResult {
  error: string | null
}

/**
 * Gestión de Contactos desde la página de detalle de Cliente
 * (008-contactos-y-detalle-cliente US2). Nunca se elimina un Contacto de
 * forma física — ver setContactoEstado (FR-006, research.md Decisión 2).
 */
export async function createContacto(
  clienteId: string,
  values: ContactoFormValues,
): Promise<ActionResult & { contactoId?: string }> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('contactos')
    .insert({
      cliente_id: clienteId,
      nombre: values.nombre.trim(),
      telefono: values.telefono.trim(),
      email: values.email.trim() || null,
    })
    .select('id')
    .single()

  if (error) {
    return { error: mapearErrorContactoAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null, contactoId: data.id }
}

export async function updateContacto(
  clienteId: string,
  contactoId: string,
  values: ContactoFormValues,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('contactos')
    .update({
      nombre: values.nombre.trim(),
      telefono: values.telefono.trim(),
      email: values.email.trim() || null,
    })
    .eq('id', contactoId)

  if (error) {
    return { error: mapearErrorContactoAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Cambia únicamente el estado (activo/obsoleto) de un Contacto — nunca
 * ejecuta un DELETE físico. Idempotente: invocarla dos veces con el mismo
 * estado no produce error. Al marcar como obsoleto, también retira la marca
 * de "principal" si la tuviera (008-contactos-y-detalle-cliente, Edge Cases:
 * "el Cliente queda temporalmente sin contacto principal marcado, hasta que
 * se designe uno nuevo") — reactivar un Contacto nunca restaura esa marca
 * automáticamente, el personal debe designar uno nuevo si lo requiere.
 */
export async function setContactoEstado(
  clienteId: string,
  contactoId: string,
  estado: 'activo' | 'obsoleto',
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('contactos')
    .update(estado === 'obsoleto' ? { estado, es_principal: false } : { estado })
    .eq('id', contactoId)

  if (error) {
    return { error: mapearErrorContactoAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Designa a un Contacto como principal del Cliente (research.md Decisión 3):
 * primero retira la marca de cualquier otro Contacto que la tuviera, luego
 * la asigna al indicado. El índice único parcial contactos_principal_unico
 * es la autoridad real ante una carrera con otra solicitud concurrente.
 */
export async function setContactoPrincipal(
  clienteId: string,
  contactoId: string,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error: unsetError } = await supabase
    .from('contactos')
    .update({ es_principal: false })
    .eq('cliente_id', clienteId)
    .eq('es_principal', true)

  if (unsetError) {
    return { error: mapearErrorContactoAMensaje(unsetError) }
  }

  const { error: setError } = await supabase
    .from('contactos')
    .update({ es_principal: true })
    .eq('id', contactoId)

  if (setError) {
    return { error: mapearErrorContactoAMensaje(setError) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Gestión de Servicios Contratados desde la página de detalle de Cliente
 * (011-gestion-servicios, Historias 2-4). Como máximo un servicio contratado
 * por combinación cliente+servicio (FR-005, restricción `UNIQUE` en base de
 * datos) — suspender/reactivar/finalizar siempre actualizan el mismo
 * registro, nunca crean uno nuevo (Clarifications Q1).
 */
export async function agregarServicioContratado(
  clienteId: string,
  values: ServicioContratadoFormValues,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('servicios_contratados').insert({
    cliente_id: clienteId,
    servicio_id: values.servicioId,
    precio_acordado: Number(values.precioAcordado),
    fecha_inicio: values.fechaInicio,
    observaciones: values.observaciones.trim() || null,
  })

  if (error) {
    return { error: mapearErrorServicioContratadoAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Cambia el precio acordado de un servicio contratado (Historia 3, FR-006).
 * El cambio aplica de inmediato hacia adelante; no altera información ya
 * generada antes del cambio (el evento de auditoría conserva el precio
 * anterior, ver trg_servicios_contratados_audit_fn()).
 */
export async function cambiarPrecioServicioContratado(
  clienteId: string,
  servicioContratadoId: string,
  precioAcordado: number,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('servicios_contratados')
    .update({ precio_acordado: precioAcordado })
    .eq('id', servicioContratadoId)

  if (error) {
    return { error: mapearErrorServicioContratadoAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Suspende un servicio contratado (Historia 4): permanece registrado pero se
 * excluye de cualquier proceso que solo considere servicios Activos.
 */
export async function suspenderServicioContratado(
  clienteId: string,
  servicioContratadoId: string,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('servicios_contratados')
    .update({ estado: 'suspendido' })
    .eq('id', servicioContratadoId)

  if (error) {
    return { error: mapearErrorServicioContratadoAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Reactiva un servicio contratado Suspendido o Finalizado (Historia 4):
 * vuelve a Activo sobre el mismo registro, limpiando su fecha de fin si la
 * tenía (Clarifications Q1) — nunca crea un servicio contratado nuevo.
 */
export async function reactivarServicioContratado(
  clienteId: string,
  servicioContratadoId: string,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('servicios_contratados')
    .update({ estado: 'activo', fecha_fin: null })
    .eq('id', servicioContratadoId)

  if (error) {
    return { error: mapearErrorServicioContratadoAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Finaliza un servicio contratado Activo o Suspendido (Historia 4): registra
 * su fecha de fin. Permanece disponible para reactivarse más adelante sobre
 * el mismo registro (Clarifications Q1).
 */
export async function finalizarServicioContratado(
  clienteId: string,
  servicioContratadoId: string,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('servicios_contratados')
    .update({ estado: 'finalizado', fecha_fin: new Date().toISOString().slice(0, 10) })
    .eq('id', servicioContratadoId)

  if (error) {
    return { error: mapearErrorServicioContratadoAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Historial de un servicio contratado (Historia 5): eventos de
 * business_audit_log filtrados por ese registro, en orden cronológico
 * (research.md #2 — misma fuente que la Auditoría de negocio ya existente).
 */
export async function obtenerHistorialServicioContratado(
  servicioContratadoId: string,
): Promise<{ eventos: HistorialEvento[]; error: string | null }> {
  await requireCapability('view_clients')
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('business_audit_log')
    .select('accion, detalle, creado_en')
    .eq('entidad', 'servicio_contratado')
    .eq('entidad_id', servicioContratadoId)
    .order('creado_en', { ascending: true })

  if (error) {
    return { eventos: [], error: 'No se pudo cargar el historial. Inténtalo de nuevo.' }
  }

  return {
    eventos: (data ?? []).map((row) => ({
      accion: row.accion,
      detalle: row.detalle,
      creadoEn: row.creado_en,
    })),
    error: null,
  }
}

export interface HistorialEvento {
  accion: string
  detalle: unknown
  creadoEn: string
}

/**
 * Gestión de Obligaciones Fiscales del Cliente desde la página de detalle de
 * Cliente (014-obligaciones-fiscales-cliente, Historia 1). Como máximo una
 * obligación por combinación cliente+obligación (FR-003, restricción
 * `UNIQUE`); el orden es único por cliente (FR-008). A diferencia de
 * Servicios Contratados, esta es la única entidad del sistema con
 * eliminación física real, y solo cuando la obligación está Activa
 * (FR-005/FR-006) — la política RLS de `delete` la bloquea en silencio
 * (sin error, 0 filas afectadas) cuando está en estado "No aplica".
 */
export async function agregarObligacionFiscalCliente(
  clienteId: string,
  values: ObligacionFiscalClienteFormValues,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.from('obligaciones_fiscales_cliente').insert({
    cliente_id: clienteId,
    obligacion_fiscal_id: values.obligacionFiscalId,
    periodicidad_id: values.periodicidadId,
    orden: Number(values.orden),
    observaciones: values.observaciones.trim() || null,
  })

  if (error) {
    return { error: mapearErrorObligacionFiscalClienteAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Edita periodicidad/orden/observaciones de una obligación fiscal ya
 * asignada a un cliente (FR-007) — la obligación fiscal en sí no cambia
 * (identidad cliente+obligación fija, FR-003).
 */
export async function editarObligacionFiscalCliente(
  clienteId: string,
  obligacionFiscalClienteId: string,
  values: ObligacionFiscalClienteFormValues,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('obligaciones_fiscales_cliente')
    .update({
      periodicidad_id: values.periodicidadId,
      orden: Number(values.orden),
      observaciones: values.observaciones.trim() || null,
    })
    .eq('id', obligacionFiscalClienteId)

  if (error) {
    return { error: mapearErrorObligacionFiscalClienteAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Marca una obligación fiscal del cliente como "No aplica" (FR-004): deja de
 * contar como vigente, pero permanece registrada por motivos históricos
 * (FR-005) — a partir de aquí ya no puede eliminarse (ver
 * eliminarObligacionFiscalCliente).
 */
export async function marcarNoAplicaObligacionFiscalCliente(
  clienteId: string,
  obligacionFiscalClienteId: string,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('obligaciones_fiscales_cliente')
    .update({ estado: 'no_aplica' })
    .eq('id', obligacionFiscalClienteId)

  if (error) {
    return { error: mapearErrorObligacionFiscalClienteAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Elimina físicamente una obligación fiscal Activa del cliente (FR-006) — la
 * única eliminación real del sistema. La política RLS
 * `obligaciones_fiscales_cliente_delete_manage_clients_activa` la bloquea en
 * silencio (0 filas afectadas, sin error) si la obligación ya está "No
 * aplica" (FR-005); por eso se verifica `count` explícitamente.
 */
export async function eliminarObligacionFiscalCliente(
  clienteId: string,
  obligacionFiscalClienteId: string,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error, count } = await supabase
    .from('obligaciones_fiscales_cliente')
    .delete({ count: 'exact' })
    .eq('id', obligacionFiscalClienteId)

  if (error) {
    return { error: mapearErrorObligacionFiscalClienteAMensaje(error) }
  }
  if (!count) {
    return {
      error: 'No se pudo eliminar: esta obligación fiscal ya no está Activa o no existe.',
    }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Aplica una plantilla de obligaciones al cliente (Historia 3, FR-014):
 * copia sus ítems como nuevas Obligaciones Fiscales del Cliente vía el RPC
 * `aplicar_plantilla_obligaciones`, omitiendo las que el cliente ya tenga
 * configuradas (FR-015) sin conservar ninguna relación con la plantilla
 * después de la copia (FR-014/FR-016).
 */
export async function aplicarPlantillaObligaciones(
  clienteId: string,
  plantillaId: string,
): Promise<ActionResult> {
  await requireCapability('manage_clients')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase.rpc('aplicar_plantilla_obligaciones', {
    p_cliente_id: clienteId,
    p_plantilla_id: plantillaId,
  })

  if (error) {
    return { error: 'No se pudo aplicar la plantilla. Inténtalo de nuevo.' }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

const EXPEDIENTES_BUCKET = 'expedientes'

/**
 * Sube un documento al Expediente Fiscal del cliente (016-expediente-fiscal,
 * US1). El Tipo de Documento, el Cumplimiento y la Obligación Fiscal son
 * opcionales (FR-006, FR-007, FR-027) — un documento puede quedar "Sin
 * clasificar" y sin ninguna asociación. La subida ocurre con la sesión del
 * propio usuario (nunca service_role, research.md Decisión 9): primero se
 * inserta la fila en `documentos` para obtener su `id`, luego se sube el
 * archivo a esa ruta en el bucket privado `expedientes`; si falla la subida,
 * se revierte la fila insertada para no dejar metadatos húérfanos sin
 * archivo.
 */
export async function subirDocumento(clienteId: string, formData: FormData): Promise<ActionResult> {
  await requireCapability('manage_documents')
  const supabase = await createServerSupabaseClient()

  const archivo = formData.get('archivo')
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: 'Selecciona un archivo PDF para cargar.' }
  }

  const errorArchivo = validarArchivoDocumento({
    tamanoBytes: archivo.size,
    tipoMime: archivo.type,
  })
  if (errorArchivo) {
    return { error: errorArchivo }
  }

  const categoriaId = (formData.get('categoriaId') as string | null)?.trim() || null
  const cumplimientoId = (formData.get('cumplimientoId') as string | null)?.trim() || null
  const obligacionFiscalId = (formData.get('obligacionFiscalId') as string | null)?.trim() || null

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'No se pudo identificar al usuario actual.' }
  }

  const { data: documento, error: insertError } = await supabase
    .from('documentos')
    .insert({
      cliente_id: clienteId,
      categoria_id: categoriaId,
      obligacion_fiscal_id: obligacionFiscalId,
      nombre_original: archivo.name,
      tamano_bytes: archivo.size,
      formato: archivo.type,
      ruta_almacenamiento: '',
      cargado_por: user.id,
      created_by: user.id,
      updated_by: user.id,
    })
    .select('id')
    .single()

  if (insertError || !documento) {
    return { error: mapearErrorDocumentoAMensaje(insertError) }
  }

  const rutaAlmacenamiento = `${clienteId}/${documento.id}.pdf`

  const { error: uploadError } = await supabase.storage
    .from(EXPEDIENTES_BUCKET)
    .upload(rutaAlmacenamiento, archivo, { contentType: archivo.type })

  if (uploadError) {
    await supabase.from('documentos').delete().eq('id', documento.id)
    return { error: 'No se pudo subir el archivo. Intenta de nuevo.' }
  }

  const { error: rutaError } = await supabase
    .from('documentos')
    .update({ ruta_almacenamiento: rutaAlmacenamiento })
    .eq('id', documento.id)

  if (rutaError) {
    return { error: mapearErrorDocumentoAMensaje(rutaError) }
  }

  if (cumplimientoId) {
    const { error: asociarError } = await supabase
      .from('cumplimiento_fiscal_documentos')
      .insert({ cumplimiento_id: cumplimientoId, documento_id: documento.id })

    if (asociarError) {
      revalidatePath(`/clientes/${clienteId}`)
      return { error: mapearErrorDocumentoAMensaje(asociarError) }
    }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Cambia la clasificación (Tipo de Documento) de un documento ya cargado
 * (FR-006): permite clasificar uno que quedó "Sin clasificar", o
 * reclasificarlo. El trigger de auditoría registra el cambio como
 * `cambio_tipo_documento` (contracts/db-functions-rls.md Sección C).
 */
export async function actualizarClasificacionDocumento(
  clienteId: string,
  documentoId: string,
  categoriaId: string,
): Promise<ActionResult> {
  await requireCapability('manage_documents')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('documentos')
    .update({ categoria_id: categoriaId.trim() || null })
    .eq('id', documentoId)

  if (error) {
    return { error: mapearErrorDocumentoAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}

/**
 * Genera una URL firmada de corta duración (5 minutos) para ver/descargar un
 * documento del expediente (FR-020, research.md Decisión 9) — nunca una URL
 * pública ni permanente. La política de Storage ya valida que el usuario
 * tenga `view_documents`/`manage_documents` antes de generarla.
 */
export async function obtenerUrlFirmadaDocumento(
  rutaAlmacenamiento: string,
): Promise<{ url: string | null; error: string | null }> {
  await requireCapability('view_documents')
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase.storage
    .from(EXPEDIENTES_BUCKET)
    .createSignedUrl(rutaAlmacenamiento, 300)

  if (error || !data) {
    return { url: null, error: 'No se pudo generar el acceso al documento. Intenta de nuevo.' }
  }

  return { url: data.signedUrl, error: null }
}

/**
 * Elimina lógicamente un documento (FR-021 a FR-023, 016-expediente-fiscal
 * US4): nunca un DELETE físico. El trigger `validar_eliminacion_logica_documento`
 * es la autoridad real sobre quién puede eliminar según antigüedad y rol —
 * esta acción solo traduce su rechazo a un mensaje claro.
 */
export async function eliminarDocumento(
  clienteId: string,
  documentoId: string,
): Promise<ActionResult> {
  await requireCapability('manage_documents')
  const supabase = await createServerSupabaseClient()

  const { error } = await supabase
    .from('documentos')
    .update({ estado: 'eliminado' })
    .eq('id', documentoId)

  if (error) {
    return { error: mapearErrorDocumentoAMensaje(error) }
  }

  revalidatePath(`/clientes/${clienteId}`)
  return { error: null }
}
