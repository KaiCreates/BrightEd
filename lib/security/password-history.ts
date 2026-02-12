/**
 * Password History Management
 * 
 * Implements security best practices:
 * - Prevent password reuse
 * - Enforce password history retention
 * - Track password changes securely
 */

import { getFirebaseDb } from '@/lib/firebase';
import { doc, updateDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { createHash } from 'crypto';

// ============================================================================
// Configuration
// ============================================================================

export const PASSWORD_HISTORY_CONFIG = {
  MAX_HISTORY: 5,
  RETENTION_DAYS: 365,
  MIN_HISTORY_AGE_DAYS: 90
};

// ============================================================================
// Type Definitions
// ============================================================================

export interface PasswordHistoryEntry {
  hash: string;
  salt: string;
  changedAt: string;
  expiresAt: string;
}

export interface PasswordChangeResult {
  success: boolean;
  error?: string;
  historyLength: number;
}

export function isSuccess(result: PasswordChangeResult): result is { success: true; historyLength: number } {
  return result.success;
}

// ============================================================================
// Hashing Functions
// ============================================================================

/**
 * Generate a random salt for password hashing
 */
function generateSalt(length: number = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let salt = '';
  for (let i = 0; i < length; i++) {
    salt += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return salt;
}

/**
 * Hash password with salt using SHA-256
 * Note: In production, use bcrypt, scrypt, or argon2 for better security
 */
function hashPassword(password: string, salt: string): string {
  return createHash('sha256')
    .update(password + salt)
    .digest('hex');
}

/**
 * Verify password against hash
 */
function verifyPassword(password: string, hash: string, salt: string): boolean {
  return hashPassword(password, salt) === hash;
}

// ============================================================================
// Password History Functions
// ============================================================================

/**
 * Check if a password is in the user's history
 */
export async function checkPasswordHistory(
  userId: string,
  password: string
): Promise<PasswordChangeResult> {
  try {
    const db = getFirebaseDb();
    if (!db) {
      return { success: false, error: 'Database not initialized', historyLength: 0 };
    }

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { success: true, historyLength: 0 };
    }

    const data = userSnap.data();
    const passwordHistory = data?.passwordHistory as PasswordHistoryEntry[] || [];

    if (passwordHistory.length === 0) {
      return { success: true, historyLength: 0 };
    }

    // Check against recent passwords
    const recentHistory = passwordHistory.slice(0, PASSWORD_HISTORY_CONFIG.MAX_HISTORY);

    for (const entry of recentHistory) {
      if (verifyPassword(password, entry.hash, entry.salt)) {
        return { success: false, error: 'Password has been used recently', historyLength: 0 };
      }
    }

    return { success: true, historyLength: passwordHistory.length };
  } catch (error) {
    console.error('Error checking password history:', error);
    return { success: false, error: 'Failed to check password history', historyLength: 0 };
  }
}

/**
 * Add a password to the user's history
 */
export async function addPasswordToHistory(
  userId: string,
  password: string
): Promise<PasswordChangeResult> {
  try {
    const db = getFirebaseDb();
    if (!db) {
      return { success: false, error: 'Database not initialized', historyLength: 0 };
    }

    // Generate salt and hash
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    const now = new Date();
    const expiresAt = new Date(
      now.getTime() + PASSWORD_HISTORY_CONFIG.RETENTION_DAYS * 24 * 60 * 60 * 1000
    );

    const newEntry: PasswordHistoryEntry = {
      hash: passwordHash,
      salt: salt,
      changedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    const userRef = doc(db, 'users', userId);

    // Update user document with new password info and history
    await updateDoc(userRef, {
      passwordLastChanged: now.toISOString(),
      passwordHistory: arrayUnion(newEntry)
    });

    // Clean up old entries
    await cleanupOldPasswordHistory(userId);

    return { success: true, error: undefined, historyLength: 1 };
  } catch (error) {
    console.error('Error adding password to history:', error);
    return { success: false, error: 'Failed to update password history', historyLength: 0 };
  }
}

/**
 * Clean up old password history entries
 */
export async function cleanupOldPasswordHistory(userId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    if (!db) return;

    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) return;

    const data = userSnap.data();
    const passwordHistory = data?.passwordHistory as PasswordHistoryEntry[] || [];

    const now = new Date();

    // Filter out expired entries
    const validHistory = passwordHistory.filter(entry => {
      return new Date(entry.expiresAt) > now;
    });

    // Keep only the most recent MAX_HISTORY entries
    const recentHistory = validHistory.slice(0, PASSWORD_HISTORY_CONFIG.MAX_HISTORY);

    if (recentHistory.length < passwordHistory.length) {
      await updateDoc(userRef, {
        passwordHistory: recentHistory
      });
    }
  } catch (error) {
    console.error('Error cleaning up password history:', error);
  }
}

/**
 * Verify a new password meets requirements
 */
export function validateNewPassword(
  password: string,
  confirmPassword: string
): { valid: boolean; error?: string } {
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match' };
  }

  // Check for uppercase
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }

  // Check for lowercase
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }

  return { valid: true };
}

// ============================================================================
// Export for use in auth flows
// ============================================================================

export interface PasswordChangeContext {
  userId: string;
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Change password with history tracking
 * This should be called from the settings page
 */
export async function changePasswordWithHistory(
  context: PasswordChangeContext
): Promise<PasswordChangeResult> {
  const { userId, newPassword, confirmPassword } = context;

  // Validate new password
  const validation = validateNewPassword(newPassword, confirmPassword);
  if (!validation.valid) {
    return { success: false, error: validation.error, historyLength: 0 };
  }

  // TODO: Verify current password against Firebase Auth
  // This require server-side verification for security
  // For now, assume Firebase Auth handles this

  // Add new password to history
  return await addPasswordToHistory(userId, newPassword);
}
