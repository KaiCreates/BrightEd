'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

interface DuoActionBarProps {
    status: 'idle' | 'selected' | 'correct' | 'wrong' | 'continue'
    onCheck: () => void
    onContinue: () => void
    feedbackMessage?: string
    feedbackTitle?: string
}

export function DuoActionBar({
    status,
    onCheck,
    onContinue,
    feedbackMessage,
    feedbackTitle
}: DuoActionBarProps) {
    const isFeedback = status === 'correct' || status === 'wrong'

    // Derived styles based on status
    const containerBg = status === 'correct' ? 'bg-[#d7ffb8]' : status === 'wrong' ? 'bg-[#ffdfe0]' : 'bg-[var(--bg-elevated)]'
    const borderColor = status === 'correct' ? 'border-[#b8f28b]' : status === 'wrong' ? 'border-[#ffc1c1]' : 'border-[var(--border-subtle)]'
    const textColor = status === 'correct' ? 'text-[#58cc02]' : status === 'wrong' ? 'text-[#ea2b2b]' : 'text-[var(--text-primary)]'

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={status}
                initial={{ y: 100 }}
                animate={{ y: 0 }}
                exit={{ y: 100 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className={`fixed bottom-0 left-0 right-0 border-t-2 ${containerBg} ${borderColor} pb-6 pt-4 md:pb-8 md:pt-6 px-4 z-50`}
            >
                <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 md:gap-8">

                    {/* Feedback Text section */}
                    <div className="flex-1 w-full md:w-auto">
                        {isFeedback ? (
                            <div className="flex items-center gap-4">
                                <div className={`
                                    w-16 h-16 rounded-full flex items-center justify-center text-3xl bg-white shadow-sm shrink-0
                                    ${status === 'correct' ? 'text-[#58cc02]' : 'text-[#ea2b2b]'}
                                `}>
                                    {status === 'correct' ? '✓' : '✗'}
                                </div>
                                <div>
                                    <h3 className={`text-xl md:text-2xl font-black ${textColor} mb-1`}>
                                        {feedbackTitle || (status === 'correct' ? 'Excellent!' : 'Correct solution:')}
                                    </h3>
                                    {feedbackMessage && (
                                        <p className={`${status === 'correct' ? 'text-[#58cc02]/80' : 'text-[#ea2b2b]/80'} font-medium`}>
                                            {feedbackMessage}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="hidden md:block">
                                <button className="px-6 py-3 rounded-2xl font-bold text-[var(--text-muted)] border-2 border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] hover:border-[var(--border-strong)] transition-all uppercase tracking-wider text-sm">
                                    Skip
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Action Button */}
                    <div className="w-full md:w-auto">
                        {(isFeedback || status === 'continue') ? (
                            <button
                                onClick={onContinue}
                                className={`
                                    w-full md:min-w-[200px] h-14 rounded-2xl font-black text-white text-lg uppercase tracking-widest border-b-[4px] active:border-b-0 active:translate-y-[4px] transition-all
                                    ${status === 'wrong' ? 'bg-[#ff4b4b] border-[#ea2b2b]' : 'bg-[#58cc02] border-[#46a302]'}
                                `}
                            >
                                Continue
                            </button>
                        ) : (
                            <button
                                onClick={onCheck}
                                disabled={status === 'idle'}
                                className={`
                                    w-full md:min-w-[200px] h-14 rounded-2xl font-black text-white text-lg uppercase tracking-widest border-b-[4px] active:border-b-0 active:translate-y-[4px] transition-all
                                    ${status === 'idle'
                                        ? 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-muted)] cursor-not-allowed border-b-0'
                                        : 'bg-[#58cc02] border-[#46a302] hover:bg-[#61e002]'
                                    }
                                `}
                            >
                                Check
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
