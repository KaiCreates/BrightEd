/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  swcMinify: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
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
      {
        source: '/onboarding',
        destination: '/welcome',
        permanent: true,
      },
    ]
  },
  // Security Headers Configuration (Security.md Section 9)
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    // Content Security Policy directives
    const cspDirectives = {
      'default-src': ["'self'"],
      'script-src': isDevelopment 
        ? [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "https://*.firebaseio.com",
            "https://www.googletagmanager.com",
            "https://apis.google.com",
            "https://accounts.google.com",
            "https://www.gstatic.com",
          ]
        : [
            "'self'",
            "'unsafe-inline'",
            "https://*.firebaseio.com",
            "https://www.googletagmanager.com",
            "https://apis.google.com",
            "https://accounts.google.com",
            "https://www.gstatic.com",
          ],
      'script-src-elem': isDevelopment
        ? [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "https://*.firebaseio.com",
            "https://www.googletagmanager.com",
            "https://apis.google.com",
            "https://accounts.google.com",
            "https://www.gstatic.com",
          ]
        : [
            "'self'",
            "'unsafe-inline'",
            "https://*.firebaseio.com",
            "https://www.googletagmanager.com",
            "https://apis.google.com",
            "https://accounts.google.com",
            "https://www.gstatic.com",
          ],
      'style-src': ["'self'", "'unsafe-inline'"],
      'img-src': ["'self'", "data:", "https:", "blob:"],
      'font-src': ["'self'", "https://fonts.gstatic.com"],
      'connect-src': [
        "'self'", 
        "https://*.googleapis.com",
        "https://*.firebaseio.com",
        "wss://*.firebaseio.com",
        "https://www.google-analytics.com",
        "https://www.googletagmanager.com",
        "https://api.dicebear.com",
        isDevelopment ? "ws://localhost:*" : ""
      ].filter(Boolean),
      'frame-src': [
        "'self'",
        "https://*.firebaseapp.com",
        "https://*.web.app",
        "https://accounts.google.com",
      ],
      'object-src': ["'none'"],
      'base-uri': ["'self'"],
      'form-action': ["'self'"],
      'frame-ancestors': ["'none'"],
      'worker-src': ["'self'", "blob:"],
      'manifest-src': ["'self'"],
      'media-src': ["'self'", "https://firebasestorage.googleapis.com"],
      'upgrade-insecure-requests': [],
    };

    const cspString = Object.entries(cspDirectives)
      .map(([key, values]) => {
        if (values.length === 0) return key;
        return `${key} ${values.join(' ')}`;
      })
      .join('; ');

    const cacheableExtensions = [
      'jpg',
      'jpeg',
      'gif',
      'png',
      'svg',
      'ico',
      'woff',
      'woff2',
      'ttf',
      'eot',
    ];

    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspString,
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), vr=()',
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin-allow-popups',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0',
          },
        ],
      },
      {
        // Allow caching for static assets
        source: '/_next/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      ...cacheableExtensions.map((ext) => ({
        // Allow caching for public assets
        source: `/:path*.${ext}`,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      })),
    ];
  },
}

module.exports = nextConfig
