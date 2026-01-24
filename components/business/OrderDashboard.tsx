'use client';

/**
 * BrightEd Economy — Order Dashboard
 * Displays active orders, pending payments, and financial summary.
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrightLayer, BrightButton, BrightHeading } from '@/components/system';
import { CharacterSprite } from '@/components/cinematic';
import { Order, OrderStatus, BusinessState, QualityTier } from '@/lib/economy/economy-types';
import { BusinessType } from '@/lib/economy/economy-types';

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
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Group orders by status
    const pendingOrders = orders.filter(o => o.status === 'pending');
    const activeOrders = orders.filter(o => o.status === 'accepted' || o.status === 'in_progress');
    const completedOrders = orders.filter(o => o.status === 'completed').slice(0, 5);

    // Calculate financial summary
    const totalPending = activeOrders.reduce((sum, o) => sum + o.totalAmount, 0);
    const totalEarnedToday = completedOrders.reduce((sum, o) => sum + o.paidAmount + o.tipAmount, 0);

    // Time until next deadline
    const nextDeadline = activeOrders
        .map(o => new Date(o.deadline))
        .sort((a, b) => a.getTime() - b.getTime())[0];

    const formatTimeRemaining = (deadline: Date): string => {
        const now = new Date();
        const diff = deadline.getTime() - now.getTime();
        if (diff < 0) return 'OVERDUE';
        const mins = Math.floor(diff / 60000);
        const hours = Math.floor(mins / 60);
        if (hours > 0) return `${hours}h ${mins % 60}m`;
        return `${mins}m`;
    };

    return (
        <div className="space-y-6">
            {/* Financial Summary Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <BrightLayer variant="glass" padding="sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Cash Balance</p>
                    <p className="text-2xl font-black text-[var(--text-primary)]">
                        ฿{businessState.cashBalance.toLocaleString()}
                    </p>
                </BrightLayer>

                <BrightLayer variant="glass" padding="sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Pending Revenue</p>
                    <p className="text-2xl font-black text-[var(--state-info)]">
                        ฿{totalPending.toLocaleString()}
                    </p>
                </BrightLayer>

                <BrightLayer variant="glass" padding="sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Earned Today</p>
                    <p className="text-2xl font-black text-[var(--state-success)]">
                        ฿{totalEarnedToday.toLocaleString()}
                    </p>
                </BrightLayer>

                <BrightLayer variant="glass" padding="sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--text-muted)]">Reputation</p>
                    <p className="text-2xl font-black text-[var(--brand-accent)]">
                        {businessState.reputation}/100
                    </p>
                </BrightLayer>
            </div>

            {/* Incoming Orders (Pending) */}
            {pendingOrders.length > 0 && (
                <div>
                    <BrightHeading level={3} className="mb-4 flex items-center gap-2">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--state-warning)] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-[var(--state-warning)]"></span>
                        </span>
                        New Orders ({pendingOrders.length})
                    </BrightHeading>

                    <div className="space-y-3">
                        {pendingOrders.map((order, idx) => (
                            <motion.div
                                key={order.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                            >
                                <OrderCard
                                    order={order}
                                    businessType={businessType}
                                    onAccept={() => onAcceptOrder(order.id)}
                                    onReject={() => onRejectOrder(order.id)}
                                    showActions={true}
                                />
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}

            {/* Active Orders */}
            {activeOrders.length > 0 && (
                <div>
                    <BrightHeading level={3} className="mb-4">
                        Active Orders ({activeOrders.length})
                        {nextDeadline && (
                            <span className="text-sm font-normal text-[var(--text-muted)] ml-2">
                                Next deadline: {formatTimeRemaining(nextDeadline)}
                            </span>
                        )}
                    </BrightHeading>

                    <div className="grid md:grid-cols-2 gap-4">
                        {activeOrders.map(order => (
                            <OrderCard
                                key={order.id}
                                order={order}
                                businessType={businessType}
                                onComplete={() => onCompleteOrder(order.id)}
                                onFulfill={() => onFulfill(order)}
                                showActions={true}
                                showDeadline={true}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Empty State */}
            {pendingOrders.length === 0 && activeOrders.length === 0 && (
                <BrightLayer variant="glass" padding="lg" className="text-center">
                    <span className="text-4xl mb-4 inline-block">☕</span>
                    <BrightHeading level={3} className="mb-2">No Active Orders</BrightHeading>
                    <p className="text-[var(--text-secondary)]">
                        New orders will appear here based on demand and your reputation.
                    </p>
                </BrightLayer>
            )}

            {/* Recent Completed */}
            {completedOrders.length > 0 && (
                <div>
                    <BrightHeading level={4} className="mb-3">Recently Completed</BrightHeading>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                        {completedOrders.map(order => (
                            <div
                                key={order.id}
                                className="flex-shrink-0 bg-[var(--bg-elevated)]/50 rounded-xl px-4 py-2 border border-[var(--border-subtle)]"
                            >
                                <p className="text-sm font-bold text-[var(--text-primary)]">{order.customerName}</p>
                                <p className="text-xs text-[var(--state-success)]">+฿{order.paidAmount + order.tipAmount}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// ORDER CARD COMPONENT
// ============================================================================

interface OrderCardProps {
    order: Order;
    businessType: BusinessType;
    onAccept?: () => void;
    onReject?: () => void;
    onComplete?: () => void;
    onFulfill?: () => void;
    showActions?: boolean;
    showDeadline?: boolean;
}

function OrderCard({
    order,
    businessType,
    onAccept,
    onReject,
    onComplete,
    onFulfill,
    showActions = false,
    showDeadline = false,
}: OrderCardProps) {
    const isPending = order.status === 'pending';
    const isActive = order.status === 'accepted' || order.status === 'in_progress';

    // Calculate time remaining
    const deadline = new Date(order.deadline);
    const now = new Date();
    const timeRemaining = deadline.getTime() - now.getTime();
    const isOverdue = timeRemaining < 0;
    const isUrgent = timeRemaining < 10 * 60 * 1000; // Less than 10 mins

    const formatDeadline = () => {
        if (isOverdue) return 'OVERDUE';
        const mins = Math.floor(timeRemaining / 60000);
        if (mins < 60) return `${mins}m remaining`;
        const hours = Math.floor(mins / 60);
        return `${hours}h ${mins % 60}m remaining`;
    };

    // Customer mood emoji
    const moodEmoji = {
        happy: '😊',
        neutral: '😐',
        impatient: '😤',
        demanding: '🧐',
    };

    return (
        <BrightLayer
            variant="glass"
            padding="md"
            className={`relative overflow-hidden ${isPending ? 'border-l-4 border-l-[var(--state-warning)]' :
                isOverdue ? 'border-l-4 border-l-[var(--state-error)] animate-urgent-pulse' :
                    isUrgent ? 'border-l-4 border-l-[var(--state-warning)]' :
                        'border-l-4 border-l-[var(--brand-primary)]'
                }`}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="text-lg">{moodEmoji[order.customerMood]}</span>
                        <span className="font-bold text-[var(--text-primary)]">{order.customerName}</span>
                        <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase"
                            style={{
                                backgroundColor: `color-mix(in srgb, ${STATUS_COLORS[order.status]} 20%, transparent)`,
                                color: STATUS_COLORS[order.status]
                            }}
                        >
                            {STATUS_LABELS[order.status]}
                        </span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">
                        {order.customerType} • {QUALITY_EMOJI[order.qualityRequirement]} Quality
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-black text-[var(--brand-accent)]">
                        ฿{order.totalAmount}
                    </p>
                    <p className="text-xs text-[var(--text-muted)]">
                        Profit: ฿{order.totalAmount - order.costAmount}
                    </p>
                </div>
            </div>

            {/* Items */}
            <div className="bg-[var(--bg-elevated)]/30 rounded-lg p-3 mb-3">
                {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-sm">
                        <span className="text-[var(--text-secondary)]">
                            {item.quantity}x {item.productName}
                        </span>
                        <span className="text-[var(--text-muted)]">
                            ฿{item.pricePerUnit * item.quantity}
                        </span>
                    </div>
                ))}
            </div>

            {/* Deadline */}
            {showDeadline && isActive && (
                <div className={`text-sm mb-3 ${isOverdue ? 'text-[var(--state-error)]' : isUrgent ? 'text-[var(--state-warning)]' : 'text-[var(--text-muted)]'}`}>
                    ⏱ {formatDeadline()}
                </div>
            )}

            {/* Expiry for pending */}
            {isPending && (
                <div className="text-xs text-[var(--text-muted)] mb-3">
                    Offer expires in {Math.max(0, Math.floor((new Date(order.expiresAt).getTime() - now.getTime()) / 60000))}m
                </div>
            )}

            {/* Actions */}
            {showActions && (
                <div className="flex gap-2 justify-end">
                    {isPending && (
                        <>
                            <BrightButton variant="ghost" size="sm" onClick={onReject}>
                                Decline
                            </BrightButton>
                            <BrightButton variant="primary" size="sm" onClick={onAccept}>
                                Accept Order
                            </BrightButton>
                        </>
                    )}
                    {isActive && (
                        <div className="flex gap-2">
                            <BrightButton variant="ghost" size="sm" onClick={onComplete}>
                                Skip to Done
                            </BrightButton>
                            <BrightButton variant="primary" size="sm" onClick={onFulfill}>
                                Fulfill Order
                            </BrightButton>
                        </div>
                    )}
                </div>
            )}
        </BrightLayer>
    );
}

export default OrderDashboard;
