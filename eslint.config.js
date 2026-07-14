// @ts-check
import baseConfig from '@control-contable/config/eslint'

/** @type {import("eslint").Linter.Config[]} */
const config = [
  ...baseConfig,
  {
    ignores: ['**/node_modules/**', '**/.next/**', '**/dist/**', 'specs/**'],
  },
]

export default config
