/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.watchOptions = {
        ignored: [
          '**/node_modules/**',
          '**/.next/**',
          'C:/pagefile.sys',
          'C:/hiberfil.sys',
          'C:/dumpstack.log.tmp'
        ],
      }
    }
    return config
  },
}

module.exports = nextConfig
