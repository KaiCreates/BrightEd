/**
 * Rate Limiting Implementation
 * 
 * Implements Security.md Section 14: Rate Limiting and Anti-Abuse
 * - Implement rate limiting on APIs and authentication routes
 * - Protects against brute-force and credential-stuffing attacks
 */

// ============================================================================
// Configuration
// ============================================================================

interface RateLimitConfig {
  windowMs: number;      // Time window in milliseconds
  maxRequests: number;   // Maximum requests per window
  keyPrefix?: string;    // Prefix for rate limit keys
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;   // Seconds until retry
}

interface RateLimitEntry {
  count: number;
  resetTime: number;     // Timestamp when window resets
  windowStart: number;   // Timestamp when window started
}

// Default configurations for different endpoints
export const rateLimitConfigs = {
  // Standard API requests
  default: {
    windowMs: 60 * 1000,        // 1 minute
    maxRequests: 60,            // 60 requests per minute
  },
  
  // Authentication endpoints (stricter)
  auth: {
    windowMs: 15 * 60 * 1000,   // 15 minutes
    maxRequests: 5,             // 5 attempts per 15 minutes
  },
  
  // User creation (strictest)
  createUser: {
    windowMs: 60 * 60 * 1000,   // 1 hour
    maxRequests: 3,             // 3 new users per hour per IP
  },
  
  // Password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000,   // 1 hour
    maxRequests: 3,             // 3 resets per hour per email
  },
  
  // Sensitive operations
  sensitive: {
    windowMs: 5 * 60 * 1000,    // 5 minutes
    maxRequests: 10,            // 10 operations per 5 minutes
  },
};

// ============================================================================
// In-Memory Store (Replace with Redis in production)
// ============================================================================

class RateLimitStore {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000);
  }

  get(key: string): RateLimitEntry | undefined {
    const entry = this.store.get(key);
    
    if (entry && Date.now() > entry.resetTime) {
      // Entry has expired, remove it
      this.store.delete(key);
      return undefined;
    }
    
    return entry;
  }

  set(key: string, entry: RateLimitEntry): void {
    this.store.set(key, entry);
  }

  increment(key: string): RateLimitEntry {
    const existing = this.get(key);
    const now = Date.now();
    
    if (existing) {
      existing.count++;
      this.set(key, existing);
      return existing;
    }
    
    // Create new entry
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now,
      windowStart: now,
    };
    
    this.set(key, newEntry);
    return newEntry;
  }

  reset(key: string): void {
    this.store.delete(key);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// Global store instance
const rateLimitStore = new RateLimitStore();

// ============================================================================
// Rate Limiter Class
// ============================================================================

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = {
      keyPrefix: 'rl:',
      ...config,
    };
  }

  /**
   * Check if request is within rate limit
   * 
   * @param identifier - Unique identifier (IP, user ID, etc.)
   * @returns Rate limit check result
   */
  check(identifier: string): RateLimitResult {
    const key = `${this.config.keyPrefix}${identifier}`;
    const now = Date.now();
    
    let entry = rateLimitStore.get(key);
    
    // If no entry or window has expired, create new window
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        windowStart: now,
        resetTime: now + this.config.windowMs,
      };
    }
    
    const remaining = Math.max(0, this.config.maxRequests - entry.count);
    const allowed = entry.count < this.config.maxRequests;
    
    return {
      allowed,
      limit: this.config.maxRequests,
      remaining,
      resetTime: new Date(entry.resetTime),
      retryAfter: allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  /**
   * Increment counter and check limit
   * Use this when request is being processed
   * 
   * @param identifier - Unique identifier
   * @returns Updated rate limit result
   */
  consume(identifier: string): RateLimitResult {
    const key = `${this.config.keyPrefix}${identifier}`;
    const now = Date.now();
    
    let entry = rateLimitStore.get(key);
    
    // If no entry or window has expired, create new window
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        windowStart: now,
        resetTime: now + this.config.windowMs,
      };
    }
    
    // Increment count
    entry.count++;
    rateLimitStore.set(key, entry);
    
    const remaining = Math.max(0, this.config.maxRequests - entry.count);
    const allowed = entry.count <= this.config.maxRequests;
    
    return {
      allowed,
      limit: this.config.maxRequests,
      remaining,
      resetTime: new Date(entry.resetTime),
      retryAfter: allowed ? undefined : Math.ceil((entry.resetTime - now) / 1000),
    };
  }

  /**
   * Reset rate limit for an identifier
   * Useful for admin operations or successful actions
   * 
   * @param identifier - Unique identifier
   */
  reset(identifier: string): void {
    const key = `${this.config.keyPrefix}${identifier}`;
    rateLimitStore.reset(key);
  }

  /**
   * Get rate limit headers for response
   */
  getHeaders(result: RateLimitResult): Record<string, string> {
    return {
      'X-RateLimit-Limit': String(result.limit),
      'X-RateLimit-Remaining': String(result.remaining),
      'X-RateLimit-Reset': String(Math.floor(result.resetTime.getTime() / 1000)),
      ...(result.retryAfter ? { 'Retry-After': String(result.retryAfter) } : {}),
    };
  }
}

