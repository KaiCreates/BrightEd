'use client'

import { motion } from 'framer-motion'
import { useTheme } from '@/lib/theme-context'

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme()

    return (
        <button
            onClick={toggleTheme}
            className="relative p-2 w-16 h-8 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-full flex items-center transition-colors overflow-hidden group"
            aria-label="Toggle Theme"
        >
            <motion.div
                animate={{ x: theme === 'light' ? 0 : 32 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30, duration: 0.3 }}
                className="w-6 h-6 bg-[var(--brand-primary)] rounded-full flex items-center justify-center shadow-lg relative z-10 transition-all duration-300"
            >
                <motion.span
                    key={theme}
                    initial={{ rotate: -180, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    transition={{ duration: 0.3 }}
                    className="text-xs"
                >
                    {theme === 'light' ? '☀️' : '🌙'}
                </motion.span>
            </motion.div>
            <div className="absolute inset-0 flex justify-around items-center px-1 pointer-events-none opacity-30 group-hover:opacity-100 transition-opacity">
                <span className="text-[10px]">🌙</span>
                <span className="text-[10px]">☀️</span>
            </div>
        </button>
    )
}
