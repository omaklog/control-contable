import { requireCapability } from '@control-contable/auth'
import { createServerSupabaseClient } from '@control-contable/supabase-client/server'
import Container from '@mui/material/Container'
import Typography from '@mui/material/Typography'

import { DocumentosFiscalesClient } from './DocumentosFiscalesClient'

const DOCUMENTOS_POR_PAGINA = 20

/**
 * Vista global de Expedientes (016-expediente-fiscal, US3): segunda pantalla
 * transversal a todos los clientes del sistema, activando el placeholder
 * "Documentos Fiscales" ya reservado en navigation.ts desde 004 (mismo
 * patrón que 015 con "Obligaciones Fiscales", research.md Decisión 10).
 * Filtra/pagina en JS sobre el conjunto completo, igual que
 * apps/portal/(app)/obligaciones-fiscales/page.tsx.
 */
export default async function DocumentosFiscalesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    cliente?: string
    rfc?: string
    tipo?: string
    anio?: string
    periodo?: string
    obligacion?: string
    cumplimiento?: string
    fechaAlta?: string
    usuario?: string
  }>
}) {
  await requireCapability('view_documents')
  const supabase = await createServerSupabaseClient()

  const params = await searchParams
  const paginaActual = Math.max(1, Number.parseInt(params.page ?? '1', 10) || 1)
  const filtroCliente = params.cliente?.trim().toLowerCase() ?? ''
  const filtroRfc = params.rfc?.trim().toLowerCase() ?? ''
  const filtroTipo = params.tipo?.trim().toLowerCase() ?? ''
  const filtroAnio = params.anio?.trim() ?? ''
  const filtroPeriodo = params.periodo?.trim().toLowerCase() ?? ''
  const filtroObligacion = params.obligacion?.trim().toLowerCase() ?? ''
  const filtroCumplimiento = params.cumplimiento?.trim().toLowerCase() ?? ''
  const filtroFechaAlta = params.fechaAlta?.trim() ?? ''
  const filtroUsuario = params.usuario?.trim().toLowerCase() ?? ''

  const { data: documentosData } = await supabase
    .from('documentos')
    .select(
      `id, nombre_original, cliente_id, categoria_id, tamano_bytes, ruta_almacenamiento, cargado_por, fecha_carga,
       clientes(nombre, rfc),
       categorias_documento(nombre),
       obligaciones_fiscales(nombre),
       cumplimiento_fiscal_documentos(cumplimientos_fiscales(periodo_inicio, periodo_etiqueta, obligaciones_fiscales_cliente(obligaciones_fiscales(nombre)), obligaciones_fiscales(nombre)))`,
    )
    .neq('estado', 'eliminado')
    .order('fecha_carga', { ascending: false })

  const usuarioIds = Array.from(
    new Set((documentosData ?? []).map((row) => row.cargado_por).filter(Boolean)),
  ) as string[]
  const { data: usuariosData } =
    usuarioIds.length > 0
      ? await supabase.from('profiles').select('id, full_name').in('id', usuarioIds)
      : { data: [] as { id: string; full_name: string | null }[] }
  const nombrePorUsuarioId = new Map(
    (usuariosData ?? []).map((row) => [row.id, row.full_name ?? '']),
  )

  const todos = (documentosData ?? []).map((row) => {
    const asociacion = row.cumplimiento_fiscal_documentos?.[0]?.cumplimientos_fiscales
    const obligacionNombre =
      asociacion?.obligaciones_fiscales_cliente?.obligaciones_fiscales?.nombre ??
      asociacion?.obligaciones_fiscales?.nombre ??
      row.obligaciones_fiscales?.nombre ??
      ''
    return {
      id: row.id,
      nombreOriginal: row.nombre_original,
      clienteId: row.cliente_id,
      clienteNombre: row.clientes?.nombre ?? '',
      clienteRfc: row.clientes?.rfc ?? '',
      categoriaNombre: row.categorias_documento?.nombre ?? null,
      periodoAnio: asociacion?.periodo_inicio
        ? new Date(asociacion.periodo_inicio).getFullYear()
        : null,
      periodoEtiqueta: asociacion?.periodo_etiqueta ?? null,
      obligacionNombre,
      tamanoBytes: row.tamano_bytes,
      rutaAlmacenamiento: row.ruta_almacenamiento,
      fechaCarga: row.fecha_carga,
      usuarioNombre: row.cargado_por ? (nombrePorUsuarioId.get(row.cargado_por) ?? '') : '',
    }
  })

  const filtrados = todos.filter((documento) => {
    if (filtroCliente && !documento.clienteNombre.toLowerCase().includes(filtroCliente))
      return false
    if (filtroRfc && !documento.clienteRfc.toLowerCase().includes(filtroRfc)) return false
    if (
      filtroTipo &&
      !(documento.categoriaNombre ?? 'sin clasificar').toLowerCase().includes(filtroTipo)
    )
      return false
    if (filtroAnio && String(documento.periodoAnio ?? '') !== filtroAnio) return false
    if (filtroPeriodo && !(documento.periodoEtiqueta ?? '').toLowerCase().includes(filtroPeriodo))
      return false
    if (filtroObligacion && !documento.obligacionNombre.toLowerCase().includes(filtroObligacion))
      return false
    if (
      filtroCumplimiento &&
      !`${documento.obligacionNombre} ${documento.periodoEtiqueta ?? ''}`
        .toLowerCase()
        .includes(filtroCumplimiento)
    )
      return false
    if (filtroFechaAlta && documento.fechaCarga.slice(0, 10) !== filtroFechaAlta) return false
    if (filtroUsuario && !documento.usuarioNombre.toLowerCase().includes(filtroUsuario))
      return false
    return true
  })

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / DOCUMENTOS_POR_PAGINA))
  const desde = (paginaActual - 1) * DOCUMENTOS_POR_PAGINA
  const documentos = filtrados.slice(desde, desde + DOCUMENTOS_POR_PAGINA)

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Documentos Fiscales
      </Typography>
      <DocumentosFiscalesClient
        documentos={documentos}
        totalPaginas={totalPaginas}
        paginaActual={paginaActual}
        cliente={params.cliente ?? ''}
        rfc={params.rfc ?? ''}
        tipo={params.tipo ?? ''}
        anio={params.anio ?? ''}
        periodo={params.periodo ?? ''}
        obligacion={params.obligacion ?? ''}
        cumplimiento={params.cumplimiento ?? ''}
        fechaAlta={params.fechaAlta ?? ''}
        usuario={params.usuario ?? ''}
      />
    </Container>
  )
}
