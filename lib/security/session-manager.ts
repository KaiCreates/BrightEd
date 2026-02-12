/**
 * Session Management System
 * 
 * Manages user sessions including:
 * - Session creation on login
 * - Session tracking and updates
 * - Session revocation
 * - Current session identification
 */

import { getFirebaseDb } from '@/lib/firebase';
import { doc, setDoc, updateDoc, getDoc, collection, query, deleteDoc, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { nanoid } from 'nanoid';

// ============================================================================
// Type Definitions
// ============================================================================

export interface SessionInfo {
  sessionId: string;
  userId: string;
  deviceInfo: DeviceInfo;
  lastActive: string;
  createdAt: string;
  ipAddress?: string;
  user_AGENT?: string;
  isActive: boolean;
}

export interface DeviceInfo {
  browser?: string;
  browserVersion?: string;
  os?: string;
  osVersion?: string;
  device?: string;
  isMobile?: boolean;
  isTablet?: boolean;
  isDesktop?: boolean;
}

export interface SessionResult {
  success: boolean;
  sessionId?: string;
  error?: string;
}

// ============================================================================
// Browser Detection Utils
// ============================================================================

function detectDevice(userAgent: string): DeviceInfo {
  const ua = userAgent.toLowerCase();

  let browser = 'Unknown';
  let browserVersion = 'Unknown';
  let os = 'Unknown';
  let osVersion = 'Unknown';
  let device = 'Unknown';
  let isMobile = false;
  let isTablet = false;
  let isDesktop = true;

  // Detect browser
  browser = 'Unknown';
  let detectedBrowser = 'Unknown';
  if (ua.includes('edg')) {
    detectedBrowser = 'Edge';
    const match = ua.match(/edg\/([0-9.]+)/);
    browserVersion = match ? match[1]! : 'Unknown';
  } else if (ua.includes('opr')) {
    detectedBrowser = 'Opera';
    const match = ua.match(/opr\/([0-9.]+)/);
    browserVersion = match ? match[1]! : 'Unknown';
  } else if (ua.includes('chrome') && !ua.includes('edg')) {
    detectedBrowser = 'Chrome';
    const match = ua.match(/chrome\/([0-9.]+)/);
    browserVersion = match ? match[1]! : 'Unknown';
  } else if (ua.includes('safari') && !ua.includes('chrome')) {
    detectedBrowser = 'Safari';
    const match = ua.match(/safari\/([0-9.]+)/);
    browserVersion = match ? match[1]! : 'Unknown';
  } else if (ua.includes('firefox')) {
    detectedBrowser = 'Firefox';
    const match = ua.match(/firefox\/([0-9.]+)/);
    browserVersion = match ? match[1]! : 'Unknown';
  }
  browser = detectedBrowser;

  // Detect OS
  os = 'Unknown';
  if (ua.includes('windows')) {
    os = 'Windows';
    const match = ua.match(/windows nt ([0-9.]+)/);
    osVersion = match ? match[1]! : 'Unknown';
  } else if (ua.includes('mac os x')) {
    os = 'macOS';
    const match = ua.match(/os x ([0-9_]+)/);
    osVersion = match ? match[1]!.replace(/_/g, '.') : 'Unknown';
  } else if (ua.includes('linux')) {
    os = 'Linux';
    osVersion = 'Unknown';
  } else if (ua.includes('iphone') || ua.includes('ipad')) {
    os = 'iOS';
    const match = ua.match(/os ([0-9_]+)/);
    osVersion = match ? match[1]!.replace(/_/g, '.') : 'Unknown';
  } else if (ua.includes('android')) {
    os = 'Android';
    const match = ua.match(/android ([0-9.]+)/);
    osVersion = match ? match[1]! : 'Unknown';
  }

  // Detect device type
  device = 'Desktop';
  if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('android') || ua.includes('mobile')) {
    isDesktop = false;
    if (ua.includes('tablet') || ua.includes('ipad')) {
      isTablet = true;
      device = 'Tablet';
    } else {
      isMobile = true;
      device = ua.includes('iphone') ? 'iPhone' : 'Mobile';
    }
  }

  return {
    browser,
    browserVersion,
    os,
    osVersion,
    device,
    isMobile,
    isTablet,
    isDesktop
  };
}

// ============================================================================
// Session Management Class
// ============================================================================

export class SessionManager {
  private static instance: SessionManager;
  private currentSessionId: string | null = null;

  private constructor() {
    // Initialize with auth state listener
    this.setupAuthListener();
  }

