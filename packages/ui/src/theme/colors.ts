import type { ColorTokens } from './types'

/**
 * design-system.md §1.1 — Color, modo claro.
 * Regla de estados (no semáforo clásico): azul = positivo/activo, rojo = negativo/vencido,
 * gris = neutro/inactivo. Nunca verde como color de estado.
 */
export const lightColors: ColorTokens = {
  mode: 'light',
  primary: {
    main: '#1e293b',
    light: '#334155',
    dark: '#0f172a',
    contrastText: '#ffffff',
  },
  secondary: {
    main: '#3b82f6',
    light: '#60a5fa',
    dark: '#1d4ed8',
    contrastText: '#ffffff',
  },
  surface: {
    background: '#f8fafc',
    paper: '#ffffff',
    divider: '#e2e8f0',
    hover: '#f1f5f9',
    selected: '#eff6ff',
  },
  status: {
    positive: '#1d4ed8',
    positiveBg: '#dbeafe',
    negative: '#b91c1c',
    negativeBg: '#fee2e2',
    neutral: '#475569',
    neutralBg: '#e2e8f0',
  },
  text: {
    primary: '#0f172a',
    secondary: '#475569',
  },
}

/**
 * design-system.md §1.2 — Color, modo oscuro. Mismo mapeo semántico que en claro
 * (regla de paridad): solo cambia el tono exacto, nunca el significado.
 */
export const darkColors: ColorTokens = {
  mode: 'dark',
  primary: {
    main: '#38bdf8',
    light: '#7dd3fc',
    dark: '#0ea5e9',
    contrastText: '#0f172a',
  },
  secondary: {
    main: '#38bdf8',
    light: '#7dd3fc',
    dark: '#0ea5e9',
    contrastText: '#0f172a',
  },
  surface: {
    background: '#0f172a',
    paper: '#1e293b',
    divider: '#334155',
    hover: '#334155',
    selected: '#334155',
  },
  status: {
    positive: '#7dd3fc',
    positiveBg: '#0c4a6e',
    negative: '#fca5a5',
    negativeBg: '#7f1d1d',
    neutral: '#cbd5e1',
    neutralBg: '#334155',
  },
  text: {
    primary: '#f8fafc',
    secondary: '#94a3b8',
  },
}
