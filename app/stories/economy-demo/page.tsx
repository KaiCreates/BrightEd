'use client';

/**
 * BrightEd Economy — Demo Page
 * Test page for the order-driven economy system.
 */

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BrightLayer, BrightButton, BrightHeading } from '@/components/system';
import { CinematicProvider, useCinematic } from '@/components/cinematic';
import { BusinessTypeSelector } from '@/components/business/BusinessTypeSelector';
import { OrderDashboard } from '@/components/business/OrderDashboard';
import {
    BusinessType,
    BusinessState,
    Order,
    generateOrdersForTick,
    acceptOrder,
    rejectOrder,
    completeOrder,
    failOrder,
    generateDailyExpenses,
    payExpenses,
    assessFinancialHealth,
    getBusinessType,
} from '@/lib/economy';
import Link from 'next/link';

function EconomyDemoContent() {
    const { showInterrupt } = useCinematic();
    const [step, setStep] = useState<'select' | 'dashboard'>('select');
    const [businessType, setBusinessType] = useState<BusinessType | null>(null);
    const [businessState, setBusinessState] = useState<BusinessState | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [simHour, setSimHour] = useState(10); // Start at 10 AM
    const [isSimulating, setIsSimulating] = useState(false);

    // Initialize business state when type is selected
    const handleBusinessSelect = (type: BusinessType, name: string) => {
        const initialState: BusinessState = {
            id: `biz_${Date.now()}`,
            playerId: 'demo_player',
            businessTypeId: type.id,
            businessName: name,
            cashBalance: type.startingCapital,
            totalRevenue: 0,
            totalExpenses: 0,
            reputation: 50,
            customerSatisfaction: 70,
            reviewCount: 0,
            operatingHours: { open: 8, close: 20 },
            staffCount: 1,
            maxConcurrentOrders: type.demandConfig.maxConcurrentOrders,
            inventory: {},
            activeOrders: [],
            ordersCompleted: 0,
            ordersFailed: 0,
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
        };

        setBusinessType(type);
        setBusinessState(initialState);
        setStep('dashboard');

        showInterrupt('luka', `${name} is now open for business! Orders will start coming in based on the time of day and your reputation.`, 'happy');
    };

    // Simulate time passing and order generation
    useEffect(() => {
        if (!isSimulating || !businessType || !businessState) return;

        const interval = setInterval(() => {
            // Generate new orders
            const activeCount = orders.filter(o => o.status === 'accepted' || o.status === 'in_progress').length;
            const newOrders = generateOrdersForTick(businessType, businessState, simHour, activeCount, 5);

            if (newOrders.length > 0) {
                setOrders(prev => [...newOrders, ...prev]);
                showInterrupt('luka', `New order from ${newOrders[0].customerName}!`, 'happy');
            }

            // Advance time
            setSimHour(h => (h >= 23 ? 8 : h + 1));
        }, 3000);

        return () => clearInterval(interval);
    }, [isSimulating, businessType, businessState, simHour, orders]);

    // Handle order accept
    const handleAcceptOrder = (orderId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const accepted = acceptOrder(order);
        setOrders(prev => prev.map(o => o.id === orderId ? accepted : o));

        showInterrupt('luka', `Order accepted! You have until ${new Date(accepted.deadline).toLocaleTimeString()} to complete it.`, 'neutral');
    };

    // Handle order reject
    const handleRejectOrder = (orderId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        const { order: rejected, reputationPenalty } = rejectOrder(order);
        setOrders(prev => prev.map(o => o.id === orderId ? rejected : o));

        if (businessState) {
            setBusinessState(prev => prev ? {
                ...prev,
                reputation: Math.max(0, prev.reputation - reputationPenalty),
            } : null);
        }

        if (reputationPenalty > 2) {
            showInterrupt('keisha', `${order.customerName} seemed disappointed you couldn't help them.`, 'concerned');
        }
    };

    // Handle order complete
    const handleCompleteOrder = (orderId: string) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) return;

        // Simulate quality score (random for demo)
        const qualityScore = 60 + Math.floor(Math.random() * 40);
        const { order: completed, payment, tip } = completeOrder(order, qualityScore);

        setOrders(prev => prev.map(o => o.id === orderId ? completed : o));

        if (businessState) {
            setBusinessState(prev => prev ? {
                ...prev,
                cashBalance: prev.cashBalance + payment + tip,
                totalRevenue: prev.totalRevenue + payment + tip,
                ordersCompleted: prev.ordersCompleted + 1,
                reputation: Math.min(100, prev.reputation + (qualityScore > 80 ? 2 : 0)),
            } : null);
        }

        if (tip > 0) {
            showInterrupt('mendy', `Great work! ${order.customerName} left a ฿${tip} tip!`, 'happy');
        }
    };

    // Financial health assessment
    const healthStatus = businessState && businessType
        ? assessFinancialHealth(businessState, businessType)
        : null;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            {/* Header */}
            <nav className="sticky top-0 z-40 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-subtle)] px-6 py-4">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div>
                        <BrightHeading level={3}>
                            {businessState ? businessState.businessName : 'Economy Demo'}
                        </BrightHeading>
                        <p className="text-sm text-[var(--text-muted)]">
                            {businessType ? `${businessType.name} • ` : ''}
                            Simulation Hour: {simHour}:00
                        </p>
                    </div>
                    <div className="flex gap-4 items-center">
                        {step === 'dashboard' && (
                            <>
                                <BrightButton
                                    variant={isSimulating ? 'danger' : 'primary'}
                                    size="sm"
                                    onClick={() => setIsSimulating(!isSimulating)}
                                >
                                    {isSimulating ? '⏸ Pause' : '▶ Start Simulation'}
                                </BrightButton>
                                <BrightButton
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                        setStep('select');
                                        setBusinessType(null);
                                        setBusinessState(null);
                                        setOrders([]);
                                        setIsSimulating(false);
                                    }}
                                >
                                    Reset
                                </BrightButton>
                            </>
                        )}
                        <Link href="/stories/cinematic-demo">
                            <BrightButton variant="outline" size="sm">Cinematic Demo</BrightButton>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Content */}
            {step === 'select' && (
                <BusinessTypeSelector onSelect={handleBusinessSelect} />
            )}

            {step === 'dashboard' && businessState && businessType && (
                <main className="max-w-6xl mx-auto px-6 py-8">
                    {/* Health indicator */}
                    {healthStatus && (
                        <div className={`mb-6 px-4 py-3 rounded-xl border-l-4 ${healthStatus.health === 'critical' ? 'bg-red-500/10 border-l-red-500' :
                                healthStatus.health === 'struggling' ? 'bg-orange-500/10 border-l-orange-500' :
                                    healthStatus.health === 'stable' ? 'bg-blue-500/10 border-l-blue-500' :
                                        'bg-green-500/10 border-l-green-500'
                            }`}>
                            <div className="flex justify-between items-center">
                                <div>
                                    <span className="text-sm font-bold uppercase tracking-wider">
                                        Business Health: {healthStatus.health.toUpperCase()}
                                    </span>
                                    {healthStatus.issues.length > 0 && (
                                        <p className="text-xs text-[var(--text-muted)] mt-1">
                                            {healthStatus.issues[0]}
                                        </p>
                                    )}
                                </div>
                                <div className="text-2xl font-black">{healthStatus.score}/100</div>
                            </div>
                        </div>
                    )}

                    <OrderDashboard
                        businessState={businessState}
                        businessType={businessType}
                        orders={orders}
                        onAcceptOrder={handleAcceptOrder}
                        onRejectOrder={handleRejectOrder}
                        onCompleteOrder={handleCompleteOrder}
                    />
                </main>
            )}
        </div>
    );
}

export default function EconomyDemoPage() {
    return (
        <CinematicProvider>
            <EconomyDemoContent />
        </CinematicProvider>
    );
}
