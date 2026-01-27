'use client';

import BusinessSectionNav from '@/components/business/BusinessSectionNav';
import { BrightHeading, BrightLayer } from '@/components/system';
import { useEconomyBusiness } from '@/lib/economy/use-economy-business';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell
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
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0.0';
  const ordersCompleted = business.ordersCompleted || 0;
  const avgOrderValue = ordersCompleted > 0 ? Math.round(revenue / ordersCompleted) : 0;

  // Real Data Snapshot (Comparison)
  // Since we don't have monthly history in the state yet, we compare key totals
  const chartData = [
    { name: 'Revenue', amount: revenue, color: 'var(--state-success)' },
    { name: 'Expenses', amount: expenses, color: 'var(--state-error)' },
    { name: 'Net Profit', amount: profit, color: profit >= 0 ? 'var(--brand-primary)' : 'var(--state-error)' }
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <BusinessSectionNav />
      <main className="max-w-7xl mx-auto px-4 py-10">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Financial Reports</div>
            <BrightHeading level={1} className="mt-1">Performance Overview</BrightHeading>
            <p className="text-[var(--text-secondary)] mt-2 max-w-xl">
              Real-time financial breakdown. No projections, actual data only.
            </p>
          </div>
          {ordersCompleted === 0 && (
            <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 text-amber-500 text-xs font-bold rounded-lg uppercase tracking-wide">
              ⚠️ Not enough data (0 Orders)
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* Main Chart Section */}
          <div className="lg:col-span-8 space-y-8">
            <BrightLayer variant="glass" padding="lg">
              <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
                <div>
                  <BrightHeading level={3}>Financial Snapshot</BrightHeading>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">Current total accumulation.</p>
                </div>
              </div>

              {/* Chart */}
              <div className="h-[350px] w-full">
                {ordersCompleted > 0 || revenue > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 700 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 700 }} />
                      <Tooltip
                        cursor={{ fill: 'var(--bg-elevated)', opacity: 0.5 }}
                        contentStyle={{
                          backgroundColor: 'var(--bg-elevated)',
                          border: '1px solid var(--border-strong)',
                          borderRadius: '12px'
                        }}
                      />
                      <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={60}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-elevated)]/20">
                    <span className="text-4xl opacity-30 mb-2">📊</span>
                    <p className="text-[var(--text-muted)] font-bold text-sm">Start selling to generate reports</p>
                  </div>
                )}
              </div>
            </BrightLayer>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <BrightLayer variant="elevated" padding="lg" className="border-t-4 border-t-[var(--brand-primary)]">
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Net Profit Margin</div>
                <div className="mt-3 text-5xl font-black text-[var(--brand-primary)]">{margin}%</div>
                <div className="mt-2 text-sm text-[var(--text-secondary)] flex justify-between">
                  <span>Target: 20%+</span>
                  <span className={Number(margin) > 20 ? "text-green-500 font-bold" : "text-amber-500 font-bold"}>
                    {Number(margin) > 20 ? "Healthy" : "Needs Optimization"}
                  </span>
                </div>
              </BrightLayer>

              <BrightLayer variant="elevated" padding="lg" className="border-t-4 border-t-[var(--brand-accent)]">
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Avg. Order Value</div>
                <div className="mt-3 text-5xl font-black text-[var(--brand-accent)]">
                  ฿{avgOrderValue}
                </div>
                <div className="mt-2 text-sm text-[var(--text-secondary)]">
                  Across {ordersCompleted} completed orders
                </div>
              </BrightLayer>
            </div>
          </div>

          {/* Key Metrics Side Panel */}
          <div className="lg:col-span-4 space-y-6">
            <BrightLayer variant="glass" padding="lg">
              <BrightHeading level={3} className="mb-6">Ledger Summary</BrightHeading>

              <div className="space-y-6">
                {/* Cash On Hand */}
                <div className="p-4 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)]">
                  <div className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Cash On Hand</div>
                  <div className="text-3xl font-black text-[var(--text-primary)]">฿ {cash.toLocaleString()}</div>
                  <div className="text-xs text-[var(--text-secondary)] mt-1">Ready for payroll & inventory</div>
                </div>

                <div className="space-y-3 pt-4 border-t border-[var(--border-subtle)]">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--text-secondary)]">Total Revenue</span>
                    <span className="font-bold text-[var(--state-success)]">+ ฿{revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-[var(--text-secondary)]">Total Expenses</span>
                    <span className="font-bold text-[var(--state-error)]">- ฿{expenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm pt-2 border-t border-[var(--border-subtle)]">
                    <span className="font-black text-[var(--text-primary)]">Net Profit</span>
                    <span className={`font-black ${profit >= 0 ? "text-[var(--brand-primary)]" : "text-[var(--state-error)]"}`}>
                      {profit >= 0 ? '+' : ''} ฿{profit.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-[var(--border-subtle)]">
                  <div className="flex justify-between items-center mb-2">
                    <div className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Reputation Score</div>
                    <div className="text-xl font-black text-[var(--brand-accent)]">{business.reputation}/100</div>
                  </div>
                  <div className="w-full bg-[var(--bg-elevated)] h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)]"
                      style={{ width: `${business.reputation}%` }}
                    />
                  </div>
                </div>
              </div>
            </BrightLayer>

            <BrightLayer variant="elevated" padding="md">
              <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                <span className="text-2xl">💡</span>
                <p className="text-xs font-medium leading-relaxed">
                  <strong>Tip:</strong> Keep margins above 30% by managing payroll and minimizing stock waste.
                </p>
              </div>
            </BrightLayer>
          </div>
        </div>
      </main>
    </div>
  );
}
