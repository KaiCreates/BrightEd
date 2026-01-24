'use client';

/**
 * BrightEd Cinematic UI — CinematicProvider
 * Context provider for managing active scenes, character interruptions, and cinematic state.
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Scene, SceneHistoryEntry } from '@/lib/cinematic/scene-types';
import { DialogueChoice } from '@/lib/cinematic/character-types';
import { SceneRenderer } from './SceneRenderer';

// ============================================================================
// TYPES
// ============================================================================

interface CinematicContextValue {
    // Scene controls
    playScene: (scene: Scene) => void;
    endScene: () => void;
    isSceneActive: boolean;
    activeScene: Scene | null;

    // Character interrupts (quick messages that don't need full scenes)
    showInterrupt: (characterId: string, message: string, emotion?: string) => void;
    hideInterrupt: () => void;
    interrupt: CharacterInterrupt | null;

    // History
    sceneHistory: SceneHistoryEntry[];

    // Attention director
    focusElement: (selector: string) => void;
    clearFocus: () => void;
    focusedElement: string | null;
}

interface CharacterInterrupt {
    characterId: string;
    message: string;
    emotion?: string;
}

const CinematicContext = createContext<CinematicContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface CinematicProviderProps {
    children: ReactNode;
    onSceneComplete?: (sceneId: string, decisions: Record<string, string>) => void;
    onDecision?: (sceneId: string, nodeId: string, choice: DialogueChoice) => void;
}

export function CinematicProvider({
    children,
    onSceneComplete,
    onDecision,
}: CinematicProviderProps) {
    const [activeScene, setActiveScene] = useState<Scene | null>(null);
    const [sceneHistory, setSceneHistory] = useState<SceneHistoryEntry[]>([]);
    const [interrupt, setInterrupt] = useState<CharacterInterrupt | null>(null);
    const [focusedElement, setFocusedElement] = useState<string | null>(null);
    const [sceneStartTime, setSceneStartTime] = useState<number>(0);

    // Play a scene
    const playScene = useCallback((scene: Scene) => {
        setActiveScene(scene);
        setSceneStartTime(Date.now());
    }, []);

    // End current scene
    const endScene = useCallback(() => {
        setActiveScene(null);
    }, []);

    // Handle scene completion
    const handleSceneComplete = useCallback((decisions: Record<string, string>) => {
        if (!activeScene) return;

        const entry: SceneHistoryEntry = {
            sceneId: activeScene.id,
            completedAt: new Date().toISOString(),
            decisions,
            duration: Date.now() - sceneStartTime,
        };

        setSceneHistory(prev => [...prev, entry]);
        onSceneComplete?.(activeScene.id, decisions);
        setActiveScene(null);
    }, [activeScene, sceneStartTime, onSceneComplete]);

    // Handle individual decisions
    const handleDecision = useCallback((nodeId: string, choice: DialogueChoice) => {
        if (!activeScene) return;
        onDecision?.(activeScene.id, nodeId, choice);
    }, [activeScene, onDecision]);

    // Show character interrupt (quick pop-in message)
    const showInterrupt = useCallback((characterId: string, message: string, emotion?: string) => {
        setInterrupt({ characterId, message, emotion });

        // Auto-hide after 5 seconds
        setTimeout(() => {
            setInterrupt(null);
        }, 5000);
    }, []);

    const hideInterrupt = useCallback(() => {
        setInterrupt(null);
    }, []);

    // Attention focus
    const focusElement = useCallback((selector: string) => {
        setFocusedElement(selector);

        // Apply focus effect to DOM element
        const el = document.querySelector(selector);
        if (el) {
            el.classList.add('cinematic-focus');
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, []);

    const clearFocus = useCallback(() => {
        if (focusedElement) {
            const el = document.querySelector(focusedElement);
            if (el) {
                el.classList.remove('cinematic-focus');
            }
        }
        setFocusedElement(null);
    }, [focusedElement]);

    const value: CinematicContextValue = {
        playScene,
        endScene,
        isSceneActive: activeScene !== null,
        activeScene,
        showInterrupt,
        hideInterrupt,
        interrupt,
        sceneHistory,
        focusElement,
        clearFocus,
        focusedElement,
    };

    return (
        <CinematicContext.Provider value={value}>
            {children}

            {/* Scene Overlay */}
            {activeScene && (
                <SceneRenderer
                    scene={activeScene}
                    onSceneComplete={handleSceneComplete}
                    onDecision={handleDecision}
                />
            )}

            {/* Interrupt Overlay */}
            {interrupt && <InterruptOverlay interrupt={interrupt} onDismiss={hideInterrupt} />}

            {/* Focus Dimming Overlay */}
            {focusedElement && <FocusDimmer />}
        </CinematicContext.Provider>
    );
}

// ============================================================================
// HOOK
// ============================================================================

export function useCinematic() {
    const context = useContext(CinematicContext);
    if (!context) {
        throw new Error('useCinematic must be used within a CinematicProvider');
    }
    return context;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

import { motion, AnimatePresence } from 'framer-motion';
import { CharacterSprite } from './CharacterSprite';
import { getCharacter } from '@/lib/cinematic/character-registry';
import { BrightLayer } from '@/components/system';
import { CharacterEmotion } from '@/lib/cinematic';

function InterruptOverlay({
    interrupt,
    onDismiss
}: {
    interrupt: CharacterInterrupt;
    onDismiss: () => void;
}) {
    const character = getCharacter(interrupt.characterId);

    return (
        <motion.div
            className="fixed bottom-6 right-6 z-[60] max-w-md cursor-pointer"
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={onDismiss}
        >
            <BrightLayer
                variant="glass"
                padding="md"
                className="border-l-4 shadow-2xl"
                style={{ borderLeftColor: character.colorAccent } as React.CSSProperties}
            >
                <div className="flex gap-3 items-start">
                    <CharacterSprite
                        characterId={interrupt.characterId}
                        emotion={(interrupt.emotion as CharacterEmotion) || 'neutral'}
                        size="sm"
                    />
                    <div className="flex-1">
                        <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: character.colorAccent }}>
                            {character.name}
                        </p>
                        <p className="text-sm text-[var(--text-primary)]">
                            &ldquo;{interrupt.message}&rdquo;
                        </p>
                    </div>
                    <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] text-lg">
                        ×
                    </button>
                </div>
            </BrightLayer>
        </motion.div>
    );
}

function FocusDimmer() {
    return (
        <motion.div
            className="fixed inset-0 z-40 bg-black/50 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            style={{
                // The focused element is excluded via CSS in globals.css
                maskImage: 'var(--focus-mask, none)',
                WebkitMaskImage: 'var(--focus-mask, none)',
            }}
        />
    );
}

export default CinematicProvider;
