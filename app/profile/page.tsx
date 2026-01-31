'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

export default function ProfileRedirectPage() {
  const router = useRouter()
  const { user, userData, loading } = useAuth()

  useEffect(() => {
    if (loading) return

    if (user && userData?.username) {
      router.replace(`/profile/${userData.username}`)
    } else if (!user) {
      router.replace('/login')
    }
  }, [user, userData, loading, router])

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]"></div>
    </div>
  )
}
