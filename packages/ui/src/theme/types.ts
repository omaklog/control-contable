export type ThemeMode = 'light' | 'dark'

export interface StatusColorTokens {
  positive: string
  positiveBg: string
  negative: string
  negativeBg: string
  neutral: string
  neutralBg: string
}

export interface SurfaceColorTokens {
  background: string
  paper: string
  divider: string
  hover: string
  selected: string
}

export interface ColorTokens {
  mode: ThemeMode
  primary: { main: string; light: string; dark: string; contrastText: string }
  secondary: { main: string; light: string; dark: string; contrastText: string }
  surface: SurfaceColorTokens
  status: StatusColorTokens
  text: { primary: string; secondary: string }
}

export interface TypographyTokens {
  fontFamilyGeneral: string
  fontFamilyMono: string
}

export type SpacingScale = number

export interface RadiusScale {
  standard: number
  large: number
  pill: number | string
}

export interface ShadowTokens {
  level1: string
  level2: string
}

export interface CustomThemeTokens {
  fontFamilyMono: string
  statusColors: StatusColorTokens
}

declare module '@mui/material/styles' {
  interface Theme {
    custom: CustomThemeTokens
  }
  interface ThemeOptions {
    custom?: CustomThemeTokens
  }
}
