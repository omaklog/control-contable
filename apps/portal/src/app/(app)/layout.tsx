import { requireApp } from '@control-contable/auth'
import { MainLayoutClient } from '@control-contable/ui'
import type { ReactNode } from 'react'

import { MENU_ITEMS } from '@/components/layout/navigation'

/**
 * Layout principal de apps/portal (feature 004-portal-main-layout): centraliza
 * requireApp('portal') una sola vez para todas las páginas de este route
 * group — un redirect() aquí impide que cualquier hijo se renderice, así que
 * las páginas dentro de (app) ya no repiten esta llamada (research.md #2).
 * /login, /unauthorized y /cambiar-contrasena quedan fuera de este grupo a
 * propósito (FR-008) y no llevan este layout. `MainLayoutClient` vive en
 * `@control-contable/ui`, compartido con apps/admin (FR-010).
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireApp('portal')

  return (
    <MainLayoutClient profile={profile} title="Portal de Control Contable" menuItems={MENU_ITEMS}>
      {children}
    </MainLayoutClient>
  )
}
