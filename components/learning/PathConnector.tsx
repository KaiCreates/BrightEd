'use client'

import { motion } from 'framer-motion'

interface PathConnectorProps {
    fromIndex: number
    isCompleted: boolean
    isNext: boolean
    variant?: 'straight' | 'left' | 'right'
}

export default function PathConnector({
    fromIndex,
    isCompleted,
    isNext,
    variant = 'straight'
}: PathConnectorProps) {
    const rotation = variant === 'left' ? '-30deg' : variant === 'right' ? '30deg' : '0deg'

    return (
        <div className="relative h-12 w-full flex justify-center">
            {/* Path Line */}
            <motion.div
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: fromIndex * 0.1 + 0.2 }}
                className="relative w-3 h-full origin-top"
                style={{ transform: `rotate(${rotation})` }}
            >
                {/* Background Line */}
                <div className="absolute inset-0 bg-[var(--border-subtle)] rounded-full" />

                {/* Progress Fill */}
                {isCompleted && (
                    <motion.div
                        initial={{ height: '0%' }}
                        animate={{ height: '100%' }}
                        transition={{ duration: 0.5, delay: fromIndex * 0.1 }}
                        className="absolute top-0 left-0 right-0 bg-gradient-to-b from-[var(--state-success)] to-green-400 rounded-full"
                    />
                )}

                {/* Pulse for next node */}
                {isNext && !isCompleted && (
                    <motion.div
                        animate={{
                            opacity: [0.3, 0.8, 0.3],
                            height: ['0%', '100%', '0%']
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute top-0 left-0 right-0 bg-gradient-to-b from-[var(--brand-primary)] to-transparent rounded-full"
                    />
                )}
            </motion.div>

            {/* Dots decoration */}
            <div className="absolute top-1/2 -translate-y-1/2 flex gap-1">
                {[...Array(3)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: fromIndex * 0.1 + i * 0.1 }}
                        className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-[var(--state-success)]' : 'bg-[var(--border-subtle)]'}`}
                    />
                ))}
            </div>
        </div>
    )
}
