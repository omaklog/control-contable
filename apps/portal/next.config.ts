import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@control-contable/ui', '@control-contable/utils', '@control-contable/types'],
}

export default nextConfig
