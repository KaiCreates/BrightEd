'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system'
import { useAuth } from '@/lib/auth-context'

export default function OnboardingCompletePage() {
  const router = useRouter()
  const { user } = useAuth()
  const { userData, loading } = useAuth()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [loading, user, router])

  if (loading || !userData) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[var(--bg-primary)] flex items-center justify-center p-4 safe-padding pb-20">
      <BrightLayer variant="glass" padding="lg" className="max-w-xl w-full text-center">
        <div className="mb-8">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="flex justify-center mb-6"
          >
            <div className="relative w-32 h-32">
              <Image
                src="/BrightEdLogo.png"
                alt="BrightEd Logo"
                fill
                className="object-contain"
              />
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-6xl mb-6"
          >
            🎉
          </motion.div>
          <BrightHeading level={1} className="mb-2">
            Your learning path is ready!
          </BrightHeading>
          <p className="text-[var(--text-secondary)] text-lg">
            We'll adjust as you improve.
          </p>
        </div>

        <BrightLayer variant="secondary" padding="md" className="mb-6 text-left">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
            <span>📚</span> Starting Level
          </h2>
          <div className="space-y-3">
            {userData.subjects?.map((subject: string, index: number) => (
              <div key={index} className="flex justify-between items-center group">
                <span className="text-[var(--text-secondary)] font-medium group-hover:text-[var(--text-primary)] transition-colors">{subject}</span>
                <span className="px-3 py-1 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs font-black uppercase tracking-widest rounded-lg border border-[var(--brand-primary)]/20">
                  Form {userData.formLevel || userData.form || 3}
                </span>
              </div>
            ))}
          </div>
        </BrightLayer>

        <BrightLayer variant="elevated" padding="md" className="mb-8 text-left border-l-4 border-l-[var(--brand-accent)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2">
            First Recommended Simulation
          </h2>
          <p className="text-[var(--text-secondary)]">
            {userData.subjects?.[0] || 'Mathematics'} - Introduction to Core Concepts
          </p>
        </BrightLayer>

        <Link href="/" className="block w-full">
          <BrightButton size="lg" className="w-full shadow-xl shadow-[var(--brand-primary)]/20">
            Start Learning
          </BrightButton>
        </Link>
      </BrightLayer>
    </div>
  )
}
