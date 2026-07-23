import type { MenuItem } from '@control-contable/ui'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import FolderIcon from '@mui/icons-material/Folder'
import HomeIcon from '@mui/icons-material/Home'
import PaymentsIcon from '@mui/icons-material/Payments'
import PeopleIcon from '@mui/icons-material/People'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'

/**
 * Entradas del menú de navegación del portal, alineadas a la arquitectura de
 * información vigente (docs/ux/design-system.md §2.2, no al listado plano
 * original de 004-portal-main-layout/spec.md FR-006). "Clientes" ya tiene
 * `capability: 'manage_clients'` desde 007-alta-cliente-portal; "Obligaciones
 * Fiscales" ya implementa la bandeja de Control de Cumplimiento Fiscal
 * (015-control-cumplimiento-fiscal, research.md #8); "Documentos Fiscales"
 * ya implementa la vista global de Expedientes (016-expediente-fiscal,
 * research.md Decisión 10); "Cobranza" ya implementa la bandeja de Cobranza
 * (017-cobranza, research.md Decisión 9); "Pagos" implementa la vista global
 * de Gestión de Pagos (018-gestion-pagos, research.md Decisión 9) — primera
 * entrada de menú sin placeholder pre-reservado desde 004. `MenuItem` y
 * `visibleMenuItems` viven en `@control-contable/ui` (compartidos con
 * apps/admin, ver 004-portal-main-layout, FR-010).
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
    implemented: true,
  },
  {
    label: 'Pagos',
    href: '/pagos',
    icon: ReceiptLongIcon,
    capability: 'view_billing',
    implemented: true,
  },
  {
    label: 'Documentos Fiscales',
    href: '/documentos-fiscales',
    icon: FolderIcon,
    capability: 'view_documents',
    implemented: true,
  },
  {
    label: 'Obligaciones Fiscales',
    href: '/obligaciones-fiscales',
    icon: FactCheckIcon,
    capability: 'view_clients',
    implemented: true,
  },
]
