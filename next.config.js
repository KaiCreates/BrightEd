/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: '*.firebasestorage.app',
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
        pathname: '/**',
      },
    ],
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
  async redirects() {
    return [
      {
        source: '/simulate',
        destination: '/lesson',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
