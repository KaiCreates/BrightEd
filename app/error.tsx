'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[var(--bg-primary)] flex items-center justify-center p-4 safe-padding">
      <div className="bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] rounded-3xl p-8 shadow-xl text-center max-w-md w-full animate-bounce-in safe-padding">
        <div className="text-6xl mb-6">🙈</div>
        <h2 className="text-3xl font-heading font-black text-[var(--text-primary)] mb-4 leading-tight">
          Whoops!
        </h2>
        <p className="text-[var(--text-secondary)] font-medium mb-8">
          Something went wrong. Let&apos;s get you back on track.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={reset}
            className="duo-btn duo-btn-primary w-full sm:w-auto"
          >
            Try again
          </button>
          <Link
            href="/home"
            className="duo-btn duo-btn-secondary w-full sm:w-auto"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
