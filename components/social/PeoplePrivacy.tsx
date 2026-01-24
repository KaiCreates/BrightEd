'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSocialHub } from '@/lib/social-hub-context';
import { useAuth } from '@/lib/auth-context';
import { UserSocialBadge } from './UserSocialBadge';
import { BrightLayer } from '@/components/system';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';

export function PeoplePrivacy() {
    const { onlineUsers, openDM, dmWindows } = useSocialHub();
    const { user } = useAuth();
    const [recentDMs, setRecentDMs] = useState<Array<{
        userId: string;
        userName: string;
        lastMessage: string;
        timestamp: Timestamp | null
    }>>([]);

    useEffect(() => {
        if (!user) return;

        // Simplified: Only load DMs when explicitly needed
        // For now, we'll show empty state to avoid Firestore errors
        // DMs will be loaded when opened via DMWindow component
        setRecentDMs([]);

        // TODO: Implement a more efficient DM loading strategy
        // that doesn't create nested listeners
    }, [user]);

    const onlineUserList = Object.entries(onlineUsers)
        .sort((a, b) => b[1].lastSeen - a[1].lastSeen)
        .slice(0, 20);

    return (
        <div className="h-full flex flex-col space-y-4">
            {/* Online Users */}
            <BrightLayer variant="glass" padding="md" className="flex-1">
                <h3 className="text-lg font-bold mb-4 text-[var(--text-primary)] flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Online ({onlineUserList.length})
                </h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {onlineUserList.length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)]">No one online</p>
                    ) : (
                        onlineUserList.map(([uid, data]) => (
                            <motion.div
                                key={uid}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                                onClick={() => openDM(uid, data.name)}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <div className="w-8 h-8 rounded-full bg-[var(--brand-primary)]/20 flex items-center justify-center">
                                            <span className="text-xs font-bold">
                                                {data.name.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-[var(--bg-elevated)]"></div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-primary)]">
                                            {data.name}
                                        </p>
                                        <p className="text-xs text-[var(--text-muted)]">
                                            Online
                                        </p>
                                    </div>
                                </div>
                                <button className="text-xs px-2 py-1 bg-[var(--brand-primary)]/20 rounded hover:bg-[var(--brand-primary)]/30 transition-colors text-[var(--brand-primary)]">
                                    DM
                                </button>
                            </motion.div>
                        ))
                    )}
                </div>
            </BrightLayer>

            {/* Recent DMs */}
            <BrightLayer variant="glass" padding="md" className="flex-1">
                <h3 className="text-lg font-bold mb-4 text-[var(--text-primary)]">
                    Recent Messages
                </h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {recentDMs.length === 0 ? (
                        <p className="text-sm text-[var(--text-muted)]">No recent messages</p>
                    ) : (
                        recentDMs.map((dm) => (
                            <motion.div
                                key={dm.userId}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="p-3 rounded-lg hover:bg-white/5 transition-colors cursor-pointer border border-white/5"
                                onClick={() => openDM(dm.userId, dm.userName)}
                            >
                                <div className="flex items-start justify-between mb-1">
                                    <p className="text-sm font-bold text-[var(--text-primary)]">
                                        {dm.userName}
                                    </p>
                                    <span className="text-xs text-[var(--text-muted)]">
                                        {dm.timestamp?.toDate().toLocaleTimeString()}
                                    </span>
                                </div>
                                <p className="text-xs text-[var(--text-secondary)] line-clamp-2">
                                    {dm.lastMessage}
                                </p>
                            </motion.div>
                        ))
                    )}
                </div>
            </BrightLayer>
        </div>
    );
}
