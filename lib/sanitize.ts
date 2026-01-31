/**
 * Sanitization utilities for user-submitted content.
 * Use these to prevent XSS and injection attacks.
 */

/**
 * Escapes HTML entities in a string to prevent XSS.
 * Use this when you need to preserve the text but make it safe for rendering.
 */
export function escapeHtml(str: string): string {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Strips all HTML tags from a string.
 * Use this when you want to completely remove any HTML.
 */
export function stripHtmlTags(str: string): string {
    if (typeof str !== 'string') return '';
    return str.replace(/<[^>]*>/g, '');
}

/**
 * Sanitizes a string for safe database storage.
 * Strips HTML tags and trims whitespace.
 */
export function sanitizeText(str: string, maxLength = 1000): string {
    if (typeof str !== 'string') return '';
    return stripHtmlTags(str).trim().slice(0, maxLength);
}

/**
 * Validates and sanitizes a username.
 * Only allows lowercase letters, numbers, and underscores.
 */
export function sanitizeUsername(str: string): string {
    if (typeof str !== 'string') return '';
    return str
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 30);
}

/**
 * Sanitizes an email address (lowercase, trim).
 */
export function sanitizeEmail(str: string): string {
    if (typeof str !== 'string') return '';
    return str.toLowerCase().trim().slice(0, 254);
}
