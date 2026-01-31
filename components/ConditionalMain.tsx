'use client'

import { usePathname } from 'next/navigation'

export function ConditionalMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isImmersivePractical = pathname?.startsWith('/practicals/technology-practicality')
  const isLandingPage = pathname === '/' || pathname === '/landing' || pathname === '/signup' || pathname === '/login' || pathname?.startsWith('/welcome')

  return <main className={(isImmersivePractical || isLandingPage) ? 'relative min-h-screen' : 'relative min-h-screen pt-24'}>{children}</main>
}
