'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';

import { getFirebaseDiagnosticInfo } from '@/lib/firebase';

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [firebaseStatus, setFirebaseStatus] = useState<{
    configured: boolean;
    message: string;
    details: Record<string, boolean>;
  } | null>(null);

  // Check Firebase configuration on mount
  useEffect(() => {
    const checkFirebaseConfig = async () => {
      try {
        // First try to fetch from server API (more reliable)
        const response = await fetch('/api/health');
        const health = await response.json();
        
        if (health.firebase?.configured) {
          setFirebaseStatus({
            configured: true,
            message: 'Authentication service ready',
            details: {
              apiKey: true,
              appId: true,
              authDomain: true,
              projectId: true,
            }
          });
          return;
        }
        
        // Fallback to client-side check
        const diag = getFirebaseDiagnosticInfo();
        const configured = diag.isConfigured && diag.hasApiKey && diag.hasAppId;
        
        setFirebaseStatus({
          configured,
          message: configured 
            ? 'Authentication service ready'
            : 'Authentication service not configured. Please redeploy the application.',
          details: {
            apiKey: diag.hasApiKey,
            appId: diag.hasAppId,
            authDomain: !!diag.authDomain,
            projectId: !!diag.projectId,
          }
        });

        if (!configured) {
          console.error('[Login] Firebase not configured:', diag);
          console.error('[Login] Server health:', health);
        }
      } catch (err) {
        console.error('[Login] Error checking Firebase config:', err);
        setFirebaseStatus({
          configured: false,
          message: 'Unable to verify authentication configuration',
          details: {}
        });
      }
    };
    
    checkFirebaseConfig();
  }, []);

  // Redirect handled by AuthGate
  /*
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/home');
    }
  }, [user, authLoading, router]);
  */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    setLoading(true);

    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const { getFirebaseAuth } = await import('@/lib/firebase');
      const auth = getFirebaseAuth();

      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      router.push('/home');
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Check if it's a configuration error
      const isConfigError = err.message?.includes('Firebase configuration is missing') || 
                           err.code === 'auth/configuration-not-found' ||
                           err.message?.includes('configuration is missing');
      
      if (isConfigError) {
        setError('Authentication service is not configured. Please check your environment variables or contact support.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Connection problem. Please check your internet and try again.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed attempts. Please try again later.');
      } else if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col md:flex-row">
      {/* Left Panel: Branding & Mascot (Hidden on mobile) */}
      <div className="hidden md:flex w-1/2 lg:w-[45%] bg-[var(--bg-secondary)] items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />

        <div className="text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-8"
          >
            <div className="owl-sprite owl-happy w-[200px] h-[200px] mx-auto scale-[1.5]" />
          </motion.div>

          <h1 className="text-5xl font-heading font-extrabold text-[var(--brand-secondary)] mb-4">BrightEd</h1>
          <p className="text-xl font-bold text-[var(--text-secondary)] max-w-md mx-auto">
            The free, fun, and effective way to learn.
          </p>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[var(--bg-primary)] relative">
        {/* Mobile Header (Mascot) */}
        <div className="md:hidden mb-8 text-center">
          <div className="owl-sprite owl-happy scale-[0.8] mx-auto mb-4" />
          <h1 className="text-3xl font-heading font-extrabold text-[var(--text-primary)]">BrightEd</h1>
        </div>

        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between mb-8">
            <Link href="/" className="text-[var(--text-muted)] font-bold uppercase tracking-wider text-sm hover:text-[var(--text-primary)] transition-colors">
              ← Back
            </Link>
            <Link href="/signup" className="text-[var(--brand-secondary)] font-bold uppercase tracking-wider text-sm hover:brightness-110 transition-all">
              Create Account
            </Link>
          </div>

          <h2 className="text-3xl font-heading font-extrabold text-[var(--text-primary)] mb-8 text-center md:text-left">
            Log in
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="relative group">
                <input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))}
                  className="w-full bg-[var(--bg-elevated)] border-[2px] border-[var(--border-subtle)] rounded-2xl px-4 py-3.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] font-medium outline-none focus:border-[var(--brand-secondary)] transition-all"
                  required
                />
              </div>

              <div className="relative group">
                <input
                  type="password"
                  placeholder="Password"
                  value={formData.password}
                  onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))}
                  className="w-full bg-[var(--bg-elevated)] border-[2px] border-[var(--border-subtle)] rounded-2xl px-4 py-3.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] font-medium outline-none focus:border-[var(--brand-secondary)] transition-all"
                  required
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-base">
                  {/* Icon placeholder if needed */}
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-100 text-red-600 rounded-xl text-sm font-bold border-2 border-red-200"
              >
                {error}
              </motion.div>
            )}

            {/* Firebase Configuration Status */}
            {firebaseStatus && !firebaseStatus.configured && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div className="flex-1">
                    <p className="font-bold text-yellow-800 mb-2">
                      Configuration Issue Detected
                    </p>
                    <p className="text-sm text-yellow-700 mb-3">
                      The authentication service is not properly configured. This usually means environment variables are missing.
                    </p>
                    
                    {/* Status Grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {Object.entries(firebaseStatus.details).map(([key, status]) => (
                        <div key={key} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${status ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          <span>{status ? '✓' : '✗'}</span>
                          <span className="capitalize font-bold">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 text-xs text-yellow-700">
                      <p className="font-bold">To fix this:</p>
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Check that all Firebase environment variables are set in Render Dashboard</li>
                        <li>Verify NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_APP_ID are correct</li>
                        <li>Redeploy the application after updating environment variables</li>
                      </ol>
                    </div>

                    <a 
                      href="/api/health" 
                      target="_blank"
                      className="inline-block mt-3 text-xs font-bold text-yellow-800 hover:underline"
                    >
                      View detailed diagnostics →
                    </a>
                  </div>
                </div>
              </motion.div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[var(--brand-secondary)] hover:bg-[#4f46e5] text-white border-b-[4px] border-[#4338ca] active:border-b-0 active:translate-y-[4px] font-extrabold tracking-widest uppercase rounded-2xl px-6 py-3.5 text-sm transition-all disabled:opacity-50 disabled:grayscale"
              >
                {loading ? 'SIGNING IN...' : 'LOG IN'}
              </button>
            </div>

            <div className="flex items-center justify-between mt-6">
              <span className="h-[2px] flex-1 bg-[var(--border-subtle)]" />
              <span className="px-4 text-[var(--text-muted)] text-xs font-bold uppercase tracking-wider">OR</span>
              <span className="h-[2px] flex-1 bg-[var(--border-subtle)]" />
            </div>

            <div className="flex justify-center mt-4">
              <button
                type="button"
                onClick={async () => {
                  try {
                    setLoading(true);
                    const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth');
                    const { getFirebaseAuth } = await import('@/lib/firebase');

                    const auth = getFirebaseAuth();
                    const provider = new GoogleAuthProvider();
                    await signInWithPopup(auth, provider);
                    router.push('/home');
                  } catch (err: any) {
                    console.error('Google login error:', err);
                    if (err.message.includes('Firebase configuration is missing')) {
                      setError('Authentication service is temporarily unavailable. Please try again later.');
                    } else {
                      setError(err.message || 'Failed to sign in with Google');
                    }
                  } finally {
                    setLoading(false);
                  }
                }}
                className="bg-[var(--bg-elevated)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[2px] border-[var(--border-subtle)] border-b-[4px] active:border-b-[2px] active:translate-y-[2px] rounded-2xl px-6 py-3 flex items-center justify-center gap-2 transition-all"
              >
                <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                  <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                    <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z" />
                    <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z" />
                    <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z" />
                    <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.799 L -6.734 42.379 C -8.804 40.439 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z" />
                  </g>
                </svg>
                <span className="font-bold">Google</span>
              </button>
            </div>

            <div className="text-center mt-8">
              <Link href="/login/forgot-password" className="text-[var(--brand-secondary)] font-bold text-sm hover:underline uppercase tracking-wide">
                Forgot password?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
