'use client'

import React from 'react'
import { motion } from 'framer-motion'

interface DuoProgressBarProps {
    progress: number // 0-100
}

export function DuoProgressBar({ progress }: DuoProgressBarProps) {
    return (
        <div className="flex-1 h-4 bg-[var(--bg-secondary)] rounded-full overflow-hidden relative">
            {/* Background track */}
            <div className="absolute inset-0 bg-[var(--border-subtle)]" />

            {/* Progress fill */}
            <motion.div
                className="h-full rounded-full relative overflow-hidden"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                transition={{ type: 'spring', stiffness: 100, damping: 15 }}
                style={{
                    background: 'linear-gradient(90deg, #58CC02, #46A302)'
                }}
            >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/30 to-transparent" />

                {/* Animated shimmer */}
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                    animate={{ x: ['-100%', '200%'] }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
            </motion.div>
        </div>
    )
}

interface DuoSessionLayoutProps {
    children: React.ReactNode
    currentStep: number
    totalSteps: number
    hearts?: number
    streak?: number
    onClose?: () => void
    footer?: React.ReactNode
}

export function DuoSessionLayout({
    children,
    currentStep,
    totalSteps,
    hearts = 5,
    streak = 0,
    onClose,
    footer
}: DuoSessionLayoutProps) {
    const progress = ((currentStep + 1) / totalSteps) * 100

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
            {/* Top Bar */}
            <header className="sticky top-0 z-40 bg-[var(--bg-primary)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)]">
                <div className="w-full max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
                    {/* Close Button */}
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>

                    {/* Progress Bar */}
                    <DuoProgressBar progress={progress} />

                    {/* Stats */}
                    <div className="flex items-center gap-3">
                        {/* Streak */}
                        {streak > 0 && (
                            <div className="flex items-center gap-1">
                                <span className="text-xl">🔥</span>
                                <span className="font-black text-orange-500">{streak}</span>
                            </div>
                        )}

                        {/* Hearts */}
                        <div className="flex items-center gap-1">
                            <motion.span
                                className="text-xl"
                                animate={hearts <= 2 ? { scale: [1, 1.2, 1] } : {}}
                                transition={{ duration: 0.5, repeat: hearts <= 2 ? Infinity : 0 }}
                            >
                                ❤️
                            </motion.span>
                            <span className={`font-black ${hearts <= 2 ? 'text-red-500' : 'text-red-400'}`}>
                                {hearts}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-start w-full max-w-4xl mx-auto px-4 pb-32 pt-6 md:pt-10">
                {children}
            </main>

            {/* Footer */}
            {footer && (
                <div className="fixed bottom-0 left-0 right-0 bg-[var(--bg-primary)]/95 backdrop-blur-xl border-t border-[var(--border-subtle)] z-50">
                    <div className="max-w-4xl mx-auto px-4 py-4 md:py-6">
                        {footer}
                    </div>
                </div>
            )}
        </div>
    )
}
