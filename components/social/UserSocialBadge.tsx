'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface UserSocialBadgeProps {
    userId: string;
    userName: string;
    businessPrestige?: number;
    className?: string;
    showHoverCard?: boolean;
}

interface BusinessCard {
    valuation: number;
    bCoins: number;
    topSubject: string;
    mastery: number;
}

export function UserSocialBadge({
    userId,
    userName,
    businessPrestige = 0,
    className = '',
    showHoverCard = true
}: UserSocialBadgeProps) {
    const [hovered, setHovered] = useState(false);
    const [businessCard, setBusinessCard] = useState<BusinessCard | null>(null);

    useEffect(() => {
        if (!showHoverCard || !hovered) return;

        const fetchBusinessCard = async () => {
            try {
                // Get user data
                const userRef = doc(db, 'users', userId);
                const userSnap = await getDoc(userRef);
                
                if (!userSnap.exists()) return;

                const userData = userSnap.data();
                let valuation = businessPrestige || 0;
                let bCoins = userData.bCoins || 0;

                // If user has a business, get its valuation
                if (userData.businessID) {
                    const bizRef = doc(db, 'businesses', userData.businessID);
                    const bizSnap = await getDoc(bizRef);
                    if (bizSnap.exists()) {
                        valuation = bizSnap.data().valuation || 0;
                    }
                }

                // Get top subject mastery
                const subjectProgress = userData.subjectProgress || {};
                let topSubject = 'None';
                let mastery = 0;

                Object.entries(subjectProgress).forEach(([subject, progress]: [string, any]) => {
                    if (progress > mastery) {
                        mastery = progress;
                        topSubject = subject;
                    }
                });

                setBusinessCard({
                    valuation,
                    bCoins,
                    topSubject,
                    mastery
                });
            } catch (error) {
                console.error('Error fetching business card:', error);
            }
        };

        fetchBusinessCard();
    }, [userId, hovered, businessPrestige, showHoverCard]);

    const getTier = (valuation: number) => {
        if (valuation >= 1000000) return 4; // Mogul
        if (valuation >= 100000) return 3; // Elite
        if (valuation >= 10000) return 2; // Pro
        return 1; // Newbie
    };

    const tier = getTier(businessPrestige);

    const getTierStyles = () => {
        switch (tier) {
            case 2: // Pro
                return {
                    container: 'relative',
                    text: 'text-cyan-400',
                    glow: 'drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]',
                    icon: '💼'
                };
            case 3: // Elite
                return {
                    container: 'relative',
                    text: 'bg-gradient-to-r from-gray-300 via-gray-100 to-gray-300 bg-clip-text text-transparent animate-shimmer',
                    glow: '',
                    icon: ''
                };
            case 4: // Mogul - The Golden Aura
                return {
                    container: 'relative golden-aura',
                    text: 'bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 bg-clip-text text-transparent animate-gradient-x drop-shadow-[0_0_12px_rgba(234,179,8,0.8)]',
                    glow: 'drop-shadow-[0_0_16px_rgba(234,179,8,0.6)]',
                    icon: '👑'
                };
            default:
                return {
                    container: '',
                    text: 'text-[var(--text-primary)]',
                    glow: '',
                    icon: ''
                };
        }
    };

    const styles = getTierStyles();

    return (
        <div
            className={`relative inline-flex items-center gap-2 ${className}`}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            <span className={`font-bold ${styles.text} ${styles.glow} ${tier === 3 ? 'animate-shimmer' : ''}`}>
                {userName}
            </span>
            {tier >= 2 && (
                <span className="text-lg">{styles.icon}</span>
            )}

            <AnimatePresence>
                {hovered && showHoverCard && businessCard && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute bottom-full left-0 mb-2 z-50 w-64 bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-2xl"
                    >
                        <div className="space-y-3">
                            <div className="border-b border-white/10 pb-2">
                                <p className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">
                                    Business Card
                                </p>
                                <p className="font-bold text-lg text-[var(--text-primary)]">{userName}</p>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-[var(--text-secondary)]">Valuation</span>
                                    <span className="font-bold text-[var(--brand-accent)]">
                                        ${businessCard.valuation.toLocaleString()}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-[var(--text-secondary)]">B-Coins</span>
                                    <span className="font-bold text-[var(--brand-primary)]">
                                        ฿ {businessCard.bCoins.toLocaleString()}
                                    </span>
                                </div>

                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-[var(--text-secondary)]">Top Mastery</span>
                                    <span className="font-bold text-[var(--text-primary)]">
                                        {businessCard.topSubject}
                                    </span>
                                </div>
                                <div className="w-full bg-[var(--bg-secondary)] rounded-full h-2 overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)]"
                                        style={{ width: `${Math.min(businessCard.mastery, 100)}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
