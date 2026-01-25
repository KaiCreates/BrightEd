'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

const PUBLIC_PATHS = new Set<string>(['/landing', '/login', '/signup'])

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() || '/'
  const { user, userData, loading } = useAuth()

  useEffect(() => {
    if (loading) return

    const isPublic = PUBLIC_PATHS.has(pathname)

    const isOnboarding = pathname.startsWith('/onboarding')

    if (!user) {
      if (!isPublic) {
        router.replace('/landing')
      }
      return
    }

    // Signed in
    const target = userData?.onboardingCompleted ? '/home' : '/onboarding'

    // If onboarding is done, keep users out of onboarding routes.
    if (userData?.onboardingCompleted && isOnboarding) {
      router.replace('/home')
      return
    }

    if (pathname === '/' || isPublic) {
      router.replace(target)
    }
  }, [loading, user, userData?.onboardingCompleted, pathname, router])

  // Avoid rendering app content while we don't know auth state yet.
  // This removes flicker between signed-out and signed-in UIs.
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]" />
          <p className="text-[var(--text-muted)] font-bold text-xs uppercase tracking-widest animate-pulse">
            Establishing Session...
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
