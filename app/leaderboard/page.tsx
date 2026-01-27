'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

interface LeaderboardEntry {
    id: string;
    name: string;
    value: number;
    subtext: string;
    icon?: string;
    rank: number;
    isCurrentUser?: boolean;
}

type LeaderboardType = 'xp' | 'streak' | 'mastery' | 'schools' | 'business';

export default function LeaderboardPage() {
    const { user, userData } = useAuth();
    const [activeTab, setActiveTab] = useState<LeaderboardType>('xp');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<LeaderboardEntry[]>([]);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                if (activeTab === 'business') {
                    // Business Leaderboard
                    const bizRef = collection(db, 'businesses');
                    const q = query(bizRef, orderBy('valuation', 'desc'), limit(20));
                    const snapshot = await getDocs(q);
                    const entries: LeaderboardEntry[] = snapshot.docs.map((doc, index) => ({
                        id: doc.id,
                        name: doc.data().name || 'Unnamed Venture',
                        value: doc.data().valuation || 0,
                        subtext: doc.data().industry || 'Business',
                        icon: '🏢',
                        rank: index + 1,
                        isCurrentUser: doc.data().ownerId === user?.uid
                    }));
                    setData(entries);
                } else {
                    const token = await user.getIdToken();
                    const res = await fetch(`/api/leaderboards?` + new URLSearchParams({
                        type: activeTab,
                        limit: '20'
                    }), {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });

                    if (!res.ok) {
                        throw new Error('Failed to fetch leaderboard');
                    }

                    const payload = await res.json();
                    const entries: LeaderboardEntry[] = (payload.entries || []).map((entry: any) => {
                        const isMastery = activeTab === 'mastery';
                        const value = typeof entry.value === 'number' ? entry.value : 0;
                        return {
                            id: entry.id,
                            name: entry.name,
                            value,
                            subtext: entry.subtext,
                            icon: entry.icon,
                            rank: entry.rank,
                            isCurrentUser: entry.id === user.uid,
                        };
                    });

                    setData(entries);
                }
            } catch (error) {
                console.error("Error fetching leaderboard:", error);
            }
            setLoading(false);
        };

        fetchData();
    }, [activeTab, user]);

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] py-12 px-4">
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <BrightHeading level={1} className="mb-4">
                        Hall of Fame 🏆
                    </BrightHeading>
                    <p className="text-[var(--text-secondary)] text-lg">
                        See where you stand among the top performers and businesses.
                    </p>
                </motion.div>

                {/* Tabs */}
                <div className="flex bg-[var(--bg-elevated)] p-1 rounded-3xl mb-8 border border-[var(--border-subtle)] shadow-lg overflow-hidden">
                    {(['xp', 'streak', 'mastery', 'schools', 'business'] as LeaderboardType[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-4 px-2 rounded-2xl font-black uppercase tracking-wider transition-all relative z-10 ${activeTab === tab
                                    ? 'text-white'
                                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                }`}
                        >
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="tab-bg"
                                    className="absolute inset-0 bg-[var(--brand-primary)] rounded-2xl -z-10"
                                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                />
                            )}
                            {tab === 'xp' ? 'XP' : tab === 'streak' ? 'Streak' : tab === 'mastery' ? 'Mastery' : tab === 'schools' ? 'Schools' : 'Business'}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <BrightLayer variant="glass" padding="none" className="overflow-hidden border border-white/10">
                    <div className="p-6 bg-gradient-to-r from-[var(--brand-primary)]/10 to-transparent border-b border-white/5 flex justify-between items-center">
                        <span className="font-black text-[var(--text-primary)] uppercase tracking-wider">Ranking</span>
                        <span className="font-black text-[var(--text-primary)] uppercase tracking-wider">
                            {activeTab === 'xp' ? 'Total XP' : activeTab === 'streak' ? 'Current Streak' : activeTab === 'mastery' ? 'Global Mastery' : activeTab === 'business' ? 'Valuation' : 'School XP'}
                        </span>
                    </div>

                    <div className="divide-y divide-white/5">
                        {loading ? (
                            <div className="py-20 text-center">
                                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)] mx-auto" />
                            </div>
                        ) : data.length > 0 ? (
                            <AnimatePresence mode="popLayout">
                                {data.map((entry) => (
                                    <motion.div
                                        key={entry.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className={`flex items-center p-6 transition-colors hover:bg-white/[0.02] ${entry.isCurrentUser ? 'bg-[var(--brand-primary)]/10 ring-1 ring-inset ring-[var(--brand-primary)]/20' : ''
                                            }`}
                                    >
                                        <div className="w-12 text-2xl font-black text-[var(--brand-primary)]">
                                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                                        </div>
                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mr-4 shadow-inner ${entry.rank <= 3 ? 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20' : 'bg-white/5'
                                            }`}>
                                            {entry.icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-bold text-[var(--text-primary)]">
                                                    {entry.name}
                                                </h3>
                                                {entry.isCurrentUser && (
                                                    <span className="bg-[var(--brand-primary)] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">You</span>
                                                )}
                                            </div>
                                            <p className="text-[var(--text-muted)] text-sm font-medium">
                                                {entry.subtext}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-[var(--brand-primary)] tracking-tighter">
                                                {activeTab === 'business'
                                                    ? `$${entry.value.toLocaleString()}`
                                                    : activeTab === 'mastery'
                                                        ? `${Math.round(entry.value * 100)}%`
                                                        : entry.value.toLocaleString()}
                                            </div>
                                            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">
                                                {activeTab === 'business' ? 'Net Worth' : activeTab === 'streak' ? 'Days' : activeTab === 'mastery' ? 'Skill' : activeTab === 'schools' ? 'Total XP' : 'Total XP'}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        ) : (
                            <div className="py-20 text-center text-[var(--text-muted)]">
                                No entries found yet. Start learning to be the first!
                            </div>
                        )}
                    </div>
                </BrightLayer>

                {/* Current User Stats Footer */}
                {!loading && userData && (activeTab === 'xp' || activeTab === 'streak' || activeTab === 'mastery') && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8"
                    >
                        <BrightLayer variant="elevated" className="border-b-[6px] border-[var(--brand-primary)]">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <div>
                                    <h4 className="text-[var(--text-muted)] text-xs font-black uppercase tracking-widest mb-1">Your Standing</h4>
                                    <div className="text-2xl font-black text-[var(--text-primary)]">
                                        Keep pushing, {userData.firstName}! 🚀
                                    </div>
                                </div>
                                <div className="flex gap-8">
                                    <div className="text-center">
                                        <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">XP</p>
                                        <p className="text-2xl font-black text-[var(--brand-primary)]">{userData.xp?.toLocaleString()}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">Streak</p>
                                        <p className="text-2xl font-black text-[var(--brand-accent)]">{userData.streak || 0}d</p>
                                    </div>
                                </div>
                                <BrightButton onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                                    Back to top
                                </BrightButton>
                            </div>
                        </BrightLayer>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
