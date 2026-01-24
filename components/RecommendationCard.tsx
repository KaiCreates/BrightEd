'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

interface RecommendationCardProps {
  title: string
  subject: string
  reason: string
  estimatedTime: string
  difficulty: string
  href: string
}

export function RecommendationCard({
  title,
  subject,
  reason,
  estimatedTime,
  difficulty,
  href,
}: RecommendationCardProps) {
  const difficultyColors = {
    Beginner: 'bg-green-500',
    Intermediate: 'bg-yellow-warm',
    Advanced: 'bg-orange-warm',
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-200"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <span className="inline-block px-3 py-1 bg-teal-light text-white text-xs font-semibold rounded-full mb-2">
            {subject}
          </span>
          <h3 className="text-2xl font-heading font-semibold text-navy-dark mb-2">
            {title}
          </h3>
        </div>
        <span className={`px-3 py-1 text-white text-xs font-semibold rounded-full ${
          difficultyColors[difficulty as keyof typeof difficultyColors] || 'bg-gray-medium'
        }`}>
          {difficulty}
        </span>
      </div>

      <p className="text-gray-dark mb-4">{reason}</p>

      <div className="flex items-center justify-between">
        <div className="flex items-center text-sm text-gray-dark">
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {estimatedTime}
        </div>
        <Link
          href={href}
          className="px-6 py-2 bg-orange-soft hover:bg-orange-warm text-white font-semibold rounded-lg transform hover:scale-105 transition-all duration-200"
        >
          Start
        </Link>
      </div>
    </motion.div>
  )
}
