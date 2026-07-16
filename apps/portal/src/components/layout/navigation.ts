import type { Capability } from '@control-contable/auth'
import AssessmentIcon from '@mui/icons-material/Assessment'
import FolderIcon from '@mui/icons-material/Folder'
import HomeIcon from '@mui/icons-material/Home'
import PaymentsIcon from '@mui/icons-material/Payments'
import PeopleIcon from '@mui/icons-material/People'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'
import type { ComponentType } from 'react'

export interface MenuItem {
  label: string
  href: string
  icon: ComponentType
  /** Si se define, la entrada solo es visible cuando esa capacidad está en las capacidades efectivas del usuario (FR-007). */
  capability?: Capability
  /** false = entrada visible pero deshabilitada, marcada "Próximamente" (FR-006). */
  implemented: boolean
}

/**
 * Entradas del menú de navegación del portal: una por cada módulo de negocio
 * de la constitución, más "Inicio". Ninguna tiene `capability` asignada
 * todavía porque ningún módulo de negocio define capacidades propias — ver
 * spec.md Clarifications y research.md #3.
 */
export const MENU_ITEMS: MenuItem[] = [
  { label: 'Inicio', href: '/', icon: HomeIcon, implemented: true },
  { label: 'Clientes', href: '/clientes', icon: PeopleIcon, implemented: false },
  { label: 'Cobranza', href: '/cobranza', icon: PaymentsIcon, implemented: false },
  { label: 'Expedientes Digitales', href: '/expedientes', icon: FolderIcon, implemented: false },
  { label: 'Recibos de Honorarios', href: '/recibos', icon: ReceiptLongIcon, implemented: false },
  { label: 'Reportes', href: '/reportes', icon: AssessmentIcon, implemented: false },
]

/**
 * Filtra las entradas del menú según las capacidades efectivas del usuario
 * (research.md #3). Función pura: no consulta `implemented` — ese campo solo
 * afecta el estilo/interactividad de la entrada en la UI, no su visibilidad.
 */
export function visibleMenuItems(items: MenuItem[], capabilities: Capability[]): MenuItem[] {
  return items.filter((item) => !item.capability || capabilities.includes(item.capability))
}
