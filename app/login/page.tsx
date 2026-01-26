'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system'
import { useAuth } from '@/lib/auth-context'
import { useEffect } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      router.push('/home')
    }
  }, [user, authLoading, router])
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const { isFirebaseReady } = await import('@/lib/firebase')
    if (!isFirebaseReady) {
      setError("System temporary unavailable: Firebase configuration is missing. Please check your environment variables.")
      return
    }

    setLoading(true)

    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth')
      const { auth } = await import('@/lib/firebase')

      await signInWithEmailAndPassword(auth, formData.email, formData.password)

      // Redirect to home
      router.push('/home')
    } catch (err: any) {
      console.error('Login error:', err)
      setError('Invalid email or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center py-20 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <BrightLayer variant="glass" padding="lg" className="border-[var(--brand-primary)]/30">
          <div className="text-center mb-8">
            <BrightHeading level={1} className="mb-2">
              Welcome Back
            </BrightHeading>
            <p className="text-[var(--text-secondary)]">
              Sign in to continue your learning journey
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                required
                className="w-full bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none focus:neon-glow-primary transition-all"
                placeholder="your.email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                className="w-full bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none focus:neon-glow-primary transition-all"
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 bg-[var(--state-error)]/10 border border-[var(--state-error)] rounded-xl text-[var(--state-error)] text-sm font-bold"
              >
                {error}
              </motion.div>
            )}

            <BrightButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </BrightButton>

            <p className="text-center text-sm text-[var(--text-secondary)]">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-[var(--brand-primary)] font-bold hover:underline">
                Sign up
              </Link>
            </p>
          </form>
        </BrightLayer>
      </motion.div>
    </div>
  )
}
