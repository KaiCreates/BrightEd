'use client';

import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDoc, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { BrightLayer, BrightHeading } from '@/components/system';
import { BCoinIcon } from '@/components/BCoinIcon';
import { motion, AnimatePresence } from 'framer-motion';
import { FeedSkeleton } from '@/components/SkeletonLoader';

interface BusinessFeedItem {
    id: string;
    name: string;
    ownerId: string;
    ownerName?: string;
    valuation: number;
    status: string;
}

interface RankBadge {
    label: string;
    color: string;
}

const BusinessItem = ({ biz, idx, rankBadge }: { biz: BusinessFeedItem, idx: number, rankBadge: RankBadge }) => {
    const [resolvedName, setResolvedName] = useState(biz.ownerName || 'Unknown Founder');

    useEffect(() => {
        const resolveMissingName = async () => {
            if (!biz.ownerName || biz.ownerName === 'Unknown Founder') {
                try {
                    const userSnap = await getDoc(doc(db, "users", biz.ownerId));
                    if (userSnap.exists()) {
                        const data = userSnap.data();
                        const name = data.firstName || 'Founder';
                        setResolvedName(name);

                        // Auto-recovery: If current user is the owner, fix the business doc
                        const currentUser = auth.currentUser;
                        if (currentUser && currentUser.uid === biz.ownerId) {
                            const bizRef = doc(db, "businesses", biz.id);
                            updateDoc(bizRef, { ownerName: name }).catch(console.error);
                        }
                    }
                } catch (err) {
                    console.error("Error resolving owner name:", err);
                }
            } else {
                setResolvedName(biz.ownerName);
            }
        };

        resolveMissingName();
    }, [biz.id, biz.ownerId, biz.ownerName]);

    return (
        <BrightLayer
            variant="glass"
            padding="sm"
            className="group hover:border-[var(--brand-primary)]/50 transition-all cursor-default"
        >
            <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-sm text-[var(--text-primary)] truncate italic">
                            {biz.name}
                        </h4>
                        {idx < 3 && <span className="text-xs">🔥</span>}
                    </div>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">
                        {resolvedName}
                    </p>
                </div>

                <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-[var(--brand-primary)] font-black text-sm mb-1">
                        <BCoinIcon size={12} /> {biz.valuation.toLocaleString()}
                    </div>
                    <div className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${rankBadge.color}`}>
                        {rankBadge.label}
                    </div>
                </div>
            </div>
        </BrightLayer>
    );
};

export default function BusinessFeed() {
    const [topBusinesses, setTopBusinesses] = useState<BusinessFeedItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(
            collection(db, "businesses"),
            orderBy("valuation", "desc"),
            limit(10)
        );

        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as BusinessFeedItem));
            setTopBusinesses(list);
            setLoading(false);
        }, (err) => {
            console.error("Feed error:", err);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const getStatusBadge = (valuation: number): RankBadge => {
        if (valuation >= 10000) return { label: 'Corporate Giant', color: 'text-yellow-500 border-yellow-500/30 bg-yellow-500/5' };
        if (valuation > 0) return { label: 'Growing', color: 'text-[var(--brand-accent)] border-[var(--brand-accent)]/30 bg-[var(--brand-accent)]/5' };
        return { label: 'Just Started', color: 'text-[var(--text-muted)] border-[var(--border-subtle)] bg-[var(--bg-secondary)]' };
    };

    if (loading) {
        return <FeedSkeleton />;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between px-2 mb-4">
                <BrightHeading level={4} className="text-sm">Trending Empires</BrightHeading>
                <span className="text-[10px] font-black text-[var(--state-success)] flex items-center gap-1 animate-pulse">
                    ● LIVE FEED
                </span>
            </div>

            <AnimatePresence mode="popLayout">
                {topBusinesses.map((biz, idx) => {
                    const badge = getStatusBadge(biz.valuation);
                    return (
                        <motion.div
                            key={biz.id}
                            layout
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ delay: idx * 0.05 }}
                        >
                            <BusinessItem biz={biz} idx={idx} rankBadge={badge} />
                        </motion.div>
                    );
                })}
            </AnimatePresence>

            {topBusinesses.length === 0 && (
                <div className="text-center py-12 border-2 border-dashed border-[var(--border-subtle)] rounded-2xl">
                    <p className="text-[var(--text-muted)] text-xs font-bold uppercase tracking-widest">No Active Ventures Yet</p>
                </div>
            )}
        </div>
    );
}
