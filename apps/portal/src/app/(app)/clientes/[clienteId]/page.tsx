import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import { ClienteDetalleClient } from '@control-contable/ui'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'
import { notFound } from 'next/navigation'

import { createContacto, setContactoEstado, setContactoPrincipal, updateContacto } from './actions'

/**
 * Página de detalle de Cliente (008-contactos-y-detalle-cliente US1): mismo
 * patrón que apps/admin — requireCapability('view_clients') deja entrar a
 * Auxiliar en modo solo lectura; canManage habilita la gestión de Contactos
 * dentro de ClienteDetalleClient (Historia 2).
 */
export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ clienteId: string }>
}) {
  const currentProfile = await requireCapability('view_clients')
  const supabase = await createServerSupabaseClient()
  const { clienteId } = await params

  const [{ data: clienteData }, { data: contactosData }] = await Promise.all([
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
      />
    </Container>
  )
}
