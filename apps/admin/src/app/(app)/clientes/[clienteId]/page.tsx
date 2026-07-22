import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import { ClienteDetalleClient } from '@control-contable/ui'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { notFound } from 'next/navigation'

import {
  actualizarClasificacionDocumento,
  agregarObligacionFiscalCliente,
  agregarServicioContratado,
  aplicarPlantillaObligaciones,
  cambiarPrecioServicioContratado,
  createContacto,
  editarObligacionFiscalCliente,
  eliminarDocumento,
  eliminarObligacionFiscalCliente,
  finalizarServicioContratado,
  marcarNoAplicaObligacionFiscalCliente,
  obtenerHistorialServicioContratado,
  obtenerUrlFirmadaDocumento,
  reactivarServicioContratado,
  setContactoEstado,
  setContactoPrincipal,
  subirDocumento,
  suspenderServicioContratado,
  updateContacto,
} from './actions'

/**
 * Página de detalle de Cliente (008-contactos-y-detalle-cliente US1):
 * primera ruta dinámica del monorepo. requireCapability('view_clients') deja
 * entrar a Auxiliar en modo solo lectura; canManage habilita la gestión de
 * Contactos y Servicios Contratados dentro de ClienteDetalleClient (Historia
 * 2, y 011-gestion-servicios Historias 2-4).
 */
