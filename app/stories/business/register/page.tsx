'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BrightHeading, BrightLayer, BrightButton } from '@/components/system';
import BusinessRegistration from '@/components/business/BusinessRegistration';

export default function BusinessRegisterPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen relative overflow-hidden bg-[var(--bg-primary)]">
      <motion.div
        initial={{ opacity: 0, scale: 1.06 }}
        animate={{ opacity: 0.45, scale: 1 }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: 'url("/backgrounds/business_cover.png")' }}
      />

      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[var(--bg-primary)] via-black/20 to-[var(--bg-primary)]" />
      <div className="fixed inset-0 z-0 bg-gradient-to-r from-[var(--bg-primary)] via-transparent to-[var(--bg-primary)]" />

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12 pt-24">
        <div className="flex items-center justify-between mb-10">
          <Link href="/practicals" className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 hover:text-[var(--text-primary)] transition-colors">
            ← Back to Practicals
          </Link>
          <Link href="/stories/business" className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 hover:text-[var(--text-primary)] transition-colors">
            Business Hub
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--brand-primary)]">Registration</span>
          </div>
          <BrightHeading level={1} className="mt-5 text-[var(--text-primary)]">
            Register Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary)] via-teal-400 to-emerald-400">Business</span>
          </BrightHeading>
          <p className="mt-3 text-[var(--text-secondary)] font-medium max-w-2xl">
            Create a legal entity, design your brand card, upload a logo, and unlock the operations dashboard.
          </p>
        </motion.div>

        <BrightLayer
          variant="glass"
          padding="lg"
          className="border border-white/10 bg-white/[0.04] backdrop-blur-xl rounded-[2rem] shadow-2xl"
        >
          <BusinessRegistration
            onComplete={() => {
              router.push('/stories/business');
              router.refresh();
            }}
          />
        </BrightLayer>

        <div className="mt-8 flex justify-center">
          <Link href="/stories/business/operations">
            <BrightButton variant="ghost" size="sm">
              Skip to Operations
            </BrightButton>
          </Link>
        </div>
      </div>
    </div>
  );
}
