import { requireApp } from '@control-contable/auth'
import { MainLayoutClient } from '@control-contable/ui'
import type { ReactNode } from 'react'

import { MENU_ITEMS } from '@/components/layout/navigation'

/**
 * Layout principal del Panel Administrativo (004-portal-main-layout,
 * ampliado a apps/admin): centraliza `requireApp('admin')` una sola vez para
 * todas las páginas de este route group, igual que ya hace `apps/portal`
 * (research.md #2) — corrige además que antes cada página llamaba
 * `requireCapability(...)` directamente sin verificar primero el acceso a la
 * app. /login, /unauthorized y /cambiar-contrasena quedan fuera de este
 * grupo a propósito y no llevan este layout.
 */
export default async function AdminAppLayout({ children }: { children: ReactNode }) {
  const profile = await requireApp('admin')

  return (
    <MainLayoutClient profile={profile} title="Panel Administrativo" menuItems={MENU_ITEMS}>
      {children}
    </MainLayoutClient>
  )
}
