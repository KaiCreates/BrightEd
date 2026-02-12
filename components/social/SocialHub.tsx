'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { GuildNavigator } from './GuildNavigator';
import { CampusSquare } from './CampusSquare';
import { PeoplePrivacy } from './PeoplePrivacy';
import { DMWindow } from './DMWindow';
import { useSocialHub } from '@/lib/social-hub-context';

export function SocialHub() {
    const { dmWindows, closeDM, toggleDMMinimize, activeRoom } = useSocialHub();
    const [mobileTab, setMobileTab] = useState<'rooms' | 'chat' | 'people'>(activeRoom ? 'chat' : 'rooms');

    // Automatically switch to chat tab when a room is selected on mobile
    React.useEffect(() => {
        if (activeRoom) {
            setMobileTab('chat');
        }
    }, [activeRoom]);

    return (
        <div className="w-full">
            {/* Mobile Navigation Dock - Hidden on LG+ screens */}
            <div className="lg:hidden flex gap-2 mb-4 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-xl">
                <button
                    onClick={() => setMobileTab('rooms')}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mobileTab === 'rooms' ? 'bg-[var(--brand-primary)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                >
                    🏰 Rooms
                </button>
                <button
                    onClick={() => setMobileTab('chat')}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mobileTab === 'chat' ? 'bg-[var(--brand-primary)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                >
                    💬 Chat
                </button>
                <button
                    onClick={() => setMobileTab('people')}
                    className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${mobileTab === 'people' ? 'bg-[var(--brand-primary)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                >
                    🫂 People
                </button>
            </div>

            {/* Main Layout Content */}
            <div className="grid grid-cols-12 gap-4 min-h-[600px] h-[calc(100vh-280px)] lg:h-[calc(100vh-200px)]">
                {/* Left Column - Guild Navigator */}
                <div className={`col-span-12 lg:col-span-3 h-full ${mobileTab !== 'rooms' ? 'hidden lg:block' : ''}`}>
                    <GuildNavigator />
                </div>

                {/* Center Column - Campus Square */}
                <div className={`col-span-12 lg:col-span-6 h-full ${mobileTab !== 'chat' ? 'hidden lg:block' : ''}`}>
                    <CampusSquare />
                </div>

                {/* Right Column - People & Privacy */}
                <div className={`col-span-12 lg:col-span-3 h-full ${mobileTab !== 'people' ? 'hidden lg:block' : ''}`}>
                    <PeoplePrivacy />
                </div>
            </div>

            {/* DM Windows */}
            <AnimatePresence>
                {dmWindows.map((dm) => (
                    <DMWindow
                        key={dm.userId}
                        userId={dm.userId}
                        userName={dm.userName}
                        roomId={dm.roomId}
                        isMinimized={dm.isMinimized}
                        onClose={() => closeDM(dm.userId)}
                        onMinimize={() => toggleDMMinimize(dm.userId)}
                    />
                ))}
            </AnimatePresence>
        </div>
    );
}
