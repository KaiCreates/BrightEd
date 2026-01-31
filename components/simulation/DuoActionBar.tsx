'use client'

import { motion } from 'framer-motion'

interface DuoActionBarProps {
    status: 'idle' | 'selected' | 'correct' | 'wrong'
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
    const bgColor = status === 'correct' ? 'bg-[#d7ffb8]' : status === 'wrong' ? 'bg-[#ffdfe0]' : 'bg-[var(--bg-primary)]'
    const textColor = status === 'correct' ? 'text-[#46a302]' : status === 'wrong' ? 'text-[#ea2b2b]' : 'text-[var(--text-primary)]'
    const buttonColor = status === 'correct' ? 'bg-[#58cc02] border-[#46a302]' : status === 'wrong' ? 'bg-[#ff4b4b] border-[#ea2b2b]' : 'bg-[#58cc02] border-[#46a302]'
    const buttonDisabled = status === 'idle'

    return (
        <div className={`fixed bottom-0 left-0 right-0 border-t-2 border-black/5 ${bgColor} transition-colors duration-300 z-50`}>
            <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 flex flex-col md:flex-row items-center justify-between gap-6">

                {/* Feedback Section */}
                {isFeedback ? (
                    <div className="flex items-center gap-4 flex-1">
                        <div className={`w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center text-3xl md:text-4xl bg-white shadow-lg`}>
                            {status === 'correct' ? '✅' : '❌'}
                        </div>
                        <div>
                            <h3 className={`text-2xl md:text-3xl font-black ${textColor} leading-tight`}>
                                {feedbackTitle || (status === 'correct' ? 'Awesome!' : 'Not quite...')}
                            </h3>
                            <p className={`text-base md:text-lg font-bold opacity-90 ${textColor}`}>
                                {feedbackMessage}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="hidden md:block flex-1">
                        <motion.button
                            whileHover={{ backgroundColor: 'rgba(0,0,0,0.05)' }}
                            whileTap={{ scale: 0.95 }}
                            className="px-8 py-4 rounded-2xl font-black text-[var(--text-muted)] border-2 border-[var(--border-subtle)] hover:bg-black/5 transition-all uppercase tracking-widest text-sm"
                        >
                            Skip
                        </motion.button>
                    </div>
                )}

                {/* Action Button */}
                <div className="w-full md:w-auto">
                    {isFeedback ? (
                        <motion.button
                            whileTap={{ y: 2 }}
                            onClick={onContinue}
                            className={`w-full md:min-w-[200px] py-4 md:py-5 rounded-2xl font-black text-white text-lg md:text-xl uppercase tracking-widest border-b-[6px] transition-all active:border-b-0 active:translate-y-[4px] ${buttonColor}`}
                        >
                            Continue
                        </motion.button>
                    ) : (
                        <motion.button
                            disabled={buttonDisabled}
                            whileTap={!buttonDisabled ? { y: 2 } : {}}
                            onClick={onCheck}
                            className={`w-full md:min-w-[200px] py-4 md:py-5 rounded-2xl font-black text-white text-lg md:text-xl uppercase tracking-widest border-b-[6px] transition-all
                ${buttonDisabled
                                    ? 'bg-[#e5e5e5] border-[#afafaf] border-b-0 cursor-not-allowed opacity-70 text-[#afafaf]'
                                    : 'bg-[#58cc02] border-[#46a302] hover:bg-[#61e002] active:border-b-0 active:translate-y-[4px] shadow-lg shadow-green-500/20'}
              `}
                        >
                            Check
                        </motion.button>
                    )}
                </div>
            </div>
        </div>
    )
}
