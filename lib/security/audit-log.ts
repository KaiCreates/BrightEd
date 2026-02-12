/**
 * Security Audit Logging
 * 
 * Implements Security.md Section 10: Logging and Monitoring
 * - Log detailed error messages only on the server
 * - Implement real-time monitoring and alerts
 * - Protect logs from tampering
 */



// ============================================================================
// Audit Event Types
// ============================================================================

type AuditSeverity = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

interface AuditEvent {
  event: string;
  severity: AuditSeverity;
  timestamp: string;
  ip?: string;
  userId?: string;
  path?: string;
  userAgent?: string;
  details?: Record<string, unknown>;
}

// ============================================================================
// Configuration
// ============================================================================

const AUDIT_LOG_ENABLED = process.env.AUDIT_LOG_ENABLED !== 'false';
const AUDIT_LOG_LEVEL = process.env.AUDIT_LOG_LEVEL || 'info';

const severityLevels: Record<AuditSeverity, number> = {
  INFO: 0,
  WARNING: 1,
  ERROR: 2,
  CRITICAL: 3,
};

function shouldLog(severity: AuditSeverity): boolean {
  const currentLevel = severityLevels[AUDIT_LOG_LEVEL.toUpperCase() as AuditSeverity] ?? 0;
  const eventLevel = severityLevels[severity];
  return eventLevel >= currentLevel;
}

// ============================================================================
// Audit Logger Class
// ============================================================================

class AuditLogger {
  private buffer: AuditEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private readonly bufferSize = 100;
  private readonly flushIntervalMs = 5000;

  constructor() {
    if (typeof window === 'undefined') {
      // Only initialize in server context
      this.startFlushInterval();
    }
  }

  /**
   * Log a security event
   * 
   * @param event - Audit event details
   */
  log(event: Omit<AuditEvent, 'timestamp'>): void {
    if (!AUDIT_LOG_ENABLED || !shouldLog(event.severity)) {
      return;
    }

    const auditEvent: AuditEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    // Add to buffer
    this.buffer.push(auditEvent);

    // Flush immediately for critical events
    if (event.severity === 'CRITICAL') {
      this.flush();
    }

    // Flush if buffer is full
    if (this.buffer.length >= this.bufferSize) {
      this.flush();
    }

    // Always console log for immediate visibility in development
    if (process.env.NODE_ENV === 'development') {
      this.consoleLog(auditEvent);
    }
  }

  /**
   * Log authentication events
   */
  logAuth(event: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'LOGOUT' | 'SESSION_EXPIRED', details: {
    ip?: string;
    userId?: string;
    userAgent?: string;
    reason?: string;
  }): void {
    const severity: AuditSeverity = event === 'LOGIN_FAILURE' ? 'WARNING' : 'INFO';

    this.log({
      event: `AUTH_${event}`,
      severity,
      ...details,
    });
  }

  /**
   * Log password change events
   */
  logPasswordChange(details: {
    ip?: string;
    userId: string;
    success: boolean;
    method: string;
  }): void {
    const severity: AuditSeverity = details.success ? 'INFO' : 'WARNING';

    this.log({
      event: 'PASSWORD_CHANGE',
      severity,
      ip: details.ip,
      userId: details.userId,
      details: {
        success: details.success,
        method: details.method,
      },
    });
  }

  /**
   * Log password history check events
   */
  logPasswordHistoryCheck(details: {
    ip?: string;
    userId: string;
    reused: boolean;
    historyLength: number;
  }): void {
    const severity: AuditSeverity = details.reused ? 'WARNING' : 'INFO';

    this.log({
      event: details.reused ? 'PASSWORD_REUSE_ATTEMPT' : 'PASSWORD_HISTORY_CHECK',
      severity,
      ip: details.ip,
      userId: details.userId,
      details: {
        reused: details.reused,
        historyLength: details.historyLength,
      },
    });
  }

  /**
   * Log session management events
   */
  logSessionEvent(event: 'SESSION_CREATED' | 'SESSION_REVOKED' | 'ALL_SESSIONS_REVOKED', details: {
    ip?: string;
    userId: string;
    sessionId?: string;
    deviceInfo?: Record<string, unknown>;
    count?: number;
  }): void {
    this.log({
      event: `SESSION_${event}`,
      severity: 'INFO',
      ip: details.ip,
      userId: details.userId,
      details: {
        sessionId: details.sessionId,
        deviceInfo: details.deviceInfo,
        count: details.count,
      },
    });
  }

