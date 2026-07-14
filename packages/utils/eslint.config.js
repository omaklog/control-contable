// @ts-check
import baseConfig from '@control-contable/config/eslint'

/** @type {import("eslint").Linter.Config[]} */
const config = [...baseConfig, { ignores: ['dist/**', 'node_modules/**'] }]

export default config
