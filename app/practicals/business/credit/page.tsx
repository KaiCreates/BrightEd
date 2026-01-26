'use client';

import BusinessSectionNav from '@/components/business/BusinessSectionNav';
import BusinessCreditCard from '@/components/business/BusinessCreditCard';
import { BrightHeading, BrightLayer } from '@/components/system';
import { useEconomyBusiness } from '@/lib/economy/use-economy-business';
import { useAuth } from '@/lib/auth-context';

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
      <div className="min-h-screen bg-[var(--bg-primary)]">
        <BusinessSectionNav />
        <main className="max-w-5xl mx-auto px-4 py-12">
          <BrightLayer variant="glass" padding="lg" className="text-center">
            <BrightHeading level={2} className="mb-2">No business found</BrightHeading>
            <p className="text-[var(--text-secondary)]">Create a business first to access credit.</p>
          </BrightLayer>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <BusinessSectionNav />
      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 mb-10">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Credit</div>
            <BrightHeading level={1} className="mt-1">Cards & Limits</BrightHeading>
            <p className="text-[var(--text-secondary)] mt-2 max-w-2xl">
              Your business identity cards. Use them to unlock credit-based gameplay later.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <div className="grid sm:grid-cols-2 gap-6">
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

          <div className="lg:col-span-5 space-y-6">
            <BrightLayer variant="glass" padding="lg">
              <BrightHeading level={3} className="mb-6">Credit Summary</BrightHeading>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Utilization</div>
                  <div className="text-sm font-black text-[var(--text-primary)]">0%</div>
                </div>
                <div className="h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                  <div className="h-full w-0 bg-[var(--brand-primary)]" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border-subtle)]">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Limit</div>
                    <div className="text-2xl font-black text-[var(--brand-accent)]">฿ 0</div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Available</div>
                    <div className="text-2xl font-black text-[var(--text-primary)]">฿ 0</div>
                  </div>
                </div>
              </div>
            </BrightLayer>

            <BrightLayer variant="elevated" padding="lg">
              <BrightHeading level={3} className="mb-3">Next Up</BrightHeading>
              <p className="text-sm text-[var(--text-secondary)]">
                I can wire this page into real credit gameplay once you decide how credit should work (loans, vendor terms, card spending, interest, etc.).
              </p>
            </BrightLayer>
          </div>
        </div>
      </main>
    </div>
  );
}
