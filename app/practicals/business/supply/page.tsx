'use client';

import BusinessSectionNav from '@/components/business/BusinessSectionNav';
import { BrightHeading, BrightLayer } from '@/components/system';
import { useEconomyBusiness } from '@/lib/economy/use-economy-business';
import Marketplace from '@/components/business/Marketplace';
import InventoryPanel from '@/components/business/InventoryPanel';

export default function BusinessSupplyPage() {
  const { business, loading } = useEconomyBusiness();

  if (loading) {
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
            <p className="text-[var(--text-secondary)]">Create a business first to access supply and inventory.</p>
          </BrightLayer>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <BusinessSectionNav />
      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-10">
          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Supply</div>
          <BrightHeading level={1} className="mt-1">Inventory & Market</BrightHeading>
          <p className="text-[var(--text-secondary)] mt-2 max-w-2xl">Stock up and keep fulfillment running.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4">
            <InventoryPanel inventory={business.inventory || {}} />
          </div>
          <div className="lg:col-span-8">
            <Marketplace business={business} />
          </div>
        </div>
      </main>
    </div>
  );
}
