'use client';

import { BrightLayer } from '@/components/system';
import { BusinessState } from '@/lib/economy/economy-types';

interface BusinessStatsBarProps {
    businessState: BusinessState;
    pendingRevenue: number;
    earnedToday: number;
}

export function BusinessStatsBar({ businessState, pendingRevenue, earnedToday }: BusinessStatsBarProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
            <BrightLayer variant="glass" padding="sm" className="flex flex-col justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Cash Balance</p>
                <p className="text-2xl font-black text-[var(--text-primary)]">
                    ฿{businessState.cashBalance.toLocaleString()}
                </p>
            </BrightLayer>

            <BrightLayer variant="glass" padding="sm" className="flex flex-col justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Pending Revenue</p>
                <p className="text-2xl font-black text-[var(--state-info)]">
                    ฿{pendingRevenue.toLocaleString()}
                </p>
            </BrightLayer>

            <BrightLayer variant="glass" padding="sm" className="flex flex-col justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Earned Today</p>
                <p className="text-2xl font-black text-[var(--state-success)]">
                    ฿{earnedToday.toLocaleString()}
                </p>
            </BrightLayer>

            <BrightLayer variant="glass" padding="sm" className="flex flex-col justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Reputation</p>
                <div className="flex items-end gap-2">
                    <p className="text-2xl font-black text-[var(--brand-accent)]">
                        {businessState.reputation}/100
                    </p>
                    <div className="h-1.5 flex-1 bg-[var(--bg-elevated)] rounded-full mb-1.5 overflow-hidden">
                        <div
                            className="h-full bg-[var(--brand-accent)] transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(0, businessState.reputation))}%` }}
                        />
                    </div>
                </div>
            </BrightLayer>
        </div>
    );
}
