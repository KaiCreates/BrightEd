'use client'

import { motion } from 'framer-motion'
import { useTheme } from '@/lib/theme-context'

export function ThemeToggle() {
    const { theme, toggleTheme, mounted } = useTheme()

    if (!mounted) return null

    const isLight = theme === 'light'

    return (
        <button
            onClick={toggleTheme}
            className="relative p-2 w-16 h-8 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full flex items-center transition-colors overflow-hidden group"
            aria-label="Toggle Theme"
        >
            <motion.div
                animate={{ x: isLight ? 0 : 32 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30, duration: 0.3 }}
                className="w-6 h-6 bg-[var(--brand-primary)] rounded-full flex items-center justify-center shadow-lg relative z-10 transition-all duration-300 text-white"
            >
                <motion.span
                    key={theme}
                    initial={{ rotate: -180, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-xs"
                >
                    {isLight ? <SunIcon /> : <MoonIcon />}
                </motion.span>
            </motion.div>
            <div className="absolute inset-0 flex justify-around items-center px-1 pointer-events-none opacity-40 group-hover:opacity-100 transition-opacity text-[var(--text-muted)]">
                <span className="w-4 h-4">
                    <MoonIcon />
                </span>
                <span className="w-4 h-4">
                    <SunIcon />
                </span>
            </div>
        </button>
    )
}

function SunIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
            <path
                d="M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
            <path d="M12 2v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M12 20v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M4.93 4.93 6.34 6.34" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M17.66 17.66 19.07 19.07" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M2 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M20 12h2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M4.93 19.07 6.34 17.66" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M17.66 6.34 19.07 4.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    )
}

function MoonIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4" aria-hidden="true">
            <path
                d="M21 13.2A8.5 8.5 0 0 1 10.8 3a7 7 0 1 0 10.2 10.2Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    )
}
