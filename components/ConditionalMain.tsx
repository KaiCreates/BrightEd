'use client'

import { usePathname } from 'next/navigation'

export function ConditionalMain({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isImmersivePractical = pathname?.startsWith('/practicals/technology-practicality')

  return <main className={isImmersivePractical ? 'relative min-h-screen' : 'relative min-h-screen pt-24'}>{children}</main>
}
