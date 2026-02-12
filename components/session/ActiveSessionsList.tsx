'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sessionManager } from '@/lib/security/session-manager';
import { loginLogger } from '@/lib/security/login-logger';
import { toast } from 'react-hot-toast';
// Icons as inline SVGs
const ShieldIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);

const LogOutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

interface SessionDisplay {
  id: string;
  device: string;
  os: string;
  browser: string;
  lastActive: string;
  createdAt: string;
  isCurrent: boolean;
  location?: string;
}

interface ActiveSessionsListProps {
  userId: string;
}

export function ActiveSessionsList({ userId }: ActiveSessionsListProps) {
  const [sessions, setSessions] = useState<SessionDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);

  useEffect(() => {
    loadSessions();
    const interval = setInterval(loadSessions, 30000);
    return () => clearInterval(interval);
  }, [userId]);

  const loadSessions = async () => {
    try {
      const sessionInfos = await sessionManager.getAllUserSessions(userId);
      const currentSessionId = sessionManager.getCurrentSessionId();
      
      const formattedSessions: SessionDisplay[] = sessionInfos.map(session => {
        const deviceInfo = session.deviceInfo;
        const isCurrent = session.sessionId === currentSessionId;
        
        const lastActive = new Date(session.lastActive).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });

        const createdAt = new Date(session.createdAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });

        const maskedIp = session.ipAddress 
          ? '***.***.***.' + session.ipAddress.split('.').pop()
          : undefined;

        return {
          id: session.sessionId,
          device: deviceInfo?.device || 'Unknown Device',
          os: deviceInfo?.os || 'Unknown OS',
          browser: deviceInfo?.browser || 'Unknown Browser',
          lastActive,
          createdAt,
          isCurrent,
          location: maskedIp
        };
      });

      formattedSessions.sort((a, b) => {
        if (a.isCurrent) return -1;
        if (b.isCurrent) return 1;
        return new Date(b.lastActive).getTime() - new Date(a.lastActive).getTime();
      });

      setSessions(formattedSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load active sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSession(sessionId);
    try {
      const success = await sessionManager.revokeSession(sessionId);
      if (success) {
        await loginLogger.logSessionRevoked(userId, sessionId, true);
        toast.success('Session revoked successfully');
        
        const currentSessionId = sessionManager.getCurrentSessionId();
        if (sessionId === currentSessionId) {
          window.location.href = '/login';
          return;
        }
        
        await loadSessions();
      } else {
        toast.error('Failed to revoke session');
      }
    } catch (error) {
      console.error('Error revoking session:', error);
      toast.error('Failed to revoke session');
    } finally {
      setRevokingSession(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    setRevokingAll(true);
    try {
      const currentSessionId = sessionManager.getCurrentSessionId() || undefined;
      const success = await sessionManager.revokeAllOtherSessions(userId, currentSessionId);
      
      if (success) {
        const otherSessionsCount = sessions.filter(s => !s.isCurrent).length;
        await loginLogger.logAllSessionsRevoked(userId, otherSessionsCount);
        
        toast.success('Revoked ' + otherSessionsCount + ' other session' + (otherSessionsCount !== 1 ? 's' : ''));
        await loadSessions();
      } else {
        toast.error('Failed to revoke other sessions');
      }
    } catch (error) {
      console.error('Error revoking all sessions:', error);
      toast.error('Failed to revoke other sessions');
    } finally {
      setRevokingAll(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]"></div>
      </div>
    );
  }

  const otherSessionsCount = sessions.filter(s => !s.isCurrent).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <ShieldIcon />
          <span>{sessions.length} active session{sessions.length !== 1 ? 's' : ''}</span>
        </div>
        
        {otherSessionsCount > 0 && (
          <button
            onClick={handleRevokeAllOthers}
            disabled={revokingAll}
            className="text-sm font-bold text-red-500 hover:text-red-400 transition-colors flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-red-500/10 disabled:opacity-50"
          >
            <LogOutIcon />
            {revokingAll ? 'Revoking...' : 'Sign out all others (' + otherSessionsCount + ')'}
          </button>
        )}
      </div>

      <div className="space-y-3">
        <AnimatePresence>
          {sessions.map((session) => (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -100 }}
              className={`
                relative p-4 rounded-2xl border-2 transition-all
                ${session.isCurrent 
                  ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/30' 
                  : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] hover:border-[var(--border-subtle)]/80'
                }
              `}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-bold text-[var(--text-primary)]">
                      {session.device}
                    </span>
                    {session.isCurrent && (
                      <span className="text-xs font-bold px-2 py-0.5 bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] rounded-full">
                        Current
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm text-[var(--text-muted)]">
                    <p>{session.browser} on {session.os}</p>
                    <p>Last active: {session.lastActive}</p>
                    {session.location && (
                      <p>Location: {session.location}</p>
                    )}
                  </div>
                </div>

                {!session.isCurrent && (
                  <button
                    onClick={() => handleRevokeSession(session.id)}
                    disabled={revokingSession === session.id}
                    className="ml-4 p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    title="Sign out this device"
                  >
                    <LogOutIcon />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {sessions.length === 0 && (
        <div className="text-center p-8 text-[var(--text-muted)]">
          No active sessions found
        </div>
      )}
    </div>
  );
}
