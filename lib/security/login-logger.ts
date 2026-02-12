/**
 * Login Activity Logger
 * 
 * Tracks and logs all security-related events:
 * - Login attempts (success/failure)
 * - Logout events
 * - Password changes
 * - Session events
 * - Security anomalies
 */

import { getFirebaseDb } from '@/lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
  deleteDoc
} from 'firebase/firestore';

// ============================================================================
// Type Definitions
// ============================================================================

export type SecurityEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET_REQUEST'
  | 'SESSION_CREATED'
  | 'SESSION_REVOKED'
  | 'ALL_SESSIONS_REVOKED'
  | 'ACCOUNT_LOCKED'
  | 'SUSPICIOUS_ACTIVITY';

export type SeverityLevel = 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface SecurityLogEntry {
  id: string;
  userId: string;
  eventType: SecurityEventType;
  severity: SeverityLevel;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: DeviceInfo;
  location?: GeoLocation;
  success: boolean;
  details?: Record<string, unknown>;
  sessionId?: string;
}

export interface DeviceInfo {
  browser: string;
  os: string;
  device: string;
  isMobile: boolean;
}

export interface GeoLocation {
  country?: string;
  region?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface LogQueryOptions {
  limit?: number;
  startDate?: string;
  endDate?: string;
  eventTypes?: SecurityEventType[];
  severity?: SeverityLevel;
}

export interface LogResult {
  success: boolean;
  entries?: SecurityLogEntry[];
  error?: string;
  totalCount?: number;
}

// ============================================================================
// Configuration
// ============================================================================

const LOG_CONFIG = {
  COLLECTION_NAME: 'securityLog',
  MAX_ENTRIES_PER_USER: 1000,
  DEFAULT_QUERY_LIMIT: 50,
  RETENTION_DAYS: 90
};

// ============================================================================
// Device Detection (simplified)
// ============================================================================

function getDeviceInfo(userAgent: string): DeviceInfo {
  const ua = userAgent.toLowerCase();

  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';
  let isMobile = false;

  if (ua.includes('chrome')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari')) browser = 'Safari';
  else if (ua.includes('edge')) browser = 'Edge';
  else if (ua.includes('opera')) browser = 'Opera';

  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac')) os = 'macOS';
  else if (ua.includes('linux')) os = 'Linux';
  else if (ua.includes('android')) { os = 'Android'; isMobile = true; device = 'Mobile'; }
  else if (ua.includes('iphone') || ua.includes('ipad')) { os = 'iOS'; isMobile = true; device = ua.includes('ipad') ? 'Tablet' : 'Mobile'; }

  return { browser, os, device, isMobile };
}

// ============================================================================
// Login Logger Class
// ============================================================================

export class LoginLogger {
  private static instance: LoginLogger;

  private constructor() { }

  static getInstance(): LoginLogger {
    if (!LoginLogger.instance) {
      LoginLogger.instance = new LoginLogger();
    }
    return LoginLogger.instance;
  }

  /**
   * Generate unique log entry ID
   */
  private generateLogId(): string {
    return `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log a security event
   */
  async logEvent(
    userId: string,
    eventType: SecurityEventType,
    options: {
      success?: boolean;
      ipAddress?: string;
      userAgent?: string;
      sessionId?: string;
      details?: Record<string, unknown>;
      severity?: SeverityLevel;
    } = {}
  ): Promise<boolean> {
    try {
      const db = getFirebaseDb();
      if (!db) return false;

      const {
        success = true,
        ipAddress,
        userAgent,
        sessionId,
        details,
        severity = 'INFO'
      } = options;

      const logEntry: SecurityLogEntry = {
        id: this.generateLogId(),
        userId,
        eventType,
        severity,
        timestamp: new Date().toISOString(),
        ipAddress,
        userAgent,
        deviceInfo: userAgent ? getDeviceInfo(userAgent) : undefined,
        success,
        details,
        sessionId
      };

      // Store in Firestore
      const logRef = doc(db, 'users', userId, LOG_CONFIG.COLLECTION_NAME, logEntry.id);
      await setDoc(logRef, logEntry);

      // Cleanup old logs
      await this.cleanupOldLogs(userId);

      return true;
    } catch (error) {
      console.error('Error logging security event:', error);
      return false;
    }
  }

  /**
   * Log a successful login
   */
  async logLoginSuccess(
    userId: string,
    ipAddress?: string,
    userAgent?: string,
    sessionId?: string
  ): Promise<boolean> {
    return this.logEvent(userId, 'LOGIN_SUCCESS', {
      success: true,
      ipAddress,
      userAgent,
      sessionId,
      severity: 'INFO'
    });
  }

  /**
   * Log a failed login attempt
   */
  async logLoginFailure(
    userId: string,
    reason: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    return this.logEvent(userId, 'LOGIN_FAILURE', {
      success: false,
      ipAddress,
      userAgent,
      severity: 'WARNING',
      details: { reason }
    });
  }

  /**
   * Log a logout event
   */
  async logLogout(
    userId: string,
    sessionId?: string,
    ipAddress?: string
  ): Promise<boolean> {
    return this.logEvent(userId, 'LOGOUT', {
      success: true,
      ipAddress,
      sessionId,
      severity: 'INFO'
    });
  }

  /**
   * Log a password change
   */
  async logPasswordChange(
    userId: string,
    success: boolean,
    ipAddress?: string,
    details?: { method: string }
  ): Promise<boolean> {
    return this.logEvent(userId, 'PASSWORD_CHANGE', {
      success,
      ipAddress,
      severity: success ? 'INFO' : 'WARNING',
      details
    });
  }

  /**
   * Log a password reset request
   */
  async logPasswordResetRequest(
    userId: string,
    email: string,
    ipAddress?: string
  ): Promise<boolean> {
    return this.logEvent(userId, 'PASSWORD_RESET_REQUEST', {
      success: true,
      ipAddress,
      severity: 'INFO',
      details: { email }
    });
  }

  /**
   * Log session creation
   */
  async logSessionCreated(
    userId: string,
    sessionId: string,
    deviceInfo: DeviceInfo,
    ipAddress?: string
  ): Promise<boolean> {
    return this.logEvent(userId, 'SESSION_CREATED', {
      success: true,
      ipAddress,
      sessionId,
      severity: 'INFO',
      details: { deviceInfo }
    });
  }

  /**
   * Log session revocation
   */
  async logSessionRevoked(
    userId: string,
    sessionId: string,
    revokedByUser: boolean
  ): Promise<boolean> {
    return this.logEvent(userId, 'SESSION_REVOKED', {
      success: true,
      sessionId,
      severity: 'INFO',
      details: { revokedByUser }
    });
  }

  /**
   * Log all sessions revoked
   */
  async logAllSessionsRevoked(
    userId: string,
    count: number
  ): Promise<boolean> {
    return this.logEvent(userId, 'ALL_SESSIONS_REVOKED', {
      success: true,
      severity: 'WARNING',
      details: { count }
    });
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    userId: string,
    activity: string,
    ipAddress?: string,
    details?: Record<string, unknown>
  ): Promise<boolean> {
    return this.logEvent(userId, 'SUSPICIOUS_ACTIVITY', {
      success: false,
      ipAddress,
      severity: 'WARNING',
      details: { activity, ...details }
    });
  }

  /**
   * Get security log entries for a user
   */
  async getLogEntries(
    userId: string,
    options: LogQueryOptions = {}
  ): Promise<LogResult> {
    try {
      const db = getFirebaseDb();
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const {
        limit: queryLimit = LOG_CONFIG.DEFAULT_QUERY_LIMIT,
        startDate,
        endDate,
        eventTypes,
        severity
      } = options;

      const logRef = collection(db, 'users', userId, LOG_CONFIG.COLLECTION_NAME);

      // Build query
      let q = query(logRef, orderBy('timestamp', 'desc'), limit(queryLimit));

      // Note: Firestore doesn't support multiple where clauses with different fields easily
      // For more complex queries, consider using composite indexes or client-side filtering

      const querySnapshot = await getDocs(q);

      let entries: SecurityLogEntry[] = [];

      for (const docSnap of querySnapshot.docs) {
        const entry = docSnap.data() as SecurityLogEntry;

        // Client-side filtering
        if (startDate && new Date(entry.timestamp) < new Date(startDate)) continue;
        if (endDate && new Date(entry.timestamp) > new Date(endDate)) continue;
        if (eventTypes && !eventTypes.includes(entry.eventType)) continue;
        if (severity && entry.severity !== severity) continue;

        entries.push(entry);
      }

      return {
        success: true,
        entries,
        totalCount: entries.length
      };
    } catch (error) {
      console.error('Error fetching security log:', error);
      return { success: false, error: 'Failed to fetch security log' };
    }
  }

  /**
   * Get recent login activity
   */
  async getRecentLogins(
    userId: string,
    days: number = 30
  ): Promise<LogResult> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.getLogEntries(userId, {
      startDate: startDate.toISOString(),
      eventTypes: ['LOGIN_SUCCESS', 'LOGIN_FAILURE']
    });
  }

  /**
   * Get login statistics
   */
  async getLoginStats(userId: string, days: number = 30): Promise<{
    success: boolean;
    stats?: {
      totalLogins: number;
      successfulLogins: number;
      failedLogins: number;
      uniqueDevices: number;
      uniqueLocations: number;
    };
    error?: string;
  }> {
    const result = await this.getRecentLogins(userId, days);

    if (!result.success || !result.entries) {
      return { success: false, error: result.error };
    }

    const entries = result.entries;
    const successfulLogins = entries.filter(e => e.eventType === 'LOGIN_SUCCESS').length;
    const failedLogins = entries.filter(e => e.eventType === 'LOGIN_FAILURE').length;

    const uniqueDevices = new Set(entries.map(e =>
      `${e.deviceInfo?.browser}-${e.deviceInfo?.os}-${e.deviceInfo?.device}`
    )).size;

    const uniqueLocations = new Set(entries.map(e => e.ipAddress)).size;

    return {
      success: true,
      stats: {
        totalLogins: entries.length,
        successfulLogins,
        failedLogins,
        uniqueDevices,
        uniqueLocations
      }
    };
  }

  /**
   * Cleanup old log entries
   */
  private async cleanupOldLogs(userId: string): Promise<void> {
    try {
      const db = getFirebaseDb();
      if (!db) return;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - LOG_CONFIG.RETENTION_DAYS);

      const logRef = collection(db, 'users', userId, LOG_CONFIG.COLLECTION_NAME);
      const q = query(logRef, orderBy('timestamp', 'asc'));

      const querySnapshot = await getDocs(q);

      let deletedCount = 0;
      const batchSize = 100;

      for (const docSnap of querySnapshot.docs) {
        const entry = docSnap.data() as SecurityLogEntry;

        // Delete if older than retention period
        if (new Date(entry.timestamp) < cutoffDate) {
          await deleteDoc(doc(db, 'users', userId, LOG_CONFIG.COLLECTION_NAME, docSnap.id));
          deletedCount++;

          if (deletedCount >= batchSize) break;
        }
      }

      // Also enforce max entries limit
      if (querySnapshot.docs.length > LOG_CONFIG.MAX_ENTRIES_PER_USER) {
        const excessCount = querySnapshot.docs.length - LOG_CONFIG.MAX_ENTRIES_PER_USER;
        const docsToDelete = querySnapshot.docs.slice(0, excessCount);

        for (const docSnap of docsToDelete) {
          await deleteDoc(doc(db, 'users', userId, LOG_CONFIG.COLLECTION_NAME, docSnap.id));
        }
      }
    } catch (error) {
      console.error('Error cleaning up security logs:', error);
    }
  }

  /**
   * Export logs to CSV format
   */
  exportToCSV(entries: SecurityLogEntry[]): string {
    const headers = ['Timestamp', 'Event Type', 'Severity', 'Success', 'Browser', 'OS', 'Device', 'IP Address'];

    const rows = entries.map(entry => [
      entry.timestamp,
      entry.eventType,
      entry.severity,
      entry.success ? 'Yes' : 'No',
      entry.deviceInfo?.browser ?? 'N/A',
      entry.deviceInfo?.os ?? 'N/A',
      entry.deviceInfo?.device ?? 'N/A',
      entry.ipAddress ?? 'N/A'
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const loginLogger = LoginLogger.getInstance();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Get icon for event type
 */
export function getEventIcon(eventType: SecurityEventType): string {
  const icons: Record<SecurityEventType, string> = {
    'LOGIN_SUCCESS': '✅',
    'LOGIN_FAILURE': '❌',
    'LOGOUT': '🚪',
    'PASSWORD_CHANGE': '🔐',
    'PASSWORD_RESET_REQUEST': '📧',
    'SESSION_CREATED': '💻',
    'SESSION_REVOKED': '🚫',
    'ALL_SESSIONS_REVOKED': '🔒',
    'ACCOUNT_LOCKED': '🔒',
    'SUSPICIOUS_ACTIVITY': '⚠️'
  };
  return icons[eventType] ?? '📋';
}

/**
 * Get color for severity
 */
export function getSeverityColor(severity: SeverityLevel): string {
  const colors: Record<SeverityLevel, string> = {
    'INFO': 'text-blue-500',
    'WARNING': 'text-yellow-500',
    'ERROR': 'text-red-500',
    'CRITICAL': 'text-red-700'
  };
  return colors[severity] ?? 'text-gray-500';
}
