'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { z } from 'zod'
import { useAuth } from '@/lib/auth-context'

// Force dynamic rendering to avoid static generation issues
export const dynamic = 'force-dynamic'

// --- Types & Constants ---

const SignUpSchema = z.object({
  firstName: z.string().min(2, 'First name is too short'),
  lastName: z.string().min(2, 'Last name is too short'),
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100, 'Password too long'),
  username: z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username too long').regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
})

const MascotOwl = ({ pose = 'owl-happy', size = 'sm' }: { pose?: string, size?: 'sm' | 'md' | 'lg' }) => {
  const sizes = { sm: 48, md: 96, lg: 192 }
  const pixels = sizes[size]

  const poses: Record<string, number> = {
    'owl-happy': 0, 'owl-relieved': 1, 'owl-shocked': 2, 'owl-sad-rain': 3,
    'owl-thinking': 4, 'owl-sad-cloud': 5, 'owl-idea': 6, 'owl-smart': 7,
    'owl-wink': 8, 'owl-confused': 9, 'owl-reading': 10, 'owl-studying': 11,
    'owl-sleeping': 12, 'owl-magic': 13, 'owl-zzz': 14, 'owl-bored': 15
  }
  const index = poses[pose] || 0
  const row = Math.floor(index / 4)
  const col = index % 4

  const posX = (col * 100) / 3
  const posY = (row * 100) / 3

  return (
    <div
      style={{
        width: `${pixels}px`,
        height: `${pixels}px`,
        backgroundImage: "url('/professor-bright-sprite.png')",
        backgroundSize: '400% 400%',
        backgroundPosition: `${posX}% ${posY}%`,
        imageRendering: 'pixelated',
        flexShrink: 0
      }}
      className="flex-shrink-0"
    />
  )
}

// --- Main Component ---

