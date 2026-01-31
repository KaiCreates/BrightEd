'use client'

import { usePathname } from 'next/navigation'
import { Navigation } from './Navigation'

export function ConditionalNavigation() {
  const pathname = usePathname()
  const isOnboardingPage = pathname?.startsWith('/onboarding')
  const isLandingPage = pathname === '/' || pathname === '/landing' || pathname === '/signup' || pathname === '/login' || pathname?.startsWith('/welcome')
  const isImmersivePractical = pathname?.startsWith('/practicals/technology-practicality')

  // Hide navigation on onboarding pages
  if (isOnboardingPage) {
    return <Navigation variant="minimal" />
  }

  // Hide navigation on immersive practicals AND landing page (which has its own header)
  if (isImmersivePractical || isLandingPage) {
    return null
  }

  // Show navigation on all other pages
  return <Navigation />
}
