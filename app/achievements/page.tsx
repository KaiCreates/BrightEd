'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'streak' | 'business' | 'mastery' | 'social';
    requirement: string;
    unlocked: boolean;
    unlockedAt?: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

const ALL_ACHIEVEMENTS: Achievement[] = [
    {
        id: 'streak-king',
        name: 'Streak King',
        description: 'Maintain a 30-day learning streak',
        icon: '🔥',
        category: 'streak',
        requirement: 'streak >= 30',
        unlocked: false,
        rarity: 'epic'
    },
    {
        id: 'first-million',
        name: 'First Million',
        description: 'Reach $1M business valuation',
        icon: '👑',
        category: 'business',
        requirement: 'valuation >= 1000000',
        unlocked: false,
        rarity: 'legendary'
    },
    {
        id: 'master-pob',
        name: 'Master of POB',
        description: 'Achieve 90%+ mastery in Principles of Business',
        icon: '💼',
        category: 'mastery',
        requirement: 'subjectProgress["Principles of Business"] >= 9.0',
        unlocked: false,
        rarity: 'rare'
    },
    {
        id: 'community-leader',
        name: 'Community Leader',
        description: 'Help 50+ students in the Live Campus',
        icon: '🌟',
        category: 'social',
        requirement: 'helpCount >= 50',
        unlocked: false,
        rarity: 'epic'
    },
    {
        id: 'seed-founder',
        name: 'Seed Founder',
        description: 'Register your first business',
        icon: '🌱',
        category: 'business',
        requirement: 'hasBusiness === true',
        unlocked: false,
        rarity: 'common'
    },
    {
        id: 'profit-first',
        name: 'Profit First',
        description: 'Earn your first 1000 B-Coins',
        icon: '💰',
        category: 'business',
        requirement: 'bCoins >= 1000',
        unlocked: false,
        rarity: 'common'
    },
    {
        id: 'market-entry',
        name: 'Market Entry',
        description: 'Reach $10k business valuation',
        icon: '📈',
        category: 'business',
        requirement: 'valuation >= 10000',
        unlocked: false,
        rarity: 'common'
    },
    {
        id: 'math-master',
        name: 'Mathematics Master',
        description: 'Achieve 90%+ mastery in Mathematics',
        icon: '📐',
        category: 'mastery',
        requirement: 'subjectProgress["Mathematics"] >= 9.0',
        unlocked: false,
        rarity: 'rare'
    },
    {
        id: 'week-warrior',
        name: 'Week Warrior',
        description: 'Maintain a 7-day learning streak',
        icon: '⚔️',
        category: 'streak',
        requirement: 'streak >= 7',
        unlocked: false,
        rarity: 'common'
    },
    {
        id: 'centurion',
        name: 'Centurion',
        description: 'Answer 100 questions correctly',
        icon: '💯',
        category: 'mastery',
        requirement: 'questionsCorrect >= 100',
        unlocked: false,
        rarity: 'rare'
    }
];

const RARITY_COLORS = {
    common: 'from-gray-400 to-gray-600',
    rare: 'from-blue-400 to-blue-600',
    epic: 'from-purple-400 to-purple-600',
    legendary: 'from-yellow-400 via-orange-500 to-yellow-600'
};

const RARITY_GLOW = {
    common: 'shadow-gray-500/20',
    rare: 'shadow-blue-500/40',
    epic: 'shadow-purple-500/60',
    legendary: 'shadow-yellow-500/80'
};