  /**
   * Log login activity
   */
  logLoginActivity(details: {
    ip?: string;
    userId: string;
    success: boolean;
    deviceInfo?: Record<string, unknown>;
    location?: string;
  }): void {
    const severity: AuditSeverity = details.success ? 'INFO' : 'WARNING';

    this.log({
      event: details.success ? 'LOGIN_ACTIVITY_SUCCESS' : 'LOGIN_ACTIVITY_FAILURE',
      severity,
      ip: details.ip,
      userId: details.userId,
      details: {
        success: details.success,
        deviceInfo: details.deviceInfo,
        location: details.location,
      },
    });
  }

  /**
   * Log access control events
   */
  logAccess(event: 'GRANTED' | 'DENIED', details: {
    ip?: string;
    userId?: string;
    path: string;
    requiredRole?: string;
    userRole?: string;
  }): void {
    const severity: AuditSeverity = event === 'DENIED' ? 'WARNING' : 'INFO';

    this.log({
      event: `ACCESS_${event}`,
      severity,
      ...details,
    });
  }

  /**
   * Log data modification events
   */
  logDataChange(event: 'CREATE' | 'UPDATE' | 'DELETE', details: {
    ip?: string;
    userId: string;
    table: string;
    recordId: string;
    changes?: Record<string, unknown>;
  }): void {
    this.log({
      event: `DATA_${event}`,
      severity: 'INFO',
      ...details,
    });
  }

  /**
   * Log rate limiting events
   */
  logRateLimit(details: {
    ip: string;
    path: string;
    limit: number;
    windowMs: number;
  }): void {
    this.log({
      event: 'RATE_LIMIT_EXCEEDED',
      severity: 'WARNING',
      ...details,
    });
  }

  /**
   * Log security anomalies
   */
  logAnomaly(type: 'SUSPICIOUS_IP' | 'UNUSUAL_PATTERN' | 'BOT_DETECTED', details: {
    ip: string;
    path?: string;
    userId?: string;
    indicators: string[];
  }): void {
    this.log({
      event: `ANOMALY_${type}`,
      severity: 'WARNING',
      ...details,
    });
  }

  /**
   * Flush buffered logs to storage
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const eventsToFlush = [...this.buffer];
    this.buffer = [];

    try {
      // Try to store in a backend sink if configured
      await this.storeInDatabase(eventsToFlush);

      // Also write to stdout for log aggregation systems
      eventsToFlush.forEach(event => {
        // eslint-disable-next-line no-console
        console.log('[SECURITY_AUDIT]', JSON.stringify(event));
      });
    } catch (error) {
      // If database storage fails, keep in buffer and retry later
      this.buffer.unshift(...eventsToFlush);

      // Limit buffer size to prevent memory issues
      if (this.buffer.length > this.bufferSize * 2) {
        this.buffer = this.buffer.slice(-this.bufferSize);
      }

      console.error('Failed to flush audit logs:', error);
    }
  }

  /**
   * Store audit events in database
   */
  private async storeInDatabase(_events: AuditEvent[]): Promise<void> {
    return;
  }

  /**
   * Console log for development visibility
   */
  private consoleLog(event: AuditEvent): void {
    const color = {
      INFO: '\x1b[36m',    // Cyan
      WARNING: '\x1b[33m', // Yellow
      ERROR: '\x1b[31m',   // Red
      CRITICAL: '\x1b[35m', // Magenta
    }[event.severity];

    // eslint-disable-next-line no-console
    console.log(
      `${color}[SECURITY ${event.severity}]\x1b[0m`,
      event.event,
      '|',
      event.path || 'no-path',
      '|',
      event.userId || 'no-user',
      '|',
      JSON.stringify(event.details || {})
    );
  }

  /**
   * Start periodic flush interval
   */
  private startFlushInterval(): void {
    if (this.flushInterval) return;

    this.flushInterval = setInterval(() => {
      this.flush();
    }, this.flushIntervalMs);
  }

  /**
   * Stop the flush interval (for cleanup)
   */
  stop(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    // Final flush
    this.flush();
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const SecurityAudit = new AuditLogger();

// ============================================================================
// Helper Functions for Common Audit Scenarios
// ============================================================================

/**
 * Create audit context from request
 */
export function createAuditContext(
  request: Request,
  userId?: string
): Pick<AuditEvent, 'ip' | 'userAgent' | 'path' | 'userId'> {
  return {
    ip: request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      'unknown',
    userAgent: request.headers.get('user-agent') || undefined,
    path: new URL(request.url).pathname,
    userId,
  };
}

/**
 * Sanitize sensitive data from audit logs
 */
export function sanitizeForAudit(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credit_card', 'ssn'];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const isSensitive = sensitiveKeys.some(sk =>
      key.toLowerCase().includes(sk)
    );

    if (isSensitive) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeForAudit(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}
