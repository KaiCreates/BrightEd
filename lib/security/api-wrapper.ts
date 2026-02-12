/**
 * API Route Security Wrapper
 * 
 * Implements Security.md Sections:
 * - Section 1: Authentication
 * - Section 2: Middleware Protection
 * - Section 5: Error Handling
 * - Section 6: Input Validation
 * - Section 10: Logging and Monitoring
 * - Section 14: Rate Limiting
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { SecurityAudit } from './audit-log';
import { checkRateLimit, createRateLimitResponse } from './rate-limit';
import { validateInput } from './validation';
import { validateCsrfRequest } from './csrf';
import { verifyAuth } from '@/lib/auth-server';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface AuthContext {
  userId: string;
  userEmail: string;
  userRole: string;
  sessionId: string;
}

export interface ApiHandlerContext {
  request: NextRequest;
  auth?: AuthContext;
  params: Record<string, string>;
}

export type ApiHandler = (
  context: ApiHandlerContext
) => Promise<Response> | Response;

export interface ApiRouteConfig {
  requireAuth?: boolean;
  requiredRole?: string;
  rateLimit?: 'default' | 'auth' | 'createUser' | 'passwordReset' | 'sensitive';
  validateBody?: ZodSchema<unknown>;
  validateQuery?: ZodSchema<unknown>;
  csrf?: boolean;
}

// ============================================================================
// Error Response Helper
// ============================================================================

/**
 * Create standardized error response (Security.md Section 5)
 * 
 * @param status - HTTP status code
 * @param code - Error code for client handling
 * @param message - User-friendly error message
 * @param details - Optional error details (sanitized)
 * @returns NextResponse with error
 */
export function createErrorResponse(
  status: number,
  code: string,
  message: string,
  details?: Record<string, unknown>
): NextResponse {
  const response = NextResponse.json(
    {
      error: code,
      message,
      ...(details && Object.keys(details).length > 0 ? { details } : {}),
      timestamp: new Date().toISOString(),
    },
    { status }
  );

  // Add cache control for error responses
  response.headers.set('Cache-Control', 'no-store, private');

  return response;
}

/**
 * Create success response with security headers
 * 
 * @param data - Response data
 * @param status - HTTP status code (default: 200)
 * @returns NextResponse with data
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200
): NextResponse {
  const response = NextResponse.json(
    {
      success: true,
      data,
      timestamp: new Date().toISOString(),
    },
    { status }
  );

  // Add cache control headers
  response.headers.set('Cache-Control', 'private, max-age=0, no-cache');

  return response;
}

// ============================================================================
// Authentication Helpers
// ============================================================================

/**
 * Extract auth context from request
 * Validates session and returns user info
 * 
 * @param request - Next.js request
 * @returns Auth context or null if not authenticated
 */
async function extractAuthContext(request: NextRequest): Promise<AuthContext | null> {
  try {
    const decodedToken = await verifyAuth(request);
    const userRole = (decodedToken as { role?: string; userRole?: string }).role
      || (decodedToken as { role?: string; userRole?: string }).userRole
      || 'user';

    return {
      userId: decodedToken.uid,
      userEmail: decodedToken.email || '',
      userRole,
      sessionId: decodedToken.uid,
    };
  } catch (error) {
    console.error('Auth extraction error:', error);
    return null;
  }
}

/**
 * Check if user has required role
 * 
 * @param userRole - User's role
 * @param requiredRole - Required role for access
 * @returns Boolean indicating access granted
 */
function checkRoleAccess(userRole: string, requiredRole: string): boolean {
  const roleHierarchy: Record<string, string[]> = {
    admin: ['admin', 'user', 'guest'],
    user: ['user', 'guest'],
    guest: ['guest'],
  };

  return roleHierarchy[userRole]?.includes(requiredRole) ?? false;
}

// ============================================================================
// Main API Wrapper
// ============================================================================

/**
 * Create secure API route handler
 * Combines all security measures from Security.md
 * 
 * @param handler - API route handler function
 * @param config - Security configuration
 * @returns Wrapped handler with security enforcement
 */
