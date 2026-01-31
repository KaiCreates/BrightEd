'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { ThemeToggle } from './system/ThemeToggle'
import { useAuth } from '@/lib/auth-context'
import { BCoinIcon } from '@/components/BCoinIcon'

const navItems = [
  { href: '/home', label: 'Home', icon: '🏠' },
  { href: '/community', label: 'Community', icon: '💬' },
  { href: '/learn', label: 'Learn', icon: '📚' },
  { href: '/practicals', label: 'Practicals', icon: '🧪' },
  { href: '/leaderboard', label: 'Rankings', icon: '🏆' },
  { href: '/progress', label: 'Progress', icon: '📈' },
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
  const [scrolled, setScrolled] = useState(false)

  // Derive state
  const isAuthenticated = !!user

  // Handle Scroll Effect
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  if (variant === 'minimal') {
    return (
      <nav className="fixed top-6 left-1/2 -translate-x-1/2 w-[90%] max-w-7xl z-50">
        <div className="bg-[var(--bg-elevated)]/70 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center space-x-3 opacity-80 hover:opacity-100 transition-opacity">
            <div className="relative w-8 h-8">
              <Image src="/BrightEdLogo.png" alt="Logo" fill className="object-contain" />
            </div>
            <span className="font-bold text-lg tracking-tight">BrightEd</span>
          </Link>
          <div className="p-1 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
            <ThemeToggle />
          </div>
        </div>
      </nav>
    )
  }

  return (
    <nav className={`fixed left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ease-out 
        ${scrolled ? 'top-2 w-[99%] max-w-full' : 'top-4 w-[96%] max-w-[1920px]'}`}
    >
      <div className={`relative bg-[var(--bg-elevated)]/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] px-3 md:px-6 transition-all duration-300 ${scrolled ? 'py-2' : 'py-3'}`}>

        <div className="flex items-center justify-between">
          {/* Logo Section */}
          <Link
            href={isAuthenticated ? "/home" : "/"}
            className="flex items-center space-x-3 group relative z-10"
          >
            <div className={`relative transition-all duration-500 ${scrolled ? 'w-8 h-8' : 'w-10 h-10'} group-hover:scale-110 drop-shadow-xl`}>
              <div className="absolute inset-0 bg-[var(--brand-primary)] opacity-20 blur-lg rounded-full group-hover:opacity-40 transition-opacity animate-pulse-slow" />
              <Image
                src="/BrightEdLogo.png"
                alt="BrightEd Logo"
                fill
                className="object-contain relative z-10"
                priority
              />
            </div>
            <span className={`font-heading font-black text-[var(--text-primary)] tracking-tighter hidden xl:block bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-gray-400 group-hover:via-[var(--brand-primary)] transition-all duration-700 ${scrolled ? 'text-lg' : 'text-xl'}`}>
              BrightEd
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden xl:flex items-center gap-0.5 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            {isAuthenticated ? (
              navItems.map((item) => {
                const isActive = pathname?.startsWith(item.href)
                const href = item.label === 'Profile' && userData?.username
                  ? `/profile/${userData.username}`
                  : item.href

                return (
                  <Link
                    key={item.href}
                    href={href}
                    className={`relative px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all duration-300 flex items-center gap-1.5 group/item ${isActive
                      ? 'text-white'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                      }`}
                  >
                    {isActive && (
                      <motion.div
                        layoutId="nav-pill"
                        className="absolute inset-0 bg-[var(--brand-primary)] rounded-lg -z-10 shadow-lg shadow-[var(--brand-primary)]/20"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    <span className={`text-base transition-transform duration-300 group-hover/item:scale-110`}>
                      {item.icon}
                    </span>
                    <span className="relative z-10">{item.label}</span>
                  </Link>
                )
              })
            ) : (
              <div className="flex gap-1">
                {!loading && publicNavItems.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${item.label === 'Sign Up'
                        ? 'bg-[var(--brand-primary)] text-white hover:shadow-lg hover:-translate-y-0.5'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/5'
                        }`}
                    >
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2 md:gap-4 relative z-10">
            {isAuthenticated && (
              <div className="flex items-center gap-1 md:gap-3 bg-white/5 px-2 md:px-4 py-1.5 rounded-2xl border border-white/10">
                {/* Flag / Subject */}
                <div className="flex items-center gap-1.5 group/stat cursor-pointer">
                  <span className="text-lg md:text-xl">🇹🇹</span>
                  <span className="text-xs md:text-sm font-black text-white/40 group-hover/stat:text-white transition-colors">11</span>
                </div>

                <div className="w-[1px] h-4 bg-white/10 mx-1" />

                {/* Streak */}
                <div className="flex items-center gap-1.5 group/stat cursor-pointer">
                  <span className="text-lg md:text-xl filter drop-shadow-[0_0_8px_rgba(255,165,0,0.5)]">🔥</span>
                  <span className="text-xs md:text-sm font-black text-[var(--brand-accent)]">{userData?.streak || 0}</span>
                </div>

                <div className="w-[1px] h-4 bg-white/10 mx-1" />

                {/* Gems / B-Coins */}
                <div className="flex items-center gap-1.5 group/stat cursor-pointer">
                  <BCoinIcon size={20} className="filter drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                  <span className="text-xs md:text-sm font-black text-blue-400">{userData?.bCoins?.toLocaleString() || '0'}</span>
                </div>

                <div className="w-[1px] h-4 bg-white/10 mx-1" />

                {/* Hearts / Consistency */}
                <div className="flex items-center gap-1.5 group/stat cursor-pointer">
                  <span className="text-lg md:text-xl filter drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">❤️</span>
                  <span className="text-xs md:text-sm font-black text-red-500">5</span>
                </div>
              </div>
            )}

            <div className="bg-white/5 rounded-full p-1 border border-white/5 hover:bg-white/10 transition-colors">
              <ThemeToggle />
            </div>

            {/* Mobile Toggle */}
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="xl:hidden ml-2 p-2 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 active:scale-95 transition-all text-[var(--text-primary)]"
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

      {/* Mobile Menu Dropdown */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="absolute top-full left-0 right-0 mt-3 p-2"
          >
            <div className="bg-[var(--bg-elevated)]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl p-4 flex flex-col gap-2">
              {isAuthenticated ? (
                navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className={`p-3 rounded-xl font-bold flex items-center gap-4 transition-colors ${pathname?.startsWith(item.href)
                      ? 'bg-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/20'
                      : 'text-[var(--text-primary)] hover:bg-white/5'
                      }`}
                  >
                    <span className="text-xl">{item.icon}</span>
                    {item.label}
                  </Link>
                ))
              ) : (
                publicNavItems.map(item => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="p-3 rounded-xl font-bold text-[var(--text-primary)] hover:bg-white/5 text-center"
                  >
                    {item.label}
                  </Link>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}
