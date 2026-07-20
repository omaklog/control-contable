import type { MenuItem } from '@control-contable/ui'
import BusinessIcon from '@mui/icons-material/Business'
import FolderSpecialIcon from '@mui/icons-material/FolderSpecial'
import HistoryIcon from '@mui/icons-material/History'
import HomeIcon from '@mui/icons-material/Home'
import MiscellaneousServicesIcon from '@mui/icons-material/MiscellaneousServices'
import PeopleIcon from '@mui/icons-material/People'

/**
 * Entradas del menú de navegación del Panel Administrativo. A diferencia de
 * `apps/portal`, este menú solo lista módulos ya implementados — sin
 * marcadores "Próximamente" para módulos administrativos futuros aún no
 * especificados (004-portal-main-layout, Clarificaciones segunda sesión,
 * FR-006); "Catálogos" ya no es uno de ellos desde 012-administracion-catalogos.
 * `MenuItem`/`visibleMenuItems` viven en `@control-contable/ui`, compartidos
 * con apps/portal (FR-010).
 */
export const MENU_ITEMS: MenuItem[] = [
  { label: 'Inicio', href: '/', icon: HomeIcon, implemented: true },
  {
    label: 'Usuarios',
    href: '/usuarios',
    icon: PeopleIcon,
    capability: 'manage_users',
    implemented: true,
  },
  {
    label: 'Clientes',
    href: '/clientes',
    icon: BusinessIcon,
    capability: 'view_clients',
    implemented: true,
  },
  {
    label: 'Servicios',
    href: '/servicios',
    icon: MiscellaneousServicesIcon,
    capability: 'manage_catalogs',
    implemented: true,
  },
  {
    label: 'Catálogos',
    href: '/catalogos',
    icon: FolderSpecialIcon,
    capability: 'manage_catalogs',
    implemented: true,
  },
  {
    label: 'Auditoría',
    href: '/auditoria',
    icon: HistoryIcon,
    capability: 'view_auth_audit_log',
    implemented: true,
  },
]