export function withSecurity(
  handler: ApiHandler,
  config: ApiRouteConfig = {}
): (request: NextRequest, { params }: { params: Record<string, string> }) => Promise<Response> {
  return async (request: NextRequest, { params }: { params: Record<string, string> }): Promise<Response> => {
    const startTime = Date.now();
    const pathname = request.nextUrl.pathname;
    const ip = request.ip || request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';

    try {
      // ============================================================================
      // 1. Rate Limiting (Security.md Section 14)
      // ============================================================================

      if (config.rateLimit) {
        const rateLimitResult = checkRateLimit(request, config.rateLimit);

        if (!rateLimitResult.allowed) {
          SecurityAudit.logRateLimit({
            ip,
            path: pathname,
            limit: rateLimitResult.limit,
            windowMs: 0, // Would need to extract from config
          });

          return createRateLimitResponse(rateLimitResult)!;
        }
      }

      // ============================================================================
      // 2. CSRF Validation (Security.md Section 6)
      // ============================================================================

      if (config.csrf && !['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
        const csrfValidation = validateCsrfRequest(request);

        if (!csrfValidation.valid) {
          SecurityAudit.log({
            event: 'CSRF_VALIDATION_FAILED',
            severity: 'WARNING',
            ip,
            path: pathname,
            details: { error: csrfValidation.error },
          });

          return createErrorResponse(
            403,
            'CSRF_ERROR',
            'Invalid or missing CSRF token'
          );
        }
      }

      // ============================================================================
      // 3. Authentication (Security.md Section 1 & 2)
      // ============================================================================

      let auth: AuthContext | undefined;

      if (config.requireAuth) {
        auth = (await extractAuthContext(request)) ?? undefined;

        if (!auth) {
          SecurityAudit.log({
            event: 'UNAUTHORIZED_API_ACCESS',
            severity: 'WARNING',
            ip,
            path: pathname,
            details: { reason: 'No valid session' },
          });

          return createErrorResponse(
            401,
            'UNAUTHORIZED',
            'Authentication required'
          );
        }

        // Role-based access control
        if (config.requiredRole && !checkRoleAccess(auth.userRole, config.requiredRole)) {
          SecurityAudit.log({
            event: 'FORBIDDEN_API_ACCESS',
            severity: 'WARNING',
            ip,
            path: pathname,
            userId: auth.userId,
            details: { userRole: auth.userRole, requiredRole: config.requiredRole },
          });

          return createErrorResponse(
            403,
            'FORBIDDEN',
            'Insufficient permissions'
          );
        }
      }

      // ============================================================================
      // 4. Input Validation (Security.md Section 6)
      // ============================================================================

      // Validate query parameters
      if (config.validateQuery) {
        const queryParams = Object.fromEntries(request.nextUrl.searchParams.entries());
        const validation = validateInput(queryParams, config.validateQuery, { sanitize: true });

        if (!validation.success) {
          SecurityAudit.log({
            event: 'INPUT_VALIDATION_FAILED',
            severity: 'INFO',
            ip,
            path: pathname,
            userId: auth?.userId,
            details: { errors: validation.errors },
          });

          return createErrorResponse(
            400,
            'VALIDATION_ERROR',
            'Invalid query parameters',
            { errors: validation.errors }
          );
        }
      }

      // Validate request body
      let validatedBody: unknown;

      if (config.validateBody && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
        try {
          const body = await request.json();
          const validation = validateInput(body, config.validateBody, { sanitize: true });

          if (!validation.success) {
            SecurityAudit.log({
              event: 'INPUT_VALIDATION_FAILED',
              severity: 'INFO',
              ip,
              path: pathname,
              userId: auth?.userId,
              details: { errors: validation.errors },
            });

            return createErrorResponse(
              400,
              'VALIDATION_ERROR',
              'Invalid request body',
              { errors: validation.errors }
            );
          }

          validatedBody = validation.data;
        } catch {
          return createErrorResponse(
            400,
            'INVALID_JSON',
            'Invalid JSON in request body'
          );
        }
      }

      // ============================================================================
      // 5. Execute Handler
      // ============================================================================

      const context: ApiHandlerContext = {
        request,
        auth,
        params,
      };

      // Add validated body to request for handler to access
      if (validatedBody !== undefined) {
        (request as unknown as { validatedBody: unknown }).validatedBody = validatedBody;
      }

      const response = await handler(context);

      // ============================================================================
      // 6. Post-Processing
      // ============================================================================

      // Log successful request
      const duration = Date.now() - startTime;

      SecurityAudit.log({
        event: 'API_REQUEST_SUCCESS',
        severity: 'INFO',
        ip,
        path: pathname,
        userId: auth?.userId,
        details: {
          method: request.method,
          status: response.status,
          duration,
        },
      });

      return response;

    } catch (error) {
      // ============================================================================
      // 7. Error Handling (Security.md Section 5)
      // ============================================================================

      const duration = Date.now() - startTime;

      // Log error (with sanitized details)
      SecurityAudit.log({
        event: 'API_REQUEST_ERROR',
        severity: 'ERROR',
        ip,
        path: pathname,
        details: {
          method: request.method,
          duration,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      // Determine error response based on environment
      const isDevelopment = process.env.NODE_ENV === 'development';

      // Log detailed error on server only
      console.error('API Error:', error);

      return createErrorResponse(
        500,
        'INTERNAL_ERROR',
        isDevelopment
          ? error instanceof Error ? error.message : 'Internal server error'
          : 'Internal server error'
      );
    }
  };
}

// ============================================================================
// Pre-configured Security Wrappers
// ============================================================================

/**
 * Public API route - no auth required, standard rate limiting
 */
export function publicApi(handler: ApiHandler): ReturnType<typeof withSecurity> {
  return withSecurity(handler, {
    rateLimit: 'default',
  });
}

/**
 * Protected API route - requires authentication
 */
export function protectedApi(handler: ApiHandler): ReturnType<typeof withSecurity> {
  return withSecurity(handler, {
    requireAuth: true,
    rateLimit: 'default',
    csrf: true,
  });
}

/**
 * Admin API route - requires admin role
 */
export function adminApi(handler: ApiHandler): ReturnType<typeof withSecurity> {
  return withSecurity(handler, {
    requireAuth: true,
    requiredRole: 'admin',
    rateLimit: 'sensitive',
    csrf: true,
  });
}

/**
 * Auth API route - for login/signup with strict rate limiting
 */
export function authApi(handler: ApiHandler): ReturnType<typeof withSecurity> {
  return withSecurity(handler, {
    rateLimit: 'auth',
    csrf: true,
  });
}

// ============================================================================
// Convenience Functions for Route Files
// ============================================================================

/**
 * Create GET handler with security
 */
export function secureGet(
  handler: ApiHandler,
  config: Omit<ApiRouteConfig, 'csrf'> = {}
): ReturnType<typeof withSecurity> {
  return withSecurity(handler, { ...config, csrf: false });
}

/**
 * Create POST handler with security
 */
export function securePost(
  handler: ApiHandler,
  config: ApiRouteConfig = {}
): ReturnType<typeof withSecurity> {
  return withSecurity(handler, { ...config, csrf: config.csrf ?? true });
}

/**
 * Create PUT handler with security
 */
export function securePut(
  handler: ApiHandler,
  config: ApiRouteConfig = {}
): ReturnType<typeof withSecurity> {
  return withSecurity(handler, { ...config, csrf: config.csrf ?? true });
}

/**
 * Create PATCH handler with security
 */
export function securePatch(
  handler: ApiHandler,
  config: ApiRouteConfig = {}
): ReturnType<typeof withSecurity> {
  return withSecurity(handler, { ...config, csrf: config.csrf ?? true });
}

/**
 * Create DELETE handler with security
 */
export function secureDelete(
  handler: ApiHandler,
  config: ApiRouteConfig = {}
): ReturnType<typeof withSecurity> {
  return withSecurity(handler, { ...config, csrf: config.csrf ?? true });
}
