import type { MenuItem } from '@control-contable/ui'
import AssessmentIcon from '@mui/icons-material/Assessment'
import FolderIcon from '@mui/icons-material/Folder'
import HomeIcon from '@mui/icons-material/Home'
import PaymentsIcon from '@mui/icons-material/Payments'
import PeopleIcon from '@mui/icons-material/People'
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong'

/**
 * Entradas del menú de navegación del portal: una por cada módulo de negocio
 * de la constitución, más "Inicio". "Clientes" ya tiene `capability:
 * 'manage_clients'` desde 007-alta-cliente-portal (Auxiliar no la ve); el
 * resto sigue sin capacidad propia porque esos módulos aún no existen — ver
 * 004-portal-main-layout/spec.md Clarifications y research.md #3. `MenuItem`
 * y `visibleMenuItems` viven en `@control-contable/ui` (compartidos con
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
  { label: 'Cobranza', href: '/cobranza', icon: PaymentsIcon, implemented: false },
  { label: 'Expedientes Digitales', href: '/expedientes', icon: FolderIcon, implemented: false },
  { label: 'Recibos de Honorarios', href: '/recibos', icon: ReceiptLongIcon, implemented: false },
  { label: 'Reportes', href: '/reportes', icon: AssessmentIcon, implemented: false },
]
