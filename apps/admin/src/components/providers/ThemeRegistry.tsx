'use client'

import * as React from 'react'
import { ThemeProvider } from '@mui/material/styles'
import Box from '@mui/material/Box'
import CssBaseline from '@mui/material/CssBaseline'
import { ColorModeProvider, darkTheme, lightTheme, useColorMode } from '@control-contable/ui'
import EmotionCacheProvider from './EmotionCacheProvider'

function ThemedContent({ children }: { children: React.ReactNode }) {
  const { mode } = useColorMode()
  return (
    <ThemeProvider theme={mode === 'dark' ? darkTheme : lightTheme}>
      <CssBaseline />
      <Box sx={{ bgcolor: 'background.default', minHeight: '100vh' }}>{children}</Box>
    </ThemeProvider>
  )
}

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  return (
    <EmotionCacheProvider options={{ key: 'mui' }}>
      <ColorModeProvider>
        <ThemedContent>{children}</ThemedContent>
      </ColorModeProvider>
    </EmotionCacheProvider>
  )
}
