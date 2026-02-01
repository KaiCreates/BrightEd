'use client';

import { BusinessState } from '@/lib/economy/economy-types';

interface BusinessStatsBarProps {
    businessState: BusinessState;
    pendingRevenue: number;
    earnedToday: number;
}

export function BusinessStatsBar({ businessState, pendingRevenue, earnedToday }: BusinessStatsBarProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 w-full">
            <div className="duo-card p-4 flex flex-col justify-between hover:translate-y-[-2px] transition-transform">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Cash Balance</p>
                <p className="text-3xl font-black text-[var(--text-primary)]">
                    ฿{businessState.cashBalance.toLocaleString()}
                </p>
            </div>

            <div className="duo-card p-4 flex flex-col justify-between hover:translate-y-[-2px] transition-transform">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Pending Revenue</p>
                <p className="text-3xl font-black text-cyan-500">
                    ฿{pendingRevenue.toLocaleString()}
                </p>
            </div>

            <div className="duo-card p-4 flex flex-col justify-between hover:translate-y-[-2px] transition-transform">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Earned Today</p>
                <p className="text-3xl font-black text-emerald-500">
                    ฿{earnedToday.toLocaleString()}
                </p>
            </div>

            <div className="duo-card p-4 flex flex-col justify-between hover:translate-y-[-2px] transition-transform">
                <p className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Reputation</p>
                <div className="flex items-end gap-3">
                    <p className="text-3xl font-black text-[var(--brand-primary)]">
                        {businessState.reputation}
                    </p>
                    <div className="h-2 flex-1 bg-[var(--bg-secondary)] rounded-full mb-2 border border-black/5 overflow-hidden">
                        <div
                            className="h-full bg-[var(--brand-primary)] transition-all duration-700"
                            style={{ width: `${Math.min(100, Math.max(0, businessState.reputation))}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
