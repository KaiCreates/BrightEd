'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { z } from 'zod'
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system'
import { useAuth } from '@/lib/auth-context'
import { useEffect } from 'react'


const SUBJECTS = [
  'Principles of Business',
  'Accounts',
  'IT',
  'Mathematics'
]

const SignUpSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password too long'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username too long').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100, 'Name too long').regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),
  form: z.string().regex(/^[1-6]$/, 'Form level must be between 1 and 6'),
  subjects: z.array(z.string()).min(1, 'Please select at least one subject')
})

export default function SignUpPage() {
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
    password: '',
    username: '',
    fullName: '',
    form: '1',
    subjects: [] as string[]
  })

  const handleSubjectToggle = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Validate form with Zod
      const validationResult = SignUpSchema.safeParse({
        email: formData.email.trim(),
        password: formData.password,
        username: formData.username.trim(),
        fullName: formData.fullName.trim(),
        form: formData.form,
        subjects: formData.subjects
      })

      if (!validationResult.success) {
        const firstError = validationResult.error.errors[0]
        throw new Error(firstError.message)
      }

      const validatedData = validationResult.data

      // 1. Create User with Firebase Auth
      const { createUserWithEmailAndPassword } = await import('firebase/auth')
      const { auth, db } = await import('@/lib/firebase')
      const { doc, setDoc, writeBatch, collection } = await import('firebase/firestore')

      const userCredential = await createUserWithEmailAndPassword(auth, validatedData.email, validatedData.password)
      const user = userCredential.user

      // Sync to Firebase Auth Profile
      const { updateProfile } = await import('firebase/auth')
      await updateProfile(user, { displayName: validatedData.fullName })

      // 2. Create User Document in Firestore
      const userDocRef = doc(db, 'users', user.uid)
      await setDoc(userDocRef, {
        username: validatedData.username,
        fullName: validatedData.fullName,
        firstName: validatedData.fullName.split(' ')[0] || validatedData.fullName,
        email: validatedData.email,
        form: parseInt(validatedData.form),
        formLevel: parseInt(validatedData.form),
        subjects: validatedData.subjects,
        subjectProgress: validatedData.subjects.reduce((acc, subj) => ({ ...acc, [subj]: 0 }), {}),
        mastery: 0.1,
        streak: 0,
        xp: 0,
        bCoins: 100,
        hasBusiness: false,
        businessID: null,
        consistency: 0,
        createdAt: new Date().toISOString()
      })

      // 3. Initialize Learning Path in 'progress' sub-collection
      const { data: pathData } = await fetch('/api/learning-path?' + new URLSearchParams({
        subjects: validatedData.subjects.join(',')
      })).then(res => res.json())

      if (pathData?.paths) {
        const batch = writeBatch(db)
        const progressCollection = collection(userDocRef, 'progress')
        let isFirstModule = true

        for (const [subject, objectives] of Object.entries(pathData.paths)) {
          const objectivesList = objectives as any[]
          for (const obj of objectivesList) {
            const moduleRef = doc(progressCollection, obj.id)
            batch.set(moduleRef, {
              moduleId: obj.id,
              subject,
              isUnlocked: isFirstModule, // Only first module unlocked by default
              status: isFirstModule ? 'active' : 'locked',
              mastery: 0,
              attempts: 0
            })
            if (isFirstModule) isFirstModule = false
          }
        }
        await batch.commit()
      }

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

            {/* Full Name */}
            <div>
              <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">
                Full Name *
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                required
                className="w-full bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none focus:neon-glow-primary transition-all"
                placeholder="Your full name"
              />
            </div>

            {/* Form Level */}
            <div>
              <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">
                Form Level *
              </label>
              <select
                value={formData.form}
                onChange={(e) => setFormData(prev => ({ ...prev, form: e.target.value }))}
                required
                className="w-full bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:border-[var(--brand-primary)] focus:outline-none focus:neon-glow-primary transition-all"
              >
                {[1, 2, 3, 4, 5, 6].map(level => (
                  <option key={level} value={level.toString()}>
                    Form {level}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selection */}
            <div>
              <label className="block text-sm font-bold text-[var(--text-primary)] mb-2 uppercase tracking-wider">
                Subjects * (Select at least one)
              </label>
              <div className="grid grid-cols-2 gap-3">
                {SUBJECTS.map(subject => (
                  <button
                    key={subject}
                    type="button"
                    onClick={() => handleSubjectToggle(subject)}
                    className={`px-4 py-3 rounded-xl border-2 transition-all text-left ${formData.subjects.includes(subject)
                      ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)] text-[var(--brand-primary)] neon-glow-primary'
                      : 'bg-[var(--bg-elevated)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]/50'
                      }`}
                  >
                    {subject}
                  </button>
                ))}
              </div>
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
