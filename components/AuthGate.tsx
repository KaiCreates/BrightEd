'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const PUBLIC_PATHS = new Set<string>(['/', '/landing', '/login', '/signup', '/welcome'])
const ONBOARDING_PATHS = ['/welcome']
const PROTECTED_PATHS = ['/home', '/community', '/learn', '/simulate', '/lesson', '/leaderboard', '/profile', '/achievements', '/practicals', '/progress']

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() || '/'
  const { user, userData, loading } = useAuth()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    if (loading) return

    const isPublic = PUBLIC_PATHS.has(pathname) || pathname.startsWith('/welcome')
    const isOnboarding = pathname.startsWith('/welcome') && !pathname.includes('/diagnostic')
    const isDiagnostic = pathname.includes('/welcome/diagnostic')
    const isProtected = PROTECTED_PATHS.some(p => pathname.startsWith(p))

    // Not logged in
    if (!user) {
      if (!isPublic) {
        router.replace('/')
      }
      setIsChecking(false)
      return
    }

    // Check completion status from userData (Firestore) with localStorage fallback
    // This prevents random redirects to /welcome if Firestore is slow or flickering
    const localOnboarding = typeof window !== 'undefined' ? localStorage.getItem('brighted_onboarding_complete') === 'true' : false
    const localDiagnostic = typeof window !== 'undefined' ? localStorage.getItem('brighted_diagnostic_complete') === 'true' : false

    const onboardingDone = userData?.onboardingCompleted === true || localOnboarding
    const diagnosticDone = userData?.diagnosticCompleted === true || localDiagnostic

    // Sync TO localStorage for fast checks on subsequent loads
    if (typeof window !== 'undefined') {
      if (userData?.onboardingCompleted === true) localStorage.setItem('brighted_onboarding_complete', 'true')
      if (userData?.diagnosticCompleted === true) localStorage.setItem('brighted_diagnostic_complete', 'true')
    }

    // Route logic
    if (!onboardingDone) {
      // User hasn't completed basic onboarding
      if (!isOnboarding || isDiagnostic) {
        // Double check loading state before forcing redirect
        if (!loading && userData !== undefined) {
          router.replace('/welcome')
          setIsChecking(false)
          return
        }
      }
    } else if (!diagnosticDone) {
      // Onboarding done, but diagnostic not done
      if (isProtected || pathname === '/') {
        // Block protected routes, force to diagnostic
        router.replace('/welcome/diagnostic')
        setIsChecking(false)
        return
      }
      // Allow access to diagnostic page
      if (isOnboarding && !isDiagnostic) {
        // If they try to go back to regular onboarding, push to diagnostic
        router.replace('/welcome/diagnostic')
        setIsChecking(false)
        return
      }
    } else {
      // Both complete - user has full access
      // Redirect away from onboarding and diagnostic if fully done
      if (isOnboarding || isDiagnostic) {
        router.replace('/home')
        setIsChecking(false)
        return
      }
      // Redirect root to home
      if (pathname === '/' || (isPublic && !isProtected)) {
        router.replace('/home')
        setIsChecking(false)
        return
      }
    }

    setIsChecking(false)
  }, [loading, user, userData, pathname, router])

  // Show loading while checking auth state
  if (loading || isChecking) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--brand-primary)]/20 border-t-[var(--brand-primary)]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl">🦉</span>
            </div>
          </div>
          <p className="text-[var(--text-muted)] font-bold text-sm uppercase tracking-widest animate-pulse">
            Loading BrightEd...
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

