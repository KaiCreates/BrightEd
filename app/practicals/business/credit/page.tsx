'use client';

import BusinessDuolingoLayout from '@/components/business/BusinessDuolingoLayout';
import BusinessCreditCard from '@/components/business/BusinessCreditCard';
import { BrightHeading } from '@/components/system';
import { useEconomyBusiness } from '@/lib/economy/use-economy-business';
import { useAuth } from '@/lib/auth-context';
import { motion } from 'framer-motion';

export default function BusinessCreditPage() {
  const { user, loading: authLoading } = useAuth();
  const { business, loading } = useEconomyBusiness();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]" />
      </div>
    );
  }

  if (!business) {
    return (
      <BusinessDuolingoLayout>
        <div className="max-w-md mx-auto py-20 text-center">
          <div className="duo-card">
            <BrightHeading level={2} className="mb-2">No business found</BrightHeading>
            <p className="text-[var(--text-secondary)]">Create a business first to access credit.</p>
          </div>
        </div>
      </BusinessDuolingoLayout>
    );
  }

  return (
    <BusinessDuolingoLayout>
      <div className="space-y-10">
        <header>
          <div className="text-xs font-black uppercase tracking-widest text-[var(--brand-primary)]">Credit</div>
          <BrightHeading level={1} className="mt-1">Cards & Limits</BrightHeading>
          <p className="text-[var(--text-secondary)] mt-2 max-w-2xl font-medium">
            Your business identity cards. Use them to unlock credit-based gameplay and manage your cash flow.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-7">
            <div className="grid sm:grid-cols-2 gap-8">
              <BusinessCreditCard
                businessName={business.businessName}
                ownerName={user?.displayName || 'Director'}
                themeColor={business.branding?.themeColor}
                logoUrl={business.branding?.logoUrl}
                icon={business.branding?.icon}
                cardLabel="BUSINESS CREDIT"
                cardNumber="4921  0032  8841  2049"
                expiry="01/29"
              />

              <BusinessCreditCard
                businessName={business.businessName}
                ownerName={user?.displayName || 'Director'}
                themeColor={business.branding?.themeColor}
                logoUrl={business.branding?.logoUrl}
                icon={business.branding?.icon}
                cardLabel="FLEET CARD"
                cardNumber="5420  1122  7744  9900"
                expiry="06/28"
              />

              <BusinessCreditCard
                businessName={business.businessName}
                ownerName={user?.displayName || 'Director'}
                themeColor={business.branding?.themeColor}
                logoUrl={business.branding?.logoUrl}
                icon={business.branding?.icon}
                cardLabel="VENDOR LINE"
                cardNumber="3714  4920  1133  008"
                expiry="11/30"
                className="sm:col-span-2"
              />
            </div>
          </div>

          <div className="lg:col-span-5 space-y-8">
            <div className="duo-card">
              <BrightHeading level={3} className="mb-6">Credit Summary</BrightHeading>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-black uppercase tracking-widest text-[var(--text-muted)]">Utilization</div>
                  <div className="text-xl font-black text-[var(--text-primary)]">0%</div>
                </div>
                <div className="h-4 rounded-full bg-[var(--bg-secondary)] overflow-hidden border border-[var(--border-subtle)]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '0%' }}
                    className="h-full bg-[var(--brand-primary)]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-[var(--border-subtle)]">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Limit</div>
                    <div className="text-2xl font-black text-[var(--brand-accent)]">฿ 10,000</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Available</div>
                    <div className="text-2xl font-black text-[var(--text-primary)]">฿ 10,000</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="duo-card border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-4">
                <span className="text-3xl">💡</span>
                <div>
                  <BrightHeading level={4} className="text-amber-600 mb-1">Financial Tip</BrightHeading>
                  <p className="text-sm text-amber-700 font-medium leading-relaxed">
                    Paying your balance early improves your business score and unlocks higher credit limits over time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BusinessDuolingoLayout>
  );
}
