'use client';

import BusinessDuolingoLayout from '@/components/business/BusinessDuolingoLayout';
import { BrightHeading } from '@/components/system';
import { useEconomyBusiness } from '@/lib/economy/use-economy-business';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { motion } from 'framer-motion';

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
      <BusinessDuolingoLayout>
        <div className="max-w-md mx-auto py-20 text-center">
          <div className="duo-card">
            <BrightHeading level={2} className="mb-2">No business found</BrightHeading>
            <p className="text-[var(--text-secondary)]">Create a business first to view reports.</p>
          </div>
        </div>
      </BusinessDuolingoLayout>
    );
  }

  const revenue = business.totalRevenue || 0;
  const expenses = business.totalExpenses || 0;
  const cash = business.cashBalance || 0;
  const profit = revenue - expenses;
  const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : '0.0';
  const ordersCompleted = business.ordersCompleted || 0;
  const avgOrderValue = ordersCompleted > 0 ? Math.round(revenue / ordersCompleted) : 0;

  const chartData = [
    { name: 'Revenue', amount: revenue, color: '#58cc02' },
    { name: 'Expenses', amount: expenses, color: '#ff4b4b' },
    { name: 'Net Profit', amount: profit, color: '#0ea5e9' }
  ];

  return (
    <BusinessDuolingoLayout>
      <div className="space-y-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="text-xs font-black uppercase tracking-widest text-[var(--brand-primary)]">Financial Reports</div>
            <BrightHeading level={1} className="mt-1">Performance Overview</BrightHeading>
            <p className="text-[var(--text-secondary)] mt-2 max-w-xl font-medium">
              Real-time financial breakdown of your business activities.
            </p>
          </div>
          {ordersCompleted === 0 && (
            <div className="px-4 py-2 bg-amber-500/10 border-2 border-amber-500/30 text-amber-600 text-[10px] font-black uppercase tracking-widest rounded-xl">
              ⚠️ Not enough data
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-8 space-y-8">
            <div className="duo-card">
              <div className="mb-8">
                <BrightHeading level={3}>Financial Snapshot</BrightHeading>
                <p className="text-sm text-[var(--text-secondary)] font-bold mt-1">Current total accumulation</p>
              </div>

              <div className="h-[350px] w-full">
                {ordersCompleted > 0 || revenue > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 800 }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 800 }} />
                      <Tooltip
                        cursor={{ fill: 'var(--bg-secondary)', opacity: 0.5 }}
                        contentStyle={{
                          backgroundColor: 'var(--bg-elevated)',
                          border: '2px solid var(--border-subtle)',
                          borderRadius: '16px',
                          fontWeight: '800'
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
                  <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-[var(--brand-primary)]/20 rounded-2xl bg-[var(--bg-secondary)]/50">
                    <span className="text-5xl mb-4">📊</span>
                    <p className="text-[var(--text-muted)] font-black uppercase tracking-widest text-xs">Start selling to generate reports</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="duo-card border-b-[#0ea5e9]">
                <div className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Net Profit Margin</div>
                <div className="mt-4 text-5xl font-black text-[#0ea5e9] tracking-tighter">{margin}%</div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">Target: 20%+</span>
                  <div className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${Number(margin) >= 20 ? "bg-green-500/10 text-green-600" : "bg-amber-500/10 text-amber-600"}`}>
                    {Number(margin) >= 20 ? "Healthy" : "Low Margin"}
                  </div>
                </div>
              </div>

              <div className="duo-card border-b-[#58cc02]">
                <div className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Avg. Order Value</div>
                <div className="mt-4 text-5xl font-black text-[#58cc02] tracking-tighter">
                  ฿{avgOrderValue}
                </div>
                <div className="mt-4 text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">
                  Across {ordersCompleted} entries
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <div className="duo-card">
              <BrightHeading level={3} className="mb-8">Ledger Summary</BrightHeading>

              <div className="space-y-8">
                <div className="p-5 bg-[var(--bg-secondary)] rounded-2xl border-2 border-[var(--border-subtle)] border-b-4">
                  <div className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Cash On Hand</div>
                  <div className="text-4xl font-black text-[var(--text-primary)]">฿ {cash.toLocaleString()}</div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-[var(--text-secondary)]">Revenue</span>
                    <span className="font-black text-[#58cc02]">฿{revenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-[var(--text-secondary)]">Expenses</span>
                    <span className="font-black text-[#ff4b4b]">฿{expenses.toLocaleString()}</span>
                  </div>
                  <div className="pt-4 border-t-2 border-dashed border-[var(--border-subtle)] flex justify-between items-center">
                    <span className="font-black text-sm uppercase tracking-widest">Net Profit</span>
                    <span className={`text-xl font-black ${profit >= 0 ? "text-[#0ea5e9]" : "text-[#ff4b4b]"}`}>
                      {profit >= 0 ? '+' : ''} ฿{profit.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t-2 border-[var(--border-subtle)]">
                  <div className="flex justify-between items-center mb-3">
                    <div className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Reputation</div>
                    <div className="text-lg font-black text-[#2DD4BF]">{business.reputation}%</div>
                  </div>
                  <div className="w-full bg-[var(--bg-secondary)] h-4 rounded-full overflow-hidden border border-[var(--border-subtle)] p-0.5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${business.reputation}%` }}
                      className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[#2DD4BF] rounded-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </BusinessDuolingoLayout>
  );
}
