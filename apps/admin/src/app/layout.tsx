import * as React from 'react'
import type { Metadata } from 'next'
import ThemeRegistry from '@/components/providers/ThemeRegistry'
import { inter, jetbrainsMono } from '@/lib/fonts'

export const metadata: Metadata = {
  title: 'Control Contable — Panel Administrativo',
  description: 'Panel de administración del sistema contable',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  )
}
