import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import { ClienteDetalleClient } from '@control-contable/ui'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { notFound } from 'next/navigation'

import {
  agregarServicioContratado,
  cambiarPrecioServicioContratado,
  createContacto,
  finalizarServicioContratado,
  obtenerHistorialServicioContratado,
  reactivarServicioContratado,
  setContactoEstado,
  setContactoPrincipal,
  suspenderServicioContratado,
  updateContacto,
} from './actions'

/**
 * Página de detalle de Cliente (008-contactos-y-detalle-cliente US1): mismo
 * patrón que apps/admin — requireCapability('view_clients') deja entrar a
 * Auxiliar en modo solo lectura; canManage habilita la gestión de Contactos
 * y Servicios Contratados dentro de ClienteDetalleClient (Historia 2, y
 * 011-gestion-servicios Historias 2-4).
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

  const canManage = currentProfile.capabilities.includes('manage_clients')

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
      />
    </Container>
  )
}
