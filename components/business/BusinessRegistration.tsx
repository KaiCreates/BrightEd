'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { BrightHeading } from '@/components/system';
import { BusinessTypeSelector } from '@/components/business/BusinessTypeSelector';
import { BusinessType } from '@/lib/economy/economy-types';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import { BrightButton, BrightLayer } from '@/components/system';
import BusinessCreditCard from '@/components/business/BusinessCreditCard';
import { useDialog } from '@/components/system';

interface BusinessRegistrationProps {
    onComplete: (name: string) => void;
}

export default function BusinessRegistration({ onComplete }: BusinessRegistrationProps) {
    const router = useRouter();
    const { userData, loading } = useAuth();
    const [step, setStep] = useState<'select' | 'processing' | 'success'>('select');
    const [error, setError] = useState<string | null>(null);
    const [registeredName, setRegisteredName] = useState('');
    const { showConfirm } = useDialog();

    // State for existing business management
    const [businessData, setBusinessData] = useState<any>(null);
    const [fetchingBusiness, setFetchingBusiness] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Fetch business data if user has one
    useEffect(() => {
        if (userData?.hasBusiness && userData.businessID) {
            setFetchingBusiness(true);
            let unsub: (() => void) | undefined;

            import('@/lib/firebase').then(({ db }) => {
                import('firebase/firestore').then(({ doc, onSnapshot }) => {
                    unsub = onSnapshot(doc(db, 'businesses', userData.businessID!), (snap) => {
                        if (snap.exists()) {
                            setBusinessData({ id: snap.id, ...snap.data() });
                        } else {
                            // Handle orphan case in dashboard view specific logic if needed
                            setBusinessData(null);
                        }
                        setFetchingBusiness(false);
                    });
                });
            });

            return () => {
                if (unsub) unsub();
            };
        }
    }, [userData?.hasBusiness, userData?.businessID]);

    const handleToggleStatus = async () => {
        if (!auth.currentUser) return;
        setActionLoading(true);
        try {
            const token = await auth.currentUser.getIdToken();
            await fetch('/api/business/toggle-status', {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            // Snapshot will update UI
        } catch (e) {
            console.error(e);
        } finally {
            setActionLoading(false);
        }
    };

    const handleShutdown = async () => {
        showConfirm(
            'Are you sure you want to SHUT DOWN your business? This cannot be undone and you will lose all progress permanently.',
            async () => {
                if (!auth.currentUser) return;
                setActionLoading(true);
                try {
                    const token = await auth.currentUser.getIdToken();
                    const res = await fetch('/api/business/shutdown', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}` }
                    });

                    if (res.ok) {
                        window.location.reload();
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setActionLoading(false);
                }
            },
            { title: 'DISSOLVE ENTITY', type: 'danger', confirmLabel: 'SHUTDOWN' }
        );
    };

    // View: Already Has Business (Dashboard)
    if (!loading && userData?.hasBusiness) {
        if (fetchingBusiness && !businessData) {
            return <div className="p-12 text-center text-[var(--text-muted)] animate-pulse">Loading Empire...</div>;
        }

        return (
            <div className="max-w-4xl mx-auto">
                <div className="duo-card p-0 overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-[var(--bg-secondary)] to-[var(--bg-elevated)] p-8 border-b-2 border-[var(--border-subtle)] flex flex-col md:flex-row items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <div className="text-4xl">{businessData?.branding?.icon || businessData?.category?.emoji || '🏢'}</div>
                                <BrightHeading level={2} className="text-3xl tracking-tight m-0">
                                    {businessData?.businessName || 'Your Business'}
                                </BrightHeading>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border-2 ${businessData?.status === 'paused'
                                    ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                    : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                    }`}>
                                    {businessData?.status === 'paused' ? '⏸ Operations Paused' : '● Active Entity'}
                                </div>
                                <span className="text-xs text-[var(--text-muted)] font-black tracking-widest uppercase">ID: {userData.businessID?.slice(0, 8)}</span>
                            </div>
                        </div>

                        <Link href="/practicals/business/operations">
                            <button className="duo-btn duo-btn-primary px-8">
                                Enter Console
                            </button>
                        </Link>
                    </div>

                    {/* Content */}
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                        {/* Left: Card Visualization */}
                        <div className="relative group perspective-1000">
                            <div className="absolute inset-x-8 -bottom-4 h-10 bg-black/20 blur-xl rounded-full opacity-60" />

                            <BusinessCreditCard
                                businessName={businessData?.businessName || 'Business'}
                                ownerName={businessData?.ownerName || 'DIRECTOR'}
                                themeColor={businessData?.branding?.themeColor}
                                logoUrl={businessData?.branding?.logoUrl}
                                icon={businessData?.branding?.icon}
                                cardLabel={businessData?.status === 'paused' ? 'PAUSED' : 'ACTIVE'}
                                className="transform transition-transform duration-500 hover:rotate-y-12 hover:rotate-x-6 hover:scale-105"
                            />
                        </div>

                        {/* Right: Actions */}
                        <div className="space-y-6">
                            <div className="bg-[var(--bg-secondary)] rounded-3xl p-6 border-2 border-[var(--border-subtle)] space-y-4">
                                <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Entity Controls</h3>

                                <button
                                    onClick={handleToggleStatus}
                                    disabled={actionLoading}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-primary)] border-2 border-[var(--border-subtle)] border-b-4 active:border-b-2 active:translate-y-0.5 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                            {businessData?.status === 'paused' ? '▶️' : '⏸'}
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-black text-[var(--text-primary)]">
                                                {businessData?.status === 'paused' ? 'Resume Operations' : 'Pause Operations'}
                                            </div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-60">
                                                {businessData?.status === 'paused' ? 'Start daily costs' : 'Halt costs and revenue'}
                                            </div>
                                        </div>
                                    </div>
                                    {actionLoading && <div className="text-xl animate-spin">⏳</div>}
                                </button>

                                <button
                                    onClick={handleShutdown}
                                    disabled={actionLoading}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-500/5 hover:bg-red-500/10 border-2 border-red-500/20 border-b-4 active:border-b-2 active:translate-y-0.5 transition-all group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-500 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                                            🛑
                                        </div>
                                        <div className="text-left">
                                            <div className="text-sm font-black text-red-600">
                                                Dissolve Entity
                                            </div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-red-500/60">
                                                Permanent reset
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            </div>

                            <p className="text-[10px] uppercase font-black tracking-widest text-center text-[var(--text-muted)]">
                                Registry of Currencydom Registered
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    const handleRegistration = async (
        type: BusinessType,
        name: string,
        branding?: { themeColor?: string; logoUrl?: string; icon?: string }
    ) => {
        const user = auth.currentUser;
        if (!user) {
            setError('Please log in again to register.');
            return;
        }

        setStep('processing');
        setError(null);

        try {
            const token = await user.getIdToken();

            const cleanBranding = branding
                ? Object.fromEntries(
                    Object.entries(branding).filter(([k, v]) => {
                        if (v === undefined) return false;
                        if (k === 'logoUrl' && (!v || typeof v !== 'string' || !v.startsWith('http'))) return false;
                        return true;
                    })
                )
                : undefined;

            const res = await fetch('/api/business/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name,
                    businessTypeId: type.id,
                    branding: cleanBranding,
                }),
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                const msg = typeof data?.error === 'string' ? data.error : 'Failed to register business. Please try again.';
                setError(msg);
                setStep('select');
                return;
            }

            setRegisteredName(name);

            // Short feedback delay to keep the UI feeling responsive
            await new Promise((resolve) => setTimeout(resolve, 700));

            setStep('success');

            // Complete shortly after success to avoid a sluggish feel
            setTimeout(() => {
                onComplete(name);
                router.refresh();
            }, 900);

        } catch (err: any) {
            setError('Failed to register business. Please try again.');
            setStep('select');
        }
    };

    return (
        <div className="w-full">
            <AnimatePresence mode="wait">
                {step === 'select' && (
                    <motion.div
                        key="select"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                    >
                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-200 text-center font-bold">
                                {error}
                            </div>
                        )}

                        {/* B-Coin balance display and flat cost notice */}
                        <div className="mb-8 flex flex-col md:flex-row items-center justify-between gap-4 p-6 bg-yellow-500/10 border-2 border-yellow-500/20 rounded-3xl">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-yellow-500/20 flex items-center justify-center text-2xl">🪙</div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-yellow-500/70">Registration Fee</div>
                                    <div className="text-xl font-black text-yellow-500 tracking-tight">250 B-Coins</div>
                                </div>
                            </div>
                            <div className="h-full w-px bg-yellow-500/10 hidden md:block" />
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Your Balance</div>
                                    <div className={`text-xl font-black ${(userData?.bCoins || 0) < 250 ? 'text-red-500' : 'text-[var(--text-primary)]'}`}>
                                        {userData?.bCoins?.toLocaleString() || 0} B-Coins
                                    </div>
                                </div>
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${(userData?.bCoins || 0) < 250 ? 'bg-red-500/20' : 'bg-emerald-500/20'}`}>
                                    {(userData?.bCoins || 0) < 250 ? '⚠️' : '✅'}
                                </div>
                            </div>
                        </div>

                        {(userData?.bCoins || 0) < 250 && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mb-8 p-10 bg-red-500/5 border-2 border-red-500/20 rounded-[2.5rem] text-center relative overflow-hidden group"
                            >
                                <div className="absolute top-0 right-0 p-8 text-6xl opacity-5 grayscale pointer-events-none group-hover:scale-110 transition-transform duration-700">🪙</div>
                                <div className="relative z-10">
                                    <div className="w-16 h-16 bg-red-500/10 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 border-2 border-red-500/20 shadow-lg shadow-red-500/5 overflow-hidden">
                                        <div className="absolute inset-0 bg-red-500/20 animate-pulse" />
                                        <span className="relative z-10">💳</span>
                                    </div>
                                    <h3 className="text-red-500 font-black text-xl uppercase tracking-wider mb-3">Insufficient Capital</h3>
                                    <p className="text-[var(--text-secondary)] text-sm font-bold max-w-sm mx-auto leading-relaxed mb-8 opacity-80">
                                        You need a minimum of <span className="text-white">250 B-Coins</span> to secure your legal charter. Complete missions or lessons to build your starting fund!
                                    </p>

                                    <Link href="/learn" className="inline-block">
                                        <button className="duo-btn duo-btn-primary px-10 py-4 text-sm flex items-center gap-3 group/btn">
                                            <span>EARN B-COINS NOW</span>
                                            <span className="group-hover/btn:translate-x-1 transition-transform">→</span>
                                        </button>
                                    </Link>
                                </div>
                            </motion.div>
                        )}

                        <div className={(userData?.bCoins || 0) < 250 ? 'opacity-50 pointer-events-none' : ''}>
                            <BusinessTypeSelector onSelect={handleRegistration} />
                        </div>
                    </motion.div>
                )}

                {step === 'processing' && (
                    <motion.div
                        key="processing"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="text-center py-20 px-8 duo-card border-none bg-white/[0.03] backdrop-blur-xl"
                    >
                        <div className="relative w-32 h-32 mx-auto mb-10">
                            <div className="absolute inset-0 border-[6px] border-white/5 rounded-full"></div>
                            <div className="absolute inset-0 border-[6px] border-[var(--brand-primary)] rounded-full border-t-transparent animate-spin shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.3)]"></div>
                            <div className="absolute inset-0 flex items-center justify-center text-5xl animate-pulse">🏛️</div>
                        </div>
                        <BrightHeading level={2} className="text-3xl mb-4 tracking-tight">Filing Your Charter</BrightHeading>
                        <p className="text-[var(--text-secondary)] font-black uppercase tracking-widest text-[10px] max-w-xs mx-auto opacity-70">
                            BrightEd Enterprise is processing your legal registration for the <span className="text-[var(--text-primary)]">Registry of Currencydom</span>.
                        </p>
                    </motion.div>
                )}

                {step === 'success' && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="text-center py-20 px-8 duo-card border-[3px] border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 shadow-2xl overflow-hidden relative"
                    >
                        {/* Background particles/glow */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[var(--brand-primary)] opacity-10 blur-[80px] rounded-full" />

                        <div className="relative z-10">
                            <div className="inline-flex items-center justify-center w-28 h-28 rounded-3xl bg-[var(--brand-primary)] text-white text-6xl mb-8 shadow-[0_8px_0_0_#0369a1] animate-bounce-slow">
                                🏢
                            </div>
                            <BrightHeading level={1} className="text-5xl text-[var(--brand-primary)] mb-4 tracking-tighter">
                                Approved!
                            </BrightHeading>
                            <p className="text-2xl text-[var(--text-primary)] font-black mb-2">
                                {registeredName}
                            </p>
                            <div className="inline-block px-4 py-1.5 rounded-full bg-[var(--brand-primary)]/20 text-[var(--brand-primary)] text-[10px] font-black uppercase tracking-[0.2em] mb-8">
                                Official Legal Entity
                            </div>

                            <p className="text-sm text-[var(--text-secondary)] max-w-sm mx-auto font-black uppercase tracking-widest leading-relaxed opacity-70">
                                Your business is now live. Launching your operations dashboard...
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
