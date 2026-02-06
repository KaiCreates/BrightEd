'use client';

/**
 * BrightEd Economy — Order Dashboard
 * Displays active orders, pending payments, and financial summary.
 */

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { BrightLayer, BrightButton, BrightHeading } from '@/components/system';
import { Order, OrderStatus, BusinessState, QualityTier } from '@/lib/economy/economy-types';
import { BusinessType } from '@/lib/economy/economy-types';
import { getDicebearAvatarUrl } from '@/lib/avatars';

interface OrderDashboardProps {
    businessState: BusinessState;
    businessType: BusinessType;
    orders: Order[];
    onAcceptOrder: (orderId: string) => void;
    onRejectOrder: (orderId: string) => void;
    onCompleteOrder: (orderId: string) => void;
    onFulfill: (order: Order) => void;
}

const STATUS_COLORS: Record<OrderStatus, string> = {
    pending: 'var(--state-warning)',
    accepted: 'var(--state-info)',
    in_progress: 'var(--brand-primary)',
    completed: 'var(--state-success)',
    failed: 'var(--state-error)',
    cancelled: 'var(--text-muted)',
    expired: 'var(--text-muted)',
};

const STATUS_LABELS: Record<OrderStatus, string> = {
    pending: 'New Order',
    accepted: 'Accepted',
    in_progress: 'In Progress',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    expired: 'Expired',
};

const QUALITY_EMOJI: Record<QualityTier, string> = {
    basic: '⭐',
    standard: '⭐⭐',
    premium: '⭐⭐⭐',
};

