'use client';

/**
 * BrightEd Cinematic UI — StatReactor Component
 * Wraps stat cards to add reactive animations based on value thresholds.
 */

import { useState, useEffect, useRef, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CharacterSprite } from './CharacterSprite';
import { getCharacterForContext } from '@/lib/cinematic/character-registry';

type StatStatus = 'normal' | 'warning' | 'critical' | 'excellent';

interface StatReactorProps {
    value: number;
    previousValue?: number;
    warningThreshold?: number;   // Below this = warning
    criticalThreshold?: number;  // Below this = critical  
    excellentThreshold?: number; // Above this = excellent (optional)
    animateChanges?: boolean;
    showCharacterWarning?: boolean;
    warningContext?: 'loan_warning' | 'tax_deadline' | 'low_cash';
    children: ReactNode;
    className?: string;
}

export function StatReactor({
    value,
    previousValue,
    warningThreshold = 1000,
    criticalThreshold = 500,
    excellentThreshold,
    animateChanges = true,
    showCharacterWarning = false,
    warningContext = 'low_cash',
    children,
    className = '',
}: StatReactorProps) {
    const [displayValue, setDisplayValue] = useState(value);
    const [status, setStatus] = useState<StatStatus>('normal');
    const [showCharacter, setShowCharacter] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    const prevValueRef = useRef(previousValue ?? value);

    // Determine status based on value
    useEffect(() => {
        let newStatus: StatStatus = 'normal';
        if (value <= criticalThreshold) {
            newStatus = 'critical';
        } else if (value <= warningThreshold) {
            newStatus = 'warning';
        } else if (excellentThreshold && value >= excellentThreshold) {
            newStatus = 'excellent';
        }
        setStatus(newStatus);

        // Show character warning on status change to critical/warning
        if (showCharacterWarning && (newStatus === 'critical' || newStatus === 'warning')) {
            setShowCharacter(true);
            setTimeout(() => setShowCharacter(false), 4000);
        }
    }, [value, warningThreshold, criticalThreshold, excellentThreshold, showCharacterWarning]);

    // Animate value changes
    useEffect(() => {
        if (!animateChanges) {
            setDisplayValue(value);
            return;
        }

        const prevVal = prevValueRef.current;
        if (prevVal === value) return;

        setIsAnimating(true);
        const diff = value - prevVal;
        const steps = 20;
        const stepValue = diff / steps;
        let current = prevVal;
        let step = 0;

        const interval = setInterval(() => {
            step++;
            current += stepValue;
            setDisplayValue(Math.round(current));

            if (step >= steps) {
                clearInterval(interval);
                setDisplayValue(value);
                setIsAnimating(false);
                prevValueRef.current = value;
            }
        }, 30);

        return () => clearInterval(interval);
    }, [value, animateChanges]);

    // Status-based classes
    const statusClasses: Record<StatStatus, string> = {
        normal: '',
        warning: 'stat-warning',
        critical: 'stat-critical',
        excellent: 'ring-2 ring-[var(--state-success)]',
    };

    return (
        <div className={`relative ${className}`}>
            {/* Main stat wrapper with status styling */}
            <motion.div
                className={`${statusClasses[status]} ${isAnimating ? 'stat-counting' : ''}`}
                animate={status === 'critical' ? { scale: [1, 1.02, 1] } : {}}
                transition={status === 'critical' ? { repeat: Infinity, duration: 1.5 } : {}}
            >
                {children}
            </motion.div>

            {/* Character peek-in warning */}
            <AnimatePresence>
                {showCharacter && (
                    <motion.div
                        className="absolute -right-2 -top-2 z-20"
                        initial={{ scale: 0, rotate: -20 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: 20 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                    >
                        <CharacterSprite
                            characterId={getCharacterForContext(warningContext)}
                            emotion={status === 'critical' ? 'urgent' : 'concerned'}
                            size="sm"
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Value change indicator */}
            <AnimatePresence>
                {isAnimating && previousValue !== undefined && (
                    <motion.div
                        className={`absolute -top-3 right-2 text-xs font-bold ${value > previousValue ? 'text-[var(--state-success)]' : 'text-[var(--state-error)]'
                            }`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        {value > previousValue ? '+' : ''}{value - previousValue}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default StatReactor;
