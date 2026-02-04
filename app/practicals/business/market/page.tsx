'use client';

import BusinessDuolingoLayout from '@/components/business/BusinessDuolingoLayout';
import { BrightHeading } from '@/components/system';
import { useEconomyBusiness } from '@/lib/economy/use-economy-business';
import BusinessToolMarket from '@/components/business/BusinessToolMarket';

export default function BusinessMarketPage() {
  const { business, businessType, loading } = useEconomyBusiness();

  if (loading) {
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
            <p className="text-[var(--text-secondary)]">Create a business first to access the market.</p>
          </div>
        </div>
      </BusinessDuolingoLayout>
    );
  }

  return (
    <BusinessDuolingoLayout>
      <div className="space-y-10">
        <header>
          <div className="text-xs font-black uppercase tracking-widest text-[var(--brand-primary)]">Market</div>
          <BrightHeading level={1} className="mt-1">General Business Market</BrightHeading>
          <p className="text-[var(--text-secondary)] mt-2 max-w-2xl font-medium">
            Upgrade your tools, systems, and workflows to unlock stronger performance.
          </p>
        </header>

        <BusinessToolMarket business={business} businessType={businessType} />
      </div>
    </BusinessDuolingoLayout>
  );
}
