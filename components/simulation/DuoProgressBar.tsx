'use client'

import { motion } from 'framer-motion'

interface DuoProgressBarProps {
    progress: number // 0 to 100
    color?: string
}

export function DuoProgressBar({ progress, color = 'var(--brand-primary)' }: DuoProgressBarProps) {
    return (
        <div className="flex-1 h-4 bg-black/20 rounded-full overflow-hidden relative">
            <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ type: 'spring', bounce: 0, duration: 0.6 }}
                style={{ backgroundColor: color }}
                className="h-full rounded-full relative"
            >
                {/* Shine/Highlight Effect */}
                <div className="absolute top-1 left-1 right-1 h-1 bg-white/20 rounded-full" />
            </motion.div>
        </div>
    )
}
