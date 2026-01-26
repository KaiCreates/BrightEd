'use client'

import { motion } from 'framer-motion'

interface SectionHeaderProps {
    moduleNumber: number
    title: string
    theme?: 'startup' | 'growth' | 'mastery' | 'default'
}

const THEME_STYLES = {
    startup: {
        icon: '🚀',
        gradient: 'from-blue-500 to-cyan-400',
        borderColor: 'border-blue-500/30',
    },
    growth: {
        icon: '📈',
        gradient: 'from-green-500 to-emerald-400',
        borderColor: 'border-green-500/30',
    },
    mastery: {
        icon: '👑',
        gradient: 'from-amber-500 to-yellow-400',
        borderColor: 'border-amber-500/30',
    },
    default: {
        icon: '📚',
        gradient: 'from-[var(--brand-primary)] to-[var(--brand-secondary)]',
        borderColor: 'border-[var(--brand-primary)]/30',
    },
}

export default function SectionHeader({
    moduleNumber,
    title,
    theme = 'default'
}: SectionHeaderProps) {
    const styles = THEME_STYLES[theme]

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="w-full max-w-lg mx-auto my-8"
        >
            <div className={`relative p-4 rounded-2xl bg-[var(--bg-secondary)] border-2 ${styles.borderColor}`}>
                {/* Decorative Lines */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-px bg-gradient-to-r from-transparent via-[var(--border-subtle)] to-transparent" />

                {/* Content */}
                <div className="relative z-10 flex items-center justify-center gap-4 bg-[var(--bg-secondary)] px-4">
                    <span className="text-3xl">{styles.icon}</span>
                    <div className="text-center">
                        <span className={`block text-[10px] font-black uppercase tracking-[0.25em] text-transparent bg-clip-text bg-gradient-to-r ${styles.gradient}`}>
                            MODULE {moduleNumber}
                        </span>
                        <h3 className="text-lg font-black text-[var(--text-primary)]">
                            {title}
                        </h3>
                    </div>
                    <span className="text-3xl">{styles.icon}</span>
                </div>
            </div>
        </motion.div>
    )
}
