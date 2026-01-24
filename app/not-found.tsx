import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-deep via-teal-medium to-teal-light flex items-center justify-center p-4">
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-8 shadow-xl text-center max-w-md">
        <h2 className="text-4xl font-heading font-bold text-navy-dark mb-4">
          404
        </h2>
        <p className="text-lg text-gray-dark mb-6">
          Page not found. The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-orange-soft hover:bg-orange-warm text-white font-semibold rounded-lg transition-all"
        >
          Return home
        </Link>
      </div>
    </div>
  )
}
