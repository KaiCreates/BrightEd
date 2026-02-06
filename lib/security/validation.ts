/**
 * Input Validation Utilities
 * 
 * Implements Security.md Section 6: Input Validation
 * - Sanitise and validate all user input
 * - Prevent SQL injection, XSS, and other attacks
 */

import { z, ZodError, ZodSchema } from 'zod';

// ============================================================================
// Common Validation Schemas
// ============================================================================

// Email validation with strict rules
export const emailSchema = z
  .string()
  .min(5, 'Email must be at least 5 characters')
  .max(254, 'Email must not exceed 254 characters')
  .email('Invalid email format')
  .transform(val => val.toLowerCase().trim());

// Password validation with security requirements
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must not exceed 128 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'
  );

// Username validation
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must not exceed 30 characters')
  .regex(
    /^[a-zA-Z0-9_-]+$/,
    'Username can only contain letters, numbers, underscores, and hyphens'
  );

// UUID validation
export const uuidSchema = z
  .string()
  .uuid('Invalid UUID format');

// Slug validation for URL-safe strings
export const slugSchema = z
  .string()
  .min(1, 'Slug is required')
  .max(100, 'Slug must not exceed 100 characters')
  .regex(
    /^[a-z0-9-]+$/,
    'Slug can only contain lowercase letters, numbers, and hyphens'
  );

// Pagination parameters
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().max(50).optional(),
  order: z.enum(['asc', 'desc']).default('asc'),
});

// Search query validation
export const searchSchema = z.object({
  q: z.string().min(1).max(100).optional(),
  filters: z.record(z.string()).optional(),
});

// ============================================================================
// User-Related Schemas
// ============================================================================

export const userRegistrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  acceptTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions' }),
  }),
});

export const userLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().default(false),
});

export const userUpdateSchema = z.object({
  username: usernameSchema.optional(),
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  avatar: z.string().url().optional(),
});

export const passwordResetSchema = z.object({
  email: emailSchema,
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: passwordSchema,
  confirmPassword: z.string(),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// ============================================================================
// Content-Related Schemas
// ============================================================================

export const lessonProgressSchema = z.object({
  lessonId: uuidSchema,
  progress: z.number().min(0).max(100),
  completed: z.boolean().default(false),
  timeSpent: z.number().int().min(0).optional(),
});

export const achievementSchema = z.object({
  achievementId: uuidSchema,
  unlockedAt: z.string().datetime().optional(),
});

export const practicalSubmissionSchema = z.object({
  practicalId: uuidSchema,
  answers: z.array(z.object({
    questionId: uuidSchema,
    answer: z.union([z.string(), z.number(), z.boolean(), z.array(z.string())]),
  })),
  timeSpent: z.number().int().min(0).optional(),
});

// ============================================================================
// API Input Schemas
// ============================================================================

export const apiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.enum(['read', 'write', 'delete', 'admin'])).min(1),
  expiresIn: z.number().int().min(1).max(365).optional(), // days
});

export const webhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.string()).min(1),
  secret: z.string().min(32).optional(),
});

// ============================================================================
// Sanitization Utilities
// ============================================================================

/**
 * Sanitize string to prevent XSS
 * Removes potentially dangerous HTML tags and attributes
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and > to prevent HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitize HTML content (if rich text is needed)
 * Only allows specific safe HTML tags
 */
export function sanitizeHtml(input: string): string {
  const allowedTags = ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li'];
  
  // Remove script tags and their content
  let sanitized = input.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // Remove style tags and their content
  sanitized = sanitized.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  
  // Remove all tags except allowed ones
  const tagRegex = /<\/?([a-z][a-z0-9]*)[^>]*>/gi;
  sanitized = sanitized.replace(tagRegex, (match, tag) => {
    return allowedTags.includes(tag.toLowerCase()) ? match : '';
  });
  
  // Remove event attributes
  sanitized = sanitized.replace(/\s*on\w+=["'][^"']*["']/gi, '');
  
  return sanitized.trim();
}

/**
 * Escape special regex characters
 */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================================================
// Validation Functions
// ============================================================================

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: Array<{
    path: string;
    message: string;
  }>;
}

/**
 * Validate data against a Zod schema
 * Returns sanitized result with user-friendly error messages
 */
export function validateInput<T>(
  data: unknown,
  schema: ZodSchema<T>,
  options: { sanitize?: boolean } = {}
): ValidationResult<T> {
  try {
    const result = schema.parse(data);
    
    // Sanitize string fields if requested
    if (options.sanitize && typeof result === 'object' && result !== null) {
      const sanitized = sanitizeObject(result);
      return { success: true, data: sanitized as T };
    }
    
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
      }));
      
      return { success: false, errors };
    }
    
    // Unexpected error - don't expose details (Security.md Section 5)
    return {
      success: false,
      errors: [{ path: '', message: 'Validation failed' }],
    };
  }
}

/**
 * Async validation for database-dependent checks
 */
export async function validateAsync<T>(
  data: unknown,
  schema: ZodSchema<T>,
  asyncCheck?: (data: T) => Promise<boolean>
): Promise<ValidationResult<T>> {
  const result = validateInput(data, schema);
  
  if (!result.success) {
    return result;
  }
  
  if (asyncCheck && result.data) {
    const isValid = await asyncCheck(result.data);
    if (!isValid) {
      return {
        success: false,
        errors: [{ path: '', message: 'Validation failed' }],
      };
    }
  }
  
  return result;
}

// ============================================================================
// Helper Functions
// ============================================================================

function sanitizeObject(obj: object): object {
  const result: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      result[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else {
      result[key] = value;
    }
  }
  
  return result;
}

// ============================================================================
// Query Parameter Validation
// ============================================================================

/**
 * Validate and sanitize URL query parameters
 */
export function validateQueryParams(
  searchParams: URLSearchParams,
  allowedParams: string[]
): Record<string, string> {
  const params: Record<string, string> = {};
  
  for (const key of allowedParams) {
    const value = searchParams.get(key);
    if (value !== null) {
      // Sanitize the value
      params[key] = sanitizeString(value);
    }
  }
  
  return params;
}

/**
 * Create a schema for query parameters
 */
export function createQuerySchema<T extends Record<string, ZodSchema<unknown>>>(
  shape: T
) {
  return z.object(shape).partial();
}

// Export all schemas for use in API routes
export const schemas = {
  email: emailSchema,
  password: passwordSchema,
  username: usernameSchema,
  uuid: uuidSchema,
  slug: slugSchema,
  pagination: paginationSchema,
  search: searchSchema,
  userRegistration: userRegistrationSchema,
  userLogin: userLoginSchema,
  userUpdate: userUpdateSchema,
  passwordReset: passwordResetSchema,
  passwordChange: passwordChangeSchema,
  lessonProgress: lessonProgressSchema,
  achievement: achievementSchema,
  practicalSubmission: practicalSubmissionSchema,
  apiKey: apiKeySchema,
  webhook: webhookSchema,
};
