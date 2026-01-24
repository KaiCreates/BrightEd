'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BrightHeading, BrightButton, BrightLayer } from '@/components/system';
import { BCoinIcon } from '@/components/BCoinIcon';
import { useAuth } from '@/lib/auth-context';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import Link from 'next/link';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';

interface BusinessStats {
    revenueHistory: number[];
    expenses: number;
}

interface BusinessData {
    name: string;
    ownerId: string;
    category: string;
    phase: string;
    valuation: number;
    balance: number;
    cashflow: number;
    employeeCount: number;
    status: string;
    stats: BusinessStats;
}

export default function BusinessDashboard() {
    const router = useRouter();
    const { user, userData, loading: authLoading } = useAuth();
    const [business, setBusiness] = useState<BusinessData | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'overview' | 'reports' | 'ai'>('overview');
    const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        if (!user || !userData?.hasBusiness || !userData?.businessID) {
            router.push('/stories/business');
            return;
        }

        const bizRef = doc(db, 'businesses', userData.businessID);
        const unsub = onSnapshot(bizRef, (snap) => {
            if (snap.exists()) {
                setBusiness(snap.data() as BusinessData);
            }
            setLoading(false);
        });

        return () => unsub();
    }, [user, userData, authLoading, router]);

    const handleGenerateAi = async () => {
        if (!business || !userData?.businessID || !user?.uid) return;
        setIsGeneratingAi(true);
        setAiSuggestions([]);

        try {
            const res = await fetch('/api/business/insights', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    businessId: userData.businessID,
                    userId: user.uid
                })
            });

            const data = await res.json();
            if (data.success) {
                setAiSuggestions(data.suggestions);
            } else {
                throw new Error(data.error || 'Failed to fetch insights');
            }
        } catch (err) {
            console.error('AI Insights fetch error:', err);
            setAiSuggestions(['The Brain is temporarily unavailable. Please check your connection and try again.']);
        } finally {
            setIsGeneratingAi(false);
        }
    };

    if (loading || !business) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]" />
            </div>
        );
    }

    const chartData = business.stats.revenueHistory.map((val, i) => ({
        name: `Month ${i + 1}`,
        revenue: val
    }));

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pt-32 pb-20 px-4">
            <div className="max-w-6xl mx-auto">

                {/* Header Side-by-Side */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
                    <div>
                        <Link href="/stories/business" className="text-sm font-bold text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors mb-2 block">
                            ← BACK TO HUB
                        </Link>
                        <BrightHeading level={1} className="italic tracking-tight">
                            {business.name}
                        </BrightHeading>
                        <p className="text-[var(--text-secondary)] font-medium">
                            {business.category} • {business.phase} Phase
                        </p>
                    </div>

                    <div className="flex gap-4">
                        <BrightLayer variant="glass" padding="sm" className="flex items-center gap-3 px-6">
                            <span className="text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">Net Worth</span>
                            <div className="text-2xl font-black text-[var(--brand-accent)]">
                                ฿ {(business.valuation + business.balance).toLocaleString()}
                            </div>
                        </BrightLayer>
                    </div>
                </div>

                {/* Dashboard Tabs */}
                <div className="flex gap-2 mb-8 bg-[var(--bg-elevated)]/30 p-1 rounded-2xl w-fit border border-[var(--border-subtle)]">
                    {(['overview', 'reports', 'ai'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab
                                ? 'bg-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/20'
                                : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <motion.div
                            key="overview"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="grid lg:grid-cols-3 gap-8"
                        >
                            {/* Main Chart Area */}
                            <BrightLayer variant="glass" padding="lg" className="lg:col-span-2 min-h-[400px]">
                                <div className="flex justify-between items-center mb-8">
                                    <BrightHeading level={3}>Revenue Performance</BrightHeading>
                                    <span className="text-xs font-bold text-[var(--state-success)]">↑ 24% vs Prev</span>
                                </div>

                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={chartData}>
                                            <defs>
                                                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.3} />
                                                    <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                                            <XAxis
                                                dataKey="name"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 'bold' }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: 'var(--text-muted)', fontSize: 10, fontWeight: 'bold' }}
                                            />
                                            <Tooltip
                                                contentStyle={{
                                                    backgroundColor: 'var(--bg-elevated)',
                                                    border: '1px solid var(--border-strong)',
                                                    borderRadius: '12px',
                                                    fontSize: '12px'
                                                }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="revenue"
                                                stroke="var(--brand-primary)"
                                                strokeWidth={4}
                                                fillOpacity={1}
                                                fill="url(#colorRev)"
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </BrightLayer>

                            {/* Sidebar Stats */}
                            <div className="space-y-6">
                                <BrightLayer variant="elevated" padding="md">
                                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4">Capitalization</p>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <span className="text-[var(--text-secondary)] text-sm">Entity Balance</span>
                                            <span className="font-bold text-xl flex items-center gap-1">
                                                <BCoinIcon size={16} /> {business.balance}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-[var(--text-secondary)] text-sm">Monthly Cashflow</span>
                                            <span className="font-bold text-xl text-[var(--state-success)]">
                                                +${business.cashflow.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <span className="text-[var(--text-secondary)] text-sm">Workforce</span>
                                            <span className="font-bold text-xl">{business.employeeCount} Members</span>
                                        </div>
                                    </div>
                                </BrightLayer>

                                <BrightLayer variant="glass" padding="md" className="bg-gradient-to-br from-[var(--brand-primary)]/10 to-transparent">
                                    <BrightHeading level={4} className="mb-2">Enterprise Card</BrightHeading>
                                    <p className="text-xs text-[var(--text-secondary)] mb-6">Your official legal entity credentials.</p>

                                    <div className="relative h-40 w-full rounded-2xl bg-slate-950/80 border border-white/10 p-6 overflow-hidden">
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-primary)] blur-[50px] opacity-20" />
                                        <div className="flex justify-between items-start">
                                            <div className="w-10 h-8 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-md opacity-80" />
                                            <span className="text-[10px] font-black text-white/40 tracking-widest uppercase">BrightEd Enterprise</span>
                                        </div>
                                        <div className="mt-8">
                                            <p className="text-lg font-mono text-white tracking-[0.2em]">{business.name.toUpperCase()}</p>
                                            <p className="text-[10px] font-mono text-white/40 mt-1">EST. {new Date((business as any).founded || Date.now()).getFullYear()}</p>
                                        </div>
                                    </div>
                                </BrightLayer>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'reports' && (
                        <motion.div
                            key="reports"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="bg-[var(--bg-elevated)]/50 backdrop-blur-md rounded-3xl p-10 border border-[var(--border-subtle)]"
                        >
                            <BrightHeading level={3} className="mb-8 p-4 border-b border-[var(--border-subtle)]">Financial Analysis</BrightHeading>

                            <div className="grid md:grid-cols-3 gap-12">
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Profit Margin</p>
                                    <div className="text-4xl font-black text-[var(--brand-primary)] mb-2">
                                        {Math.round((business.cashflow / business.stats.revenueHistory[business.stats.revenueHistory.length - 1]) * 100)}%
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)]">Ratio of cashflow to gross monthly revenue.</p>
                                </div>
                                <div className="text-center p-4 border-x border-[var(--border-subtle)]">
                                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Burn Rate</p>
                                    <div className="text-4xl font-black text-[var(--state-error)] mb-2">
                                        ${business.stats.expenses} <span className="text-lg text-[var(--text-muted)]">/mo</span>
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)]">Your monthly operational expenditure.</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Employee Productivity</p>
                                    <div className="text-4xl font-black text-[var(--brand-accent)] mb-2">
                                        ฿ {(business.valuation / business.employeeCount).toLocaleString()}
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)]">Asset value contribution per staff member.</p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'ai' && (
                        <motion.div
                            key="ai"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="max-w-3xl mx-auto"
                        >
                            <BrightLayer variant="glass" padding="lg" className="border-[var(--brand-primary)]/30 border-t-4 shadow-2xl">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] flex items-center justify-center text-3xl shadow-lg">
                                        🧠
                                    </div>
                                    <div>
                                        <BrightHeading level={2}>The Brain: AI Insights</BrightHeading>
                                        <p className="text-[var(--text-secondary)]">Advanced NABLE-driven strategy for your venture.</p>
                                    </div>
                                </div>

                                {aiSuggestions.length === 0 ? (
                                    <div className="text-center py-12 border-2 border-dashed border-[var(--border-subtle)] rounded-3xl">
                                        <p className="text-[var(--text-secondary)] mb-6">Click below to analyze your business metrics and generate growth suggestions.</p>
                                        <BrightButton
                                            variant="primary"
                                            onClick={handleGenerateAi}
                                            disabled={isGeneratingAi}
                                        >
                                            {isGeneratingAi ? 'Analyzing Data...' : 'Generate AI Strategy'}
                                        </BrightButton>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {aiSuggestions.map((suggestion, i) => (
                                            <motion.div
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: i * 0.1 }}
                                                key={i}
                                                className="p-4 bg-[var(--bg-elevated)] rounded-xl border-l-4 border-[var(--brand-primary)] shadow-sm"
                                            >
                                                <p className="text-[var(--text-primary)] font-medium leading-relaxed">{suggestion}</p>
                                            </motion.div>
                                        ))}
                                        <div className="pt-6 flex justify-center">
                                            <BrightButton variant="secondary" onClick={() => setAiSuggestions([])}>
                                                Clear Suggestions
                                            </BrightButton>
                                        </div>
                                    </div>
                                )}
                            </BrightLayer>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
