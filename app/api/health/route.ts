/**
 * Health Check API
 * 
 * Returns the status of Firebase configuration and other critical services.
 * Useful for debugging deployment issues on Render.
 */

import { NextResponse } from 'next/server';
import { getFirebaseDiagnosticInfo } from '@/lib/firebase';

export async function GET() {
  const diagnostics = getFirebaseDiagnosticInfo();
  
  const health = {
    status: diagnostics.isConfigured ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    firebase: {
      configured: diagnostics.isConfigured,
      projectId: diagnostics.projectId,
      authDomain: diagnostics.authDomain,
      features: {
        authentication: diagnostics.hasApiKey && diagnostics.hasAppId,
        firestore: diagnostics.isConfigured,
        storage: diagnostics.hasStorage,
        realtimeDatabase: diagnostics.hasDatabase,
        analytics: diagnostics.hasAnalytics,
      }
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      appUrl: process.env.NEXT_PUBLIC_APP_URL,
    }
  };

  const statusCode = diagnostics.isConfigured ? 200 : 503;
  
  return NextResponse.json(health, { status: statusCode });
}
