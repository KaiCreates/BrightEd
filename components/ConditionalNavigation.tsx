'use client'

import { usePathname } from 'next/navigation'
import { Navigation } from './Navigation'

export function ConditionalNavigation() {
  const pathname = usePathname()
  const isOnboardingPage = pathname?.startsWith('/onboarding')
  const isLandingPage = pathname === '/landing' || pathname === '/signup' || pathname === '/login'

  // Hide navigation on onboarding pages
  if (isOnboardingPage) {
    return <Navigation variant="minimal" />
  }

  // Show navigation on all other pages (including landing)
  return <Navigation />
}
