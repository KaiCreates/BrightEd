'use client';

/**
 * BrightEd Cinematic UI — CharacterDialogue Component
 * Renders character dialogue with typewriter effect, choice buttons, and emotion indicators.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DialogueNode,
    DialogueChoice,
    CharacterEmotion
} from '@/lib/cinematic/character-types';
import { getCharacter } from '@/lib/cinematic/character-registry';
import { CharacterSprite } from './CharacterSprite';
import { BrightButton, BrightLayer } from '@/components/system';

interface CharacterDialogueProps {
    node: DialogueNode;
    onChoiceSelect?: (choice: DialogueChoice) => void;
    onComplete?: () => void;
    autoAdvance?: boolean;
    typewriterSpeed?: number; // ms per character
    className?: string;
}

export function CharacterDialogue({
    node,
    onChoiceSelect,
    onComplete,
    autoAdvance = false,
    typewriterSpeed = 30,
    className = '',
}: CharacterDialogueProps) {
    const [displayedText, setDisplayedText] = useState('');
    const [isTyping, setIsTyping] = useState(true);
    const [showChoices, setShowChoices] = useState(false);

    const character = getCharacter(node.characterId);
    const fullText = node.text;

    // Typewriter effect
    useEffect(() => {
        setDisplayedText('');
        setIsTyping(true);
        setShowChoices(false);

        let currentIndex = 0;
        const interval = setInterval(() => {
            if (currentIndex < fullText.length) {
                setDisplayedText(fullText.slice(0, currentIndex + 1));
                currentIndex++;
            } else {
                clearInterval(interval);
                setIsTyping(false);

                // Show choices after typing completes
                if (node.choices && node.choices.length > 0) {
                    setTimeout(() => setShowChoices(true), 300);
                } else if (autoAdvance && node.delay) {
                    // Auto-advance after delay
                    setTimeout(() => onComplete?.(), node.delay);
                }
            }
        }, typewriterSpeed);

        return () => clearInterval(interval);
    }, [node.id, fullText, typewriterSpeed, autoAdvance, node.delay, node.choices, onComplete]);

    // Skip typewriter on click
    const handleSkip = useCallback(() => {
        if (isTyping) {
            setDisplayedText(fullText);
            setIsTyping(false);
            if (node.choices && node.choices.length > 0) {
                setTimeout(() => setShowChoices(true), 100);
            }
        } else if (!node.choices || node.choices.length === 0) {
            // No choices, advance to next
            onComplete?.();
        }
    }, [isTyping, fullText, node.choices, onComplete]);

    const handleChoiceClick = (choice: DialogueChoice) => {
        if (choice.disabled) return;
        onChoiceSelect?.(choice);
    };

    return (
        <motion.div
            className={`w-full max-w-2xl mx-auto ${className}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4 }}
        >
            <BrightLayer
                variant="glass"
                padding="lg"
                className="relative overflow-hidden cursor-pointer"
                onClick={handleSkip}
            >
                {/* Accent border based on character */}
                <div
                    className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-lg"
                    style={{ backgroundColor: character.colorAccent }}
                />

                {/* Character Header */}
                <div className="flex items-start gap-4 mb-4">
                    <CharacterSprite
                        characterId={node.characterId}
                        emotion={node.emotion || 'neutral'}
                        isSpeaking={isTyping}
                        size="md"
                        showName={false}
                    />

                    <div className="flex-1 min-w-0">
                        {/* Character Name & Role */}
                        <div className="flex items-center gap-2 mb-1">
                            <span
                                className="text-sm font-bold"
                                style={{ color: character.colorAccent }}
                            >
                                {character.name}
                            </span>
                            {node.emotion && node.emotion !== 'neutral' && (
                                <EmotionBadge emotion={node.emotion} />
                            )}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                            {character.role.replace('_', ' ')}
                        </span>
                    </div>

                    {/* Skip indicator */}
                    {isTyping && (
                        <motion.div
                            className="text-xs text-[var(--text-muted)] opacity-50"
                            animate={{ opacity: [0.3, 0.7, 0.3] }}
                            transition={{ repeat: Infinity, duration: 1.5 }}
                        >
                            Click to skip
                        </motion.div>
                    )}
                </div>

                {/* Dialogue Text */}
                <div className="relative min-h-[60px] pl-2">
                    <p className="text-lg leading-relaxed text-[var(--text-primary)]">
                        &ldquo;{displayedText}
                        {isTyping && (
                            <motion.span
                                className="inline-block w-0.5 h-5 ml-0.5 bg-current"
                                animate={{ opacity: [1, 0] }}
                                transition={{ repeat: Infinity, duration: 0.5 }}
                            />
                        )}
                        {!isTyping && '&rdquo;'}
                    </p>
                </div>

                {/* Continue indicator (when no choices) */}
                {!isTyping && (!node.choices || node.choices.length === 0) && (
                    <motion.div
                        className="flex items-center justify-end gap-2 mt-4 text-sm text-[var(--brand-primary)]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <span className="font-medium">Continue</span>
                        <motion.span
                            animate={{ x: [0, 5, 0] }}
                            transition={{ repeat: Infinity, duration: 1 }}
                        >
                            →
                        </motion.span>
                    </motion.div>
                )}
            </BrightLayer>

            {/* Choice Buttons */}
            <AnimatePresence>
                {showChoices && node.choices && node.choices.length > 0 && (
                    <motion.div
                        className="mt-4 space-y-2"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ staggerChildren: 0.1 }}
                    >
                        {node.choices.map((choice, index) => (
                            <ChoiceButton
                                key={choice.id}
                                choice={choice}
                                index={index}
                                onClick={() => handleChoiceClick(choice)}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function EmotionBadge({ emotion }: { emotion: CharacterEmotion }) {
    const emotionConfig: Record<CharacterEmotion, { label: string; color: string }> = {
        neutral: { label: '', color: '' },
        happy: { label: 'pleased', color: 'var(--state-success)' },
        concerned: { label: 'concerned', color: 'var(--state-warning)' },
        urgent: { label: 'urgent', color: 'var(--state-error)' },
        disappointed: { label: 'disappointed', color: 'var(--state-error)' },
        impressed: { label: 'impressed', color: 'var(--brand-accent)' },
        suspicious: { label: 'suspicious', color: 'var(--state-warning)' },
    };

    const config = emotionConfig[emotion];
    if (!config.label) return null;

    return (
        <span
            className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full"
            style={{
                backgroundColor: `color-mix(in srgb, ${config.color} 20%, transparent)`,
                color: config.color,
            }}
        >
            {config.label}
        </span>
    );
}

interface ChoiceButtonProps {
    choice: DialogueChoice;
    index: number;
    onClick: () => void;
}

function ChoiceButton({ choice, index, onClick }: ChoiceButtonProps) {
    const toneStyles: Record<DialogueChoice['tone'], string> = {
        polite: 'border-[var(--state-success)]/30 hover:border-[var(--state-success)] hover:bg-[var(--state-success)]/5',
        neutral: 'border-[var(--border-subtle)] hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5',
        aggressive: 'border-[var(--state-error)]/30 hover:border-[var(--state-error)] hover:bg-[var(--state-error)]/5',
    };

    return (
        <motion.button
            className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all ${toneStyles[choice.tone]} ${choice.disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
            onClick={onClick}
            disabled={choice.disabled}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={!choice.disabled ? { scale: 1.01 } : undefined}
            whileTap={!choice.disabled ? { scale: 0.99 } : undefined}
        >
            <div className="flex items-center gap-3">
                {/* Choice indicator */}
                <span className="w-6 h-6 rounded-full bg-[var(--bg-elevated)] flex items-center justify-center text-xs font-bold text-[var(--text-muted)]">
                    {index + 1}
                </span>

                <div className="flex-1">
                    <p className="font-medium text-[var(--text-primary)]">{choice.text}</p>
                    {choice.disabled && choice.disabledReason && (
                        <p className="text-xs text-[var(--state-error)] mt-1">{choice.disabledReason}</p>
                    )}
                </div>

                {/* Tone indicator */}
                {choice.tone !== 'neutral' && (
                    <span className="text-xs opacity-50">
                        {choice.tone === 'polite' ? '🤝' : '⚡'}
                    </span>
                )}
            </div>
        </motion.button>
    );
}

export default CharacterDialogue;
