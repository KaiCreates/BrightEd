'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { BrightHeading, DialogProvider } from '@/components/system';
import { useAuth } from '@/lib/auth-context';

const NAV_ITEMS = [
    { href: '/practicals/business', label: 'Hub', icon: '🏠' },
    { href: '/practicals/business/operations', label: 'Operations', icon: '⚡' },
    { href: '/practicals/business/supply', label: 'Supply', icon: '📦' },
    { href: '/practicals/business/team', label: 'Team', icon: '👥' },
    { href: '/practicals/business/credit', label: 'Credit', icon: '💳' },
    { href: '/practicals/business/reports', label: 'Reports', icon: '📊' },
];

export default function BusinessDuolingoLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { userData } = useAuth();
    const hasBusiness = userData?.hasBusiness || false;

    const masteryPercent = typeof userData?.mastery === 'number'
        ? Math.round(userData.mastery * 100)
        : (userData?.globalMastery ? Math.round(userData.globalMastery * 100) : 0);

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
            {/* Desktop Sidebar */}
            <aside className="fixed left-0 top-0 h-screen w-64 bg-[var(--bg-elevated)] border-r-2 border-[var(--border-subtle)] hidden lg:flex flex-col p-6 z-50">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="w-10 h-10 bg-[var(--brand-primary)] rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-[var(--brand-primary)]/20">
                        B
                    </div>
                    <BrightHeading level={3} className="text-xl tracking-tight">BrightEd</BrightHeading>
                </div>

                <nav className="flex-1 flex flex-col gap-2">
                    {NAV_ITEMS.map((item) => {
                        const active = pathname === item.href;
                        const isLocked = !hasBusiness && item.href !== '/practicals/business';

                        return (
                            <Link
                                key={item.href}
                                href={isLocked ? '#' : item.href}
                                className={`flex items-center justify-between px-4 py-3 rounded-2xl transition-all font-bold text-sm tracking-wide border-2 ${active
                                    ? 'bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] border-[var(--brand-primary)] shadow-[0_4px_0_0_rgba(var(--brand-primary-rgb),0.2)]'
                                    : isLocked
                                        ? 'text-[var(--text-muted)] opacity-50 cursor-not-allowed border-transparent'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] border-transparent'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <span className={`text-xl ${isLocked ? 'grayscale' : ''}`}>{item.icon}</span>
                                    {item.label}
                                </div>
                                {isLocked && <span className="text-xs">🔒</span>}
                            </Link>
                        );
                    })}
                </nav>

                <div className="mt-auto pt-6 border-t border-[var(--border-subtle)]">
                    <Link
                        href="/practicals"
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl text-[var(--text-muted)] hover:text-[var(--text-primary)] font-bold text-sm"
                    >
                        <span>←</span> Back to Hub
                    </Link>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="lg:ml-64 min-h-screen relative pb-24 lg:pb-10">
                {/* Top Header - Global Stats */}
                <header className="sticky top-0 z-40 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b-2 border-[var(--border-subtle)] py-4 px-6 lg:px-10 flex items-center justify-between">
                    <div className="lg:hidden">
                        <div className="w-8 h-8 bg-[var(--brand-primary)] rounded-lg flex items-center justify-center text-white font-black text-lg">B</div>
                    </div>

                    <div className="flex items-center gap-4 ml-auto">
                        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] px-4 py-2 rounded-2xl border-2 border-[var(--border-subtle)] border-b-4 shadow-sm">
                            <span className="text-lg">💰</span>
                            <span className="font-black text-sm">฿ {userData?.bCoins?.toLocaleString() || '0'}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-[var(--bg-elevated)] px-4 py-2 rounded-2xl border-2 border-[var(--border-subtle)] border-b-4 shadow-sm">
                            <span className="text-lg">⭐</span>
                            <span className="font-black text-sm">{masteryPercent}%</span>
                        </div>
                    </div>
                </header>

                <div className="p-6 lg:p-10 max-w-[1400px] mx-auto">
                    {children}
                </div>
            </main>

            {/* Mobile Bottom Nav */}
            <nav className="fixed bottom-0 left-0 right-0 bg-[var(--bg-elevated)] border-t-2 border-[var(--border-subtle)] lg:hidden flex items-center justify-around p-2 z-50 safe-area-inset-bottom">
                {NAV_ITEMS.slice(0, 5).map((item) => {
                    const active = pathname === item.href;
                    const isLocked = !hasBusiness && item.href !== '/practicals/business';

                    return (
                        <Link
                            key={item.href}
                            href={isLocked ? '#' : item.href}
                            className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all relative ${active ? 'text-[var(--brand-primary)]' : 'text-[var(--text-muted)]'
                                } ${isLocked ? 'opacity-40 grayscale pointer-events-none' : ''}`}
                        >
                            <span className="text-2xl">{item.icon}</span>
                            <span className="text-[10px] font-black uppercase tracking-tighter line-clamp-1">{item.label}</span>
                            {isLocked && <span className="absolute top-0 right-1 text-[10px]">🔒</span>}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