export default function AchievementsPage() {
    const { user, userData } = useAuth();
    const [achievements, setAchievements] = useState<Achievement[]>(ALL_ACHIEVEMENTS);
    const [pinnedAchievements, setPinnedAchievements] = useState<string[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    useEffect(() => {
        if (!user || !userData) return;

        // Check which achievements are unlocked
        const checkAchievements = async () => {
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            const userDoc = userSnap.data() || {};

            const unlockedIds = userDoc.unlockedAchievements || [];
            const pinned = userDoc.pinnedAchievements || [];

            setPinnedAchievements(pinned);

            // Get business data for business achievements
            let businessValuation = 0;
            if (userData.businessID) {
                const bizRef = doc(db, 'businesses', userData.businessID);
                const bizSnap = await getDoc(bizRef);
                if (bizSnap.exists()) {
                    businessValuation = bizSnap.data().valuation || 0;
                }
            }

            const updated = ALL_ACHIEVEMENTS.map(ach => {
                const isUnlocked = unlockedIds.includes(ach.id);
                let shouldUnlock = false;

                // Check requirements
                switch (ach.id) {
                    case 'streak-king':
                        shouldUnlock = (userData.streak || 0) >= 30;
                        break;
                    case 'first-million':
                        shouldUnlock = businessValuation >= 1000000;
                        break;
                    case 'master-pob':
                        shouldUnlock = (userData.subjectProgress?.['Principles of Business'] || 0) >= 9.0;
                        break;
                    case 'community-leader':
                        shouldUnlock = (userDoc.helpCount || 0) >= 50;
                        break;
                    case 'seed-founder':
                        shouldUnlock = userData.hasBusiness === true;
                        break;
                    case 'profit-first':
                        shouldUnlock = (userData.bCoins || 0) >= 1000;
                        break;
                    case 'market-entry':
                        shouldUnlock = businessValuation >= 10000;
                        break;
                    case 'math-master':
                        shouldUnlock = (userData.subjectProgress?.['Mathematics'] || 0) >= 9.0;
                        break;
                    case 'week-warrior':
                        shouldUnlock = (userData.streak || 0) >= 7;
                        break;
                    case 'centurion':
                        shouldUnlock = (userData.questionsCorrect || 0) >= 100;
                        break;
                }

                // Auto-unlock if requirement met
                if (shouldUnlock && !isUnlocked) {
                    updateDoc(userRef, {
                        unlockedAchievements: arrayUnion(ach.id)
                    }).catch(() => {});
                }

                return {
                    ...ach,
                    unlocked: isUnlocked || shouldUnlock,
                    unlockedAt: isUnlocked ? userDoc.achievementUnlockDates?.[ach.id] : undefined
                };
            });

            setAchievements(updated);
        };

        checkAchievements();
    }, [user, userData]);

    const togglePin = async (achievementId: string) => {
        if (!user) return;

        const userRef = doc(db, 'users', user.uid);
        const isPinned = pinnedAchievements.includes(achievementId);

        if (isPinned) {
            if (pinnedAchievements.length <= 1) {
                alert('You must have at least one pinned achievement');
                return;
            }
            await updateDoc(userRef, {
                pinnedAchievements: arrayRemove(achievementId)
            });
            setPinnedAchievements(prev => prev.filter(id => id !== achievementId));
        } else {
            if (pinnedAchievements.length >= 3) {
                alert('You can only pin up to 3 achievements');
                return;
            }
            await updateDoc(userRef, {
                pinnedAchievements: arrayUnion(achievementId)
            });
            setPinnedAchievements(prev => [...prev, achievementId]);
        }
    };

    const filteredAchievements = selectedCategory === 'all'
        ? achievements
        : achievements.filter(a => a.category === selectedCategory);

    const categories = ['all', 'streak', 'business', 'mastery', 'social'];

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] py-20 px-4">
            <div className="max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <BrightHeading level={1} className="mb-4">
                        🏆 The Locker Room 🏆
                    </BrightHeading>
                    <p className="text-[var(--text-secondary)] font-medium text-lg">
                        Your digital trophy case. Flex your achievements and show off your progress.
                    </p>
                </motion.div>

                {/* Category Filter */}
                <div className="flex gap-2 mb-8 justify-center flex-wrap">
                    {categories.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wider transition-all ${
                                selectedCategory === cat
                                    ? 'bg-[var(--brand-primary)] text-white shadow-lg'
                                    : 'bg-white/5 text-[var(--text-secondary)] hover:bg-white/10'
                            }`}
                        >
                            {cat === 'all' ? 'All' : cat}
                        </button>
                    ))}
                </div>

                {/* Pinned Achievements (Top 3) */}
                {pinnedAchievements.length > 0 && (
                    <div className="mb-12">
                        <BrightHeading level={3} className="mb-6 text-center">
                            ⭐ Pinned Achievements
                        </BrightHeading>
                        <div className="grid md:grid-cols-3 gap-6">
                            {pinnedAchievements.map((achId) => {
                                const ach = achievements.find(a => a.id === achId);
                                if (!ach) return null;
                                return (
                                    <AchievementCard
                                        key={ach.id}
                                        achievement={ach}
                                        isPinned={true}
                                        onTogglePin={togglePin}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* All Achievements Grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence>
                        {filteredAchievements.map((achievement, index) => (
                            <AchievementCard
                                key={achievement.id}
                                achievement={achievement}
                                isPinned={pinnedAchievements.includes(achievement.id)}
                                onTogglePin={togglePin}
                                index={index}
                            />
                        ))}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}

function AchievementCard({
    achievement,
    isPinned,
    onTogglePin,
    index = 0
}: {
    achievement: Achievement;
    isPinned: boolean;
    onTogglePin: (id: string) => void;
    index?: number;
}) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ delay: index * 0.05 }}
            className={`relative ${achievement.unlocked ? '' : 'grayscale blur-sm'} transition-all duration-500`}
        >
            <BrightLayer
                variant="glass"
                padding="md"
                className={`
                    h-full cursor-pointer group
                    ${achievement.unlocked 
                        ? `bg-gradient-to-br ${RARITY_COLORS[achievement.rarity]} ${RARITY_GLOW[achievement.rarity]} shadow-2xl` 
                        : 'bg-white/5 opacity-60'
                    }
                    ${isPinned ? 'ring-4 ring-yellow-400 ring-opacity-50' : ''}
                `}
            >
                {/* Pin Button */}
                {achievement.unlocked && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onTogglePin(achievement.id);
                        }}
                        className={`absolute top-2 right-2 p-2 rounded-full transition-all ${
                            isPinned
                                ? 'bg-yellow-400 text-yellow-900'
                                : 'bg-white/10 hover:bg-white/20 text-white/60'
                        }`}
                    >
                        {isPinned ? '📌' : '📍'}
                    </button>
                )}

                {/* Achievement Icon */}
                <div className="text-center mb-4">
                    <div className={`
                        text-6xl mb-2 transition-transform group-hover:scale-110
                        ${achievement.unlocked ? 'animate-bounce-subtle' : ''}
                    `}>
                        {achievement.icon}
                    </div>
                    <h3 className="text-xl font-black text-white mb-1">
                        {achievement.name}
                    </h3>
                    <p className="text-sm text-white/80 mb-2">
                        {achievement.description}
                    </p>
                    <span className={`
                        text-xs font-black uppercase tracking-widest px-3 py-1 rounded-full
                        ${achievement.rarity === 'legendary' 
                            ? 'bg-yellow-400/20 text-yellow-200 border border-yellow-400/50'
                            : achievement.rarity === 'epic'
                            ? 'bg-purple-400/20 text-purple-200 border border-purple-400/50'
                            : achievement.rarity === 'rare'
                            ? 'bg-blue-400/20 text-blue-200 border border-blue-400/50'
                            : 'bg-gray-400/20 text-gray-200 border border-gray-400/50'
                        }
                    `}>
                        {achievement.rarity}
                    </span>
                </div>

                {/* Locked Overlay */}
                {!achievement.unlocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-2xl">
                        <div className="text-center">
                            <div className="text-4xl mb-2">🔒</div>
                            <p className="text-sm font-bold text-white/80">
                                Locked
                            </p>
                        </div>
                    </div>
                )}

                {/* Unlocked Badge */}
                {achievement.unlocked && achievement.unlockedAt && (
                    <div className="text-xs text-white/60 text-center mt-2">
                        Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                    </div>
                )}
            </BrightLayer>
        </motion.div>
    );
}
