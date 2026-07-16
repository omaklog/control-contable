import { requireApp } from '@control-contable/auth'
import type { ReactNode } from 'react'

import { MainLayoutClient } from '@/components/layout/MainLayoutClient'

/**
 * Layout principal de apps/portal (feature 004-portal-main-layout): centraliza
 * requireApp('portal') una sola vez para todas las páginas de este route
 * group — un redirect() aquí impide que cualquier hijo se renderice, así que
 * las páginas dentro de (app) ya no repiten esta llamada (research.md #2).
 * /login, /unauthorized y /cambiar-contrasena quedan fuera de este grupo a
 * propósito (FR-008) y no llevan este layout.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const profile = await requireApp('portal')

  return <MainLayoutClient profile={profile}>{children}</MainLayoutClient>
}