  static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Setup Firebase auth state listener
   */
  private setupAuthListener(): void {
    if (typeof window === 'undefined') return;

    const auth = getAuth();

    onAuthStateChanged(auth, (user) => {
      if (user) {
        // User signed in - create or update session
        this.createSessionForUser(user);
      } else {
        // User signed out - cleanup session
        this.cleanupCurrentSession();
      }
    });
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${nanoid(16)}`;
  }

  /**
   * Create a new session for a user
   */
  async createSessionForUser(user: User, ipAddress?: string): Promise<SessionResult> {
    try {
      const sessionId = this.generateSessionId();
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';
      const deviceInfo = detectDevice(userAgent);

      const now = new Date();

      const sessionData: SessionInfo = {
        sessionId,
        userId: user.uid,
        deviceInfo,
        lastActive: now.toISOString(),
        createdAt: now.toISOString(),
        ipAddress,
        user_AGENT: userAgent,
        isActive: true
      };

      // Store session in Firestore
      const db = getFirebaseDb();
      if (!db) {
        return { success: false, error: 'Database not initialized' };
      }

      const sessionRef = doc(db, 'sessions', sessionId);
      await setDoc(sessionRef, sessionData);

      // Store session ID in localStorage for quick access
      this.currentSessionId = sessionId;
      localStorage.setItem('brighted_current_session', sessionId);

      return { success: true, sessionId };
    } catch (error) {
      console.error('Error creating session:', error);
      return { success: false, error: 'Failed to create session' };
    }
  }

  /**
   * Get current session ID
   */
  getCurrentSessionId(): string | null {
    if (!this.currentSessionId) {
      this.currentSessionId = localStorage.getItem('brighted_current_session');
    }
    return this.currentSessionId;
  }

  /**
   * Refresh session last active timestamp
   */
  async refreshSessionLastActive(sessionId: string): Promise<void> {
    try {
      const db = getFirebaseDb();
      if (!db) return;

      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        lastActive: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error refreshing session:', error);
    }
  }

  /**
   * Revoke a specific session
   */
  async revokeSession(sessionId: string): Promise<boolean> {
    try {
      const db = getFirebaseDb();
      if (!db) return false;

      const sessionRef = doc(db, 'sessions', sessionId);
      await deleteDoc(sessionRef);

      // Clear current session if it's the one being revoked
      if (this.currentSessionId === sessionId) {
        this.currentSessionId = null;
        localStorage.removeItem('brighted_current_session');
      }

      return true;
    } catch (error) {
      console.error('Error revoking session:', error);
      return false;
    }
  }

  /**
   * Revoke all sessions except current one
   */
  async revokeAllOtherSessions(userId: string, currentSessionId?: string): Promise<boolean> {
    try {
      const db = getFirebaseDb();
      if (!db) return false;

      const sessionsRef = collection(db, 'sessions');

      // Get all sessions for this user
      const q = query(sessionsRef);
      const querySnapshot = await getDocs(q);

      const batchUpdates = [];

      for (const docSnap of querySnapshot.docs) {
        const session = docSnap.data() as SessionInfo;

        if (session.userId === userId &&
          (!currentSessionId || session.sessionId !== currentSessionId)) {
          batchUpdates.push(deleteDoc(doc(db, 'sessions', session.sessionId)));
        }
      }

      await Promise.all(batchUpdates);
      return true;
    } catch (error) {
      console.error('Error revoking all sessions:', error);
      return false;
    }
  }

  /**
   * Get all active sessions for a user
   */
  async getAllUserSessions(userId: string): Promise<SessionInfo[]> {
    try {
      const db = getFirebaseDb();
      if (!db) return [];

      const sessionsRef = collection(db, 'sessions');

      // Get sessions for this user, ordered by last active
      const q = query(sessionsRef);
      const querySnapshot = await getDocs(q);

      const sessions: SessionInfo[] = [];

      for (const docSnap of querySnapshot.docs) {
        const session = docSnap.data() as SessionInfo;
        if (session.userId === userId) {
          sessions.push(session);
        }
      }

      // Sort by last active (most recent first)
      sessions.sort((a, b) =>
        new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime()
      );

      return sessions;
    } catch (error) {
      console.error('Error getting user sessions:', error);
      return [];
    }
  }

  /**
   * Get current session details
   */
  async getCurrentSessionDetails(): Promise<SessionInfo | null> {
    const sessionId = this.getCurrentSessionId();
    if (!sessionId) return null;

    try {
      const db = getFirebaseDb();
      if (!db) return null;

      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);

      if (sessionSnap.exists()) {
        return sessionSnap.data() as SessionInfo;
      }

      return null;
    } catch (error) {
      console.error('Error getting current session:', error);
      return null;
    }
  }

  /**
   * Cleanup current session on logout
   */
  private cleanupCurrentSession(): void {
    this.currentSessionId = null;
    localStorage.removeItem('brighted_current_session');
  }

  /**
   * Update IP address for session
   */
  async updateSessionIpAddress(sessionId: string, ipAddress: string): Promise<void> {
    try {
      const db = getFirebaseDb();
      if (!db) return;

      const sessionRef = doc(db, 'sessions', sessionId);
      await updateDoc(sessionRef, {
        ipAddress
      });
    } catch (error) {
      console.error('Error updating session IP:', error);
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const sessionManager = SessionManager.getInstance();

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format session info for display
 */
export function formatSessionForDisplay(session: SessionInfo): {
  id: string;
  device: string;
  os: string;
  browser: string;
  lastActive: string;
  isCurrent: boolean;
  location?: string;
} {
  const { deviceInfo, lastActive, ipAddress } = session;

  return {
    id: session.sessionId,
    device: deviceInfo.device ?? 'Unknown',
    os: deviceInfo.os ?? 'Unknown',
    browser: deviceInfo.browser ?? 'Unknown',
    lastActive: new Date(lastActive).toLocaleString(),
    isCurrent: sessionManager.getCurrentSessionId() === session.sessionId,
    location: ipAddress ? maskIpAddress(ipAddress) : undefined
  };
}

/**
 * Mask IP address for privacy (show last octet only)
 */
function maskIpAddress(ip: string): string {
  const parts = ip.split('.');
  if (parts.length === 4) {
    return `***.***.***.${parts[3]}`;
  }
  return '***.***.***.***';
}
