'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { z } from 'zod'
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system'
import { useAuth } from '@/lib/auth-context'
import { useEffect } from 'react'


const SignUpSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password too long'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username too long').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
})

export default function SignUpPage() {
  const router = useRouter()
  const { user, userData, loading: authLoading } = useAuth()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      router.push(userData?.onboardingCompleted ? '/home' : '/onboarding')
    }
  }, [user, userData?.onboardingCompleted, authLoading, router])
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
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
      // Validate form with Zod
      const validationResult = SignUpSchema.safeParse({
        email: formData.email.trim(),
        password: formData.password,
        username: formData.username.trim(),
      })

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0]
        throw new Error(firstError.message)
      }

      const validatedData = validationResult.data

      // 1. Create User with Firebase Auth
      const { createUserWithEmailAndPassword } = await import('firebase/auth')
      const { auth, db } = await import('@/lib/firebase')
      const { doc, setDoc } = await import('firebase/firestore')

      const userCredential = await createUserWithEmailAndPassword(auth, validatedData.email, validatedData.password)
      const user = userCredential.user

      // 2. Create User Document in Firestore
      const userDocRef = doc(db, 'users', user.uid)
      await setDoc(userDocRef, {
        username: validatedData.username,
        email: validatedData.email,
        mastery: 0.1,
        streak: 0,
        xp: 0,
        bCoins: 100,
        hasBusiness: false,
        businessID: null,
        consistency: 0,
        subjectProgress: {},
        subjects: [],
        onboardingCompleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })

      // Redirect to onboarding
      router.push('/onboarding')
    } catch (err: any) {
      console.error('Signup Error:', err)
      setError(err.message || 'An error occurred during signup')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center py-20 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        <BrightLayer variant="glass" padding="lg" className="border-[var(--brand-primary)]/30">
          <div className="text-center mb-8">
            <BrightHeading level={1} className="mb-2">
              Create Your Account
            </BrightHeading>
            <p className="text-[var(--text-secondary)]">
              Start your journey to mastering Business, Finance, and IT
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">
                Email *
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

            {/* Password */}
            <div>
              <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">
                Password *
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                minLength={6}
                className="w-full bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none focus:neon-glow-primary transition-all"
                placeholder="At least 6 characters"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">
                Username *
              </label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                required
                className="w-full bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none focus:neon-glow-primary transition-all"
                placeholder="Choose a unique username"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                {error}
              </div>
            )}

            <BrightButton
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </BrightButton>

            <p className="text-center text-sm text-[var(--text-secondary)]">
              Already have an account?{' '}
              <Link href="/login" className="text-[var(--brand-primary)] font-bold hover:underline">
                Log in
              </Link>
            </p>
          </form>
        </BrightLayer>
      </motion.div>
    </div>
  )
}
