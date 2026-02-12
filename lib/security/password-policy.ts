/**
 * Password Policy Configuration
 * 
 * Centralized password security settings
 */

export const PASSWORD_POLICY = {
  // Minimum password length
  MIN_LENGTH: 8,
  
  // Maximum password length
  MAX_LENGTH: 128,
  
  // Character requirements
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true,
  
  // Special characters allowed
  SPECIAL_CHARS: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  
  // Password history settings
  HISTORY: {
    // Number of previous passwords to track
    MAX_HISTORY: 5,
    
    // How long to keep history (in days)
    RETENTION_DAYS: 365,
    
    // Minimum time between password changes (in days)
    MIN_AGE_DAYS: 1
  },
  
  // Account lockout settings
  LOCKOUT: {
    // Failed attempts before lockout
    MAX_ATTEMPTS: 5,
    
    // Lockout duration (in minutes)
    DURATION_MINUTES: 30
  }
};

/**
 * Validate password against policy
 */
export function validatePassword(password: string): { 
  valid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];
  
  if (password.length < PASSWORD_POLICY.MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.MIN_LENGTH} characters`);
  }
  
  if (password.length > PASSWORD_POLICY.MAX_LENGTH) {
    errors.push(`Password must not exceed ${PASSWORD_POLICY.MAX_LENGTH} characters`);
  }
  
  if (PASSWORD_POLICY.REQUIRE_UPPERCASE && !/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (PASSWORD_POLICY.REQUIRE_LOWERCASE && !/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (PASSWORD_POLICY.REQUIRE_NUMBER && !/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (PASSWORD_POLICY.REQUIRE_SPECIAL && !/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get password strength score (0-4)
 */
export function getPasswordStrength(password: string): number {
  let score = 0;
  
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) score++;
  
  return Math.min(4, Math.floor(score / 1.5));
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(score: number): string {
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return labels[score] || 'Unknown';
}

/**
 * Get password strength color
 */
export function getPasswordStrengthColor(score: number): string {
  const colors = [
    'text-red-500',
    'text-orange-500', 
    'text-yellow-500',
    'text-blue-500',
    'text-green-500'
  ];
  return colors[score] || 'text-gray-500';
}
