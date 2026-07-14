import * as React from 'react'
import type { Metadata } from 'next'
import ThemeRegistry from '@/components/providers/ThemeRegistry'

export const metadata: Metadata = {
  title: 'Control Contable — Portal',
  description: 'Sistema de administración del despacho contable',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  )
}
