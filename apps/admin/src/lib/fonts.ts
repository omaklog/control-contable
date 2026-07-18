import { Inter, JetBrains_Mono } from 'next/font/google'

/**
 * Fuentes autohospedadas por Next.js en build time (sin llamada a un CDN externo
 * en tiempo de ejecución — 009-migrate-design-system, research.md #5).
 */
export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})
