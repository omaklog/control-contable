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
      env: loadEnv('', __dirname, ''),
    },
  }),
)
