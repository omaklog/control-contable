'use client'

import * as React from 'react'

import type { ThemeMode } from './types'

/** Clave única de `localStorage` para el override manual (data-model.md — Preferencia de modo). */
export const COLOR_MODE_STORAGE_KEY = 'control-contable:color-mode'

/**
 * Decide el modo inicial: un valor guardado manualmente prevalece sobre la
 * preferencia del sistema operativo; sin valor guardado, sigue al SO; si no se
 * puede detectar la preferencia del SO, usa `'light'` como respaldo (Edge Case).
 */
export function resolveInitialMode({
  storedMode,
  prefersDark,
}: {
  storedMode: ThemeMode | null
  prefersDark: boolean | null
}): ThemeMode {
  if (storedMode === 'light' || storedMode === 'dark') {
    return storedMode
  }
  if (prefersDark === true) {
    return 'dark'
  }
  return 'light'
}

function readStoredMode(): ThemeMode | null {
  if (typeof window === 'undefined') return null
  const value = window.localStorage.getItem(COLOR_MODE_STORAGE_KEY)
  return value === 'light' || value === 'dark' ? value : null
}

function readPrefersDark(): boolean | null {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return null
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  } catch {
    return null
  }
}

interface ColorModeContextValue {
  mode: ThemeMode
  toggleMode: () => void
}

const ColorModeContext = React.createContext<ColorModeContextValue | null>(null)

export function ColorModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = React.useState<ThemeMode>('light')

  React.useEffect(() => {
    setMode(resolveInitialMode({ storedMode: readStoredMode(), prefersDark: readPrefersDark() }))
  }, [])

  const toggleMode = React.useCallback(() => {
    setMode((current) => {
      const next: ThemeMode = current === 'light' ? 'dark' : 'light'
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(COLOR_MODE_STORAGE_KEY, next)
      }
      return next
    })
  }, [])

  const value = React.useMemo(() => ({ mode, toggleMode }), [mode, toggleMode])

  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>
}

export function useColorMode(): ColorModeContextValue {
  const context = React.useContext(ColorModeContext)
  if (!context) {
    throw new Error('useColorMode debe usarse dentro de un ColorModeProvider')
  }
  return context
}
