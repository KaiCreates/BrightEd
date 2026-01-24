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
    <div className="min-h-screen bg-gradient-to-br from-teal-deep via-teal-medium to-teal-light flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl text-center max-w-md">
        <h2 className="text-3xl font-heading font-bold text-navy-dark mb-4">
          Something went wrong!
        </h2>
        <p className="text-gray-dark mb-6">
          We encountered an error. Please try again.
        </p>
        <div className="flex space-x-4 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-orange-soft hover:bg-orange-warm text-white font-semibold rounded-lg transition-all"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-gray-light hover:bg-gray-medium text-navy-dark font-semibold rounded-lg transition-all"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  )
}
