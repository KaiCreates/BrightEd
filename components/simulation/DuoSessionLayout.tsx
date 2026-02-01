'use client'

import React from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { DuoProgressBar } from './DuoProgressBar'

interface DuoSessionLayoutProps {
    children: React.ReactNode
    currentStep: number
    totalSteps: number
    hearts?: number
    onClose?: () => void
    footer?: React.ReactNode
}

export function DuoSessionLayout({
    children,
    currentStep,
    totalSteps,
    hearts = 5,
    onClose,
    footer
}: DuoSessionLayoutProps) {
    const progress = ((currentStep + 1) / totalSteps) * 100

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col">
            {/* Top Bar */}
            <div className="w-full max-w-5xl mx-auto px-4 py-6 md:py-8 flex items-center gap-4">
                <button
                    onClick={onClose}
                    className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors p-2"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                <DuoProgressBar progress={progress} />

                <div className="flex items-center gap-1.5 ml-2">
                    <span className="text-xl md:text-2xl filter drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">❤️</span>
                    <span className="text-lg font-black text-red-500">{hearts}</span>
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-start w-full max-w-5xl mx-auto px-4 pb-32 pt-8 md:pt-12">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="w-full"
                    >
                        {children}
                    </motion.div>
                </AnimatePresence>
            </main>

            {/* Footer */}
            {footer && (
                <div className="fixed bottom-0 left-0 right-0 border-t-2 border-[var(--border-subtle)] bg-[var(--bg-primary)]/80 backdrop-blur-xl z-50">
                    <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 flex items-center justify-between gap-4">
                        {footer}
                    </div>
                </div>
            )}
        </div>
    )
}
