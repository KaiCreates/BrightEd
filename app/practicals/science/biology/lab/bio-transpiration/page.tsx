'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DndContext,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    TouchSensor,
    useDraggable,
    useDroppable
} from '@dnd-kit/core';
import ProfessorBright, { useProfessor } from '@/components/science/ProfessorBright';
import { createParticles, Particle, itemVariants } from '@/lib/science/virtual-lab.types';
import { useLabCompletion } from '@/hooks/useLabCompletion';

// ==========================================
// TYPES
// ==========================================

type EnvFactor = 'fan' | 'heater' | 'bag' | 'lamp' | 'none';

interface Environment {
    factor: EnvFactor;
    intensity: 'off' | 'on';
}

interface DraggableTool {
    id: string;
    factor: EnvFactor;
    name: string;
    icon: string;
}

const TOOLS: DraggableTool[] = [
    { id: 'tool-fan', factor: 'fan', name: 'Electric Fan', icon: '💨' },
    { id: 'tool-lamp', factor: 'lamp', name: 'Bright Lamp', icon: '💡' },
    { id: 'tool-bag', factor: 'bag', name: 'Plastic Bag', icon: '🛍️' },
    { id: 'tool-heater', factor: 'heater', name: 'Heater', icon: '🔥' }
];

// ==========================================
// DRAGGABLE TOOL
// ==========================================

function DraggableEnvironment({ tool, isOverlay }: { tool: DraggableTool; isOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: tool.id });

    return (
        <motion.div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            variants={itemVariants}
            initial="hidden"
            animate={isDragging ? "dragging" : "visible"}
            whileHover="hover"
            className={`
        p-4 rounded-2xl cursor-grab active:cursor-grabbing
        bg-[#1B1B2F] border border-[#3D3D5C]
        transition-all select-none
        hover:bg-white/[0.08] hover:border-emerald-500/30
        flex items-center gap-3
        ${isOverlay ? 'shadow-2xl shadow-emerald-500/20 scale-110 z-50' : ''}
      `}
        >
            <span className="text-2xl">{tool.icon}</span>
            <div>
                <div className="text-sm font-black text-white">{tool.name}</div>
                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">Environmental Factor</div>
            </div>
        </motion.div>
    );
}

// ==========================================
// POTOMETER SETUP
// ==========================================

