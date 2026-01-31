'use client'

import { motion } from 'framer-motion'

interface SectionHeaderProps {
    moduleNumber: number
    title: string
    theme?: 'startup' | 'growth' | 'mastery' | 'default'
    onOpenGuidebook?: () => void
}

const THEME_STYLES = {
    startup: {
        icon: '🚀',
        bannerColor: 'bg-[#ff4b4b]', // Duolingo Red/Coral
        accentColor: 'text-[#ff4b4b]',
    },
    growth: {
        icon: '📈',
        bannerColor: 'bg-[#58cc02]', // Duolingo Green
        accentColor: 'text-[#58cc02]',
    },
    mastery: {
        icon: '👑',
        bannerColor: 'bg-[#ffc800]', // Duolingo Gold
        accentColor: 'text-[#ffc800]',
    },
    default: {
        icon: '📚',
        bannerColor: 'bg-[#1cb0f6]', // Duolingo Blue
        accentColor: 'text-[#1cb0f6]',
    },
}

export default function SectionHeader({
    moduleNumber,
    title,
    theme = 'default',
    onOpenGuidebook
}: SectionHeaderProps) {
    const styles = THEME_STYLES[theme]

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="w-full max-w-2xl mx-auto my-12 px-4"
        >
            <div className={`relative px-6 py-6 rounded-[24px] ${styles.bannerColor} text-white shadow-[0_8px_0_rgba(0,0,0,0.1)] flex items-center justify-between`}>
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80">
                        Section {moduleNumber}, Unit {moduleNumber}
                    </span>
                    <h3 className="text-2xl font-black tracking-tight leading-tight">
                        {title}
                    </h3>
                </div>

                <button
                    onClick={onOpenGuidebook}
                    className="flex items-center gap-3 bg-black/10 hover:bg-black/20 transition-colors px-6 py-4 rounded-[16px] border-b-4 border-black/20 active:border-b-0 active:translate-y-[4px]"
                >
                    <span className="text-2xl font-bold">📖</span>
                    <span className="text-sm font-black uppercase tracking-widest">Guidebook</span>
                </button>
            </div>
        </motion.div>
    )
}
