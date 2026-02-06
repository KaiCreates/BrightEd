'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { sendPasswordResetEmail } from 'firebase/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { sendPasswordResetEmail } = await import('firebase/auth');
      const { getFirebaseAuth } = await import('@/lib/firebase');
      const auth = getFirebaseAuth();
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err?.code === 'auth/user-not-found') {
        setError('No account found with this email address.');
      } else if (err?.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err?.message ?? 'Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <Link href="/login" className="inline-block text-[var(--text-muted)] font-bold uppercase tracking-wider text-sm hover:text-[var(--text-primary)] transition-colors mb-8">
          ← Back to Log in
        </Link>

        <h1 className="text-3xl font-heading font-extrabold text-[var(--text-primary)] mb-2">
          Forgot password?
        </h1>
        <p className="text-[var(--text-muted)] text-sm mb-8">
          Enter your email and we&apos;ll send you a link to reset your password.
        </p>

        {sent ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-green-100 text-green-800 rounded-2xl border-2 border-green-200 text-sm font-medium mb-6"
          >
            Check your inbox. We&apos;ve sent a password reset link to <strong>{email}</strong>. If you don&apos;t see it, check your spam folder.
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[var(--bg-elevated)] border-[2px] border-[var(--border-subtle)] rounded-2xl px-4 py-3.5 text-[var(--text-primary)] placeholder-[var(--text-muted)] font-medium outline-none focus:border-[var(--brand-secondary)] transition-all"
              required
              autoComplete="email"
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 bg-red-100 text-red-600 rounded-xl text-sm font-bold border-2 border-red-200"
              >
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--brand-secondary)] hover:bg-[#4f46e5] text-white border-b-[4px] border-[#4338ca] active:border-b-0 active:translate-y-[4px] font-extrabold tracking-widest uppercase rounded-2xl px-6 py-3.5 text-sm transition-all disabled:opacity-50 disabled:grayscale"
            >
              {loading ? 'SENDING...' : 'SEND RESET LINK'}
            </button>
          </form>
        )}

        <p className="text-center mt-6">
          <Link href="/login" className="text-[var(--brand-secondary)] font-bold text-sm hover:underline">
            Back to Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
