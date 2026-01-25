'use client';

/**
 * BrightEd Cinematic UI — SceneRenderer Component
 * Full-screen scene composition with background, characters, and dialogue overlay.
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Scene,
    SceneState,
    SceneAmbience,
    BACKGROUND_ASSETS,
    AMBIENCE_STYLES,
    DEFAULT_TRANSITIONS
} from '@/lib/cinematic/scene-types';
import { DialogueNode, DialogueChoice, CharacterEmotion } from '@/lib/cinematic/character-types';
import { CharacterSprite } from './CharacterSprite';
import { CharacterDialogue } from './CharacterDialogue';

interface SceneRendererProps {
    scene: Scene;
    onSceneComplete?: (decisions: Record<string, string>) => void;
    onDecision?: (nodeId: string, choice: DialogueChoice) => void;
    className?: string;
}

export function SceneRenderer({
    scene,
    onSceneComplete,
    onDecision,
    className = '',
}: SceneRendererProps) {
    const [state, setState] = useState<SceneState>({
        sceneId: scene.id,
        isActive: true,
        currentNodeId: scene.startNodeId,
        visitedNodes: [scene.startNodeId],
        characterStates: {},
        startedAt: Date.now(),
    });

    const [decisions, setDecisions] = useState<Record<string, string>>({});
    const [isExiting, setIsExiting] = useState(false);

    // Get current dialogue node
    const currentNode = scene.dialogue.find(n => n.id === state.currentNodeId);

    // Initialize character states from scene config
    useEffect(() => {
        const initialStates: SceneState['characterStates'] = {};
        scene.characters.forEach(char => {
            initialStates[char.characterId] = {
                emotion: char.initialEmotion,
                position: char.initialPosition,
                isSpeaking: false,
            };
        });
        setState(prev => ({ ...prev, characterStates: initialStates }));
    }, [scene]);

    // Update speaking character when node changes
    useEffect(() => {
        if (!currentNode) return;

        setState(prev => {
            const newStates = { ...prev.characterStates };

            // Stop all from speaking first
            Object.keys(newStates).forEach(id => {
                newStates[id] = { ...newStates[id], isSpeaking: false };
            });

            // Set current speaker
            if (currentNode.characterId && newStates[currentNode.characterId]) {
                newStates[currentNode.characterId] = {
                    ...newStates[currentNode.characterId],
                    isSpeaking: true,
                    emotion: currentNode.emotion || newStates[currentNode.characterId].emotion,
                };
            }

            return { ...prev, characterStates: newStates };
        });
    }, [currentNode]);

    const completeScene = useCallback((finalDecisions: Record<string, string>) => {
        setIsExiting(true);
        setTimeout(() => {
            onSceneComplete?.(finalDecisions);
        }, DEFAULT_TRANSITIONS.exit.duration);
    }, [onSceneComplete]);

    // Handle choice selection
    const handleChoiceSelect = useCallback((choice: DialogueChoice) => {
        if (!currentNode) return;

        const newDecisions = { ...decisions, [currentNode.id]: choice.id };
        setDecisions(newDecisions);

        onDecision?.(currentNode.id, choice);

        // Navigate to next node
        const nextNodeId = choice.nextNodeId || currentNode.nextNodeId;
        if (nextNodeId) {
            setState(prev => ({
                ...prev,
                currentNodeId: nextNodeId,
                visitedNodes: [...prev.visitedNodes, nextNodeId],
            }));
        } else {
            // Scene complete
            completeScene(newDecisions);
        }
    }, [currentNode, decisions, onDecision, completeScene]);

    // Handle dialogue completion (no choices, auto-advance)
    const handleDialogueComplete = useCallback(() => {
        if (!currentNode) return;

        const nextNodeId = currentNode.nextNodeId;
        if (nextNodeId) {
            setState(prev => ({
                ...prev,
                currentNodeId: nextNodeId,
                visitedNodes: [...prev.visitedNodes, nextNodeId],
            }));
        } else {
            // Scene complete
            completeScene(decisions);
        }
    }, [currentNode, decisions, completeScene]);

    // Get background style
    const bgAsset = BACKGROUND_ASSETS[scene.background];
    const ambienceStyle = AMBIENCE_STYLES[scene.ambience];

    return (
        <AnimatePresence mode="wait">
            <motion.div
                key={scene.id}
                className={`fixed inset-0 z-50 flex flex-col ${className}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: DEFAULT_TRANSITIONS.enter.duration / 1000 }}
            >
                {/* Background Layer */}
                <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{
                        backgroundColor: bgAsset.fallbackColor,
                        // backgroundImage: `url(${bgAsset.dark})` // TODO: theme-aware
                    }}
                >
                    {/* Gradient overlay for depth */}
                    <div
                        className="absolute inset-0"
                        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0.5) 100%)' }}
                    />
                </div>

                {/* Ambience Overlay */}
                <motion.div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: ambienceStyle.overlayGradient }}
                    animate={ambienceStyle.pulseSpeed ? {
                        opacity: [0.5, 0.7, 0.5],
                    } : undefined}
                    transition={ambienceStyle.pulseSpeed ? {
                        repeat: Infinity,
                        duration: ambienceStyle.pulseSpeed / 1000,
                    } : undefined}
                />

                {/* Vignette Effect */}
                {ambienceStyle.vignetteIntensity > 0 && (
                    <div
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            background: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,${ambienceStyle.vignetteIntensity}) 100%)`,
                        }}
                    />
                )}

                {/* Screen Effect */}
                {scene.screenEffect === 'blur-edges' && (
                    <div className="absolute inset-0 pointer-events-none" style={{
                        backdropFilter: 'blur(2px)',
                        WebkitBackdropFilter: 'blur(2px)',
                        maskImage: 'radial-gradient(ellipse at center, transparent 60%, black 100%)',
                        WebkitMaskImage: 'radial-gradient(ellipse at center, transparent 60%, black 100%)',
                    }} />
                )}

                {/* Character Layer */}
                <div className="flex-1 relative">
                    {/* Characters positioned across the scene */}
                    <div className="absolute bottom-32 left-0 right-0 flex justify-between items-end px-12">
                        {scene.characters.map((char, idx) => {
                            const charState = state.characterStates[char.characterId];
                            if (!charState || charState.position === 'offscreen') return null;

                            return (
                                <motion.div
                                    key={char.characterId}
                                    className={`${charState.position === 'left' ? 'mr-auto' :
                                            charState.position === 'right' ? 'ml-auto' :
                                                'mx-auto'
                                        }`}
                                    initial={{
                                        opacity: 0,
                                        y: 50,
                                        x: charState.position === 'left' ? -100 : charState.position === 'right' ? 100 : 0
                                    }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                        x: 0
                                    }}
                                    transition={{
                                        delay: (char.entranceDelay || 0) / 1000,
                                        duration: 0.6,
                                        type: 'spring',
                                        stiffness: 100,
                                    }}
                                >
                                    <CharacterSprite
                                        characterId={char.characterId}
                                        position={charState.position}
                                        emotion={charState.emotion}
                                        isSpeaking={charState.isSpeaking}
                                        size="xl"
                                        showName={true}
                                    />
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

                {/* Dialogue Layer */}
                <div className="relative z-10 p-6 pb-12">
                    <AnimatePresence mode="wait">
                        {currentNode && (
                            <CharacterDialogue
                                key={currentNode.id}
                                node={currentNode}
                                onChoiceSelect={handleChoiceSelect}
                                onComplete={handleDialogueComplete}
                                autoAdvance={!currentNode.choices || currentNode.choices.length === 0}
                            />
                        )}
                    </AnimatePresence>
                </div>

                {/* Skip Scene Button (if allowed) */}
                {scene.canSkip && (
                    <button
                        className="absolute top-6 right-6 px-4 py-2 rounded-lg bg-black/30 text-white/70 text-sm hover:bg-black/50 transition-colors"
                        onClick={() => completeScene(decisions)}
                    >
                        Skip Scene
                    </button>
                )}

                {/* Scene Title Overlay (brief flash) */}
                <SceneTitleOverlay name={scene.name} />
            </motion.div>
        </AnimatePresence>
    );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function SceneTitleOverlay({ name }: { name: string }) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setVisible(false), 2000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <motion.h2
                        className="text-4xl md:text-6xl font-black text-white/90 text-center tracking-tight"
                        style={{ textShadow: '0 4px 20px rgba(0,0,0,0.5)' }}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        {name}
                    </motion.h2>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

export default SceneRenderer;
