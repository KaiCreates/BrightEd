'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FeedbackResponse } from '@/lib/professor-bright'

interface ProfessorBrightMascotProps {
    feedback: FeedbackResponse | null
    webMode?: boolean
    mini?: boolean // NEW: show only the mascot without bubble
}

export function ProfessorBrightMascot({ feedback, webMode = false, mini = false }: ProfessorBrightMascotProps) {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (feedback) {
            setIsVisible(true)
            if (!mini) {
                const timer = setTimeout(() => {
                    setIsVisible(false)
                }, 3000)
                return () => clearTimeout(timer)
            }
        }
    }, [feedback, mini])

    if (!feedback) return null;

    if (mini) {
        return (
            <div className="relative filter drop-shadow-xl">
                <div
                    className={`owl-sprite ${feedback.spriteClass} scale-75 md:scale-100`}
                    style={{
                        transformOrigin: 'bottom center'
                    }}
                />
            </div>
        )
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ x: 300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 300, opacity: 0 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                    className="fixed bottom-0 right-0 z-50 flex items-end p-4 md:p-8 pointer-events-none"
                >
                    {/* Speech Bubble */}
                    <div className="relative mr-4 mb-20 md:mb-24 w-64 md:w-80 pointer-events-auto">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className={`
                p-6 rounded-2xl rounded-br-none shadow-2xl relative
                ${feedback.tone === 'celebratory' ? 'bg-gradient-to-br from-yellow-400 to-amber-500 text-white' :
                                    feedback.tone === 'challenging' ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white' :
                                        feedback.tone === 'supportive' ? 'bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white' :
                                            'bg-white dark:bg-slate-800 text-slate-800 dark:text-white border-2 border-green-500'}
              `}
                        >
                            {/* Header */}
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xl">{feedback.emoji}</span>
                                <h4 className="font-black uppercase text-xs tracking-widest opacity-90">
                                    {feedback.tone === 'celebratory' ? 'Brilliant!' :
                                        feedback.tone === 'challenging' ? 'Challenge!' :
                                            feedback.tone === 'supportive' ? 'Hint:' : 'Correct!'}
                                </h4>
                            </div>

                            {/* Message */}
                            <p className="text-sm md:text-base font-bold leading-relaxed mb-2">
                                {feedback.message}
                            </p>

                            {/* Tip (Optional) */}
                            {feedback.tip && (
                                <div className="mt-2 pt-2 border-t border-black/10 dark:border-white/10 text-xs font-medium opacity-80 flex gap-1">
                                    <span>💡</span>
                                    <span>{feedback.tip}</span>
                                </div>
                            )}

                            {/* Arrow */}
                            <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-inherit transform rotate-45 skew-x-12" />
                        </motion.div>
                    </div>

                    {/* Large Sprite Mascot */}
                    <div className="relative pointer-events-auto filter drop-shadow-2xl">
                        {/* Scale up the 150px sprite to be larger (e.g. 1.5x = 225px) */}
                        <div
                            className={`owl-sprite ${feedback.spriteClass}`}
                            style={{
                                transform: 'scale(1.5)',
                                transformOrigin: 'bottom right'
                            }}
                        />
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
