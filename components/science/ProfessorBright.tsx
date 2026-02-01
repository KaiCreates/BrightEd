'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ProfessorState,
    ProfessorMood,
    professorVariants
} from '@/lib/science/virtual-lab.types';

interface ProfessorBrightProps {
    state: ProfessorState;
    onHintRequest?: () => void;
}

const moodEmojis: Record<ProfessorMood, string> = {
    idle: '🧑‍🔬',
    happy: '😊',
    thinking: '🤔',
    worried: '😰',
    celebrating: '🎉',
    shocked: '😱',
    hint: '💡'
};

const moodColors: Record<ProfessorMood, string> = {
    idle: 'bg-[#1CB0F6]',
    happy: 'bg-[#58CC02]',
    thinking: 'bg-[#FFC800]',
    worried: 'bg-[#FF9600]',
    celebrating: 'bg-[#CE82FF]',
    shocked: 'bg-[#FF4B4B]',
    hint: 'bg-[#1CB0F6]'
};

export default function ProfessorBright({ state, onHintRequest }: ProfessorBrightProps) {
    const [blinking, setBlinking] = useState(false);

    // Idle blinking animation
    useEffect(() => {
        if (state.mood === 'idle') {
            const interval = setInterval(() => {
                setBlinking(true);
                setTimeout(() => setBlinking(false), 150);
            }, 3000 + Math.random() * 2000);
            return () => clearInterval(interval);
        }
    }, [state.mood]);

    const positionClasses: Record<string, string> = {
        'bottom-right': 'bottom-6 right-6',
        'center': 'bottom-1/2 left-1/2 -translate-x-1/2 translate-y-1/2',
        'top-right': 'top-20 right-6'
    };

    return (
        <AnimatePresence>
            {state.isVisible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8, y: 20 }}
                    className={`fixed z-[60] ${positionClasses[state.position]}`}
                >
                    <motion.div
                        variants={professorVariants}
                        animate={state.animationVariant}
                        className={`relative ${moodColors[state.mood]} rounded-[2rem] border-4 border-b-8 border-black/20 shadow-xl p-6 max-w-sm`}
                    >
                        {/* Professor Avatar */}
                        <motion.div
                            className="absolute -top-8 -left-4 w-20 h-20 rounded-full bg-[#58CC02] flex items-center justify-center text-4xl shadow-lg border-4 border-b-8 border-[#46A302]"
                            animate={state.mood === 'idle' ? { y: [0, -3, 0] } : {}}
                            transition={{ repeat: Infinity, duration: 2 }}
                        >
                            <span className={blinking ? 'opacity-0' : ''}>
                                {moodEmojis[state.mood]}
                            </span>
                        </motion.div>

                        {/* Lab Coat Detail */}
                        <div className="absolute -top-2 left-10 w-6 h-6 bg-white/30 rounded-full border-2 border-white/40" />

                        {/* Message Bubble */}
                        <div className="ml-12 mt-4">
                            <div className="text-[9px] font-black uppercase tracking-widest text-white/50 mb-2">
                                Professor Bright
                            </div>
                            <motion.p
                                key={state.message}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-sm font-medium text-white leading-relaxed"
                            >
                                {state.message}
                            </motion.p>

                            {/* Hint Button */}
                            {state.mood === 'thinking' && onHintRequest && (
                                <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    onClick={onHintRequest}
                                    className="mt-4 px-4 py-2 rounded-xl bg-white/20 border-2 border-b-4 border-black/10 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/30 transition-all"
                                >
                                    💡 Give me a hint
                                </motion.button>
                            )}
                        </div>

                        {/* Decorative Bubbles */}
                        <motion.div
                            className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white/30"
                            animate={{ y: [0, -5, 0], opacity: [0.3, 0.6, 0.3] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        />
                        <motion.div
                            className="absolute top-6 right-6 w-1.5 h-1.5 rounded-full bg-white/20"
                            animate={{ y: [0, -4, 0], opacity: [0.2, 0.5, 0.2] }}
                            transition={{ repeat: Infinity, duration: 2, delay: 0.5 }}
                        />
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// ==========================================
// PROFESSOR HOOK - Manages Professor State
// ==========================================

interface UseProfessorOptions {
    initialMessage?: string;
    idleHintDelay?: number;
}

export function useProfessor(options: UseProfessorOptions = {}) {
    const { initialMessage = "Ready to begin the experiment!", idleHintDelay = 10000 } = options;

    const [professor, setProfessor] = useState<ProfessorState>({
        isVisible: true,
        mood: 'idle',
        message: initialMessage,
        position: 'bottom-right',
        animationVariant: 'float'
    });

    const [lastInteraction, setLastInteraction] = useState(Date.now());

    // Idle hint after delay
    useEffect(() => {
        const checkIdle = setInterval(() => {
            if (Date.now() - lastInteraction > idleHintDelay && professor.mood === 'idle') {
                setProfessor(prev => ({
                    ...prev,
                    mood: 'thinking',
                    message: "Need a hint? I'm here to help!",
                    animationVariant: 'bounce'
                }));
            }
        }, 2000);

        return () => clearInterval(checkIdle);
    }, [lastInteraction, idleHintDelay, professor.mood]);

    const showSuccess = useCallback((message: string) => {
        setLastInteraction(Date.now());
        setProfessor({
            isVisible: true,
            mood: 'celebrating',
            message,
            position: 'bottom-right',
            animationVariant: 'bounce'
        });
    }, []);

    const showWarning = useCallback((message: string) => {
        setLastInteraction(Date.now());
        setProfessor({
            isVisible: true,
            mood: 'shocked',
            message,
            position: 'center',
            animationVariant: 'shake'
        });
    }, []);

    const showHint = useCallback((message: string) => {
        setLastInteraction(Date.now());
        setProfessor({
            isVisible: true,
            mood: 'hint',
            message,
            position: 'bottom-right',
            animationVariant: 'bounce'
        });
    }, []);

    const showThinking = useCallback((message: string) => {
        setLastInteraction(Date.now());
        setProfessor({
            isVisible: true,
            mood: 'thinking',
            message,
            position: 'bottom-right',
            animationVariant: 'float'
        });
    }, []);

    const resetToIdle = useCallback((message?: string) => {
        setLastInteraction(Date.now());
        setProfessor({
            isVisible: true,
            mood: 'idle',
            message: message || "What's next?",
            position: 'bottom-right',
            animationVariant: 'float'
        });
    }, []);

    const hide = useCallback(() => {
        setProfessor(prev => ({ ...prev, isVisible: false }));
    }, []);

    const recordInteraction = useCallback(() => {
        setLastInteraction(Date.now());
    }, []);

    return {
        professor,
        showSuccess,
        showWarning,
        showHint,
        showThinking,
        resetToIdle,
        hide,
        recordInteraction
    };
}
