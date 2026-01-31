'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()

  useEffect(() => {
    // The new flow handles onboarding during signup.
    // Any access to this route should redirect home.
    router.replace('/home')
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-white text-slate-400">
      <p>Redirecting to home...</p>
    </div>
  )
}
