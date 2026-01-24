'use client';

/**
 * BrightEd Cinematic UI — CharacterSprite Component
 * Renders an animated character with emotion states and entrance/exit animations.
 */

import { motion, AnimatePresence, Variants } from 'framer-motion';
import {
    Character,
    CharacterEmotion,
    CharacterPosition,
    CharacterAnimation,
    POSITION_COORDS,
    ANIMATION_DURATIONS,
    EMOTION_VISUALS
} from '@/lib/cinematic/character-types';
import { getCharacter } from '@/lib/cinematic/character-registry';

interface CharacterSpriteProps {
    characterId: string;
    position?: CharacterPosition;
    emotion?: CharacterEmotion;
    animation?: CharacterAnimation;
    isSpeaking?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showName?: boolean;
    className?: string;
}

const SIZE_CLASSES = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
};

const spriteVariants: Variants = {
    hidden: {
        opacity: 0,
        scale: 0.8,
        y: 20
    },
    visible: {
        opacity: 1,
        scale: 1,
        y: 0,
        transition: {
            type: 'spring',
            stiffness: 200,
            damping: 20
        }
    },
    exit: {
        opacity: 0,
        scale: 0.9,
        y: -10,
        transition: {
            duration: 0.3
        }
    },
    speaking: {
        scale: [1, 1.02, 1],
        transition: {
            repeat: Infinity,
            duration: 0.8,
        }
    },
    gesture: {
        rotate: [0, -5, 5, -3, 3, 0],
        transition: {
            duration: 0.8,
        }
    },
    celebrate: {
        y: [0, -15, 0],
        rotate: [0, -5, 5, 0],
        scale: [1, 1.1, 1],
        transition: {
            duration: 0.6,
            repeat: 2,
        }
    },
    thinking: {
        y: [0, -5, 0],
        transition: {
            repeat: Infinity,
            duration: 2,
            ease: 'easeInOut',
        }
    },
};

const emotionGlowVariants: Variants = {
    neutral: { boxShadow: 'none' },
    happy: {
        boxShadow: '0 0 20px 5px var(--state-success)',
        transition: { duration: 0.3 }
    },
    concerned: {
        boxShadow: '0 0 15px 3px var(--state-warning)',
        transition: { duration: 0.3 }
    },
    urgent: {
        boxShadow: [
            '0 0 10px 2px var(--state-error)',
            '0 0 25px 8px var(--state-error)',
            '0 0 10px 2px var(--state-error)',
        ],
        transition: { repeat: Infinity, duration: 1.5 }
    },
    disappointed: { boxShadow: 'none' },
    impressed: {
        boxShadow: '0 0 20px 5px var(--brand-accent)',
        transition: { duration: 0.3 }
    },
    suspicious: { boxShadow: 'none' },
};

export function CharacterSprite({
    characterId,
    position = 'center',
    emotion = 'neutral',
    animation = 'idle',
    isSpeaking = false,
    size = 'lg',
    showName = false,
    className = '',
}: CharacterSpriteProps) {
    const character = getCharacter(characterId);
    const positionStyle = POSITION_COORDS[position];
    const emotionVisual = EMOTION_VISUALS[emotion];

    // Determine which animation to play
    const getAnimationState = () => {
        if (animation === 'celebrate') return 'celebrate';
        if (animation === 'thinking') return 'thinking';
        if (animation === 'gesture') return 'gesture';
        if (isSpeaking) return 'speaking';
        return 'visible';
    };

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={`${characterId}-${position}`}
                className={`relative flex flex-col items-center ${className}`}
                initial="hidden"
                animate={getAnimationState()}
                exit="exit"
                variants={spriteVariants}
                style={{
                    transform: position !== 'offscreen' ? undefined : 'translateX(-100%)',
                }}
            >
                {/* Character Avatar Container */}
                <motion.div
                    className={`relative ${SIZE_CLASSES[size]} rounded-full overflow-hidden border-4 border-white/20`}
                    style={{
                        borderColor: character.colorAccent,
                        backgroundColor: 'var(--bg-elevated)',
                    }}
                    variants={emotionGlowVariants}
                    animate={emotion}
                >
                    {/* Character Image or Emoji Fallback */}
                    <div className="w-full h-full flex items-center justify-center text-4xl bg-gradient-to-br from-white/10 to-transparent">
                        {/* TODO: Replace with actual character images when generated */}
                        <span
                            className="select-none"
                            style={{
                                fontSize: size === 'xl' ? '4rem' : size === 'lg' ? '3rem' : size === 'md' ? '2rem' : '1.5rem'
                            }}
                        >
                            {character.emoji}
                        </span>
                    </div>

                    {/* Emotion Indicator Overlay */}
                    {emotion !== 'neutral' && emotionVisual.glowColor && (
                        <motion.div
                            className="absolute inset-0 rounded-full pointer-events-none"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.2 }}
                            style={{ backgroundColor: emotionVisual.glowColor }}
                        />
                    )}

                    {/* Speaking Indicator */}
                    {isSpeaking && (
                        <motion.div
                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white"
                            animate={{
                                scale: [1, 1.2, 1],
                                opacity: [1, 0.7, 1],
                            }}
                            transition={{
                                repeat: Infinity,
                                duration: 0.5,
                            }}
                        />
                    )}
                </motion.div>

                {/* Character Name */}
                {showName && (
                    <motion.div
                        className="mt-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider"
                        style={{
                            backgroundColor: `color-mix(in srgb, ${character.colorAccent} 20%, transparent)`,
                            color: character.colorAccent,
                        }}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        {character.name}
                    </motion.div>
                )}

                {/* Emotion Badge (for non-neutral emotions) */}
                {emotion !== 'neutral' && (
                    <motion.div
                        className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs"
                        style={{ backgroundColor: emotionVisual.glowColor || 'var(--bg-elevated)' }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', stiffness: 400 }}
                    >
                        {emotion === 'happy' && '😊'}
                        {emotion === 'concerned' && '😟'}
                        {emotion === 'urgent' && '⚠️'}
                        {emotion === 'disappointed' && '😔'}
                        {emotion === 'impressed' && '🌟'}
                        {emotion === 'suspicious' && '🤨'}
                    </motion.div>
                )}
            </motion.div>
        </AnimatePresence>
    );
}

export default CharacterSprite;
