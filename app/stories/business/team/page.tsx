'use client';

import BusinessSectionNav from '@/components/business/BusinessSectionNav';
import { BrightHeading, BrightLayer } from '@/components/system';
import { useEconomyBusiness } from '@/lib/economy/use-economy-business';
import OrgChart from '@/components/business/OrgChart';
import PayrollManager from '@/components/business/PayrollManager';
import EmployeeShop from '@/components/business/EmployeeShop';

export default function BusinessTeamPage() {
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
            <p className="text-[var(--text-secondary)]">Create a business first to manage your team.</p>
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
          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Team</div>
          <BrightHeading level={1} className="mt-1">HR & Payroll</BrightHeading>
          <p className="text-[var(--text-secondary)] mt-2 max-w-2xl">Hire, manage, and pay your staff.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-8">
            <OrgChart business={business} />
          </div>

          <div className="lg:col-span-5 space-y-8">
            <PayrollManager business={business} />
            <EmployeeShop business={business} />
          </div>
        </div>
      </main>
    </div>
  );
}
