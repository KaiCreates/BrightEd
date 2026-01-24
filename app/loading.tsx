export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-deep via-teal-medium to-teal-light flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p>Loading...</p>
      </div>
    </div>
  )
}