// ============================================================================
// Pre-configured Rate Limiters
// ============================================================================

export const rateLimiters = {
  default: new RateLimiter(rateLimitConfigs.default),
  auth: new RateLimiter(rateLimitConfigs.auth),
  createUser: new RateLimiter(rateLimitConfigs.createUser),
  passwordReset: new RateLimiter(rateLimitConfigs.passwordReset),
  sensitive: new RateLimiter(rateLimitConfigs.sensitive),
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate rate limit key from request
 * 
 * @param request - HTTP request
 * @param identifier - Optional additional identifier (user ID, etc.)
 * @returns Rate limit key
 */
export function getRateLimitKey(
  request: Request,
  identifier?: string
): string {
  // Get IP address
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             'unknown';
  
  if (identifier) {
    return `${ip}:${identifier}`;
  }
  
  return ip;
}

/**
 * Check rate limit for API route
 * Convenience function for API route handlers
 * 
 * @param request - HTTP request
 * @param type - Type of rate limit to apply
 * @param identifier - Optional additional identifier
 * @returns Rate limit result
 */
export function checkRateLimit(
  request: Request,
  type: keyof typeof rateLimitConfigs = 'default',
  identifier?: string
): RateLimitResult {
  const key = getRateLimitKey(request, identifier);
  const limiter = rateLimiters[type];
  return limiter.consume(key);
}

/**
 * Create rate limit middleware response
 * Returns 429 response if rate limit exceeded
 * 
 * @param result - Rate limit result
 * @returns Response if rate limited, null if allowed
 */
export function createRateLimitResponse(result: RateLimitResult): Response | null {
  if (result.allowed) {
    return null;
  }

  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-RateLimit-Limit': String(result.limit),
    'X-RateLimit-Remaining': '0',
    'X-RateLimit-Reset': String(Math.floor(result.resetTime.getTime() / 1000)),
    'Retry-After': String(result.retryAfter || 60),
  });

  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers,
    }
  );
}

// ============================================================================
// Decorator for API Routes (App Router)
// ============================================================================

export interface WithRateLimitOptions {
  type?: keyof typeof rateLimitConfigs;
  identifier?: (request: Request) => string;
  skipSuccessfulRequests?: boolean;
}

/**
 * Higher-order function to wrap API handlers with rate limiting
 * 
 * @param handler - API route handler
 * @param options - Rate limit options
 * @returns Wrapped handler with rate limiting
 */
export function withRateLimit(
  handler: (request: Request) => Promise<Response> | Response,
  options: WithRateLimitOptions = {}
): (request: Request) => Promise<Response> {
  const { type = 'default', identifier } = options;
  
  return async (request: Request): Promise<Response> => {
    const key = identifier ? identifier(request) : getRateLimitKey(request);
    const limiter = rateLimiters[type];
    
    const result = limiter.check(key);
    
    if (!result.allowed) {
      return createRateLimitResponse(result)!;
    }
    
    // Consume the request
    limiter.consume(key);
    
    // Execute handler
    const response = await handler(request);
    
    // Add rate limit headers to successful response
    if (response.status !== 429) {
      const headers = limiter.getHeaders(result);
      Object.entries(headers).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
    }
    
    return response;
  };
}
