'use client';

/**
 * BrightEd Cinematic UI — DashboardAmbience Component
 * Animated background layer that reflects business health state.
 */

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

type AmbienceState = 'calm' | 'neutral' | 'stressed' | 'critical' | 'prosperous';

interface DashboardAmbienceProps {
    cashBalance?: number;
    profitMargin?: number;
    riskLevel?: number;
    className?: string;
}

const AMBIENCE_CONFIGS: Record<AmbienceState, {
    gradient: string;
    particleColor: string;
    particleCount: number;
    pulseSpeed: number;
}> = {
    calm: {
        gradient: 'radial-gradient(ellipse at 30% 20%, rgba(45, 212, 191, 0.05) 0%, transparent 50%)',
        particleColor: 'rgba(45, 212, 191, 0.3)',
        particleCount: 3,
        pulseSpeed: 8,
    },
    neutral: {
        gradient: 'radial-gradient(ellipse at 50% 50%, rgba(99, 102, 241, 0.03) 0%, transparent 50%)',
        particleColor: 'rgba(99, 102, 241, 0.2)',
        particleCount: 2,
        pulseSpeed: 10,
    },
    stressed: {
        gradient: 'radial-gradient(ellipse at 70% 80%, rgba(245, 158, 11, 0.08) 0%, transparent 50%)',
        particleColor: 'rgba(245, 158, 11, 0.3)',
        particleCount: 5,
        pulseSpeed: 5,
    },
    critical: {
        gradient: 'radial-gradient(ellipse at 50% 50%, rgba(239, 68, 68, 0.1) 0%, transparent 60%)',
        particleColor: 'rgba(239, 68, 68, 0.4)',
        particleCount: 8,
        pulseSpeed: 2,
    },
    prosperous: {
        gradient: 'radial-gradient(ellipse at 30% 30%, rgba(16, 185, 129, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 70%, rgba(250, 204, 21, 0.05) 0%, transparent 50%)',
        particleColor: 'rgba(250, 204, 21, 0.4)',
        particleCount: 6,
        pulseSpeed: 6,
    },
};

export function DashboardAmbience({
    cashBalance = 10000,
    profitMargin = 0.2,
    riskLevel = 0.3,
    className = '',
}: DashboardAmbienceProps) {
    const [ambience, setAmbience] = useState<AmbienceState>('neutral');
    const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; delay: number }>>([]);

    // Determine ambience state from business metrics
    useEffect(() => {
        let state: AmbienceState = 'neutral';

        if (cashBalance < 500 || riskLevel > 0.8) {
            state = 'critical';
        } else if (cashBalance < 2000 || riskLevel > 0.5) {
            state = 'stressed';
        } else if (profitMargin > 0.3 && cashBalance > 10000) {
            state = 'prosperous';
        } else if (profitMargin > 0.15 && cashBalance > 5000) {
            state = 'calm';
        }

        setAmbience(state);
    }, [cashBalance, profitMargin, riskLevel]);

    // Generate floating particles
    useEffect(() => {
        const config = AMBIENCE_CONFIGS[ambience];
        const newParticles = Array.from({ length: config.particleCount }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: 100 + Math.random() * 200,
            delay: Math.random() * 5,
        }));
        setParticles(newParticles);
    }, [ambience]);

    const config = AMBIENCE_CONFIGS[ambience];

    return (
        <div className={`fixed inset-0 pointer-events-none overflow-hidden ${className}`} style={{ zIndex: 0 }}>
            {/* Base gradient overlay */}
            <motion.div
                className="absolute inset-0"
                style={{ background: config.gradient }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1 }}
                key={ambience}
            />

            {/* Floating particles */}
            {particles.map(particle => (
                <motion.div
                    key={particle.id}
                    className="absolute rounded-full blur-3xl"
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        width: particle.size,
                        height: particle.size,
                        backgroundColor: config.particleColor,
                    }}
                    animate={{
                        x: [0, 30, -20, 0],
                        y: [0, -20, 30, 0],
                        scale: [1, 1.2, 0.9, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{
                        duration: config.pulseSpeed + particle.delay,
                        repeat: Infinity,
                        ease: 'easeInOut',
                        delay: particle.delay,
                    }}
                />
            ))}

            {/* Subtle vignette for critical state */}
            {ambience === 'critical' && (
                <motion.div
                    className="absolute inset-0"
                    style={{
                        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(239, 68, 68, 0.15) 100%)',
                    }}
                    animate={{ opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity }}
                />
            )}

            {/* Success shimmer for prosperous state */}
            {ambience === 'prosperous' && (
                <motion.div
                    className="absolute top-0 left-0 w-full h-px"
                    style={{
                        background: 'linear-gradient(90deg, transparent, rgba(250, 204, 21, 0.5), transparent)',
                    }}
                    animate={{ x: ['-100%', '100%'] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
            )}
        </div>
    );
}

export default DashboardAmbience;
