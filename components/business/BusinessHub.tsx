'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BrightHeading, BrightButton } from '@/components/system';
import { useEconomyBusiness } from '@/lib/economy/use-economy-business';
import { useAuth } from '@/lib/auth-context';
import BusinessCreditCard from '@/components/business/BusinessCreditCard';
import BusinessDuolingoLayout from '@/components/business/BusinessDuolingoLayout';

export default function BusinessHub() {
    const { user, loading: authLoading } = useAuth();
    const { business, businessType, loading } = useEconomyBusiness();

    if (authLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center px-4">
                <div className="duo-card max-w-md w-full text-center">
                    <BrightHeading level={2} className="mb-3">Sign in required</BrightHeading>
                    <p className="text-[var(--text-secondary)] mb-6">Please sign in to access your business.</p>
                    <Link href="/">
                        <button className="duo-btn duo-btn-primary w-full">Go Home</button>
                    </Link>
                </div>
            </div>
        );
    }

    if (!business) {
        return (
            <BusinessDuolingoLayout>
                <div className="max-w-xl mx-auto py-20 text-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="duo-card border-dashed border-2 border-[var(--brand-primary)]/30"
                    >
                        <div className="text-7xl mb-6">💼</div>
                        <BrightHeading level={2} className="mb-4">Start Your Empire</BrightHeading>
                        <p className="text-[var(--text-secondary)] mb-8 text-lg font-medium">
                            Register your first business to unlock the simulation dashboard and start building your legacy.
                        </p>
                        <Link href="/practicals/business/register" className="w-full">
                            <button className="duo-btn duo-btn-primary w-full py-4 text-lg">
                                Create Business
                            </button>
                        </Link>
                    </motion.div>
                </div>
            </BusinessDuolingoLayout>
        );
    }

    const MENU_ITEMS = [
        {
            href: '/practicals/business/operations',
            label: 'Operations',
            desc: 'Fulfill orders and earn revenue',
            icon: '⚡',
            color: 'text-amber-500'
        },
        {
            href: '/practicals/business/supply',
            label: 'Supply',
            desc: 'Manage inventory and restock',
            icon: '📦',
            color: 'text-blue-500'
        },
        {
            href: '/practicals/business/team',
            label: 'Team',
            desc: 'Manage payroll and hire staff',
            icon: '👥',
            color: 'text-green-500'
        },
        {
            href: '/practicals/business/credit',
            label: 'Credit',
            desc: 'Cards, limits and vendor lines',
            icon: '💳',
            color: 'text-purple-500'
        },
        {
            href: '/practicals/business/reports',
            label: 'Reports',
            desc: 'Financials and performance',
            icon: '📊',
            color: 'text-cyan-500'
        },
    ];

    return (
        <BusinessDuolingoLayout>
            <div className="space-y-10">
                <section className="flex flex-col md:flex-row gap-10 items-start">
                    <div className="flex-1 space-y-4">
                        <div className="text-xs font-black uppercase tracking-[0.2em] text-[var(--brand-primary)]">Business Entity</div>
                        <BrightHeading level={1} className="text-5xl">{business.businessName}</BrightHeading>
                        <p className="text-xl text-[var(--text-secondary)] font-bold">
                            {businessType?.name || 'Venture'} • <span className="text-[var(--state-success)] font-black">Startup Tier</span>
                        </p>

                        <div className="pt-4">
                            <BusinessCreditCard
                                businessName={business.businessName}
                                ownerName={user.displayName || 'Director'}
                                themeColor={business.branding?.themeColor}
                                logoUrl={business.branding?.logoUrl}
                                icon={business.branding?.icon}
                            />
                        </div>
                    </div>

                    <div className="w-full md:w-80 space-y-4">
                        <div className="duo-card bg-[var(--brand-primary)] text-white border-transparent">
                            <div className="text-xs font-black uppercase tracking-widest opacity-80 mb-1">Current Status</div>
                            <div className="text-2xl font-black mb-4">Operations Active</div>
                            <Link href="/practicals/business/operations">
                                <button className="duo-btn w-full bg-white text-[var(--brand-primary)] shadow-[0_5px_0_0_#e2e8f0]">
                                    Enter Console
                                </button>
                            </Link>
                        </div>

                        <div className="duo-card">
                            <div className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Reputation</div>
                            <div className="text-3xl font-black text-[var(--text-primary)]">{business.reputation}/100</div>
                            <div className="mt-2 w-full bg-[var(--bg-secondary)] h-3 rounded-full overflow-hidden border border-[var(--border-subtle)]">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${business.reputation}%` }}
                                    className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)]"
                                />
                            </div>
                        </div>
                    </div>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-6">
                        <BrightHeading level={3}>Management Suite</BrightHeading>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                        {MENU_ITEMS.map((item) => (
                            <Link key={item.href} href={item.href} className="group">
                                <div className="duo-card h-full group-hover:border-[var(--brand-primary)] transition-colors">
                                    <div className={`text-4xl mb-4 ${item.color}`}>{item.icon}</div>
                                    <div className="text-xl font-black text-[var(--text-primary)] mb-1">{item.label}</div>
                                    <div className="text-sm text-[var(--text-secondary)] font-medium leading-relaxed">
                                        {item.desc}
                                    </div>
                                    <div className="mt-auto pt-6 flex justify-end">
                                        <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-[var(--brand-primary)] group-hover:text-white transition-all">
                                            →
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            </div>
        </BusinessDuolingoLayout>
    );
}
