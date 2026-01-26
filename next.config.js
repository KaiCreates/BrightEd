/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    formats: ['image/avif', 'image/webp'],
  },
  webpack: (config, { isServer }) => {
    config.watchOptions = {
      ...(config.watchOptions || {}),
      ignored: [
        '**/node_modules/**',
        '**/.next/**',
        '**/pagefile.sys',
        '**/hiberfil.sys',
        '**/dumpstack.log.tmp',
        'C:/pagefile.sys',
        'C:/hiberfil.sys',
        'C:/dumpstack.log.tmp'
      ],
    };
    return config
  },
}

module.exports = nextConfig
