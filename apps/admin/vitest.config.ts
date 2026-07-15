import path from 'node:path'

import baseConfig from '@control-contable/config/vitest/base'
import { loadEnv } from 'vite'
import { mergeConfig, defineConfig } from 'vitest/config'

export default mergeConfig(
  baseConfig,
  defineConfig({
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      // env.ts valida process.env.NEXT_PUBLIC_* al importarse — cargar
      // .env.local para que las pruebas puedan importar módulos que dependen
      // de él (p. ej. Server Actions vía @/lib/env), igual que hace Next.js.
      env: loadEnv('', __dirname, ''),
    },
  }),
)
