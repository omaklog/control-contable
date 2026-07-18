import type { MenuItem } from '@control-contable/ui'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import FolderIcon from '@mui/icons-material/Folder'
import HomeIcon from '@mui/icons-material/Home'
import PaymentsIcon from '@mui/icons-material/Payments'
import PeopleIcon from '@mui/icons-material/People'

/**
 * Entradas del menú de navegación del portal, alineadas a la arquitectura de
 * información vigente (docs/ux/design-system.md §2.2, no al listado plano
 * original de 004-portal-main-layout/spec.md FR-006). "Clientes" ya tiene
 * `capability: 'manage_clients'` desde 007-alta-cliente-portal; "Cobranza" y
 * "Documentos Fiscales" reusan las capacidades `view_billing`/`view_documents`
 * ya existentes en `packages/auth` (FR-007) aunque todavía no tengan página
 * propia; "Obligaciones Fiscales" no tiene capacidad todavía (no existe ese
 * módulo). `MenuItem` y `visibleMenuItems` viven en `@control-contable/ui`
 * (compartidos con apps/admin, ver 004-portal-main-layout, FR-010).
 */
export const MENU_ITEMS: MenuItem[] = [
  { label: 'Inicio', href: '/', icon: HomeIcon, implemented: true },
  {
    label: 'Clientes',
    href: '/clientes',
    icon: PeopleIcon,
    capability: 'manage_clients',
    implemented: true,
  },
  {
    label: 'Cobranza',
    href: '/cobranza',
    icon: PaymentsIcon,
    capability: 'view_billing',
    implemented: false,
  },
  {
    label: 'Documentos Fiscales',
    href: '/documentos-fiscales',
    icon: FolderIcon,
    capability: 'view_documents',
    implemented: false,
  },
  {
    label: 'Obligaciones Fiscales',
    href: '/obligaciones-fiscales',
    icon: FactCheckIcon,
    implemented: false,
  },
]
