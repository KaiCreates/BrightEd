'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocialHub } from '@/lib/social-hub-context';
import { useAuth } from '@/lib/auth-context';
import { UserSocialBadge } from './UserSocialBadge';
import { BrightButton } from '@/components/system';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';

interface DMWindowProps {
    userId: string;
    userName: string;
    roomId: string;
    isMinimized: boolean;
    onClose: () => void;
    onMinimize: () => void;
}

export function DMWindow({ userId, userName, roomId, isMinimized, onClose, onMinimize }: DMWindowProps) {
    const { sendDM } = useSocialHub();
    const { user } = useAuth();
    const [messages, setMessages] = useState<Array<{ id: string; text: string; senderId: string; timestamp: Timestamp | null }>>([]);
    const [messageText, setMessageText] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!roomId || !user) return;

        const messagesRef = collection(db, 'dms', roomId, 'messages');
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const msgs: Array<{ id: string; text: string; senderId: string; timestamp: Timestamp | null }> = [];
                snapshot.forEach((doc) => {
                    const data = doc.data();
                    msgs.push({
                        id: doc.id,
                        text: data.text || '',
                        senderId: data.senderId || '',
                        timestamp: data.timestamp || null
                    });
                });
                setMessages(msgs);
            },
            (error) => {
                console.error('Error loading DM messages:', error);
                setMessages([]);
            }
        );

        return () => unsubscribe();
    }, [roomId, user]);

    useEffect(() => {
        if (!isMinimized && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isMinimized]);

    const handleSend = async () => {
        if (!messageText.trim()) return;

        try {
            await sendDM(userId, messageText);
            setMessageText('');
        } catch (error) {
            console.error('Error sending DM:', error);
        }
    };

    if (isMinimized) {
        return (
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="fixed bottom-4 right-4 z-50"
            >
                <button
                    onClick={onMinimize}
                    className="bg-[var(--brand-primary)] text-white px-4 py-2 rounded-t-xl shadow-lg hover:bg-[var(--brand-primary)]/90 transition-colors"
                >
                    {userName}
                </button>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ y: 100, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 100, opacity: 0, scale: 0.95 }}
            className="fixed bottom-4 right-4 w-96 h-[500px] bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-50 flex flex-col"
        >
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <UserSocialBadge userId={userId} userName={userName} showHoverCard={false} />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onMinimize}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                    </button>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message) => (
                    <div
                        key={message.id}
                        className={`flex ${message.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}
                    >
                        <div
                            className={`
                                max-w-[80%] rounded-xl p-3
                                ${message.senderId === user?.uid
                                    ? 'bg-[var(--brand-primary)]/20 text-[var(--text-primary)]'
                                    : 'bg-white/5 text-[var(--text-primary)]'
                                }
                            `}
                        >
                            <div className="prose prose-invert max-w-none text-sm">
                                <ReactMarkdown>{message.text}</ReactMarkdown>
                            </div>
                            <p className="text-xs text-[var(--text-muted)] mt-1">
                                {message.timestamp?.toDate().toLocaleTimeString()}
                            </p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10">
                <div className="flex gap-2">
                    <textarea
                        value={messageText}
                        onChange={(e) => setMessageText(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder="Type a message..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm resize-none focus:outline-none focus:border-[var(--brand-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                        rows={2}
                    />
                    <BrightButton
                        variant="primary"
                        size="sm"
                        onClick={handleSend}
                        disabled={!messageText.trim()}
                    >
                        Send
                    </BrightButton>
                </div>
            </div>
        </motion.div>
    );
}
