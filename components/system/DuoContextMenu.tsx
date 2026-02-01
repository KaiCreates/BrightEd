'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ContextMenuItem {
    label: string;
    icon?: string;
    onClick: () => void;
    variant?: 'primary' | 'danger';
}

interface DuoContextMenuProps {
    trigger: React.ReactNode;
    items: ContextMenuItem[];
}

export function DuoContextMenu({ trigger, items }: DuoContextMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    return (
        <div className="relative inline-block" ref={menuRef}>
            <div onClick={() => setIsOpen(!isOpen)} className="cursor-pointer">
                {trigger}
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: -10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: -10 }}
                        className="absolute right-0 top-full mt-2 z-50 w-48 bg-[var(--bg-elevated)] rounded-2xl border-2 border-[var(--border-subtle)] border-b-4 shadow-xl overflow-hidden"
                    >
                        <div className="flex flex-col p-2 gap-1">
                            {items.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        item.onClick();
                                        setIsOpen(false);
                                    }}
                                    className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all
                    ${item.variant === 'danger'
                                            ? 'text-red-500 hover:bg-red-500/10'
                                            : 'text-[var(--text-primary)] hover:bg-[var(--brand-primary)]/10 hover:text-[var(--brand-primary)]'
                                        }
                  `}
                                >
                                    {item.icon && <span className="text-lg">{item.icon}</span>}
                                    <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