function PotometerDisplay({
    bubblePos,
    activeFactor,
    isRunning
}: {
    bubblePos: number; // 0 to 100
    activeFactor: EnvFactor;
    isRunning: boolean;
}) {
    const { setNodeRef, isOver } = useDroppable({ id: 'potometer-zone' });

    return (
        <div
            ref={setNodeRef}
            className={`
                relative w-full max-w-3xl h-80 rounded-3xl border-2 transition-all p-8
                ${isOver ? 'border-emerald-500 bg-emerald-500/10' : 'border-[#3D3D5C] bg-[#1B1B2F]'}
                flex items-center justify-center
            `}
        >
            {/* Plant Shoot */}
            <div className="absolute top-10 left-20 text-9xl z-10 drop-shadow-2xl">🌱</div>

            {/* Capillary Tube */}
            <div className="absolute bottom-20 left-20 right-20 h-4 bg-blue-900/30 rounded-full border border-blue-500/30 overflow-hidden">
                <div className="w-full h-full flex items-center px-2">
                    {/* Ruler Markings */}
                    {[...Array(20)].map((_, i) => (
                        <div key={i} className="flex-1 border-r border-white/20 h-2 last:border-0" />
                    ))}
                </div>
                {/* Air Bubble */}
                <motion.div
                    className="absolute top-0 bottom-0 w-2 bg-white/80 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                    animate={{ left: `${bubblePos}%` }}
                    transition={{ ease: "linear", duration: 0.5 }}
                />
            </div>

            {/* Reservoir / Beaker */}
            <div className="absolute bottom-10 right-10 w-24 h-32 bg-blue-500/20 border-2 border-blue-400 rounded-b-xl backdrop-blur-sm z-0">
                <div className="absolute inset-0 bg-blue-500/10 animate-pulse" />
            </div>

            {/* Active Factor Indicator */}
            <div className="absolute top-4 right-4">
                {activeFactor === 'fan' && <div className="text-6xl animate-pulse">💨</div>}
                {activeFactor === 'lamp' && <div className="text-6xl animate-pulse text-yellow-500 drop-shadow-[0_0_30px_rgba(234,179,8,0.5)]">💡</div>}
                {activeFactor === 'bag' && <div className="text-6xl opacity-80">🛍️</div>}
                {activeFactor === 'heater' && <div className="text-6xl animate-bounce">🔥</div>}
                {activeFactor === 'none' && <div className="text-xs font-black uppercase text-zinc-600">Control Conditions</div>}
            </div>

            {/* Status Text */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest text-zinc-500">
                {isRunning ? 'Measuring Transpiration...' : 'Potometer Ready'}
            </div>
        </div>
    );
}

// ==========================================
// MAIN LAB: TRANSPIRATION
// ==========================================

export default function TranspirationLabPage() {
    const [activeFactor, setActiveFactor] = useState<EnvFactor>('none');
    const [bubblePos, setBubblePos] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [timer, setTimer] = useState(0);
    const [results, setResults] = useState<{ factor: string; distance: number }[]>([]);
    const [showSuccess, setShowSuccess] = useState(false);

    // Dragging state
    const [activeDraggable, setActiveDraggable] = useState<DraggableTool | null>(null);

    const { professor, showSuccess: showProfessorSuccess, showWarning, showHint } = useProfessor({
        initialMessage: "Use the potometer to measure transpiration rates. Try adding different environmental factors!"
    });

    const { completeLab, result } = useLabCompletion();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
    );

    // Simulation Loop
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isRunning) {
            interval = setInterval(() => {
                setTimer(prev => prev + 1);

                // Calculate Rate based on factor
                // Base rate = 0.5 per tick
                let rate = 0.5;
                if (activeFactor === 'fan') rate = 1.2; // Wind increases transpiration
                if (activeFactor === 'lamp') rate = 0.9; // Light opens stomata
                if (activeFactor === 'heater') rate = 1.5; // Heat increases evaporation
                if (activeFactor === 'bag') rate = 0.1; // Humidity decreases transpiration

                setBubblePos(prev => {
                    const next = prev + rate;
                    if (next >= 100) {
                        handleStop();
                        return 100;
                    }
                    return next;
                });

            }, 100);
        }

        return () => clearInterval(interval);
    }, [isRunning, activeFactor]);

    const handleStart = () => {
        if (bubblePos >= 100) {
            handleReset(); // Auto reset if full
        }
        setIsRunning(true);
        showProfessorSuccess("Measurement started! Watch the air bubble move.");
    };

    const handleStop = () => {
        setIsRunning(false);
        const distance = Math.round(bubblePos); // Simplified distance
        setResults(prev => [...prev, { factor: activeFactor === 'none' ? 'Control' : activeFactor, distance }]);
        showProfessorSuccess(`Measurement complete! Bubble moved ${distance}mm.`);

        // Complete Lab Condition: 3 different tests
        const factorsTested = new Set([...results.map(r => r.factor), activeFactor === 'none' ? 'Control' : activeFactor]);
        if (factorsTested.size >= 3) {
            setTimeout(() => handleFinish(), 1500);
        }
    };

    const handleReset = () => {
        setIsRunning(false);
        setBubblePos(0);
        setTimer(0);
    };

    const handleFinish = async () => {
        await completeLab('bio-transpiration', 300);
        setShowSuccess(true);
    };

    const handleDragStart = (event: DragStartEvent) => {
        const tool = TOOLS.find(t => t.id === event.active.id);
        setActiveDraggable(tool || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDraggable(null);
        const { over, active } = event;

        if (over && over.id === 'potometer-zone') {
            const tool = TOOLS.find(t => t.id === active.id);
            if (tool) {
                if (isRunning) {
                    showWarning("Stop the current measurement before changing factors!");
                    return;
                }
                setActiveFactor(tool.factor);
                handleReset();
                showProfessorSuccess(`Applied ${tool.name}. Transpiration rate should change!`);
            }
        }
    };

    const removeFactor = () => {
        if (isRunning) {
            showWarning("Stop the measurement first!");
            return;
        }
        setActiveFactor('none');
        handleReset();
        showProfessorSuccess("Returning to Control conditions (Normal room environment).");
    };

    if (showSuccess) {
        return (
            <div className="fixed inset-0 z-[200] bg-gradient-to-br from-blue-900 to-black flex items-center justify-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center max-w-3xl px-8"
                >
                    <div className="text-9xl mb-8">🌿💧</div>
                    <h1 className="text-4xl md:text-6xl font-black text-emerald-400 mb-4 uppercase tracking-tight">
                        Transpiration Analyzed!
                    </h1>
                    <p className="text-xl text-zinc-300 mb-8">
                        You investigated how wind, light, and humidity affect water loss in plants.
                    </p>

                    <div className="grid grid-cols-2 gap-6 mb-10 max-w-md mx-auto">
                        <div className="p-6 rounded-3xl bg-white/5 border border-[#3D3D5C]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Variables Tested</div>
                            <div className="text-3xl font-black text-white">{new Set(results.map(r => r.factor)).size}</div>
                        </div>
                        <div className="p-6 rounded-3xl bg-white/5 border border-[#3D3D5C]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">XP Earned</div>
                            <div className="text-3xl font-black text-amber-400">
                                {result?.xpGain !== undefined ? `+${result.xpGain}` : '+300'}
                            </div>
                        </div>
                    </div>

                    <a
                        href="/practicals/science/biology"
                        className="inline-block px-10 py-4 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest hover:bg-emerald-400 transition-colors"
                    >
                        Return to Lab Portfolio
                    </a>
                </motion.div>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="fixed inset-0 bg-gradient-to-b from-[#0A1628] to-[#050A12] overflow-hidden">
                {/* Header */}
                <header className="relative z-50 h-16 bg-[#131325] border-b-4 border-[#3D3D5C] flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <a href="/practicals/science/biology" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
                            ← Exit Lab
                        </a>
                        <div className="h-6 w-px bg-zinc-700" />
                        <div className="text-sm font-black tracking-tight text-white">Transpiration Potometer</div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            Tests: <span className="text-emerald-400">{results.length}</span>
                        </div>
                    </div>
                </header>

                <div className="relative z-10 h-[calc(100vh-4rem)] flex">
                    {/* Left: Environmental Factors */}
                    <aside className="w-72 bg-[#131325] border-r-4 border-[#3D3D5C] p-6">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">Environment Tools</div>

                        <div className="space-y-4">
                            {TOOLS.map(tool => (
                                <DraggableEnvironment key={tool.id} tool={tool} />
                            ))}
                        </div>

                        <div className="mt-8 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800">
                            <h4 className="text-zinc-400 font-bold mb-2 text-xs">Simulated Conditions</h4>
                            <div className="space-y-2 text-[10px] text-zinc-500">
                                <div className="flex justify-between">
                                    <span>Variable:</span>
                                    <span className="text-white font-bold uppercase">{activeFactor === 'none' ? 'Control' : activeFactor}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Temperature:</span>
                                    <span className="text-white">{activeFactor === 'heater' ? '35°C' : '22°C'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Wind Speed:</span>
                                    <span className="text-white">{activeFactor === 'fan' ? '5 m/s' : '0 m/s'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Humidity:</span>
                                    <span className="text-white">{activeFactor === 'bag' ? '95%' : '40%'}</span>
                                </div>
                            </div>

                            {activeFactor !== 'none' && (
                                <button
                                    onClick={removeFactor}
                                    className="mt-4 w-full py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black uppercase hover:bg-red-500/20"
                                >
                                    Remove Factor
                                </button>
                            )}
                        </div>
                    </aside>

                    {/* Main: Potometer */}
                    <main className="flex-1 flex flex-col items-center p-12 relative overflow-hidden">
                        {/* Background Ambience */}
                        <div className="absolute inset-0 z-0">
                            {activeFactor === 'fan' && <div className="absolute inset-0 bg-blue-500/5 animate-pulse" />} {/* Wind effect */}
                            {activeFactor === 'lamp' && <div className="absolute inset-0 bg-yellow-500/5" />} {/* Light effect */}
                            {activeFactor === 'heater' && <div className="absolute inset-0 bg-red-500/5" />} {/* Heat effect */}
                        </div>

                        <div className="z-10 w-full flex flex-col items-center">
                            <PotometerDisplay
                                bubblePos={bubblePos}
                                activeFactor={activeFactor}
                                isRunning={isRunning}
                            />

                            <div className="mt-8 flex gap-4">
                                {!isRunning ? (
                                    <button
                                        onClick={handleStart}
                                        className="px-12 py-4 rounded-2xl bg-emerald-500 text-white font-black text-lg uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 transition-transform"
                                    >
                                        Start Timer
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleStop}
                                        className="px-12 py-4 rounded-2xl bg-red-500 text-white font-black text-lg uppercase tracking-widest shadow-xl shadow-red-500/20 hover:scale-105 transition-transform"
                                    >
                                        Stop
                                    </button>
                                )}

                                <button
                                    onClick={handleReset}
                                    className="px-6 py-4 rounded-2xl bg-zinc-800 text-zinc-400 font-black text-lg uppercase tracking-widest hover:bg-zinc-700 transition-colors"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>

                        {/* Results Table */}
                        {results.length > 0 && (
                            <div className="mt-12 w-full max-w-2xl bg-[#1B1B2F] border border-[#3D3D5C] rounded-3xl p-6 z-10">
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Recorded Data</div>
                                <div className="grid grid-cols-2 gap-x-12 gap-y-2">
                                    <div className="flex justify-between text-xs font-bold text-zinc-400 border-b border-white/10 pb-2">
                                        <span>Condition</span>
                                        <span>Distance Moved</span>
                                    </div>
                                    <div />
                                    {results.map((r, i) => (
                                        <div key={i} className="flex justify-between text-sm text-zinc-300 py-1">
                                            <span className="capitalize">{r.factor}</span>
                                            <span className="font-mono text-emerald-400">{r.distance} mm</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                    </main>
                </div>

                <DragOverlay>
                    {activeDraggable && <DraggableEnvironment tool={activeDraggable} isOverlay />}
                </DragOverlay>

                <ProfessorBright state={professor} />
            </div>
        </DndContext>
    );
}