export default function SignUpPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [termsAccepted, setTermsAccepted] = useState(false)

  const subjectsParam = searchParams?.get('subjects')
  const hasSubjects = !!subjectsParam
  const notifyParam = searchParams?.get('notify')

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    username: '',
    subjects: subjectsParam?.split(',') || []
  })

  // Redirect handled by AuthGate
  /*
  useEffect(() => {
    if (!authLoading && user) {
      router.push('/home')
    }
  }, [user, authLoading, router])
  */

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!hasSubjects) {
      router.push('/welcome')
      return
    }

    if (!termsAccepted) {
      setError('Please accept the Privacy Policy and Terms & Conditions to continue.')
      return
    }

    const { isFirebaseReady } = await import('@/lib/firebase')
    if (!isFirebaseReady) {
      setError("Authentication service is temporarily unavailable. Please try again later.")
      return
    }

    setLoading(true)

    try {
      // Validate form
      const validationResult = SignUpSchema.safeParse({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        username: formData.username.trim(),
      })

      if (!validationResult.success) {
        const msg = (validationResult as any).error?.errors[0]?.message || "Validation failed";
        throw new Error(msg)
      }

      const validatedData = validationResult.data

      // 1. Create User
      const { createUserWithEmailAndPassword, updateProfile } = await import('firebase/auth')
      const { auth, db } = await import('@/lib/firebase')
      if (!auth || !db) throw new Error("Firebase services not initialized");
      const { doc, setDoc, collection, writeBatch } = await import('firebase/firestore')

      const userCredential = await createUserWithEmailAndPassword(auth, validatedData.email, validatedData.password)
      const newUser = userCredential.user

      // Update display name immediately
      await updateProfile(newUser, { displayName: `${validatedData.firstName} ${validatedData.lastName}` })

      // 2. Prepare User Data (Bypassing Onboarding)
      const userDocRef = doc(db, 'users', newUser.uid)

      const lvlsParam = searchParams?.get('lvls')
      const diagnosticMastery = searchParams?.get('mastery')
      const diagStatsParam = searchParams?.get('diag_stats')

      // Capture Onboarding Data
      const examParam = searchParams?.get('exam')
      const schoolParam = searchParams?.get('school')
      const countryParam = searchParams?.get('country')
      const formParam = searchParams?.get('form')

      let proficiencyMap: Record<string, string> = {}
      try {
        if (lvlsParam) proficiencyMap = JSON.parse(lvlsParam)
      } catch (e) {
        console.error('Failed to parse lvls:', e)
      }

      const subjectProgress: Record<string, number> = {}
      formData.subjects.forEach(s => {
        // If we have a specific diagnostic mastery, we could apply it globally or to specific subjects
        // For now, if diagnosticMastery exists, we use it as the base.
        const baseMastery = diagnosticMastery ? parseFloat(diagnosticMastery) : (parseInt(proficiencyMap[s] || '1') * 0.1)
        subjectProgress[s] = baseMastery
      })

      await setDoc(userDocRef, {
        uid: newUser.uid,
        username: validatedData.username,
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        displayName: `${validatedData.firstName} ${validatedData.lastName}`,
        email: validatedData.email,
        mastery: diagnosticMastery ? parseFloat(diagnosticMastery) : 0.1,
        streak: 1,
        xp: 50,
        bCoins: 100,
        hasBusiness: false,
        businessID: null,
        consistency: 10,
        subjectProgress,
        subjects: formData.subjects,
        proficiencies: proficiencyMap,
        diagnosticStats: diagStatsParam ? JSON.parse(diagStatsParam) : null,
        diagnosticCompleted: !!diagnosticMastery,
        onboardingCompleted: true,
        onboardingCompletedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        examTrack: examParam || 'CSEC',
        formLevel: formParam || '3',
        country: countryParam || 'Trinidad and Tobago',
        school: schoolParam || null,
        notificationPermission: notifyParam || null
      })

      // 3. Initialize Learning Path
      try {
        const { paths } = await fetch(
          '/api/learning-path?' + new URLSearchParams({ subjects: formData.subjects.join(',') })
        ).then((res) => res.json())

        if (paths) {
          const batch = writeBatch(db)
          const progressRef = collection(userDocRef, 'progress')
          let isFirstModule = true

          for (const [subj, objectives] of Object.entries(paths)) {
            // eslint-disable-next-line
            const objectivesList = objectives as any[]
            for (const obj of objectivesList) {
              const moduleRef = doc(progressRef, obj.id)
              batch.set(moduleRef, {
                moduleId: obj.id,
                subject: subj,
                isUnlocked: isFirstModule,
                status: isFirstModule ? 'active' : 'locked',
                mastery: 0,
                attempts: 0,
              })
              if (isFirstModule) isFirstModule = false
            }
          }
          await batch.commit()
        }
      } catch (pathError) {
        console.error("Failed to init learning path:", pathError)
      }

      const diagParams = new URLSearchParams()
      diagParams.set('subjects', formData.subjects.join(','))
      diagParams.set('lvls', lvlsParam || '{}')
      router.push(`/welcome/diagnostic?${diagParams.toString()}`)
    } catch (err: any) {
      console.error('Signup Error:', err)
      if (err.message?.includes('Firebase configuration is missing') || err.code === 'auth/configuration-not-found') {
        setError('Authentication service is temporarily unavailable. Please contact support or try again later.')
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists.')
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Please use a stronger password.')
      } else if (err.code === 'auth/network-request-failed') {
        setError('Connection problem. Please check your internet and try again.')
      } else if (err.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.')
      } else {
        setError(err.message || 'An unexpected error occurred. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans flex items-center justify-center p-4">

      {/* Header / Logo */}
      <div className="absolute top-6 left-6 flex items-center gap-2">
        <MascotOwl pose="owl-happy" size="sm" />
        <span className="font-heading font-extrabold text-2xl text-[var(--brand-secondary)] tracking-tighter">BrightEd</span>
      </div>

      <AnimatePresence mode="wait">
        {!hasSubjects ? (
          <motion.div
            key="redirect"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-8 text-center"
          >
            <MascotOwl pose="owl-smart" size="lg" />
            <div>
              <h2 className="text-3xl font-extrabold text-[var(--text-primary)]">Ready to learn?</h2>
              <p className="text-[var(--text-secondary)] font-bold mt-2">First, let&apos;s pick your subjects!</p>
            </div>
            <Link
              href="/welcome"
              className="bg-[var(--brand-secondary)] hover:bg-[#4f46e5] text-white font-extrabold px-12 py-4 rounded-2xl border-b-4 border-[#4338ca] active:border-b-0 active:translate-y-1 transition-all tracking-widest uppercase shadow-lg shadow-indigo-500/10"
            >
              GET STARTED
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <div className="text-center mb-8">
              <div className="flex justify-center mb-4">
                <MascotOwl pose="owl-happy" size="md" />
              </div>
              <h2 className="text-3xl font-extrabold text-[var(--text-primary)]">Create your profile</h2>
              <p className="text-[var(--text-secondary)] font-bold mt-2">To save your progress!</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="First Name"
                  className="w-full p-4 rounded-2xl border-2 border-[var(--border-subtle)] focus:border-[var(--brand-secondary)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold outline-none transition-all"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                />
                <input
                  type="text"
                  placeholder="Last Name"
                  className="w-full p-4 rounded-2xl border-2 border-[var(--border-subtle)] focus:border-[var(--brand-secondary)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold outline-none transition-all"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                />
              </div>
              <input
                type="text"
                placeholder="Username"
                className="w-full p-4 rounded-2xl border-2 border-[var(--border-subtle)] focus:border-[var(--brand-secondary)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold outline-none transition-all"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                required
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full p-4 rounded-2xl border-2 border-[var(--border-subtle)] focus:border-[var(--brand-secondary)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold outline-none transition-all"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full p-4 rounded-2xl border-2 border-[var(--border-subtle)] focus:border-[var(--brand-secondary)] bg-[var(--bg-elevated)] text-[var(--text-primary)] font-bold outline-none transition-all"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
              />

              <label className="flex items-start gap-3 rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-4 text-sm font-bold text-[var(--text-secondary)]">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[var(--border-subtle)] text-[var(--brand-secondary)]"
                  required
                />
                <span>
                  I agree to the{' '}
                  <a
                    href="/privacy-policy.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--brand-secondary)] underline"
                  >
                    Privacy Policy
                  </a>{' '}
                  and{' '}
                  <a
                    href="/terms-and-conditions.pdf"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[var(--brand-secondary)] underline"
                  >
                    Terms &amp; Conditions
                  </a>.
                </span>
              </label>

              {error && (
                <div className="p-4 bg-red-50 text-red-500 font-bold rounded-2xl border-2 border-red-100 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[var(--brand-secondary)] hover:bg-[#4f46e5] text-white font-extrabold py-4 rounded-2xl border-b-4 border-[#4338ca] active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 tracking-widest uppercase mt-4 shadow-lg shadow-indigo-500/10"
              >
                {loading ? 'CREATING...' : 'CREATE ACCOUNT'}
              </button>
            </form>

            <p className="text-center mt-8 text-[var(--text-muted)] font-bold">
              Already have an account? <Link href="/login" className="text-[var(--brand-secondary)]">Log in</Link>
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
