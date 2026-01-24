'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function RootPage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    // If we are still initializing auth, don't do anything yet
    if (loading) return

    if (!user) {
      // User is not authenticated, redirect to landing
      router.push('/landing')
    } else {
      // User is authenticated, check onboarding status
      const checkOnboarding = async () => {
        try {
          const { doc, getDoc } = await import('firebase/firestore')
          const { db } = await import('@/lib/firebase')
          
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          const userData = userDoc.data()
          
          if (userData?.onboardingCompleted) {
            router.push('/home')
          } else {
            router.push('/onboarding')
          }
        } catch (error) {
          console.error('Error checking onboarding status:', error)
          router.push('/onboarding')
        }
      }
      
      checkOnboarding()
    }
  }, [user, loading, router])

  // Show loading while transitioning
  if (loading) {
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
