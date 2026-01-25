'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
    theme: Theme
    toggleTheme: () => void
    mounted: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>('light')
    const [mounted, setMounted] = useState(false)

    // Initialize theme before first render to prevent flicker
    useEffect(() => {
        const savedTheme = localStorage.getItem('brighted-theme') as Theme
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light')
        
        // Set theme immediately to prevent flash
        document.documentElement.setAttribute('data-theme', initialTheme)
        document.documentElement.style.colorScheme = initialTheme
        setTheme(initialTheme)
        setMounted(true)
    }, [])

    useEffect(() => {
        if (mounted) {
            // Use requestAnimationFrame for smooth transition
            requestAnimationFrame(() => {
                document.documentElement.setAttribute('data-theme', theme)
                document.documentElement.style.colorScheme = theme
                localStorage.setItem('brighted-theme', theme)
            })
        }
    }, [theme, mounted])

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
    }

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, mounted }}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider')
    }
    return context
}
