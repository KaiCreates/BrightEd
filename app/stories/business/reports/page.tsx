'use client';

import BusinessSectionNav from '@/components/business/BusinessSectionNav';
import { BrightHeading, BrightLayer } from '@/components/system';
import { useEconomyBusiness } from '@/lib/economy/use-economy-business';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';

function formatCompact(n: number) {
  try {
    return new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  } catch {
    return n.toLocaleString();
  }
}

export default function BusinessReportsPage() {
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
            <p className="text-[var(--text-secondary)]">Create a business first to view reports.</p>
          </BrightLayer>
        </main>
      </div>
    );
  }

  const revenue = business.totalRevenue || 0;
  const expenses = business.totalExpenses || 0;
  const cash = business.cashBalance || 0;
  const profit = revenue - expenses;
  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

  const chartData = Array.from({ length: 12 }).map((_, i) => {
    const t = i / 11;
    const rev = Math.round(revenue * t);
    const exp = Math.round(expenses * t);
    return {
      name: `M${i + 1}`,
      revenue: rev,
      expenses: exp,
      profit: rev - exp,
    };
  });

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <BusinessSectionNav />
      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="mb-10">
          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Reports</div>
          <BrightHeading level={1} className="mt-1">Business Reports</BrightHeading>
          <p className="text-[var(--text-secondary)] mt-2 max-w-2xl">
            A clean snapshot of your company’s performance.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-8">
            <BrightLayer variant="glass" padding="lg">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
                <div>
                  <BrightHeading level={3}>Revenue vs Expenses</BrightHeading>
                  <div className="text-sm text-[var(--text-secondary)] mt-1">12-month view (placeholder until we track monthly history).</div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Net Profit</div>
                  <div className={`text-2xl font-black ${profit >= 0 ? 'text-[var(--state-success)]' : 'text-[var(--state-error)]'}`}>
                    ฿ {formatCompact(profit)}
                  </div>
                </div>
              </div>

              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, left: 0, right: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="expFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--state-error)" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="var(--state-error)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 800 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 800 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-strong)',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="var(--brand-primary)" strokeWidth={3} fill="url(#revFill)" />
                    <Area type="monotone" dataKey="expenses" stroke="var(--state-error)" strokeWidth={2} fill="url(#expFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </BrightLayer>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BrightLayer variant="elevated" padding="lg">
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Profit Margin</div>
                <div className="mt-3 text-5xl font-black text-[var(--brand-primary)]">{margin}%</div>
                <div className="mt-3 text-sm text-[var(--text-secondary)]">Profit as a percentage of total revenue.</div>
              </BrightLayer>

              <BrightLayer variant="elevated" padding="lg">
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Cash Runway</div>
                <div className="mt-3 text-5xl font-black text-[var(--brand-accent)]">
                  {expenses > 0 ? Math.max(0, Math.floor(cash / (expenses / 30))) : 0}
                  <span className="text-base text-[var(--text-muted)] font-black"> days</span>
                </div>
                <div className="mt-3 text-sm text-[var(--text-secondary)]">Estimated days of operating cash left at current spend.</div>
              </BrightLayer>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-6">
            <BrightLayer variant="glass" padding="lg">
              <BrightHeading level={3} className="mb-6">Key Metrics</BrightHeading>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Cash</div>
                  <div className="text-lg font-black text-[var(--text-primary)]">฿ {formatCompact(cash)}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Total Revenue</div>
                  <div className="text-lg font-black text-[var(--state-success)]">฿ {formatCompact(revenue)}</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Total Expenses</div>
                  <div className="text-lg font-black text-[var(--state-error)]">฿ {formatCompact(expenses)}</div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-[var(--border-subtle)]">
                  <div className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Reputation</div>
                  <div className="text-lg font-black text-[var(--brand-accent)]">{business.reputation}/100</div>
                </div>
              </div>
            </BrightLayer>

            <BrightLayer variant="elevated" padding="lg">
              <BrightHeading level={3} className="mb-3">Exports</BrightHeading>
              <p className="text-sm text-[var(--text-secondary)]">
                If you want “real report” exports (PDF/CSV), tell me what format you want and what sections should be included.
              </p>
            </BrightLayer>
          </div>
        </div>
      </main>
    </div>
  );
}
