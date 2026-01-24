'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocialHub } from '@/lib/social-hub-context';
import { useAuth } from '@/lib/auth-context';
import { BrightLayer, BrightButton } from '@/components/system';
import Fuse from 'fuse.js';

const SUBJECT_LOUNGES = [
    { name: 'Principles of Business', subject: 'Principles of Business', icon: '💼' },
    { name: 'Mathematics', subject: 'Mathematics', icon: '📐' },
    { name: 'English A', subject: 'English A', icon: '📝' },
    { name: 'Information Technology', subject: 'Information Technology', icon: '💻' },
    { name: 'Chemistry', subject: 'Chemistry', icon: '🔬' }
];

export function GuildNavigator() {
    const { rooms, activeRoom, setActiveRoom, createPrivateRoom, joinRoom, leaveRoom, deleteRoom } = useSocialHub();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [showJoinModal, setShowJoinModal] = useState(false);
    const [joinCode, setJoinCode] = useState('');
    const [isJoining, setIsJoining] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Combine subject lounges with private rooms
    const allRooms = useMemo(() => {
        const publicRooms = SUBJECT_LOUNGES.map(lounge => ({
            id: lounge.name,
            name: lounge.name,
            type: 'public' as const,
            subject: lounge.subject,
            members: [],
            icon: lounge.icon
        }));

        const privateRooms = rooms
            .filter(room => room.type === 'private')
            .map(room => ({ ...room, icon: '🔒' }));

        return [...publicRooms, ...privateRooms];
    }, [rooms]);

    // Fuzzy search
    const fuse = useMemo(() => {
        return new Fuse(allRooms, {
            keys: ['name', 'subject'],
            threshold: 0.3
        });
    }, [allRooms]);

    const filteredRooms = useMemo(() => {
        if (!searchQuery.trim()) return allRooms;
        const results = fuse.search(searchQuery);
        return results.map(result => result.item);
    }, [searchQuery, fuse, allRooms]);

    const handleJoinRoom = async () => {
        if (!joinCode.trim() || joinCode.length !== 6) return;

        setIsJoining(true);
        try {
            const success = await joinRoom(joinCode);
            if (success) {
                setShowJoinModal(false);
                setJoinCode('');
            } else {
                alert('Room not found. Please check the code.');
            }
        } catch (error) {
            console.error('Error joining room:', error);
            alert('Failed to join room. Please try again.');
        } finally {
            setIsJoining(false);
        }
    };

    const handleCreateRoom = async () => {
        setIsCreating(true);
        try {
            const code = await createPrivateRoom();
            setShowCreateModal(false);
            alert(`Room created! Share this code: ${code}`);
        } catch (error) {
            console.error('Error creating room:', error);
            alert('Failed to create room. Please try again.');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Search Bar */}
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Search rooms..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-3 text-sm font-medium text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--brand-primary)] transition-colors"
                />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-4">
                <BrightButton
                    variant="secondary"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setShowCreateModal(true)}
                >
                    + Create
                </BrightButton>
                <BrightButton
                    variant="outline"
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setShowJoinModal(true)}
                >
                    Join
                </BrightButton>
            </div>

            {/* Room List */}
            <div className="flex-1 overflow-y-auto space-y-2">
                <AnimatePresence>
                    {filteredRooms.map((room) => (
                        <motion.div
                            key={room.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            onClick={() => setActiveRoom(room as any)}
                            className={`
                                p-3 rounded-xl cursor-pointer transition-all
                                ${activeRoom?.id === room.id
                                    ? 'bg-[var(--brand-primary)]/20 border-2 border-[var(--brand-primary)]'
                                    : 'bg-white/5 backdrop-blur-xl border border-white/10 hover:bg-white/10'
                                }
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">{room.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-sm text-[var(--text-primary)] truncate">
                                        {room.name}
                                    </p>
                                    {room.type === 'public' && (
                                        <p className="text-xs text-[var(--text-muted)]">
                                            {room.subject}
                                        </p>
                                    )}
                                </div>

                                {/* Management Actions */}
                                {room.type === 'private' && (
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {room.ownerId === user?.uid ? (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm('Delete this study den permanently?')) {
                                                        deleteRoom(room.id);
                                                    }
                                                }}
                                                className="p-1.5 hover:bg-red-500/20 rounded-lg text-red-500 transition-colors"
                                                title="Delete Room"
                                            >
                                                🗑️
                                            </button>
                                        ) : (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm('Leave this study den?')) {
                                                        leaveRoom(room.id);
                                                    }
                                                }}
                                                className="p-1.5 hover:bg-orange-500/20 rounded-lg text-orange-500 transition-colors"
                                                title="Leave Room"
                                            >
                                                🚪
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Join Room Modal */}
            <AnimatePresence>
                {showJoinModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowJoinModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-md"
                        >
                            <h3 className="text-xl font-bold mb-4 text-[var(--text-primary)]">
                                Join Study Den
                            </h3>
                            <input
                                type="text"
                                placeholder="Enter 6-digit code"
                                value={joinCode}
                                onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-center text-2xl font-mono font-bold mb-4 focus:outline-none focus:border-[var(--brand-primary)]"
                                maxLength={6}
                                autoFocus
                            />
                            <div className="flex gap-3">
                                <BrightButton
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => setShowJoinModal(false)}
                                >
                                    Cancel
                                </BrightButton>
                                <BrightButton
                                    variant="primary"
                                    className="flex-1"
                                    onClick={handleJoinRoom}
                                    disabled={isJoining || joinCode.length !== 6}
                                    isLoading={isJoining}
                                >
                                    Join
                                </BrightButton>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Create Room Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 w-full max-w-md"
                        >
                            <h3 className="text-xl font-bold mb-4 text-[var(--text-primary)]">
                                Create Study Den
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-6">
                                Create a private room for you and your friends. Share the code to invite others.
                            </p>
                            <div className="flex gap-3">
                                <BrightButton
                                    variant="secondary"
                                    className="flex-1"
                                    onClick={() => setShowCreateModal(false)}
                                >
                                    Cancel
                                </BrightButton>
                                <BrightButton
                                    variant="primary"
                                    className="flex-1"
                                    onClick={handleCreateRoom}
                                    disabled={isCreating}
                                    isLoading={isCreating}
                                >
                                    Create
                                </BrightButton>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
