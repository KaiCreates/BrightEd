'use client'

import { motion } from 'framer-motion'

interface StreakIndicatorProps {
  days: number
}

export function StreakIndicator({ days }: StreakIndicatorProps) {
  return (
    <div className="flex items-center space-x-4">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-5xl"
      >
        🔥
      </motion.div>
      <div>
        <div className="text-3xl font-heading font-bold text-yellow-warm">
          {days} days
        </div>
        <div className="text-sm text-gray-dark">
          Keep it up! You&apos;re on a roll.
        </div>
      </div>
    </div>
  )
}
