'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/home');
    }
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const { isFirebaseReady } = await import('@/lib/firebase');
    if (!isFirebaseReady) {
      setError("System temporary unavailable: Firebase configuration missing.");
      return;
    }

    setLoading(true);

    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      const { auth } = await import('@/lib/firebase');

      await signInWithEmailAndPassword(auth, formData.email, formData.password);
      router.push('/home');
    } catch (err: any) {
      console.error('Login error:', err);
      setError('Invalid email or password');
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

            <div className="flex gap-4 mt-4">
              <button type="button" className="flex-1 bg-[var(--bg-elevated)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[2px] border-[var(--border-subtle)] border-b-[4px] active:border-b-[2px] active:translate-y-[2px] rounded-2xl p-3 flex items-center justify-center transition-all">
                <span className="text-xl font-bold">G</span>
              </button>
              <button type="button" className="flex-1 bg-[var(--bg-elevated)] hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[2px] border-[var(--border-subtle)] border-b-[4px] active:border-b-[2px] active:translate-y-[2px] rounded-2xl p-3 flex items-center justify-center transition-all">
                <span className="text-xl font-bold">F</span>
              </button>
            </div>

            <div className="text-center mt-8">
              <Link href="#" className="text-[var(--brand-secondary)] font-bold text-sm hover:underline uppercase tracking-wide">
                Forgot password?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
