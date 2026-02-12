'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { ProfessorBrightMascot, StreakCelebration } from '@/components/learning';
import { FeedbackResponse } from '@/lib/professor-bright';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

interface LeaderboardEntry {
    id: string;
    name: string;
    value: number;
    subtext: string;
    icon?: string;
    rank: number;
    isCurrentUser?: boolean;
    avatarUrl?: string | null;
    avatarCustomization?: any | null;
}

type LeaderboardType = 'xp' | 'streak' | 'mastery' | 'schools' | 'business';

export default function LeaderboardPage() {
    const { user, userData } = useAuth();
    const [activeTab, setActiveTab] = useState<LeaderboardType>('xp');
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<LeaderboardEntry[]>([]);
    const [mascotFeedback, setMascotFeedback] = useState<FeedbackResponse | null>(null);

    useEffect(() => {
        if (!user) return;

        const fetchData = async () => {
            setLoading(true);
            try {
                if (activeTab === 'business') {
                    // Business Leaderboard
                    if (!db) {
                        setLoading(false);
                        return;
                    }
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

    useEffect(() => {
        // Mascot Greeting
        const timeout = setTimeout(() => {
            if (activeTab === 'xp') {
                setMascotFeedback({
                    tone: 'encouraging',
                    message: "The XP leaderboard shows who's putting in the most work! Keep grinding! ⚡",
                    emoji: '🔋',
                    spriteClass: 'owl-magic'
                });
            } else if (activeTab === 'streak') {
                setMascotFeedback({
                    tone: 'supportive',
                    message: "Consistency is key. Don't let your flame go out! 🔥",
                    emoji: '🔥',
                    spriteClass: 'owl-neutral'
                });
            } else if (activeTab === 'business') {
                setMascotFeedback({
                    tone: 'celebratory',
                    message: "Look at those valuations! You're building an empire! 🏢",
                    emoji: '💰',
                    spriteClass: 'owl-happy'
                });
            }
        }, 1000);
        return () => clearTimeout(timeout);
    }, [activeTab]);

    const getRankColor = (rank: number) => {
        if (rank === 1) return 'border-yellow-400 bg-yellow-400/5 shadow-yellow-400/20';
        if (rank === 2) return 'border-slate-300 bg-slate-300/5 shadow-slate-300/20';
        if (rank === 3) return 'border-orange-400 bg-orange-400/5 shadow-orange-400/20';
        return 'border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30';
    };

    const getRankIconBg = (rank: number) => {
        if (rank === 1) return 'bg-yellow-400 text-[#543b00]';
        if (rank === 2) return 'bg-slate-300 text-[#334155]';
        if (rank === 3) return 'bg-orange-400 text-[#5c2a00]';
        return 'bg-[var(--bg-elevated)] text-[var(--text-muted)]';
    };

    return (
        <div className="min-h-screen min-h-[100dvh] bg-[var(--bg-primary)] py-8 pb-32 md:py-16 safe-padding overflow-x-hidden">
            {/* Background Decorations */}
            <div className="fixed inset-0 z-0 pointer-events-none opacity-[0.03]">
                <div className="absolute top-[10%] left-[5%] w-[40%] h-[40%] bg-[var(--brand-primary)] rounded-full blur-[120px]" />
                <div className="absolute bottom-[20%] right-[10%] w-[30%] h-[30%] bg-[var(--brand-accent)] rounded-full blur-[100px]" />
            </div>

            <div className="container-responsive relative z-10 max-w-4xl mx-auto">
                {/* Hero Header */}
                <motion.div
                    initial={{ opacity: 0, y: -30 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs font-black uppercase tracking-[0.2em] mb-6 border border-[var(--brand-primary)]/20 shadow-sm">
                        <span className="text-xl">🏆</span> Arena of Excellence
                    </div>
                    <BrightHeading level={1} className="mb-4 text-5xl md:text-7xl">
                        Hall of <span className="text-[var(--brand-primary)] text-shadow-glow">Fame</span>
                    </BrightHeading>
                    <p className="text-[var(--text-secondary)] text-lg md:text-xl font-medium max-w-2xl mx-auto leading-relaxed">
                        The elite scholars and visionaries of BrightEd. Where will your name be remembered?
                    </p>
                </motion.div>

                {/* Tactile Tab System */}
                <BrightLayer variant="glass" padding="none" className="p-2 mb-12 border-b-[8px] border-[var(--border-subtle)] ring-1 ring-white/5">
                    <div className="flex flex-wrap md:flex-nowrap gap-2">
                        {(['xp', 'streak', 'mastery', 'schools', 'business'] as LeaderboardType[]).map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`
                                    flex-1 min-w-[120px] py-4 px-4 rounded-2xl font-black uppercase tracking-wider transition-all relative overflow-hidden
                                    ${activeTab === tab
                                        ? 'text-white shadow-lg'
                                        : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5'
                                    }
                                `}
                            >
                                {activeTab === tab && (
                                    <motion.div
                                        layoutId="leaderboard-tab-bg"
                                        className="absolute inset-0 bg-[var(--brand-primary)] border-b-[4px] border-[#1F7A85]"
                                        transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                    />
                                )}
                                <span className="relative z-10">
                                    {tab === 'xp' ? '⚡ XP' :
                                        tab === 'streak' ? '🔥 Streak' :
                                            tab === 'mastery' ? '🧠 Mastery' :
                                                tab === 'schools' ? '🏫 Schools' : '🏢 Business'}
                                </span>
                            </button>
                        ))}
                    </div>
                </BrightLayer>

                {/* Main Leaderboard List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="py-32 flex flex-col items-center justify-center space-y-4">
                            <div className="w-16 h-16 border-4 border-[var(--brand-primary)] border-t-transparent rounded-full animate-spin shadow-[0_0_15px_rgba(45,155,168,0.3)]" />
                            <p className="text-[var(--text-muted)] font-black uppercase tracking-widest text-sm animate-pulse">Consulting the Sages...</p>
                        </div>
                    ) : data.length > 0 ? (
                        <AnimatePresence mode="popLayout">
                            {data.map((entry, index) => (
                                <motion.div
                                    key={entry.id}
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group"
                                >
                                    <BrightLayer
                                        variant="elevated"
                                        padding="none"
                                        className={`
                                            relative flex items-center p-4 md:p-6 transition-all hover:-translate-y-1 active:translate-y-0
                                            border-b-[8px] ${getRankColor(entry.rank)}
                                            ${entry.isCurrentUser ? 'ring-2 ring-[var(--brand-primary)] shadow-[0_0_20px_rgba(45,155,168,0.2)]' : ''}
                                        `}
                                    >
                                        {/* Rank Badge */}
                                        <div className={`
                                            w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center text-xl md:text-2xl font-black mr-4 md:mr-6 shrink-0
                                            shadow-lg border-b-[4px] border-black/10 transition-transform group-hover:scale-110
                                            ${getRankIconBg(entry.rank)}
                                        `}>
                                            {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : entry.rank}
                                        </div>

                                        {/* Entry Avatar/Icon */}
                                        <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mr-4 md:mr-6 shadow-inner overflow-hidden">
                                            {entry.avatarCustomization ? (
                                                <AvatarRenderer
                                                    customization={entry.avatarCustomization}
                                                    username={entry.name}
                                                />
                                            ) : entry.avatarUrl ? (
                                                <Image
                                                    src={entry.avatarUrl}
                                                    alt={entry.name}
                                                    fill
                                                    sizes="56px"
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <span className="text-2xl">{entry.icon || '👤'}</span>
                                            )}
                                        </div>

                                        {/* Name and Subtext */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="text-lg md:text-2xl font-black text-[var(--text-primary)] truncate group-hover:text-[var(--brand-primary)] transition-colors">
                                                    {entry.name}
                                                </h3>
                                                {entry.isCurrentUser && (
                                                    <span className="bg-[var(--brand-primary)] text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-tighter shadow-sm">YOU</span>
                                                )}
                                            </div>
                                            <p className="text-[var(--text-muted)] text-xs md:text-sm font-bold uppercase tracking-widest truncate">
                                                {entry.subtext}
                                            </p>
                                        </div>

                                        {/* Value Display */}
                                        <div className="text-right ml-4">
                                            <div className={`text-2xl md:text-4xl font-black tracking-tighter ${entry.rank <= 3 ? 'text-[var(--text-primary)]' : 'text-[var(--brand-primary)]'}`}>
                                                {activeTab === 'business'
                                                    ? `$${entry.value.toLocaleString()}`
                                                    : activeTab === 'mastery'
                                                        ? `${Math.round(entry.value * 100)}%`
                                                        : entry.value.toLocaleString()}
                                            </div>
                                            <p className="text-[var(--text-muted)] text-[10px] md:text-[11px] font-black uppercase tracking-[0.2em]">
                                                {activeTab === 'business' ? 'Net Worth' : activeTab === 'streak' ? 'Current Streak' : activeTab === 'mastery' ? 'Overall Mastery' : 'Academic XP'}
                                            </p>
                                        </div>
                                    </BrightLayer>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    ) : (
                        <BrightLayer variant="glass" className="py-20 text-center text-[var(--text-muted)] border-b-[8px] border-[var(--border-subtle)]">
                            <span className="text-5xl block mb-4">🏜️</span>
                            <p className="font-black uppercase tracking-widest">No legends have claimed this path yet.</p>
                            <p className="text-xs font-medium mt-2">Start learning to be the first name etched in history!</p>
                        </BrightLayer>
                    )}
                </div>

                {/* Personal Standing Card (Bottom Sticky) */}
                {!loading && userData && (activeTab === 'xp' || activeTab === 'streak' || activeTab === 'mastery') && (
                    <motion.div
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-12"
                    >
                        <BrightLayer variant="elevated" className="border-b-[8px] border-[var(--brand-primary)] bg-[var(--bg-elevated)]/90 backdrop-blur-xl ring-1 ring-[var(--brand-primary)]/50 shadow-2xl">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-[var(--brand-primary)] text-white flex items-center justify-center text-2xl font-black shadow-lg">
                                        👋
                                    </div>
                                    <div>
                                        <p className="text-[var(--text-muted)] text-xs font-black uppercase tracking-widest mb-1">Your Standing</p>
                                        <h4 className="text-2xl font-black text-[var(--text-primary)]">Keep rising, {userData.firstName}!</h4>
                                    </div>
                                </div>
                                <div className="flex gap-10">
                                    <div className="text-left">
                                        <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-1">Total XP</p>
                                        <p className="text-2xl font-black text-[var(--brand-primary)] tracking-tighter">{userData.xp?.toLocaleString()}</p>
                                    </div>
                                    <div className="text-left">
                                        <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-1">Streak</p>
                                        <p className="text-2xl font-black text-[var(--brand-accent)] tracking-tighter">{userData.streak || 0}d 🔥</p>
                                    </div>
                                    <BrightButton onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} size="sm">
                                        Top ⬆️
                                    </BrightButton>
                                </div>
                            </div>
                        </BrightLayer>
                    </motion.div>
                )}
            </div>

            {/* Professor Bright Mascot Feedback */}
            <ProfessorBrightMascot feedback={mascotFeedback} />
        </div>
    );
}

function AvatarRenderer({ customization, username }: { customization: any, username: string }) {
    const svg = React.useMemo(() => {
        const c = customization;
        // Normalize for v9 local rendering which might expect clothesColor
        const avatar = createAvatar(avataaars, {
            seed: username,
            backgroundColor: [c.backgroundColor || 'FF8A8A'],
            top: [c.top || 'shortFlat'],
            hairColor: [c.hairColor || '2c1b18'],
            clothing: [c.clothing || 'blazerAndShirt'],
            clothesColor: [c.clothingColor || c.clothesColor || '262e33'],
            accessories: [c.accessories || 'blank'],
            eyes: [c.eyes || 'default'],
            mouth: [c.mouth || 'smile'],
            skinColor: [c.skinColor || 'ffdbb4'],
            facialHair: [c.facialHair || 'blank'],
            backgroundType: ['solid']
        });
        return avatar.toString();
    }, [customization, username]);

    return (
        <div
            className="w-full h-full"
            dangerouslySetInnerHTML={{ __html: svg }}
        />
    );
}
