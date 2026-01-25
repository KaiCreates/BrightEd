'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

interface BusinessAccessGateProps {
  children: React.ReactNode
  subject: string // 'Principles of Business' or 'Accounts'
}

export default function BusinessAccessGate({ children, subject }: BusinessAccessGateProps) {
  const { userData, loading } = useAuth()
  const router = useRouter()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]" />
      </div>
    )
  }

  // Check if this subject requires business registration
  const requiresBusiness = subject.toLowerCase().includes('business') || 
                           subject.toLowerCase().includes('principles of business') ||
                           subject.toLowerCase().includes('accounts') ||
                           subject.toLowerCase().includes('accounting')

  if (requiresBusiness && !userData?.hasBusiness) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md"
        >
          <BrightLayer variant="glass" padding="lg" className="text-center border-[var(--brand-primary)]/30 neon-glow-primary">
            <div className="text-6xl mb-6">🚀</div>
            <BrightHeading level={2} className="mb-4">
              Empire Required!
            </BrightHeading>
            <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
              You need to register a business before you can access {subject} simulations. 
              These real-world scenarios require an active business entity.
            </p>
            <Link href="/practicals/business/register">
              <BrightButton variant="primary" size="lg" className="w-full mb-4">
                Register Your Business
              </BrightButton>
            </Link>
            <button
              onClick={() => router.back()}
              className="text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            >
              ← Go Back
            </button>
          </BrightLayer>
        </motion.div>
      </div>
    )
  }

  return <>{children}</>
}
