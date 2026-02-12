'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSocialHub } from '@/lib/social-hub-context';
import { useAuth } from '@/lib/auth-context';
import { UserSocialBadge } from './UserSocialBadge';
import { BrightButton } from '@/components/system';
import ReactMarkdown from 'react-markdown';
import { storage } from '@/lib/firebase';
import { ref, getDownloadURL } from 'firebase/storage';

const REACTIONS = ['🔥', '💯', '👏', '💡'];

export function CampusSquare() {
    const { activeRoom, messages, sendMessage, addReaction, openDM, reportMessage, reportRoom, typingUsers, setTyping } = useSocialHub();
    const { user } = useAuth();
    const [messageText, setMessageText] = useState('');
    const [showReactions, setShowReactions] = useState<string | null>(null);
    const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set());
    const [fileUploading, setFileUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (messages.length > 0 && messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages.length]);

    const handleSendMessage = async () => {
        if (!messageText.trim() && !fileUploading) return;

        try {
            await sendMessage(messageText);
            setMessageText('');
        } catch (error: unknown) {
            const err = error as { message?: string };
            alert(err.message || 'Failed to send message');
        }
    };

    const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const text = e.target.value;
        setMessageText(text);

        // Notify that user is typing
        if (text.trim()) {
            setTyping(true);
            // Clear previous timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
            // Set typing to false after 3 seconds of inactivity
            typingTimeoutRef.current = setTimeout(() => {
                setTyping(false);
            }, 3000);
        } else {
            setTyping(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file size (20MB max)
        if (file.size > 20 * 1024 * 1024) {
            alert('File size must be less than 20MB');
            return;
        }

        // Validate file type
        const allowedTypes = ['.pdf', '.png', '.jpg', '.jpeg', '.docx'];
        const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
        if (!allowedTypes.includes(fileExtension)) {
            alert('Only PDF, PNG, JPG, and DOCX files are allowed');
            return;
        }

        setFileUploading(true);
        setUploadProgress(0);
        try {
            if (!storage) throw new Error('Storage not initialized');
            const fileRef = ref(storage, `messages/${Date.now()}_${file.name}`);

            // Use uploadBytesResumable for progress tracking
            const { uploadBytesResumable } = await import('firebase/storage');
            const uploadTask = uploadBytesResumable(fileRef, file);

            // Track upload progress
            uploadTask.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress(Math.round(progress));
                },
                (error) => {
                    console.error('Upload error:', error);
                    alert('Failed to upload file');
                    setFileUploading(false);
                    setUploadProgress(0);
                },
                async () => {
                    // Upload complete
                    const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                    await sendMessage(`📎 ${file.name}`, downloadURL);
                    setFileUploading(false);
                    setUploadProgress(0);
                }
            );
        } catch (error) {
            console.error('Error uploading file:', error);
            alert('Failed to upload file');
            setFileUploading(false);
            setUploadProgress(0);
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const toggleThread = (messageId: string) => {
        setExpandedThreads((prev) => {
            const next = new Set(prev);
            if (next.has(messageId)) {
                next.delete(messageId);
            } else {
                next.add(messageId);
            }
            return next;
        });
    };

    if (!activeRoom) {
        return (
            <div className="h-full flex items-center justify-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
                <p className="text-[var(--text-muted)] font-medium">
                    Select a room to start chatting
                </p>
            </div>
        );
    }

    const MessageItem = ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const message = messages[index];
        if (!message) return <div style={style} />;

        const reactions = message.reactions || {};
        const hasReactions = Object.keys(reactions).length > 0;

        return (
            <div style={style} className="px-4 py-2">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors"
                >
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <UserSocialBadge
                                userId={message.senderId}
                                userName={message.senderName || 'User'}
                                businessPrestige={message.businessPrestige}
                            />
                            <span className="text-xs text-[var(--text-muted)]">
                                {message.timestamp?.toDate().toLocaleTimeString()}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => openDM(message.senderId, message.senderName || 'User')}
                                className="text-xs px-2 py-1 bg-white/5 rounded hover:bg-white/10 transition-colors text-[var(--text-secondary)]"
                            >
                                DM
                            </button>
                            <button
                                onClick={() => reportMessage(message.id, 'Inappropriate content')}
                                className="text-xs px-2 py-1 bg-white/5 rounded hover:bg-white/10 transition-colors text-[var(--state-error)]"
                            >
                                Report
                            </button>
                        </div>
                    </div>

                    <div className="prose prose-invert max-w-none mb-3">
                        <ReactMarkdown
                            components={{
                                code: ({ node: _node, ...props }) => (
                                    <code className="bg-black/30 px-2 py-1 rounded text-sm" {...props} />
                                ),
                                pre: ({ node: _node, ...props }) => (
                                    <pre className="bg-black/30 p-3 rounded overflow-x-auto" {...props} />
                                )
                            }}
                        >
                            {message.text}
                        </ReactMarkdown>
                    </div>

                    {message.fileUrl && (
                        <div className="mb-3">
                            <a
                                href={message.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors text-sm"
                            >
                                <span>📎</span>
                                <span className="text-[var(--brand-primary)]">
                                    {message.text.replace('📎 ', '')}
                                </span>
                            </a>
                        </div>
                    )}

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            {REACTIONS.map((emoji) => {
                                const userIds = reactions[emoji] || [];
                                const hasReacted = userIds.includes(user?.uid || '');
                                const count = userIds.length;

                                if (showReactions === message.id) {
                                    return (
                                        <button
                                            key={emoji}
                                            onClick={() => addReaction(message.id, emoji)}
                                            className={`
                                                px-2 py-1 rounded-lg text-lg transition-all
                                                ${hasReacted
                                                    ? 'bg-[var(--brand-primary)]/30 border border-[var(--brand-primary)]'
                                                    : 'bg-white/5 hover:bg-white/10'
                                                }
                                            `}
                                        >
                                            {emoji}
                                            {count > 0 && (
                                                <span className="ml-1 text-xs">{count}</span>
                                            )}
                                        </button>
                                    );
                                }

                                if (count > 0) {
                                    return (
                                        <button
                                            key={emoji}
                                            onClick={() => addReaction(message.id, emoji)}
                                            className={`
                                                px-2 py-1 rounded-lg text-lg transition-all
                                                ${hasReacted
                                                    ? 'bg-[var(--brand-primary)]/30 border border-[var(--brand-primary)]'
                                                    : 'bg-white/5 hover:bg-white/10'
                                                }
                                            `}
                                        >
                                            {emoji} {count}
                                        </button>
                                    );
                                }

                                return null;
                            })}
                        </div>

                        {!showReactions && (
                            <button
                                onClick={() => setShowReactions(message.id)}
                                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                {hasReactions ? 'Add reaction' : 'React'}
                            </button>
                        )}

                        {showReactions === message.id && (
                            <button
                                onClick={() => setShowReactions(null)}
                                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                Done
                            </button>
                        )}

                        <button
                            onClick={() => toggleThread(message.id)}
                            className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            {expandedThreads.has(message.id) ? 'Hide replies' : 'Reply'}
                        </button>
                    </div>

                    {expandedThreads.has(message.id) && (
                        <div className="mt-4 pl-4 border-l-2 border-white/10">
                            <p className="text-xs text-[var(--text-muted)] mb-2">Thread replies coming soon...</p>
                        </div>
                    )}
                </motion.div>
            </div>
        );
    };

    return (
        <div className="h-full flex flex-col bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)]">
                        {activeRoom.name}
                    </h2>
                    {activeRoom.type === 'public' && activeRoom.subject && (
                        <p className="text-sm text-[var(--text-muted)]">{activeRoom.subject}</p>
                    )}
                </div>

                <BrightButton
                    variant="outline"
                    size="sm"
                    className="text-xs border-white/10 hover:border-red-500/50 hover:text-red-500"
                    onClick={() => {
                        const reason = confirm('Report this room for inappropriate content?');
                        if (reason) {
                            reportRoom(activeRoom.id, "User reported room from header");
                            alert("Thank you. Our moderation team will review this room.");
                        }
                    }}
                >
                    🚩 Report Room
                </BrightButton>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <AnimatePresence>
                    {messages.map((message, index) => (
                        <MessageItem
                            key={message.id}
                            index={index}
                            style={{}}
                        />
                    ))}
                </AnimatePresence>
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10">
                {/* Typing Indicator */}
                {typingUsers.length > 0 && (
                    <div className="mb-2 px-2">
                        <span className="text-xs text-[var(--text-muted)] italic">
                            {typingUsers.length === 1
                                ? `${typingUsers[0]!.name} is typing...`
                                : typingUsers.length === 2
                                    ? `${typingUsers[0]!.name} and ${typingUsers[1]!.name} are typing...`
                                    : `${typingUsers[0]!.name} and ${typingUsers.length - 1} others are typing...`}
                        </span>
                        <span className="inline-flex ml-1">
                            <span className="w-1 h-1 bg-[var(--brand-primary)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1 h-1 bg-[var(--brand-primary)] rounded-full animate-bounce ml-0.5" style={{ animationDelay: '150ms' }} />
                            <span className="w-1 h-1 bg-[var(--brand-primary)] rounded-full animate-bounce ml-0.5" style={{ animationDelay: '300ms' }} />
                        </span>
                    </div>
                )}
                {fileUploading && (
                    <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[var(--text-secondary)]">Uploading...</span>
                            <span className="text-xs font-bold text-[var(--brand-primary)]">{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-white/5 rounded-full h-2 overflow-hidden">
                            <motion.div
                                className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${uploadProgress}%` }}
                                transition={{ duration: 0.3 }}
                            />
                        </div>
                    </div>
                )}
                <div className="flex items-end gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={fileUploading}
                        className="p-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                    >
                        {fileUploading ? '⏳' : '📎'}
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".pdf,.png,.jpg,.jpeg,.docx"
                    />
                    <textarea
                        value={messageText}
                        onChange={handleMessageChange}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage();
                            }
                        }}
                        placeholder="Type your message... (Markdown supported)"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-[var(--brand-primary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
                        rows={2}
                    />
                    <BrightButton
                        variant="primary"
                        size="sm"
                        onClick={handleSendMessage}
                        disabled={!messageText.trim() && !fileUploading}
                    >
                        Send
                    </BrightButton>
                </div>
            </div>
        </div>
    );
}
