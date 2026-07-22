import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import { calcularTotalPaginas } from '@control-contable/utils'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

import { CobranzaClient } from './CobranzaClient'

const COBRANZAS_POR_PAGINA = 20

/**
 * Bandeja de Cobranza (017-cobranza, US1/US4): activa el placeholder de
 * navegación "Cobranza" ya reservado desde 004 (research.md Decisión 9).
 * El estado de pago/vencimiento siempre se lee de la vista `cobranzas_resumen`
 * (nunca se recalcula en JS) — ver contracts/db-functions-rls.md Sección H.
 * Filtra/pagina en JS sobre el conjunto ya acotado por RLS, mismo patrón que
 * `obligaciones-fiscales/page.tsx` (015). Para Contador/Auxiliar, el filtro
 * inicial preselecciona sus clientes asignados (`clientes.responsable_id`)
 * con cobranzas pendientes de pago — ampliable por el usuario (Clarifications,
 * FR-022); no es una restricción de acceso, solo un valor de filtro inicial.
 */
export default async function CobranzaPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    rfc?: string
    cliente?: string
    mes?: string
    anio?: string
    estadoPago?: string
    estadoVencimiento?: string
    todos?: string
  }>
}) {
  const currentProfile = await requireCapability('view_billing')
  const supabase = await createServerSupabaseClient()

  const params = await searchParams
  const paginaActual = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)
  const filtroRfc = params.rfc?.trim().toLowerCase() ?? ''
  const filtroCliente = params.cliente?.trim().toLowerCase() ?? ''
  const filtroMes = params.mes?.trim() ?? ''
  const filtroAnio = params.anio?.trim() ?? ''
  const filtroEstadoPago = params.estadoPago?.trim() ?? ''
  const filtroEstadoVencimiento = params.estadoVencimiento?.trim() ?? ''

  const esAdministrador = currentProfile.role === 'administrador'
  const sinFiltrosAplicados =
    !params.rfc &&
    !params.cliente &&
    !params.mes &&
    !params.anio &&
    !params.estadoPago &&
    !params.estadoVencimiento &&
    !params.todos
  const usarFiltroInicialAsignado = !esAdministrador && sinFiltrosAplicados

  const [
    { data: cobranzasData },
    { data: clientesActivosData },
    { data: cargosPendientesData },
    { data: configuracionData },
  ] = await Promise.all([
    supabase
      .from('cobranzas_resumen')
      .select('*')
      .eq('estado', 'vigente')
      .order('periodo_anio', { ascending: false })
      .order('periodo_mes', { ascending: false }),
    supabase
      .from('clientes')
      .select('id, nombre, rfc')
      .eq('estado', 'activo')
      .order('nombre', { ascending: true }),
    supabase
      .from('cargos_extraordinarios')
      .select('id, descripcion, monto, periodo_mes, periodo_anio, cliente_id, clientes(nombre)')
      .eq('estado', 'pendiente')
      .order('fecha_registro', { ascending: false }),
    supabase.from('configuracion_cobranza').select('dia_generacion, dia_limite_pago').single(),
  ])

  const clienteIds = Array.from(
    new Set(
      (cobranzasData ?? []).map((row) => row.cliente_id).filter((id): id is string => Boolean(id)),
    ),
  )
  const { data: clientesData } =
    clienteIds.length > 0
      ? await supabase
          .from('clientes')
          .select('id, nombre, rfc, responsable_id')
          .in('id', clienteIds)
      : { data: [] as { id: string; nombre: string; rfc: string; responsable_id: string | null }[] }
  const clientePorId = new Map((clientesData ?? []).map((row) => [row.id, row]))

  const todas = (cobranzasData ?? [])
    .filter((row) => row.id && row.cliente_id)
    .map((row) => {
      const cliente = clientePorId.get(row.cliente_id!)
      return {
        id: row.id!,
        clienteId: row.cliente_id!,
        clienteNombre: cliente?.nombre ?? '',
        clienteRfc: cliente?.rfc ?? '',
        clienteResponsableId: cliente?.responsable_id ?? null,
        periodoMes: row.periodo_mes ?? 0,
        periodoAnio: row.periodo_anio ?? 0,
        fechaLimite: row.fecha_limite ?? '',
        totalConceptos: row.total_conceptos ?? 0,
        totalPagado: row.total_pagado ?? 0,
        saldo: row.saldo ?? 0,
        estadoPago: (row.estado_pago ?? 'pendiente') as 'pendiente' | 'parcial' | 'pagada',
        estadoVencimiento: (row.estado_vencimiento ?? 'vigente') as 'vigente' | 'vencida',
      }
    })

  const filtradas = todas.filter((cobranza) => {
    if (filtroRfc && !cobranza.clienteRfc.toLowerCase().includes(filtroRfc)) return false
    if (filtroCliente && !cobranza.clienteNombre.toLowerCase().includes(filtroCliente)) return false
    if (filtroMes && String(cobranza.periodoMes) !== filtroMes) return false
    if (filtroAnio && String(cobranza.periodoAnio) !== filtroAnio) return false
    if (filtroEstadoPago && cobranza.estadoPago !== filtroEstadoPago) return false
    if (filtroEstadoVencimiento && cobranza.estadoVencimiento !== filtroEstadoVencimiento)
      return false
    if (usarFiltroInicialAsignado) {
      if (cobranza.clienteResponsableId !== currentProfile.id) return false
      if (cobranza.estadoPago === 'pagada') return false
    }
    return true
  })

  const totalPaginas = calcularTotalPaginas(filtradas.length, COBRANZAS_POR_PAGINA)
  const desde = (paginaActual - 1) * COBRANZAS_POR_PAGINA
  const cobranzas = filtradas.slice(desde, desde + COBRANZAS_POR_PAGINA)

  const canManage = currentProfile.capabilities.includes('manage_billing')

  const clientesActivos = (clientesActivosData ?? []).map((row) => ({
    id: row.id,
    nombre: row.nombre,
    rfc: row.rfc,
  }))

  const cargosExtraordinariosPendientes = (cargosPendientesData ?? []).map((row) => ({
    id: row.id,
    descripcion: row.descripcion,
    monto: row.monto,
    periodoMes: row.periodo_mes,
    periodoAnio: row.periodo_anio,
    clienteNombre: row.clientes?.nombre ?? '',
  }))

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Cobranza
      </Typography>
      <CobranzaClient
        cobranzas={cobranzas}
        canManage={canManage}
        esAdministrador={esAdministrador}
        clientesActivos={clientesActivos}
        cargosExtraordinariosPendientes={cargosExtraordinariosPendientes}
        totalPaginas={totalPaginas}
        paginaActual={paginaActual}
        rfc={params.rfc ?? ''}
        cliente={params.cliente ?? ''}
        mes={params.mes ?? ''}
        anio={params.anio ?? ''}
        estadoPago={params.estadoPago ?? ''}
        estadoVencimiento={params.estadoVencimiento ?? ''}
        filtroInicialAsignadoActivo={usarFiltroInicialAsignado}
        configuracion={{
          diaGeneracion: configuracionData?.dia_generacion ?? 1,
          diaLimitePago: configuracionData?.dia_limite_pago ?? 20,
        }}
      />
    </Container>
  )
}
