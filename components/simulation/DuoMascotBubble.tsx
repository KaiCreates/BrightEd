'use client'

import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface DuoMascotBubbleProps {
    content: string
    emotion?: string
}

export function DuoMascotBubble({ content, emotion = 'owl-happy' }: DuoMascotBubbleProps) {
    const [displayedContent, setDisplayedContent] = useState('')

    // Typewriter effect
    useEffect(() => {
        setDisplayedContent('')
        let i = 0
        const interval = setInterval(() => {
            if (i < content.length) {
                setDisplayedContent(prev => prev + content.charAt(i))
                i++
            } else {
                clearInterval(interval)
            }
        }, 15) // Speed of typing

        return () => clearInterval(interval)
    }, [content])

    return (
        <div className="flex items-start md:items-center gap-4 md:gap-8 w-full max-w-4xl mb-8 md:mb-12 px-2">
            {/* Mascot */}
            <div className="w-24 h-24 md:w-32 md:h-32 shrink-0 relative flex items-center justify-center mt-2 md:mt-0">
                <motion.div
                    animate={{
                        y: [0, -6, 0],
                        rotate: [0, 2, -2, 0]
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className={`owl-sprite ${emotion} drop-shadow-xl`}
                    style={{ transform: 'scale(1.4)', transformOrigin: 'center' }}
                />
            </div>

            {/* Speech Bubble */}
            <div className="flex-1 min-w-0">
                <div className="relative">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, x: -10 }}
                        animate={{ opacity: 1, scale: 1, x: 0 }}
                        className="bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] rounded-3xl rounded-tl-sm p-5 md:p-8 shadow-sm relative"
                    >
                        <p className="text-lg md:text-2xl font-bold leading-relaxed text-[var(--text-primary)]">
                            {displayedContent}
                            <span className="animate-pulse inline-block ml-1 opacity-50">|</span>
                        </p>
                    </motion.div>

                    {/* Bubble Arrow Tail */}
                    <svg
                        className="absolute -left-[14px] top-0 w-4 h-6 text-[var(--bg-elevated)] fill-current stroke-[var(--border-subtle)]"
                        viewBox="0 0 16 24"
                        style={{ strokeWidth: 2 }}
                    >
                        <path d="M16 0 L0 0 L16 24 Z" />
                        {/* This is a simplified arrow, might need tweaking to match border perfectly, 
                             or we can use the CSS trick again but improved */}
                    </svg>
                    {/* CSS Arrow Override for better border matching */}
                    <div className="absolute -left-[10px] top-0 w-6 h-6 bg-[var(--bg-elevated)] border-l-2 border-t-2 border-[var(--border-subtle)] rounded-tl-lg [mask-image:linear-gradient(135deg,black_50%,transparent_50%)]"
                        style={{
                            transform: 'skewX(20deg)'
                        }}
                    />
                </div>
            </div>
        </div>
    )
}
