'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { BrightHeading, BrightButton, BrightLayer } from '@/components/system';
import { useEconomyBusiness } from '@/lib/economy/use-economy-business';
import { useAuth } from '@/lib/auth-context';
import { BusinessState, BusinessType } from '@/lib/economy/economy-types';
import BusinessRegistration from '@/components/business/BusinessRegistration';
import BusinessSectionNav from '@/components/business/BusinessSectionNav';
import BusinessCreditCard from '@/components/business/BusinessCreditCard';


// ============================================================================
// MODULAR BUSINESS HUB
// ============================================================================

export default function BusinessHub() {
  const { user, loading: authLoading } = useAuth();
  const { business, businessType, loading } = useEconomyBusiness();
  const [isRegistering, setIsRegistering] = useState(false);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
        <BrightLayer variant="glass" padding="lg" className="max-w-md w-full text-center">
          <BrightHeading level={2} className="mb-3">Sign in required</BrightHeading>
          <p className="text-[var(--text-secondary)] mb-6">Please sign in to access the business dashboard.</p>
          <Link href="/">
            <BrightButton variant="primary" className="w-full">Go Home</BrightButton>
          </Link>
        </BrightLayer>
      </div>
    );
  }

  if (isRegistering) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-hidden pt-20">
        <div className="fixed top-8 right-8 z-50">
          <button onClick={() => setIsRegistering(false)} className="text-[var(--text-muted)] hover:text-white">✕ Close</button>
        </div>
        <BusinessRegistration onComplete={() => setIsRegistering(false)} />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-hidden">
        <BusinessSectionNav />
        <main className="relative z-10 pt-12 pb-32 px-4 max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-16"
          >
            <div className="max-w-md mx-auto">
              <BrightLayer variant="glass" padding="lg" className="border-dashed border-2 border-[var(--brand-primary)]/30 backdrop-blur-xl">
                <div className="text-6xl mb-6">🚀</div>
                <BrightHeading level={2} className="mb-4">Create Your Business</BrightHeading>
                <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
                  Set up your company brand, unlock the simulation dashboard, and start building.
                </p>
                <BrightButton variant="primary" size="lg" className="w-full" onClick={() => setIsRegistering(true)}>
                  Create Business
                </BrightButton>
              </BrightLayer>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <BusinessSectionNav />
      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5">
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Business Hub</div>
            <BrightHeading level={1} className="mt-1">{business.businessName}</BrightHeading>
            <div className="text-sm text-[var(--text-secondary)] font-medium mt-2">
              {businessType?.name ?? 'Business'}
            </div>

            <div className="mt-6">
              <BusinessCreditCard
                businessName={business.businessName}
                ownerName={user.displayName || 'Director'}
                themeColor={business.branding?.themeColor}
                logoUrl={business.branding?.logoUrl}
                icon={business.branding?.icon}
              />
            </div>
          </div>

          <div className="lg:col-span-7">
            <BrightLayer variant="glass" padding="lg" className="h-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div>
                  <BrightHeading level={3}>Dashboard</BrightHeading>
                  <p className="text-sm text-[var(--text-secondary)]">Pick what you want to manage—everything is split into pages now.</p>
                </div>
                <Link href="/stories/business/operations">
                  <BrightButton variant="primary" size="lg">Open Operations</BrightButton>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Link href="/stories/business/operations" className="block">
                  <BrightLayer variant="elevated" padding="md" className="h-full border border-[var(--border-subtle)] hover:border-[var(--brand-primary)] transition-colors">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Operations</div>
                    <div className="mt-2 text-lg font-black text-[var(--text-primary)]">Orders & Work</div>
                    <div className="mt-1 text-sm text-[var(--text-secondary)]">Accept, fulfill, earn revenue.</div>
                  </BrightLayer>
                </Link>

                <Link href="/stories/business/credit" className="block">
                  <BrightLayer variant="elevated" padding="md" className="h-full border border-[var(--border-subtle)] hover:border-[var(--brand-primary)] transition-colors">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Credit</div>
                    <div className="mt-2 text-lg font-black text-[var(--text-primary)]">Cards & Limits</div>
                    <div className="mt-1 text-sm text-[var(--text-secondary)]">View your business cards and credit.</div>
                  </BrightLayer>
                </Link>

                <Link href="/stories/business/reports" className="block">
                  <BrightLayer variant="elevated" padding="md" className="h-full border border-[var(--border-subtle)] hover:border-[var(--brand-primary)] transition-colors">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Reports</div>
                    <div className="mt-2 text-lg font-black text-[var(--text-primary)]">Performance</div>
                    <div className="mt-1 text-sm text-[var(--text-secondary)]">Charts, revenue, expenses, runway.</div>
                  </BrightLayer>
                </Link>

                <Link href="/stories/business/team" className="block">
                  <BrightLayer variant="elevated" padding="md" className="h-full border border-[var(--border-subtle)] hover:border-[var(--brand-primary)] transition-colors">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Team</div>
                    <div className="mt-2 text-lg font-black text-[var(--text-primary)]">HR & Payroll</div>
                    <div className="mt-1 text-sm text-[var(--text-secondary)]">Manage staff and wages.</div>
                  </BrightLayer>
                </Link>

                <Link href="/stories/business/supply" className="block sm:col-span-2">
                  <BrightLayer variant="elevated" padding="md" className="h-full border border-[var(--border-subtle)] hover:border-[var(--brand-primary)] transition-colors">
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Supply</div>
                    <div className="mt-2 text-lg font-black text-[var(--text-primary)]">Inventory & Market</div>
                    <div className="mt-1 text-sm text-[var(--text-secondary)]">Stock up supplies for fulfillment.</div>
                  </BrightLayer>
                </Link>
              </div>
            </BrightLayer>
          </div>
        </div>
      </main>
    </div>
  );
}
