'use client'

import { motion } from 'framer-motion'

interface DuoMascotBubbleProps {
    content: string
    emotion?: string
}

export function DuoMascotBubble({ content, emotion = 'owl-happy' }: DuoMascotBubbleProps) {
    return (
        <div className="flex items-center gap-6 md:gap-10 w-full max-w-3xl mb-12">
            {/* Mascot */}
            <div className="w-28 h-28 md:w-36 md:h-36 shrink-0 relative flex items-center justify-center">
                <motion.div
                    animate={{
                        y: [0, -8, 0],
                    }}
                    transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className={`owl-sprite ${emotion}`}
                    style={{ transform: 'scale(1.5)', transformOrigin: 'center' }}
                />
            </div>

            {/* Speech Bubble */}
            <div className="flex-1 relative">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, x: 20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    className="bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] rounded-2xl p-5 md:p-8 shadow-sm relative"
                >
                    <p className="text-xl md:text-2xl font-bold leading-relaxed text-[var(--text-primary)]">
                        {content}
                    </p>

                    {/* Bubble Arrow */}
                    <div className="absolute left-[-10px] top-1/2 -translate-y-1/2 w-5 h-5 bg-[var(--bg-elevated)] border-l-2 border-b-2 border-[var(--border-subtle)] rotate-45" />
                </motion.div>
            </div>
        </div>
    )
}
