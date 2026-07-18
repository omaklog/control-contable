import type { Capability } from '@control-contable/auth'
import type { ComponentType } from 'react'

export interface MenuItem {
  label: string
  href: string
  icon: ComponentType
  /** Si se define, la entrada solo es visible cuando esa capacidad está en las capacidades efectivas del usuario (004-portal-main-layout, FR-007). */
  capability?: Capability
  /** false = entrada visible pero deshabilitada. */
  implemented: boolean
  /** Texto secundario a mostrar cuando implemented=false, en vez del genérico "Próximamente" (006-crud-clientes-admin, FR-017). */
  pendingLabel?: string
}

/**
 * Filtra las entradas del menú según las capacidades efectivas del usuario
 * (004-portal-main-layout, research.md #3). Función pura: no consulta
 * `implemented` — ese campo solo afecta el estilo/interactividad de la
 * entrada en la UI, no su visibilidad. Compartida por `apps/portal` y
 * `apps/admin` (cada una define su propia lista de `MenuItem`).
 */
export function visibleMenuItems(items: MenuItem[], capabilities: Capability[]): MenuItem[] {
  return items.filter((item) => !item.capability || capabilities.includes(item.capability))
}

/**
 * Determina si `href` corresponde a la ruta actualmente activa (004-portal-main-layout,
 * FR-011/FR-012, research.md #7). Coincidencia exacta para `/` (Inicio) — evita que
 * cualquier ruta lo marque como activo por ser prefijo trivial de todas—; por prefijo
 * para el resto, de forma que subrutas (p. ej. `/clientes/[id]`) también activen la
 * entrada de menú de su módulo padre.
 */
export function isActiveMenuItem(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
