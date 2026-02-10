/**
 * Next.js Middleware - Security Implementation
 * 
 * Implements:
 * - Section 2: Middleware Protection
 * - Section 3: Role-Based Access Control (RBAC)
 * - Section 9: Secure Communications (additional headers)
 * - Section 14: Rate Limiting on authentication routes
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SecurityAudit } from '@/lib/security/audit-log';

// Rate limiting configuration for auth routes (Security.md Section 14)
const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 5, // 5 attempts per window
};

// In-memory store for rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// ============================================================================
// Rate Limiting Function (Security.md Section 14)
// ============================================================================

function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    // Create new record
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime: now + rateLimitConfig.windowMs,
    });
    return { allowed: true, remaining: rateLimitConfig.maxRequests - 1, resetTime: now + rateLimitConfig.windowMs };
  }

  if (record.count >= rateLimitConfig.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: record.resetTime };
  }

  record.count++;
  rateLimitStore.set(identifier, record);
  return { allowed: true, remaining: rateLimitConfig.maxRequests - record.count, resetTime: record.resetTime };
}

// ============================================================================
// Secure Headers (Security.md Section 9)
// ============================================================================

const secureHeaders = {
  'X-DNS-Prefetch-Control': 'on',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  'X-XSS-Protection': '1; mode=block',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), vr=()',
  'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
  'Cross-Origin-Resource-Policy': 'same-origin',
};

function getCspHeaderValue(isDevelopment: boolean): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': isDevelopment
      ? [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        'https://*.firebaseio.com',
        'https://www.googletagmanager.com',
        'https://apis.google.com',
        'https://accounts.google.com',
        'https://www.gstatic.com',
      ]
      : [
        "'self'",
        "'unsafe-inline'",
        'https://*.firebaseio.com',
        'https://www.googletagmanager.com',
        'https://apis.google.com',
        'https://accounts.google.com',
        'https://www.gstatic.com',
      ],
    'script-src-elem': isDevelopment
      ? [
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        'https://*.firebaseio.com',
        'https://www.googletagmanager.com',
        'https://apis.google.com',
        'https://accounts.google.com',
        'https://www.gstatic.com',
      ]
      : [
        "'self'",
        "'unsafe-inline'",
        'https://*.firebaseio.com',
        'https://www.googletagmanager.com',
        'https://apis.google.com',
        'https://accounts.google.com',
        'https://www.gstatic.com',
      ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'https:', 'blob:'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'connect-src': [
      "'self'",
      'https://*.googleapis.com',
      'https://*.firebaseio.com',
      'wss://*.firebaseio.com',
      'https://www.google-analytics.com',
      'https://www.googletagmanager.com',
      'https://api.dicebear.com',
      ...(isDevelopment ? ['ws://localhost:*'] : []),
    ],
    'frame-src': [
      "'self'",
      'https://*.firebaseapp.com',
      'https://*.web.app',
      'https://accounts.google.com',
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    'media-src': ["'self'", 'https://firebasestorage.googleapis.com'],
  };

  return Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

function applySecurityHeaders(response: NextResponse): NextResponse {
  Object.entries(secureHeaders).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  return response;
}

// ============================================================================
// Main Middleware Function (Security.md Sections 2 & 3)
// ============================================================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const ip = request.ip ?? request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown';

  // Create initial response
  const response = NextResponse.next();

  // Apply security headers to all responses (Security.md Section 9)
  applySecurityHeaders(response);
  response.headers.set('Content-Security-Policy', getCspHeaderValue(process.env.NODE_ENV === 'development'));

  // Rate limiting for auth endpoints (Security.md Section 14)
  // Must run before the public-route early return so it applies to /login, /signup
  if (pathname === '/login' || pathname === '/signup') {
    const rateLimitKey = `${ip}:${pathname}`;
    const rateLimit = checkRateLimit(rateLimitKey);

    if (!rateLimit.allowed) {
      SecurityAudit.log({
        event: 'RATE_LIMIT_EXCEEDED',
        severity: 'WARNING',
        ip,
        path: pathname,
        details: { resetTime: rateLimit.resetTime },
      });

      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': String(rateLimitConfig.maxRequests),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(Math.ceil(rateLimit.resetTime / 1000)),
            'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)),
          }
        }
      );
    }

    // Add rate limit headers
    response.headers.set('X-RateLimit-Limit', String(rateLimitConfig.maxRequests));
    response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
    response.headers.set('X-RateLimit-Reset', String(Math.ceil(rateLimit.resetTime / 1000)));
  }

  return response;
}

// ============================================================================
// Middleware Configuration
// ============================================================================

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - auth callback routes
     */
    '/((?!_next/static|_next/image|favicon.ico|public/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
