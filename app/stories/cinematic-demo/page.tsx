'use client';

/**
 * BrightEd Cinematic UI — Demo Page
 * Test page for previewing the cinematic UI components and scenes.
 */

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
    CinematicProvider,
    useCinematic,
    CharacterSprite,
    CharacterDialogue,
    DashboardAmbience,
    StatReactor,
} from '@/components/cinematic';
import {
    DEMO_SCENES,
    getAllScenes,
    CHARACTERS,
    getAllCharacterIds,
    getCharacter,
} from '@/lib/cinematic';
import { BrightLayer, BrightButton, BrightHeading } from '@/components/system';
import { DialogueNode, CharacterEmotion } from '@/lib/cinematic/character-types';
import Link from 'next/link';

function DemoContent() {
    const { playScene, showInterrupt, isSceneActive } = useCinematic();
    const [selectedEmotion, setSelectedEmotion] = useState<CharacterEmotion>('neutral');
    const [cashBalance, setCashBalance] = useState(5000);
    const scenes = getAllScenes();
    const characterIds = getAllCharacterIds();

    // Sample dialogue node for testing
    const sampleDialogue: DialogueNode = {
        id: 'test_1',
        characterId: 'luka',
        text: 'Welcome to the Cinematic UI demo. This system brings characters to life, delivers information through scenes, and makes the dashboard feel alive.',
        emotion: selectedEmotion,
        choices: [
            { id: 'c1', text: 'This looks amazing!', tone: 'polite' },
            { id: 'c2', text: 'Tell me more about how it works.', tone: 'neutral' },
            { id: 'c3', text: 'Skip the theatrics.', tone: 'aggressive' },
        ],
    };

    const emotions: CharacterEmotion[] = ['neutral', 'happy', 'concerned', 'urgent', 'disappointed', 'impressed', 'suspicious'];

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] relative">
            {/* Ambient background based on cash balance */}
            <DashboardAmbience cashBalance={cashBalance} />

            {/* Header */}
            <nav className="sticky top-0 z-40 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-subtle)] px-6 py-4">
                <div className="max-w-6xl mx-auto flex justify-between items-center">
                    <div>
                        <BrightHeading level={3}>Cinematic UI Demo</BrightHeading>
                        <p className="text-sm text-[var(--text-muted)]">Test characters, scenes, and animations</p>
                    </div>
                    <Link href="/stories/business">
                        <BrightButton variant="outline" size="sm">← Back to Business</BrightButton>
                    </Link>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto px-6 py-12 space-y-16 relative z-10">

                {/* Section 1: Character Gallery */}
                <section>
                    <BrightHeading level={2} className="mb-6">Character Gallery</BrightHeading>
                    <p className="text-[var(--text-secondary)] mb-8">
                        All persistent characters with emotion control. Click to trigger an interrupt.
                    </p>

                    {/* Emotion selector */}
                    <div className="flex flex-wrap gap-2 mb-8">
                        {emotions.map(emotion => (
                            <button
                                key={emotion}
                                onClick={() => setSelectedEmotion(emotion)}
                                className={`px-3 py-1 rounded-full text-xs font-bold uppercase transition-all ${selectedEmotion === emotion
                                        ? 'bg-[var(--brand-primary)] text-white'
                                        : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                                    }`}
                            >
                                {emotion}
                            </button>
                        ))}
                    </div>

                    {/* Character grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
                        {characterIds.map(id => {
                            const char = getCharacter(id);
                            return (
                                <motion.div
                                    key={id}
                                    className="text-center cursor-pointer"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => showInterrupt(id, `Hello! I'm ${char.name}. ${char.description.slice(0, 60)}...`, selectedEmotion)}
                                >
                                    <CharacterSprite
                                        characterId={id}
                                        emotion={selectedEmotion}
                                        size="lg"
                                        showName={true}
                                    />
                                    <p className="mt-2 text-xs text-[var(--text-muted)]">{char.role.replace('_', ' ')}</p>
                                </motion.div>
                            );
                        })}
                    </div>
                </section>

                {/* Section 2: Scene Launcher */}
                <section>
                    <BrightHeading level={2} className="mb-6">Scene Launcher</BrightHeading>
                    <p className="text-[var(--text-secondary)] mb-8">
                        Click any scene to experience the full cinematic interaction.
                    </p>

                    <div className="grid md:grid-cols-2 gap-6">
                        {scenes.map(scene => (
                            <BrightLayer
                                key={scene.id}
                                variant="glass"
                                padding="lg"
                                className="cursor-pointer hover:border-[var(--brand-primary)]/50 transition-all"
                                onClick={() => playScene(scene)}
                            >
                                <div className="flex items-start gap-4">
                                    <div className="text-4xl">
                                        {scene.ambience === 'celebratory' ? '🎉' :
                                            scene.ambience === 'urgent' ? '⚠️' :
                                                scene.ambience === 'tense' ? '😰' : '📋'}
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-[var(--text-primary)]">{scene.name}</h3>
                                        <p className="text-sm text-[var(--text-secondary)] mb-2">{scene.description}</p>
                                        <div className="flex gap-2 flex-wrap">
                                            <span className="px-2 py-0.5 bg-[var(--bg-elevated)] rounded text-[10px] font-bold uppercase text-[var(--text-muted)]">
                                                {scene.background}
                                            </span>
                                            <span className="px-2 py-0.5 bg-[var(--bg-elevated)] rounded text-[10px] font-bold uppercase text-[var(--text-muted)]">
                                                {scene.ambience}
                                            </span>
                                            <span className="px-2 py-0.5 bg-[var(--bg-elevated)] rounded text-[10px] font-bold uppercase text-[var(--text-muted)]">
                                                {scene.dialogue.length} nodes
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </BrightLayer>
                        ))}
                    </div>
                </section>

                {/* Section 3: Dialogue Preview */}
                <section>
                    <BrightHeading level={2} className="mb-6">Dialogue Component</BrightHeading>
                    <p className="text-[var(--text-secondary)] mb-8">
                        Character dialogue with typewriter effect and choice buttons.
                    </p>

                    <CharacterDialogue
                        node={sampleDialogue}
                        onChoiceSelect={(choice) => {
                            showInterrupt('luka', `You chose: "${choice.text}"`, 'happy');
                        }}
                    />
                </section>

                {/* Section 4: Living Dashboard Stats */}
                <section>
                    <BrightHeading level={2} className="mb-6">Living Dashboard Stats</BrightHeading>
                    <p className="text-[var(--text-secondary)] mb-8">
                        Reactive stat cards that pulse and glow based on value thresholds.
                    </p>

                    {/* Cash balance slider */}
                    <div className="mb-8">
                        <label className="text-sm font-bold text-[var(--text-muted)] block mb-2">
                            Adjust Cash Balance: ฿{cashBalance.toLocaleString()}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="15000"
                            step="100"
                            value={cashBalance}
                            onChange={(e) => setCashBalance(Number(e.target.value))}
                            className="w-full max-w-md"
                        />
                    </div>

                    <div className="grid md:grid-cols-3 gap-6">
                        <StatReactor
                            value={cashBalance}
                            previousValue={cashBalance}
                            warningThreshold={2000}
                            criticalThreshold={500}
                            excellentThreshold={10000}
                            showCharacterWarning={true}
                            warningContext="low_cash"
                        >
                            <BrightLayer variant="glass" padding="md">
                                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Cash Balance</p>
                                <div className="text-2xl font-black text-[var(--text-primary)]">
                                    ฿{cashBalance.toLocaleString()}
                                </div>
                            </BrightLayer>
                        </StatReactor>

                        <StatReactor
                            value={cashBalance > 5000 ? 12 : 5}
                            warningThreshold={8}
                            criticalThreshold={3}
                        >
                            <BrightLayer variant="glass" padding="md">
                                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Employees</p>
                                <div className="text-2xl font-black text-[var(--text-primary)]">
                                    {cashBalance > 5000 ? 12 : 5}
                                </div>
                            </BrightLayer>
                        </StatReactor>

                        <StatReactor
                            value={cashBalance > 8000 ? 95 : cashBalance > 3000 ? 70 : 40}
                            warningThreshold={60}
                            criticalThreshold={50}
                            excellentThreshold={90}
                        >
                            <BrightLayer variant="glass" padding="md">
                                <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">Morale</p>
                                <div className="text-2xl font-black text-[var(--text-primary)]">
                                    {cashBalance > 8000 ? 95 : cashBalance > 3000 ? 70 : 40}%
                                </div>
                            </BrightLayer>
                        </StatReactor>
                    </div>
                </section>

                {/* Section 5: Animation Classes */}
                <section>
                    <BrightHeading level={2} className="mb-6">Animation Classes</BrightHeading>
                    <p className="text-[var(--text-secondary)] mb-8">
                        CSS animation utilities available for the cinematic system.
                    </p>

                    <div className="grid md:grid-cols-4 gap-6">
                        <BrightLayer variant="glass" padding="md" className="animate-urgent-pulse">
                            <p className="text-xs font-bold">.animate-urgent-pulse</p>
                        </BrightLayer>
                        <BrightLayer variant="glass" padding="md" className="animate-attention-glow">
                            <p className="text-xs font-bold">.animate-attention-glow</p>
                        </BrightLayer>
                        <BrightLayer variant="glass" padding="md" className="animate-breathing">
                            <p className="text-xs font-bold">.animate-breathing</p>
                        </BrightLayer>
                        <BrightLayer variant="glass" padding="md" className="animate-character-enter-left">
                            <p className="text-xs font-bold">.animate-character-enter-left</p>
                        </BrightLayer>
                    </div>
                </section>

            </main>
        </div>
    );
}

export default function CinematicDemoPage() {
    return (
        <CinematicProvider
            onSceneComplete={(sceneId, decisions) => {
                console.log('Scene completed:', sceneId, decisions);
            }}
            onDecision={(sceneId, nodeId, choice) => {
                console.log('Decision made:', sceneId, nodeId, choice);
            }}
        >
            <DemoContent />
        </CinematicProvider>
    );
}
