'use client'

import React from 'react'
import { motion } from 'framer-motion'

/**
 * BRIGHT BUTTON
 * Standardized button for the platform.
 */
interface BrightButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger'
    size?: 'sm' | 'md' | 'lg'
    isLoading?: boolean
    leftIcon?: React.ReactNode
}

export function BrightButton({
    children,
    variant = 'primary',
    size = 'md',
    isLoading,
    leftIcon,
    className = '',
    ...props
}: BrightButtonProps) {
    const variants = {
        primary: 'bg-[var(--brand-primary)] text-white hover:shadow-xl hover:shadow-[var(--brand-primary)]/40 hover:-translate-y-1 btn-press neon-glow-primary',
        secondary: 'bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] hover:border-[var(--brand-primary)]/50 btn-press',
        ghost: 'bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] btn-press',
        outline: 'bg-transparent border-2 border-[var(--brand-primary)] text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 btn-press',
        danger: 'bg-[var(--state-error)] text-white hover:shadow-xl hover:shadow-[var(--state-error)]/40 hover:-translate-y-1 btn-press',
    }

    const sizes = {
        sm: 'px-4 py-2 text-xs',
        md: 'px-6 py-3 text-sm',
        lg: 'px-8 py-4 text-base',
    }

    return (
        <motion.button
            whileTap={{ scale: 0.97 }}
            className={`
        relative inline-flex items-center justify-center font-black uppercase tracking-[0.2em] rounded-[var(--radius-pill)] transition-all 
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variants[variant]} ${sizes[size]} ${className}
      `}
            disabled={isLoading || props.disabled}
            {...props as any}
        >
            {isLoading && (
                <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            )}
            {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
        </motion.button>
    )
}

/**
 * BRIGHT LAYER (Container)
 * Standardized surface for cards, panels, and sections.
 */
interface BrightLayerProps extends React.HTMLAttributes<HTMLDivElement> {
    children?: React.ReactNode
    variant?: 'elevated' | 'secondary' | 'glass'
    padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function BrightLayer({
    children,
    variant = 'elevated',
    padding = 'md',
    className = '',
    ...props
}: BrightLayerProps) {
    const variants = {
        elevated: 'bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-md',
        secondary: 'bg-[var(--bg-secondary)] border border-[var(--border-subtle)]',
        glass: 'glass-card shadow-xl',
    }

    const paddings = {
        none: 'p-0',
        sm: 'p-4 md:p-6',
        md: 'p-6 md:p-8',
        lg: 'p-6 md:p-12',
    }

    return (
        <div
            className={`rounded-[var(--radius-main)] overflow-hidden transition-colors ${variants[variant]} ${paddings[padding]} ${className}`}
            {...props}
        >
            {children}
        </div>
    )
}

/**
 * BRIGHT TYPOGRAPHY
 */
export function BrightHeading({ children, level = 1, className = '' }: { children: React.ReactNode, level?: 1 | 2 | 3 | 4, className?: string }) {
    const styles = {
        1: 'text-4xl md:text-5xl lg:text-7xl font-black tracking-tight leading-[1.1] md:leading-tight',
        2: 'text-2xl md:text-3xl lg:text-4xl font-black tracking-tight leading-snug',
        3: 'text-xl md:text-2xl font-bold tracking-tight',
        4: 'text-base md:text-lg font-bold uppercase tracking-widest text-[var(--text-muted)]',
    }
    const Tag = `h${level}` as keyof JSX.IntrinsicElements
    return <Tag className={`font-heading ${styles[level]} ${className}`}>{children}</Tag>
}