export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ clienteId: string }>
}) {
  const currentProfile = await requireCapability('view_clients')
  const supabase = await createServerSupabaseClient()
  const { clienteId } = await params

  const [
    { data: clienteData },
    { data: contactosData },
    { data: serviciosContratadosData },
    { data: serviciosDisponiblesData },
    { data: obligacionesFiscalesClienteData },
    { data: obligacionesFiscalesDisponiblesData },
    { data: periodicidadesDisponiblesData },
    { data: plantillasDisponiblesData },
    { data: documentosData },
    { data: categoriasDocumentoData },
    { data: cumplimientosClienteData },
  ] = await Promise.all([
    supabase
      .from('clientes')
      .select(
        'id, nombre, tipo_persona, rfc, correo, telefono, direccion_fiscal, estado, regimenes_fiscales(descripcion)',
      )
      .eq('id', clienteId)
      .maybeSingle(),
    supabase
      .from('contactos')
      .select('id, nombre, telefono, email, estado, es_principal')
      .eq('cliente_id', clienteId)
      .order('nombre', { ascending: true }),
    supabase
      .from('servicios_contratados')
      .select(
        'id, servicio_id, precio_acordado, fecha_inicio, fecha_fin, estado, observaciones, servicios(nombre)',
      )
      .eq('cliente_id', clienteId)
      .order('created_at', { ascending: true }),
    supabase
      .from('servicios')
      .select('id, nombre')
      .eq('estado', 'activo')
      .order('nombre', { ascending: true }),
    supabase
      .from('obligaciones_fiscales_cliente')
      .select(
        'id, obligacion_fiscal_id, periodicidad_id, orden, estado, observaciones, obligaciones_fiscales(nombre), periodicidades(nombre)',
      )
      .eq('cliente_id', clienteId)
      .order('orden', { ascending: true }),
    supabase
      .from('obligaciones_fiscales')
      .select('id, nombre')
      .eq('estado', 'activo')
      .order('nombre', { ascending: true }),
    supabase
      .from('periodicidades')
      .select('id, nombre')
      .eq('estado', 'activo')
      .order('nombre', { ascending: true }),
    supabase
      .from('plantillas_obligaciones')
      .select('id, nombre')
      .eq('estado', 'activo')
      .order('nombre', { ascending: true }),
    supabase
      .from('documentos')
      .select(
        `id, nombre_original, categoria_id, obligacion_fiscal_id, tamano_bytes, ruta_almacenamiento, cargado_por, fecha_carga, estado,
         categorias_documento(nombre),
         obligaciones_fiscales(nombre),
         cumplimiento_fiscal_documentos(cumplimiento_id, cumplimientos_fiscales(periodo_inicio, periodo_etiqueta))`,
      )
      .eq('cliente_id', clienteId)
      .neq('estado', 'eliminado')
      .order('fecha_carga', { ascending: false }),
    supabase
      .from('categorias_documento')
      .select('id, nombre')
      .eq('activa', true)
      .order('nombre', { ascending: true }),
    supabase
      .from('cumplimientos_fiscales')
      .select(
        'id, periodo_etiqueta, descripcion, obligaciones_fiscales_cliente(obligaciones_fiscales(nombre)), obligaciones_fiscales(nombre)',
      )
      .eq('cliente_id', clienteId)
      .order('periodo_inicio', { ascending: false }),
  ])

  if (!clienteData) {
    notFound()
  }

  const cliente = {
    id: clienteData.id,
    nombre: clienteData.nombre,
    tipoPersona: clienteData.tipo_persona,
    rfc: clienteData.rfc,
    regimenFiscalDescripcion: clienteData.regimenes_fiscales?.descripcion ?? '',
    correo: clienteData.correo,
    telefono: clienteData.telefono ?? '',
    direccionFiscal: clienteData.direccion_fiscal ?? '',
    estado: clienteData.estado,
  }

  const contactos = (contactosData ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    telefono: row.telefono,
    email: row.email,
    estado: row.estado,
    esPrincipal: row.es_principal,
  }))

  const servicios = (serviciosContratadosData ?? []).map((row) => ({
    id: row.id,
    servicioId: row.servicio_id,
    servicioNombre: row.servicios?.nombre ?? '',
    precioAcordado: row.precio_acordado,
    fechaInicio: row.fecha_inicio,
    fechaFin: row.fecha_fin,
    estado: row.estado,
    observaciones: row.observaciones,
  }))

  const serviciosDisponibles = (serviciosDisponiblesData ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
  }))

  const obligacionesFiscales = (obligacionesFiscalesClienteData ?? []).map((row) => ({
    id: row.id,
    obligacionFiscalId: row.obligacion_fiscal_id,
    obligacionFiscalNombre: row.obligaciones_fiscales?.nombre ?? '',
    periodicidadId: row.periodicidad_id,
    periodicidadNombre: row.periodicidades?.nombre ?? '',
    orden: row.orden,
    estado: row.estado,
    observaciones: row.observaciones,
  }))

  const obligacionesFiscalesDisponibles = (obligacionesFiscalesDisponiblesData ?? []).map(
    (row) => ({
      id: row.id,
      nombre: row.nombre,
    }),
  )

  const periodicidadesDisponibles = (periodicidadesDisponiblesData ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
  }))

  const plantillasDisponibles = (plantillasDisponiblesData ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
  }))

  const documentos = (documentosData ?? []).map((row) => {
    const asociacionCumplimiento = row.cumplimiento_fiscal_documentos?.[0]
    return {
      id: row.id,
      nombreOriginal: row.nombre_original,
      categoriaId: row.categoria_id,
      categoriaNombre: row.categorias_documento?.nombre ?? null,
      obligacionFiscalId: row.obligacion_fiscal_id,
      obligacionFiscalNombre: row.obligaciones_fiscales?.nombre ?? null,
      cumplimientoId: asociacionCumplimiento?.cumplimiento_id ?? null,
      periodoEtiqueta: asociacionCumplimiento?.cumplimientos_fiscales?.periodo_etiqueta ?? null,
      periodoAnio: asociacionCumplimiento?.cumplimientos_fiscales?.periodo_inicio
        ? new Date(asociacionCumplimiento.cumplimientos_fiscales.periodo_inicio).getFullYear()
        : null,
      tamanoBytes: row.tamano_bytes,
      rutaAlmacenamiento: row.ruta_almacenamiento,
      fechaCarga: row.fecha_carga,
    }
  })

  const tiposDocumentoDisponibles = (categoriasDocumentoData ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
  }))

  const cumplimientosDisponibles = (cumplimientosClienteData ?? []).map((row) => ({
    id: row.id,
    etiqueta: `${
      row.obligaciones_fiscales_cliente?.obligaciones_fiscales?.nombre ??
      row.obligaciones_fiscales?.nombre ??
      row.descripcion ??
      'Cumplimiento'
    } — ${row.periodo_etiqueta}`,
  }))

  const canManage = currentProfile.capabilities.includes('manage_clients')
  const canManageDocumentos = currentProfile.capabilities.includes('manage_documents')

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        {cliente.nombre}
      </Typography>
      <ClienteDetalleClient
        cliente={cliente}
        contactos={contactos}
        canManage={canManage}
        onCreateContacto={createContacto.bind(null, clienteId)}
        onUpdateContacto={updateContacto.bind(null, clienteId)}
        onSetContactoEstado={setContactoEstado.bind(null, clienteId)}
        onSetContactoPrincipal={setContactoPrincipal.bind(null, clienteId)}
        servicios={servicios}
        serviciosDisponibles={serviciosDisponibles}
        onAgregarServicio={agregarServicioContratado.bind(null, clienteId)}
        onCambiarPrecioServicio={cambiarPrecioServicioContratado.bind(null, clienteId)}
        onSuspenderServicio={suspenderServicioContratado.bind(null, clienteId)}
        onReactivarServicio={reactivarServicioContratado.bind(null, clienteId)}
        onFinalizarServicio={finalizarServicioContratado.bind(null, clienteId)}
        onObtenerHistorialServicio={obtenerHistorialServicioContratado}
        obligacionesFiscales={obligacionesFiscales}
        obligacionesFiscalesDisponibles={obligacionesFiscalesDisponibles}
        periodicidadesDisponibles={periodicidadesDisponibles}
        plantillasDisponibles={plantillasDisponibles}
        onAgregarObligacionFiscal={agregarObligacionFiscalCliente.bind(null, clienteId)}
        onEditarObligacionFiscal={editarObligacionFiscalCliente.bind(null, clienteId)}
        onMarcarNoAplicaObligacionFiscal={marcarNoAplicaObligacionFiscalCliente.bind(
          null,
          clienteId,
        )}
        onEliminarObligacionFiscal={eliminarObligacionFiscalCliente.bind(null, clienteId)}
        onAplicarPlantillaObligaciones={aplicarPlantillaObligaciones.bind(null, clienteId)}
        documentos={documentos}
        tiposDocumentoDisponibles={tiposDocumentoDisponibles}
        cumplimientosDisponibles={cumplimientosDisponibles}
        obligacionesFiscalesDisponiblesDocumentos={obligacionesFiscalesDisponibles}
        canManageDocumentos={canManageDocumentos}
        onSubirDocumento={subirDocumento.bind(null, clienteId)}
        onActualizarClasificacionDocumento={actualizarClasificacionDocumento.bind(null, clienteId)}
        onObtenerUrlFirmadaDocumento={obtenerUrlFirmadaDocumento}
        onEliminarDocumento={eliminarDocumento.bind(null, clienteId)}
      />
    </Container>
  )
}
