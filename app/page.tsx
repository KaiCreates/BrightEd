'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function RootPage() {
  const router = useRouter()
  const { user, loading, authHint } = useAuth()

  useEffect(() => {
    // If we are still initializing auth, don't do anything yet
    if (loading) return

    if (!user) {
      // If we are NOT loading and there's definitely no user...
      // But wait! If authHint is true, it might be a transient state where Firebase 
      // hasn't quite caught up yet (though usually 'loading' handles this).
      // If loading is false and user is null, Firebase says no user.
      router.push('/landing')
    } else {
      // User is authenticated
      const onboardingData = localStorage.getItem('brighted_onboarding')

      if (onboardingData) {
        router.push('/home')
      } else {
        // Double check Firestore if local storage is empty
        router.push('/onboarding')
      }
    }
  }, [user, loading, router])

  // Show loading while transitioning or if we expect a user (authHint)
  if (loading || (authHint && !user)) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]"></div>
          <p className="text-[var(--text-muted)] font-bold text-xs uppercase tracking-widest animate-pulse">Establishing Session...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]"></div>
    </div>
  )
}
