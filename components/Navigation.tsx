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
  { href: '/leaderboard', label: 'Rankings', icon: '🏆' },
  { href: '/simulate', label: 'Simulate', icon: '🎮' },
  { href: '/practicals', label: 'Practicals', icon: '🧪' },
  { href: '/achievements', label: 'Locker', icon: '🎖️' },
  { href: '/profile', label: 'Profile', icon: '👤' },
]

const publicNavItems = [
  { href: '/landing', label: 'Home' },
  { href: '/signup', label: 'Sign Up' },
  { href: '/login', label: 'Login' },
]

export function Navigation({ variant = 'default' }: { variant?: 'default' | 'minimal' }) {
  const pathname = usePathname()
  const { user, userData, loading } = useAuth()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  // Derive state
  const isAuthenticated = !!user
  const showPublic = !isAuthenticated
  // If loading, maybe show nothing or skeleton? For now show nothing or public if safe

  if (variant === 'minimal') {
    return (
      <nav className="fixed top-0 left-0 right-0 h-20 bg-[var(--bg-primary)]/50 backdrop-blur-md z-50 flex items-center justify-between px-6">
        <Link href="/" className="flex items-center space-x-3 opacity-50 hover:opacity-100 transition-opacity">
          <div className="relative w-8 h-8">
            <Image src="/BrightEdLogo.png" alt="Logo" fill className="object-contain" />
          </div>
        </Link>
        <div className="p-1 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
          <ThemeToggle />
        </div>
      </nav>
    )
  }

  return (
    <nav className="fixed top-0 left-0 right-0 h-24 bg-[var(--bg-elevated)]/60 backdrop-blur-2xl border-b border-white/5 z-50 transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.1)]">
      <div className="w-full px-6 md:px-12 lg:px-16">
        <div className="flex items-center justify-between h-24">
          {/* Logo Section */}
          <Link
            href={isAuthenticated ? "/home" : "/landing"}
            className="flex items-center space-x-4 group"
          >
            <div className="relative w-14 h-14 md:w-16 md:h-16 transform group-hover:scale-110 group-active:scale-95 transition-all duration-500 ease-out">
              <div className="absolute inset-0 bg-[var(--brand-primary)] opacity-20 blur-xl rounded-full group-hover:opacity-40 transition-opacity" />
              <Image
                src="/BrightEdLogo.png"
                alt="BrightEd Logo"
                fill
                className="object-contain drop-shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.5)] relative z-10"
                priority
              />
            </div>
            <span className="text-2xl md:text-3xl font-heading font-black text-[var(--text-primary)] tracking-tighter hidden xl:block bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-400 group-hover:via-[var(--brand-primary)] transition-all duration-700">
              BrightEd
            </span>
          </Link>

          {/* Desktop Nav - Optimized Spacing */}
          <div className="hidden lg:flex items-center gap-2">
            {isAuthenticated ? (
              // Protected Links
              navItems.map((item) => {
                const isActive = pathname?.startsWith(item.href)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative px-5 py-2.5 rounded-2xl text-[12px] font-black uppercase tracking-[0.2em] transition-all duration-500 flex items-center gap-3 overflow-hidden group/item ${isActive
                      ? 'text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-active-bg"
                        className="absolute inset-0 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] -z-10 shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.4)]"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    {!isActive && (
                      <div className="absolute inset-x-0 bottom-0 h-0.5 bg-[var(--brand-primary)] scale-x-0 group-hover/item:scale-x-100 transition-transform origin-left duration-300" />
                    )}
                    <span className={`text-xl transition-transform duration-500 group-hover/item:scale-125 ${isActive ? 'scale-110' : 'opacity-70 group-hover/item:opacity-100'}`}>
                      {item.icon}
                    </span>
                    <span className="relative z-10">{item.label}</span>
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
                    className={`px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${item.label === 'Sign Up'
                      ? 'bg-[var(--brand-primary)] text-white hover:shadow-[0_0_25px_rgba(var(--brand-primary-rgb),0.5)] hover:-translate-y-0.5 active:translate-y-0'
                      : isActive
                        ? 'text-[var(--brand-primary)] bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20 shadow-inner'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                      }`}
                  >
                    {item.label}
                  </Link>
                )
              })
            )}

            <div className="h-8 w-[1px] bg-white/5 mx-6" />

            {/* Actions */}
            <div className="flex items-center gap-4">
              {isAuthenticated && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="flex items-center gap-3 px-4 py-2 bg-gradient-to-r from-yellow-500/10 to-amber-500/10 rounded-2xl border border-yellow-500/20 shadow-lg"
                >
                  <BCoinIcon size={24} />
                  <span className="text-sm font-black text-yellow-500 tracking-tighter">
                    {userData?.bCoins?.toLocaleString() || '0'}
                  </span>
                </motion.div>
              )}

              <div className="p-1 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 transition-colors">
                <ThemeToggle />
              </div>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="lg:hidden flex items-center gap-4">
            {isAuthenticated && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/5">
                <BCoinIcon size={18} />
                <span className="text-xs font-black text-yellow-500">{userData?.bCoins?.toLocaleString() || '0'}</span>
              </div>
            )}
            <ThemeToggle />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-[var(--text-primary)] p-3 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:scale-95 transition-all"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 6h16M4 12h16M4 18h16" />
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
          className="lg:hidden absolute top-24 left-0 right-0 bg-[var(--bg-elevated)] border-b border-[var(--border-subtle)] shadow-2xl p-4 flex flex-col gap-2"
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

