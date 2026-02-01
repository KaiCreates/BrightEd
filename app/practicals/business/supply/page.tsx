'use client';

import BusinessDuolingoLayout from '@/components/business/BusinessDuolingoLayout';
import { BrightHeading } from '@/components/system';
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
      <BusinessDuolingoLayout>
        <div className="max-w-md mx-auto py-20 text-center">
          <div className="duo-card">
            <BrightHeading level={2} className="mb-2">No business found</BrightHeading>
            <p className="text-[var(--text-secondary)]">Create a business first to access supply and inventory.</p>
          </div>
        </div>
      </BusinessDuolingoLayout>
    );
  }

  return (
    <BusinessDuolingoLayout>
      <div className="space-y-10">
        <header>
          <div className="text-xs font-black uppercase tracking-widest text-[var(--brand-primary)]">Supply</div>
          <BrightHeading level={1} className="mt-1">Inventory & Market</BrightHeading>
          <p className="text-[var(--text-secondary)] mt-2 max-w-2xl font-medium">
            Procure raw materials, manage your stock levels, and keep your production lines moving.
          </p>
        </header>

        <div className="space-y-12">
          <InventoryPanel inventory={business.inventory || {}} />
          <Marketplace business={business} />
        </div>
      </div>
    </BusinessDuolingoLayout>
  );
}