export function OrderDashboard({
    businessState,
    businessType,
    orders,
    onAcceptOrder,
    onRejectOrder,
    onCompleteOrder,
    onFulfill,
}: OrderDashboardProps) {
    const [now, setNow] = useState(0);

    useEffect(() => {
        setNow(Date.now());
        const interval = setInterval(() => setNow(Date.now()), 60000);
        return () => clearInterval(interval);
    }, []);

    // Group orders by status
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const activeOrders = orders.filter(o => o.status === 'accepted' || o.status === 'in_progress');
    const completedOrders = orders.filter(o => o.status === 'completed').slice(0, 5);

    // Time until next deadline
    const activeWithDeadlines = activeOrders
        .filter(o => o.deadline)
        .map(o => new Date(o.deadline))
        .sort((a, b) => a.getTime() - b.getTime());

    const nextDeadline = activeWithDeadlines[0];

    const formatTimeRemaining = (deadline: Date): string => {
        if (!now) return '...';
        const diff = deadline.getTime() - now;
        if (diff < 0) return 'OVERDUE';
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        if (hours > 0) return `${hours}h ${mins % 60}m`;
        return `${mins}m`;
    };

    const getAvatarSeed = (order: Order) =>
        businessState.customerProfiles?.[order.customerId]?.avatarSeed ?? order.customerId;

    return (
        <div className="space-y-8 layout-transition">
            {/* Incoming Orders (Pending) */}
            <div className="min-h-[140px] flex flex-col">
                <BrightHeading level={3} className="mb-4 flex items-center gap-3">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--state-warning)] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--state-warning)]"></span>
                    </span>
                    <span className="tracking-tight">Market Requests</span>
                    <span className="ml-auto text-[10px] font-black bg-[var(--bg-elevated)] px-2 py-0.5 rounded-full border border-[var(--border-subtle)]">
                        {pendingOrders.length} QUEUED
                    </span>
                </BrightHeading>

                <div className="space-y-3 relative flex-1">
                    <AnimatePresence initial={false} mode="popLayout">
                        {pendingOrders.map((order) => (
                            <motion.div
                                key={order.id}
                                layout
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9, x: -20 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                            >
                                <OrderCard
                                    order={order}
                                    businessType={businessType}
                                    customerAvatarSeed={getAvatarSeed(order)}
                                    onAccept={() => onAcceptOrder(order.id)}
                                    onReject={() => onRejectOrder(order.id)}
                                    showActions={true}
                                    now={now}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {pendingOrders.length === 0 && (
                        <div className="flex-1 flex items-center justify-center p-8 border border-dashed border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-elevated)]/5">
                            <p className="text-xs text-[var(--text-muted)] italic font-medium">Scanning for new market opportunities...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Active Operations */}
            <div className="min-h-[220px] flex flex-col">
                <div className="flex justify-between items-end mb-4">
                    <BrightHeading level={3} className="tracking-tight">Live Operations</BrightHeading>
                    {nextDeadline && (
                        <span className="text-[10px] font-black text-[var(--state-warning)] bg-[var(--state-warning)]/10 px-2 py-1 rounded border border-[var(--state-warning)]/20 uppercase tracking-widest">
                            Urgent Due: {formatTimeRemaining(nextDeadline)}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative flex-1">
                    <AnimatePresence initial={false} mode="popLayout">
                        {activeOrders.map(order => (
                            <motion.div
                                key={order.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.8, filter: 'blur(8px)' }}
                                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                            >
                                <OrderCard
                                    order={order}
                                    businessType={businessType}
                                    customerAvatarSeed={getAvatarSeed(order)}
                                    onComplete={() => onCompleteOrder(order.id)}
                                    onFulfill={() => onFulfill(order)}
                                    showActions={true}
                                    showDeadline={true}
                                    now={now}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {activeOrders.length === 0 && (
                        <div className="col-span-full flex-1 flex flex-col items-center justify-center p-10 bg-[var(--bg-elevated)]/10 rounded-2xl border border-[var(--border-subtle)]">
                            <span className="text-2xl mb-2 opacity-50">⚡</span>
                            <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest">Systems Standby</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Terminal History */}
            {completedOrders.length > 0 && (
                <div className="pt-4 border-t border-[var(--border-subtle)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--text-muted)] mb-4">Terminal Performance Log</p>
                    <div className="flex gap-3 overflow-x-auto pb-4 sleek-scrollbar">
                        <AnimatePresence initial={false}>
                            {completedOrders.map(order => (
                                <motion.div
                                    key={order.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex-none min-w-[140px] bg-[var(--bg-elevated)]/40 rounded-xl px-4 py-3 border border-[var(--border-subtle)] hover:border-[var(--brand-primary)]/40 transition-all cursor-default"
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <Image
                                            src={getDicebearAvatarUrl(getAvatarSeed(order))}
                                            alt={order.customerName}
                                            width={24}
                                            height={24}
                                            className="h-6 w-6 rounded-full border border-white/10 object-cover"
                                        />
                                        <p className="text-[10px] font-black text-[var(--text-secondary)] uppercase truncate">{order.customerName}</p>
                                    </div>
                                    <p className="text-sm font-black text-[var(--state-success)]">+฿{order.paidAmount + order.tipAmount}</p>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            )}
        </div>
    );
}

// ----------------------------------------------------------------------------
// Internal OrderCard Component
// ----------------------------------------------------------------------------

interface OrderCardProps {
    order: Order;
    businessType: BusinessType;
    customerAvatarSeed?: string;
    onAccept?: () => void;
    onReject?: () => void;
    onComplete?: () => void;
    onFulfill?: () => void;
    showActions?: boolean;
    showDeadline?: boolean;
    now: number;
}

function OrderCard({
    order,
    customerAvatarSeed,
    onAccept,
    onReject,
    onComplete,
    onFulfill,
    showActions = false,
    showDeadline = false,
    now,
}: OrderCardProps) {
    const isPending = order.status === 'pending';
    const isActive = order.status === 'accepted' || order.status === 'in_progress';

    // Calculate time remaining
    const deadline = new Date(order.deadline);
    const timeRemaining = now ? deadline.getTime() - now : null;
    const isOverdue = timeRemaining !== null && timeRemaining < 0;
    const isUrgent = timeRemaining !== null && timeRemaining < 5 * 60 * 1000; // Less than 5 mins

    const formatDeadline = () => {
        if (timeRemaining === null) return '...';
        if (isOverdue) return 'OVERDUE';
        const mins = Math.floor(timeRemaining / 60000);
        if (mins < 60) return `${mins}m remaining`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ${mins % 60}m remaining`;
    };

    const expiresInMinutes = now
        ? Math.max(0, Math.floor((new Date(order.expiresAt).getTime() - now) / 60000))
        : null;

    const moodEmoji = {
        happy: '😊',
        neutral: '😐',
        impatient: '😤',
        demanding: '🧐',
    };

    // Extract narrative if available
    const narrative = (order as any).narrative;
    const narrativeData = (order as any).narrativeData;
    const consequenceMessage = (order as any).consequenceMessage;
    const avatarUrl = getDicebearAvatarUrl(customerAvatarSeed ?? order.customerId);

    return (
        <BrightLayer
            variant="glass"
            padding="md"
            className={`relative overflow-hidden transition-all duration-300 group/card glass-card-hover ${isPending ? 'border-l-4 border-l-[var(--state-warning)]' :
                isOverdue ? 'border-l-4 border-l-[var(--state-error)] animate-pulse' :
                    isUrgent ? 'border-l-4 border-l-[var(--state-warning)]' :
                        'border-l-4 border-l-[var(--brand-primary)]'
                }`}
        >
            <div className="flex justify-between items-start mb-4 gap-2">
                <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0">
                        <Image
                            src={avatarUrl}
                            alt={order.customerName}
                            width={40}
                            height={40}
                            className="h-10 w-10 rounded-2xl border border-white/10 object-cover"
                        />
                        <span className="absolute -bottom-1 -right-1 text-xs">{moodEmoji[order.customerMood]}</span>
                    </div>
                    <div className="min-w-0">
                        <span className="block font-black text-sm text-[var(--text-primary)] leading-tight mb-1 truncate">{order.customerName}</span>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[9px] font-black uppercase text-[var(--text-muted)] tracking-widest flex-shrink-0">{order.customerType}</span>
                            <span className="w-1 h-1 rounded-full bg-[var(--border-subtle)] flex-shrink-0" />
                            <span className="text-[9px] font-black text-[var(--brand-primary)] uppercase flex-shrink-0">{QUALITY_EMOJI[order.qualityRequirement]} QUALITY</span>
                        </div>
                    </div>
                </div>
                <div className="text-right flex-shrink-0">
                    <div className="flex items-center justify-end gap-1 mb-1">
                        <span className="text-xs font-black text-[var(--brand-accent)]">฿</span>
                        <span className="text-lg font-black text-[var(--brand-accent)] leading-none">{order.totalAmount}</span>
                    </div>
                    <span
                        className="text-[8px] px-2 py-0.5 rounded-md font-bold uppercase ring-1 ring-inset"
                        style={{
                            backgroundColor: `color-mix(in srgb, ${STATUS_COLORS[order.status]} 10%, transparent)`,
                            color: STATUS_COLORS[order.status],
                            borderColor: `color-mix(in srgb, ${STATUS_COLORS[order.status]} 30%, transparent)`
                        }}
                    >
                        {STATUS_LABELS[order.status]}
                    </span>
                </div>
            </div>

            {/* Items Summary */}
            <div className="bg-[var(--bg-elevated)]/20 rounded-xl p-3 mb-4 space-y-1.5 border border-white/5">
                {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-[11px] font-medium">
                        <span className="text-[var(--text-secondary)]">
                            <span className="text-[var(--text-muted)] font-black mr-2 opacity-60">{item.quantity}X</span>
                            {item.productName}
                        </span>
                        <span className="text-[var(--text-muted)] font-mono">฿{item.pricePerUnit * item.quantity}</span>
                    </div>
                ))}
            </div>

            {/* Narrative Context */}
            {narrative && isPending && (
                <div className="bg-[var(--brand-primary)]/5 border border-[var(--brand-primary)]/20 rounded-xl p-3 mb-4">
                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--brand-primary)] mb-2">
                        📖 Context
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed italic">
                        {narrative}
                    </p>
                    {narrativeData?.urgencyReason && (
                        <div className="mt-2 text-[10px] text-[var(--state-warning)] font-bold">
                            ⚡ {narrativeData.urgencyReason}
                        </div>
                    )}
                </div>
            )}

            {/* Consequence Message (for completed orders) */}
            {consequenceMessage && order.status === 'completed' && (
                <div className="bg-[var(--state-success)]/5 border border-[var(--state-success)]/20 rounded-xl p-3 mb-4">
                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--state-success)] mb-2">
                        ✨ Outcome
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                        {consequenceMessage}
                    </p>
                </div>
            )}

            {/* Status Feedback */}
            <div className="flex items-center justify-between mt-auto">
                <div className="flex flex-col gap-1">
                    {showDeadline && isActive && (
                        <div className={`text-[10px] font-black uppercase tracking-wider ${isOverdue ? 'text-[var(--state-error)]' : isUrgent ? 'text-[var(--state-warning)]' : 'text-[var(--text-muted)]'}`}>
                            ⏱ {formatDeadline()}
                        </div>
                    )}
                    {isPending && (
                        <div className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-wider">
                            {expiresInMinutes === null ? 'Expires soon' : `Expires in ${expiresInMinutes}m`}
                        </div>
                    )}
                </div>

                {/* Actions */}
                {showActions && (
                    <div className="flex gap-2">
                        {isPending && (
                            <>
                                <BrightButton variant="ghost" size="lg" onClick={onReject} className="px-3 h-8">
                                    Decline
                                </BrightButton>
                                <BrightButton variant="primary" size="lg" onClick={onAccept} className="px-5 h-8 font-black">
                                    Accept
                                </BrightButton>
                            </>
                        )}
                        {isActive && (
                            <div className="flex gap-2">
                                <BrightButton variant="ghost" size="lg" onClick={onReject} className="px-3 h-8 text-[var(--state-error)]/70 hover:text-[var(--state-error)]">
                                    Cancel
                                </BrightButton>
                                <BrightButton variant="ghost" size="lg" onClick={onComplete} className="px-3 h-8">
                                    Done
                                </BrightButton>
                                <BrightButton variant="primary" size="sm" onClick={onFulfill} className="px-5 h-8 font-black shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.25)]">
                                    Fulfill
                                </BrightButton>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </BrightLayer>
    );
}

export default OrderDashboard;
