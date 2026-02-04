'use client';

/**
 * Customer Loyalty Dashboard
 * Displays customer relationships and loyalty tiers
 */

import { motion } from 'framer-motion';
import { BrightLayer, BrightHeading } from '@/components/system';
import { LOYALTY_TIERS, getLoyaltyTier } from '@/lib/economy/loyalty-system';
import { getDicebearAvatarUrl } from '@/lib/avatars';

interface CustomerData {
    id: string;
    name: string;
    avatarSeed?: string;
    loyaltyScore: number;
    currentTier: number;
    lastOrderDate: string;
    totalOrders: number;
    lifetimeValue: number;
}

interface LoyaltyDashboardProps {
    customers: CustomerData[];
}

export function LoyaltyDashboard({ customers }: LoyaltyDashboardProps) {
    // Sort by loyalty score
    const sortedCustomers = [...customers].sort((a, b) => b.loyaltyScore - a.loyaltyScore);
    const topCustomers = sortedCustomers.slice(0, 10);

    // Calculate stats
    const avgLoyalty = customers.length > 0
        ? customers.reduce((sum, c) => sum + c.loyaltyScore, 0) / customers.length
        : 0;

    const tierCounts = LOYALTY_TIERS.map(tier => ({
        ...tier,
        count: customers.filter(c => c.currentTier === tier.tier).length,
    }));

    return (
        <div className="space-y-6">
            <div>
                <BrightHeading level={3}>Customer Loyalty</BrightHeading>
                <p className="text-sm text-[var(--text-secondary)]">
                    Build relationships to unlock higher margins and repeat business
                </p>
            </div>

            {/* Tier Distribution */}
            <BrightLayer variant="glass" padding="md">
                <div className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-4">
                    Loyalty Tiers
                </div>
                <div className="grid grid-cols-5 gap-3">
                    {tierCounts.map((tier) => (
                        <div
                            key={tier.tier}
                            className="text-center p-3 rounded-xl bg-[var(--bg-elevated)]/50 border border-[var(--border-subtle)]"
                        >
                            <div className="text-2xl mb-1">{tier.icon}</div>
                            <div className="text-xs font-bold text-[var(--text-primary)] mb-1">
                                {tier.name}
                            </div>
                            <div className="text-lg font-black text-[var(--brand-accent)]">
                                {tier.count}
                            </div>
                            <div className="text-[9px] text-[var(--text-muted)]">
                                +{tier.marginBonus * 100}% margin
                            </div>
                        </div>
                    ))}
                </div>
            </BrightLayer>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                <BrightLayer variant="elevated" padding="md">
                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                        Total Customers
                    </div>
                    <div className="text-2xl font-black text-[var(--text-primary)]">
                        {customers.length}
                    </div>
                </BrightLayer>

                <BrightLayer variant="elevated" padding="md">
                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                        Avg Loyalty
                    </div>
                    <div className="text-2xl font-black text-[var(--brand-accent)]">
                        {Math.round(avgLoyalty)}
                    </div>
                </BrightLayer>

                <BrightLayer variant="elevated" padding="md">
                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">
                        VIP+ Customers
                    </div>
                    <div className="text-2xl font-black text-[var(--state-success)]">
                        {customers.filter(c => c.currentTier >= 3).length}
                    </div>
                </BrightLayer>
            </div>

            {/* Top Customers */}
            {topCustomers.length > 0 && (
                <BrightLayer variant="glass" padding="md">
                    <div className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-4">
                        Top Customers
                    </div>
                    <div className="space-y-2">
                        {topCustomers.map((customer, idx) => {
                            const tier = getLoyaltyTier(customer.loyaltyScore);
                            const daysSinceOrder = Math.floor(
                                (Date.now() - new Date(customer.lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
                            );
                            const avatarUrl = getDicebearAvatarUrl(customer.avatarSeed ?? customer.id);

                            return (
                                <motion.div
                                    key={customer.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-elevated)]/30 border border-[var(--border-subtle)] hover:border-[var(--brand-primary)]/40 transition-colors"
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="relative flex-shrink-0">
                                            <img
                                                src={avatarUrl}
                                                alt={customer.name}
                                                className="h-10 w-10 rounded-xl border border-[var(--border-subtle)] object-cover"
                                            />
                                            <span className="absolute -bottom-1 -right-1 text-xs">{tier.icon}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="font-bold text-sm text-[var(--text-primary)] truncate">
                                                {customer.name}
                                            </div>
                                            <div className="text-[10px] text-[var(--text-muted)]">
                                                {customer.totalOrders} orders • ฿{customer.lifetimeValue.toLocaleString()} lifetime
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 flex-shrink-0">
                                        <div className="text-right">
                                            <div className="text-xs font-bold text-[var(--brand-primary)]">
                                                {tier.name}
                                            </div>
                                            <div className="text-[10px] text-[var(--text-muted)]">
                                                {daysSinceOrder}d ago
                                            </div>
                                        </div>
                                        <div className="w-16">
                                            <div className="text-xs text-[var(--text-muted)] mb-1">
                                                {customer.loyaltyScore}/100
                                            </div>
                                            <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] transition-all"
                                                    style={{ width: `${customer.loyaltyScore}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </BrightLayer>
            )}
        </div>
    );
}

export default LoyaltyDashboard;
