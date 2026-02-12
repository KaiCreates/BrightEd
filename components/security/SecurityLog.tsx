'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loginLogger, SecurityLogEntry, SecurityEventType, SeverityLevel, getEventIcon, getSeverityColor } from '@/lib/security/login-logger';
import { toast } from 'react-hot-toast';

interface SecurityLogProps {
  userId: string;
  limit?: number;
}

const eventTypeLabels: Record<SecurityEventType, string> = {
  'LOGIN_SUCCESS': 'Login Successful',
  'LOGIN_FAILURE': 'Login Failed',
  'LOGOUT': 'Logout',
  'PASSWORD_CHANGE': 'Password Changed',
  'PASSWORD_RESET_REQUEST': 'Password Reset Requested',
  'SESSION_CREATED': 'New Session',
  'SESSION_REVOKED': 'Session Revoked',
  'ALL_SESSIONS_REVOKED': 'All Sessions Revoked',
  'ACCOUNT_LOCKED': 'Account Locked',
  'SUSPICIOUS_ACTIVITY': 'Suspicious Activity'
};

const severityLabels: Record<SeverityLevel, string> = {
  'INFO': 'Info',
  'WARNING': 'Warning',
  'ERROR': 'Error',
  'CRITICAL': 'Critical'
};

export function SecurityLog({ userId, limit = 50 }: SecurityLogProps) {
  const [logs, setLogs] = useState<SecurityLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventTypes, setSelectedEventTypes] = useState<SecurityEventType[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityLevel | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadLogs();
  }, [userId]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const result = await loginLogger.getLogEntries(userId, {
        limit,
        eventTypes: selectedEventTypes.length > 0 ? selectedEventTypes : undefined,
        severity: selectedSeverity || undefined
      });

      if (result.success && result.entries) {
        setLogs(result.entries);
      } else {
        toast.error('Failed to load security log');
      }
    } catch (error) {
      console.error('Error loading security log:', error);
      toast.error('Failed to load security log');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = loginLogger.exportToCSV(logs);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `security-log-${userId}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Security log exported');
    } catch (error) {
      toast.error('Failed to export log');
    } finally {
      setExporting(false);
    }
  };

  const toggleEventType = (eventType: SecurityEventType) => {
    setSelectedEventTypes(prev => 
      prev.includes(eventType) 
        ? prev.filter(t => t !== eventType)
        : [...prev, eventType]
    );
  };

  const filteredLogs = logs.filter(log => {
    if (selectedEventTypes.length > 0 && !selectedEventTypes.includes(log.eventType)) {
      return false;
    }
    if (selectedSeverity && log.severity !== selectedSeverity) {
      return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={selectedSeverity || ''}
          onChange={(e) => setSelectedSeverity(e.target.value as SeverityLevel || null)}
          className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          <option value="">All Severities</option>
          {Object.entries(severityLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <button
          onClick={loadLogs}
          className="px-4 py-2 bg-[var(--brand-primary)] text-white rounded-lg text-sm font-bold hover:bg-[var(--brand-primary)]/90 transition-colors"
        >
          Refresh
        </button>

        <button
          onClick={handleExport}
          disabled={exporting || logs.length === 0}
          className="px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] rounded-lg text-sm font-bold hover:bg-[var(--bg-secondary)] transition-colors disabled:opacity-50"
        >
          {exporting ? 'Exporting...' : 'Export CSV'}
        </button>
      </div>

      {/* Event Type Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Object.entries(eventTypeLabels).map(([eventType, label]) => (
          <button
            key={eventType}
            onClick={() => toggleEventType(eventType as SecurityEventType)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              selectedEventTypes.includes(eventType as SecurityEventType)
                ? 'bg-[var(--brand-primary)] text-white'
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Logs List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar">
        <AnimatePresence>
          {filteredLogs.map((log) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] hover:border-[var(--border-subtle)]/80 transition-all"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{getEventIcon(log.eventType)}</span>
                    <span className="font-bold text-[var(--text-primary)]">
                      {eventTypeLabels[log.eventType]}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                      log.severity === 'INFO' ? 'bg-blue-500/20 text-blue-500' :
                      log.severity === 'WARNING' ? 'bg-yellow-500/20 text-yellow-500' :
                      log.severity === 'ERROR' ? 'bg-red-500/20 text-red-500' :
                      'bg-red-700/20 text-red-700'
                    }`}>
                      {severityLabels[log.severity]}
                    </span>
                    {!log.success && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-500 font-bold">
                        Failed
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 text-sm text-[var(--text-muted)]">
                    <p>
                      {new Date(log.timestamp).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </p>
                    {log.deviceInfo && (
                      <p>
                        {log.deviceInfo.browser} on {log.deviceInfo.os} ({log.deviceInfo.device})
                      </p>
                    )}
                    {log.ipAddress && (
                      <p>
                        IP: ***.{log.ipAddress.split('.').pop()}
                      </p>
                    )}
                    {log.details && Object.keys(log.details).length > 0 && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                          Details
                        </summary>
                        <pre className="mt-2 p-2 bg-[var(--bg-secondary)] rounded-lg text-xs overflow-x-auto">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {filteredLogs.length === 0 && (
          <div className="text-center p-8 text-[var(--text-muted)]">
            No security events found
          </div>
        )}
      </div>

      {logs.length > 0 && (
        <div className="text-center text-sm text-[var(--text-muted)]">
          Showing {filteredLogs.length} of {logs.length} events
        </div>
      )}
    </div>
  );
}
