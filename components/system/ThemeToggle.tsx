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
            className={`
                relative w-16 h-8 rounded-full p-1 
                transition-all duration-300 ease-out
                border-2 
                ${isLight
                    ? 'bg-gradient-to-r from-amber-100 to-orange-100 border-amber-200 shadow-lg shadow-amber-200/30'
                    : 'bg-gradient-to-r from-slate-800 to-slate-900 border-slate-600 shadow-lg shadow-slate-900/50'
                }
                hover:scale-105 active:scale-95
                focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)] focus:ring-offset-2 focus:ring-offset-[var(--bg-primary)]
            `}
            aria-label={`Switch to ${isLight ? 'dark' : 'light'} mode`}
        >
            {/* Track decorations */}
            <div className="absolute inset-0 rounded-full overflow-hidden">
                {/* Stars for dark mode */}
                <motion.div
                    animate={{ opacity: isLight ? 0 : 1 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0"
                >
                    <span className="absolute top-1.5 left-2 w-0.5 h-0.5 bg-white/60 rounded-full" />
                    <span className="absolute top-3 left-4 w-1 h-1 bg-white/40 rounded-full" />
                    <span className="absolute bottom-2 left-3 w-0.5 h-0.5 bg-white/50 rounded-full" />
                </motion.div>

                {/* Clouds for light mode */}
                <motion.div
                    animate={{ opacity: isLight ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0"
                >
                    <span className="absolute top-1 right-2 w-3 h-1.5 bg-white/70 rounded-full blur-[1px]" />
                    <span className="absolute bottom-1.5 right-4 w-2 h-1 bg-white/50 rounded-full blur-[1px]" />
                </motion.div>
            </div>

            {/* Slider thumb */}
            <motion.div
                animate={{ x: isLight ? 0 : 32 }}
                transition={{
                    type: 'spring',
                    stiffness: 600,
                    damping: 35,
                    mass: 0.8
                }}
                className={`
                    relative w-6 h-6 rounded-full 
                    flex items-center justify-center
                    shadow-lg
                    ${isLight
                        ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-orange-400/50'
                        : 'bg-gradient-to-br from-indigo-400 to-purple-600 shadow-indigo-500/50'
                    }
                `}
            >
                {/* Icon container with rotation */}
                <motion.div
                    key={theme}
                    initial={{ rotate: -90, scale: 0.5 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ duration: 0.4, type: 'spring', stiffness: 200 }}
                    className="w-4 h-4 text-white"
                >
                    {isLight ? <SunIcon /> : <MoonIcon />}
                </motion.div>

                {/* Glow effect */}
                <div
                    className={`
                        absolute inset-0 rounded-full blur-md opacity-50
                        ${isLight ? 'bg-amber-400' : 'bg-indigo-400'}
                    `}
                />
            </motion.div>
        </button>
    )
}

function SunIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full" aria-hidden="true">
            <path d="M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10Z" />
            <path
                d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
            />
        </svg>
    )
}

function MoonIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full" aria-hidden="true">
            <path d="M21.752 15.002A9.72 9.72 0 0 1 18 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 0 0 3 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 0 0 9.002-5.998Z" />
        </svg>
    )
}
