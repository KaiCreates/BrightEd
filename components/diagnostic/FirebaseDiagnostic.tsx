'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getFirebaseDiagnosticInfo } from '@/lib/firebase';

interface DiagnosticInfo {
  isConfigured: boolean;
  projectId: string;
  authDomain: string;
  hasApiKey: boolean;
  hasAppId: boolean;
  hasStorage: boolean;
  hasDatabase: boolean;
  hasAnalytics: boolean;
}

export function FirebaseDiagnostic() {
  const [diagnostics, setDiagnostics] = useState<DiagnosticInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const info = getFirebaseDiagnosticInfo();
      setDiagnostics(info);
    } catch (error) {
      console.error('Failed to get Firebase diagnostics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="p-4 bg-[var(--bg-elevated)] rounded-xl">
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-[var(--bg-secondary)] rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-[var(--bg-secondary)] rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!diagnostics) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
        <p className="text-red-500 font-bold">Failed to load Firebase diagnostics</p>
      </div>
    );
  }

  const allGood = diagnostics.isConfigured && diagnostics.hasApiKey && diagnostics.hasAppId;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-2xl border-2 ${
        allGood 
          ? 'bg-green-500/5 border-green-500/30' 
          : 'bg-red-500/5 border-red-500/30'
      }`}
    >
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl">{allGood ? '✅' : '❌'}</span>
        <h3 className="text-xl font-black">
          Firebase {allGood ? 'Configured' : 'Not Configured'}
        </h3>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-[var(--text-muted)]">Project ID:</span>
            <p className="font-mono font-bold">{diagnostics.projectId || 'Not set'}</p>
          </div>
          <div>
            <span className="text-[var(--text-muted)]">Auth Domain:</span>
            <p className="font-mono font-bold">{diagnostics.authDomain || 'Not set'}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          <DiagnosticItem 
            label="API Key" 
            status={diagnostics.hasApiKey} 
          />
          <DiagnosticItem 
            label="App ID" 
            status={diagnostics.hasAppId} 
          />
          <DiagnosticItem 
            label="Auth Domain" 
            status={!!diagnostics.authDomain} 
          />
          <DiagnosticItem 
            label="Storage" 
            status={diagnostics.hasStorage} 
          />
          <DiagnosticItem 
            label="Database" 
            status={diagnostics.hasDatabase} 
          />
          <DiagnosticItem 
            label="Analytics" 
            status={diagnostics.hasAnalytics} 
          />
        </div>
      </div>

      {!allGood && (
        <div className="mt-4 p-4 bg-red-500/10 rounded-xl">
          <p className="text-sm text-red-500 font-bold mb-2">Configuration Issues Detected</p>
          <p className="text-sm text-[var(--text-muted)]">
            Missing required Firebase environment variables. Authentication will not work.
          </p>
          <div className="mt-3 space-y-2">
            <p className="text-xs font-bold text-[var(--text-muted)]">To fix:</p>
            <ol className="text-xs text-[var(--text-muted)] list-decimal list-inside space-y-1">
              <li>Check your environment variables are set</li>
              <li>Verify NEXT_PUBLIC_FIREBASE_* variables exist</li>
              <li>For Render: See docs/RENDER_SETUP.md</li>
              <li>Restart server after fixing</li>
            </ol>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function DiagnosticItem({ label, status }: { label: string; status: boolean }) {
  return (
    <div className={`flex items-center gap-2 p-2 rounded-lg ${
      status ? 'bg-green-500/10' : 'bg-red-500/10'
    }`}>
      <span className={status ? 'text-green-500' : 'text-red-500'}>
        {status ? '✓' : '✗'}
      </span>
      <span className={`text-xs font-bold ${
        status ? 'text-green-500' : 'text-red-500'
      }`}>
        {label}
      </span>
    </div>
  );
}
