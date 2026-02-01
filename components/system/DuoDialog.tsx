'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BrightHeading, BrightButton } from './index';

interface DuoDialogProps {
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'alert' | 'confirm' | 'danger';
    onConfirm: () => void;
    onCancel?: () => void;
    confirmLabel?: string;
    cancelLabel?: string;
}

export function DuoDialog({
    isOpen,
    title,
    message,
    type = 'confirm',
    onConfirm,
    onCancel,
    confirmLabel = 'OK',
    cancelLabel = 'CANCEL',
}: DuoDialogProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    />

                    {/* Dialog Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="relative w-full max-w-sm bg-[var(--bg-elevated)] rounded-[2.5rem] border-2 border-[var(--border-subtle)] border-b-[8px] overflow-hidden shadow-2xl"
                    >
                        <div className={`h-2 ${type === 'danger' ? 'bg-red-500' : 'bg-[var(--brand-primary)]'}`} />

                        <div className="p-8 pb-6">
                            <BrightHeading level={3} className="text-2xl mb-4 leading-tight">
                                {title}
                            </BrightHeading>
                            <p className="text-[var(--text-secondary)] font-medium leading-relaxed">
                                {message}
                            </p>
                        </div>

                        <div className="p-8 pt-0 flex flex-col gap-3">
                            <BrightButton
                                variant={type === 'danger' ? 'danger' : 'primary'}
                                className="w-full h-14 text-sm"
                                onClick={onConfirm}
                            >
                                {confirmLabel}
                            </BrightButton>

                            {type !== 'alert' && (
                                <button
                                    onClick={onCancel}
                                    className="w-full h-12 text-xs font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                                >
                                    {cancelLabel}
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
