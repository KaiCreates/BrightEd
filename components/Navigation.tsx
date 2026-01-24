'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { ThemeToggle } from './system/ThemeToggle'
import { useAuth } from '@/lib/auth-context'
import { BCoinIcon } from '@/components/BCoinIcon'

const navItems = [
  { href: '/home', label: 'Home', icon: '🏠' },
  { href: '/learn', label: 'Learn', icon: '📚' },
  { href: '/simulate', label: 'Simulate', icon: '🎮' },
  { href: '/stories', label: 'Stories', icon: '📖' },
  { href: '/achievements', label: 'Locker', icon: '🏆' },
  { href: '/profile', label: 'Profile', icon: '👤' },
]

const publicNavItems = [
  { href: '/landing', label: 'Home' },
  { href: '/signup', label: 'Sign Up' },
  { href: '/login', label: 'Login' },
]

export function Navigation({ variant = 'default' }: { variant?: 'default' | 'minimal' }) {
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Derive state
  const isAuthenticated = !!user
  const showPublic = !isAuthenticated
  // If loading, maybe show nothing or skeleton? For now show nothing or public if safe

  if (variant === 'minimal') {
    return (
      <nav className="fixed top-0 left-0 right-0 h-20 bg-[var(--bg-primary)]/50 backdrop-blur-md z-50 flex items-center justify-center">
        <Link href="/" className="flex items-center space-x-3 opacity-50 hover:opacity-100 transition-opacity">
          <div className="relative w-8 h-8">
            <Image src="/BrightEdLogo.png" alt="Logo" fill className="object-contain" />
          </div>
        </Link>
      </nav>
    )
  }

  return (
    <nav className="fixed top-0 left-0 right-0 h-20 bg-[var(--bg-elevated)]/80 backdrop-blur-xl border-b border-[var(--border-subtle)] z-50 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link
            href={isAuthenticated ? "/home" : "/landing"}
            className="flex items-center space-x-3 group"
          >
            <div className="relative w-10 h-10 transform group-hover:scale-110 transition-transform duration-300">
              <Image
                src="/BrightEdLogo.png"
                alt="BrightEd Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-xl font-heading font-black text-[var(--text-primary)] tracking-tight hidden sm:block">
              BrightEd
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {isAuthenticated ? (
              // Protected Links
              navItems.map((item) => {
                const isActive = pathname?.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 flex items-center gap-2 ${isActive
                        ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.2)]'
                        : 'text-[var(--text-muted)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                  >
                    <span className="text-lg opacity-70 mb-[2px]">{item.icon}</span>
                    {item.label}
                  </Link>
                )
              })
            ) : (
              // Public Links
              !loading && publicNavItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`px-6 py-2 rounded-full font-bold text-sm transition-all ${item.label === 'Sign Up'
                        ? 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90 shadow-lg shadow-[var(--brand-primary)]/20'
                        : isActive
                          ? 'text-[var(--brand-primary)]'
                          : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                      }`}
                  >
                    {item.label}
                  </Link>
                )
              })
            )}

            <div className="h-6 w-[1px] bg-[var(--border-subtle)] mx-4" />

            {/* Currency (Authentication Only) - Optional Polish */}
            {isAuthenticated && (
              <div className="mr-4 flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-secondary)] rounded-full border border-[var(--border-subtle)]">
                <BCoinIcon size={20} />
                <span className="text-sm font-bold text-[var(--brand-accent)]">---</span>
              </div>
            )}

            <ThemeToggle />
          </div>

          {/* Mobile Menu Toggle */}
          <div className="md:hidden flex items-center gap-4">
            <ThemeToggle />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-[var(--text-primary)] p-2 rounded-lg hover:bg-[var(--bg-secondary)]"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Content */}
      {isMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:hidden absolute top-20 left-0 right-0 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] shadow-2xl p-4 flex flex-col gap-2"
        >
          {isAuthenticated ? (
            navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`p-4 rounded-2xl font-bold flex items-center gap-4 ${pathname?.startsWith(item.href)
                    ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]'
                    : 'text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]'
                  }`}
              >
                <span className="text-2xl">{item.icon}</span>
                {item.label}
              </Link>
            ))
          ) : (
            publicNavItems.map(item => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMenuOpen(false)}
                className="p-4 rounded-2xl font-bold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] text-center"
              >
                {item.label}
              </Link>
            ))
          )}
        </motion.div>
      )}
    </nav>
  )
}

