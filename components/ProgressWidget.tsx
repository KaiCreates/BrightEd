'use client'

import { motion } from 'framer-motion'

interface ProgressBarProps {
  label: string
  percentage: number
  color: string
}

function ProgressBar({ label, percentage, color }: ProgressBarProps) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-navy-dark">{label}</span>
        <span className="text-sm font-mono text-gray-dark">{percentage}%</span>
      </div>
      <div className="w-full bg-gray-medium rounded-full h-3 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full rounded-full ${color}`}
        />
      </div>
    </div>
  )
}

export function ProgressWidget() {
  const topics = [
    { label: 'Mathematics', percentage: 75, color: 'bg-yellow-warm' },
    { label: 'Principles of Business', percentage: 60, color: 'bg-orange-soft' },
    { label: 'Economics', percentage: 45, color: 'bg-purple-light' },
  ]

  return (
    <div>
      {topics.map((topic, index) => (
        <motion.div
          key={topic.label}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <ProgressBar {...topic} />
        </motion.div>
      ))}
    </div>
  )
}
