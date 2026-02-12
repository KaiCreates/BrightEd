'use client';

import React, { useState, useEffect, useCallback } from 'react';
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

interface WaterBath {
    id: string;
    name: string;
    temperature: number;
    icon: string;
    color: string;
    enzymeStatus: 'inactive' | 'optimal' | 'denatured';
}

interface TestTube {
    id: string;
    bathId: string;
    hasAmylase: boolean;
    hasStarch: boolean;
    timeElapsed: number;
    starchBroken: boolean;
}

const WATER_BATHS: WaterBath[] = [
    { id: 'ice', name: 'Ice Bath', temperature: 0, icon: '🧊', color: 'from-blue-500/30 to-cyan-500/30', enzymeStatus: 'inactive' },
    { id: 'room', name: 'Room Temperature', temperature: 37, icon: '🌡️', color: 'from-emerald-500/30 to-green-500/30', enzymeStatus: 'optimal' },
    { id: 'boiling', name: 'Boiling Water', temperature: 100, icon: '♨️', color: 'from-red-500/30 to-orange-500/30', enzymeStatus: 'denatured' }
];

// ==========================================
// DRAGGABLE REAGENT
// ==========================================

interface Reagent {
    id: string;
    name: string;
    icon: string;
}

const REAGENTS: Reagent[] = [
    { id: 'amylase', name: 'Amylase Enzyme', icon: '🧬' },
    { id: 'starch', name: 'Starch Solution', icon: '🫧' },
    { id: 'iodine', name: 'Iodine', icon: '🟤' }
];

function DraggableReagent({ reagent, isOverlay }: { reagent: Reagent; isOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: reagent.id
    });

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
        bg-[#1B1B2F]  border border-[#3D3D5C]
        transition-all select-none
        hover:bg-white/[0.08] hover:border-emerald-500/30
        ${isOverlay ? 'shadow-2xl shadow-emerald-500/20 scale-110' : ''}
      `}
        >
            <div className="flex items-center gap-3">
                <span className="text-2xl">{reagent.icon}</span>
                <span className="text-sm font-black text-white">{reagent.name}</span>
            </div>
        </motion.div>
    );
}

// ==========================================
// WATER BATH DROP ZONE
// ==========================================

function WaterBathZone({
    bath,
    testTube,
    isHovering,
    onTest
}: {
    bath: WaterBath;
    testTube: TestTube | null;
    isHovering: boolean;
    onTest: () => void;
}) {
    const { setNodeRef } = useDroppable({ id: bath.id });

    const statusLabel: Record<WaterBath['enzymeStatus'], { text: string; color: string }> = {
        inactive: { text: 'Too Cold - Slow Reaction', color: 'text-blue-400' },
        optimal: { text: 'Optimal - Fast Reaction', color: 'text-emerald-400' },
        denatured: { text: 'Denatured - No Reaction', color: 'text-red-400' }
    };

    return (
        <motion.div
            ref={setNodeRef}
            animate={isHovering ? { scale: 1.02, borderColor: 'rgba(16, 185, 129, 0.6)' } : { scale: 1 }}
            className={`
        relative p-6 rounded-[2rem] border-2 transition-all
        bg-gradient-to-br ${bath.color} 
        border-[#3D3D5C] min-h-[280px]
        ${isHovering ? 'shadow-2xl shadow-emerald-500/20' : ''}
      `}
        >
            {/* Temperature Display */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <span className="text-4xl">{bath.icon}</span>
                    <div>
                        <div className="text-lg font-black text-white">{bath.name}</div>
                        <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                            {bath.temperature}°C
                        </div>
                    </div>
                </div>
                <div className={`text-[9px] font-black uppercase tracking-widest ${statusLabel[bath.enzymeStatus].color}`}>
                    {statusLabel[bath.enzymeStatus].text}
                </div>
            </div>

            {/* Test Tube Slot */}
            <div className="mt-6 p-6 rounded-2xl bg-white/5 border border-[#3D3D5C] min-h-[140px] flex flex-col items-center justify-center">
                {testTube ? (
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="text-center"
                    >
                        <div className="text-4xl mb-3">🧪</div>
                        <div className="text-xs text-zinc-400 mb-2">
                            {testTube.hasAmylase && testTube.hasStarch ? 'Amylase + Starch' : 'Empty'}
                        </div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            {testTube.timeElapsed}s elapsed
                        </div>
                        <button
                            onClick={onTest}
                            className="mt-4 px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/30 text-[10px] font-black uppercase tracking-widest text-amber-400 hover:bg-amber-500/30"
                        >
                            🟤 Test with Iodine
                        </button>
                    </motion.div>
                ) : (
                    <div className="text-center">
                        <div className="text-3xl opacity-30 mb-2">🧪</div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                            Drop reagents here
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

// ==========================================
// SPOTTING TILE RESULT
// ==========================================

interface SpottingResult {
    bathId: string;
    color: 'blue_black' | 'yellow_brown';
    starchPresent: boolean;
}

// ==========================================
// MAIN ENZYME TEMPERATURE LAB V2
// ==========================================

export default function EnzymeLabV2Page() {
    const [testTubes, setTestTubes] = useState<Record<string, TestTube>>({});
    const [activeReagent, setActiveReagent] = useState<Reagent | null>(null);
    const [hoveringBath, setHoveringBath] = useState<string | null>(null);
    const [results, setResults] = useState<SpottingResult[]>([]);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);

    const { professor, showSuccess: showProfessorSuccess, showWarning, showHint, resetToIdle } = useProfessor({
        initialMessage: "Let's test how temperature affects enzyme activity. Add amylase and starch to each water bath!"
    });

    const { completeLab, result } = useLabCompletion();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
    );

    // Timer for elapsed time
    useEffect(() => {
        const interval = setInterval(() => {
            setTestTubes(prev => {
                const updated = { ...prev };
                Object.keys(updated).forEach(key => {
                    const tube = updated[key];
                    if (tube && tube.hasAmylase && tube.hasStarch) {
                        const bath = WATER_BATHS.find(b => b.id === tube.bathId)!;
                        updated[key] = {
                            ...tube,
                            timeElapsed: tube.timeElapsed + 10,
                            // Starch breaks down at optimal temp after ~60s
                            starchBroken: bath.enzymeStatus === 'optimal' && tube.timeElapsed >= 50
                        };
                    }
                });
                return updated;
            });
        }, 1000); // Speed up for simulation

        return () => clearInterval(interval);
    }, []);

    const handleDragStart = (event: DragStartEvent) => {
        const reagent = REAGENTS.find(r => r.id === event.active.id);
        setActiveReagent(reagent || null);
    };

    const handleDragOver = (event: any) => {
        if (event.over && WATER_BATHS.some(b => b.id === event.over.id)) {
            setHoveringBath(event.over.id);
        } else {
            setHoveringBath(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveReagent(null);
        setHoveringBath(null);

        if (!over) return;

        const reagentId = active.id as string;
        const bathId = over.id as string;
        const bath = WATER_BATHS.find(b => b.id === bathId)!;

        if (!bath) return;

        setTestTubes(prev => {
            const existing = prev[bathId] || {
                id: `tube-${bathId}`,
                bathId,
                hasAmylase: false,
                hasStarch: false,
                timeElapsed: 0,
                starchBroken: false
            };

            if (reagentId === 'amylase') {
                return { ...prev, [bathId]: { ...existing, hasAmylase: true } };
            }
            if (reagentId === 'starch') {
                return { ...prev, [bathId]: { ...existing, hasStarch: true } };
            }
            return prev;
        });

        if (reagentId === 'amylase' || reagentId === 'starch') {
            showProfessorSuccess(`Added ${reagentId} to the ${bath.name}!`);
        }
    };

    const handleTest = (bathId: string) => {
        const tube = testTubes[bathId];
        const bath = WATER_BATHS.find(b => b.id === bathId)!;

        if (!tube || !bath) return;

        const starchPresent = bath.enzymeStatus !== 'optimal' || !tube.starchBroken;
        const color = starchPresent ? 'blue_black' : 'yellow_brown';

        setResults(prev => [...prev, { bathId, color, starchPresent }]);

        // Particle effect
        const particleColor = starchPresent ? '#3730A3' : '#D97706';
        setParticles(createParticles(400, 200, 25, particleColor));
        setTimeout(() => setParticles([]), 1000);

        if (starchPresent) {
            showProfessorSuccess(`Blue-black! Starch is still present at ${bath.temperature}°C.`);
        } else {
            showProfessorSuccess(`Yellow-brown! Starch was digested at ${bath.temperature}°C. This is the optimal temperature!`);
        }

        // Check if all 3 tested
        if (results.length + 1 >= 3) {
            completeLab('bio-enzymes-temp', 300);
            setTimeout(() => setShowSuccess(true), 2000);
        }
    };

    if (showSuccess) {
        return (
            <div className="fixed inset-0 z-[200] bg-gradient-to-br from-emerald-900 to-black flex items-center justify-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center max-w-3xl px-8"
                >
                    <motion.div
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ repeat: 2, duration: 0.5 }}
                        className="text-9xl mb-8"
                    >
                        🧬✅
                    </motion.div>
                    <h1 className="text-4xl md:text-6xl font-black text-emerald-400 mb-4 uppercase tracking-tight">
                        Lab Complete!
                    </h1>
                    <p className="text-xl text-zinc-300 mb-8">
                        You demonstrated that enzymes have an <span className="text-emerald-400 font-bold">optimal temperature</span> and
                        <span className="text-red-400 font-bold"> denature at high temperatures</span>.
                    </p>

                    <div className="grid grid-cols-3 gap-4 mb-10 max-w-xl mx-auto">
                        {WATER_BATHS.map(bath => {
                            const result = results.find(r => r.bathId === bath.id);
                            return (
                                <div key={bath.id} className={`p-4 rounded-2xl bg-gradient-to-br ${bath.color} border border-[#3D3D5C]`}>
                                    <div className="text-3xl mb-2">{bath.icon}</div>
                                    <div className="text-sm font-black text-white">{bath.temperature}°C</div>
                                    <div className={`text-[10px] font-bold mt-1 ${result?.starchPresent ? 'text-indigo-400' : 'text-amber-400'}`}>
                                        {result?.starchPresent ? 'Starch Present' : 'Starch Digested'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-6 rounded-3xl bg-white/5 border border-[#3D3D5C] mb-10">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">XP Earned</div>
                        <div className="text-3xl font-black text-amber-400">
                            {result?.xpGain !== undefined ? `+${result.xpGain}` : '+300'}
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
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="fixed inset-0 bg-gradient-to-b from-[#0A1628] to-[#050A12] overflow-hidden">
                {/* Background */}
                <div className="absolute inset-0">
                    <div className="absolute top-0 left-1/4 w-1/2 h-1/3 bg-emerald-500/5 blur-[200px] rounded-full" />
                    <div className="absolute bottom-0 right-1/4 w-1/3 h-1/3 bg-blue-500/5 blur-[150px] rounded-full" />
                </div>

                {/* Header */}
                <header className="relative z-50 h-16 bg-[#131325]  border-b-4 border-[#3D3D5C] flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <a href="/practicals/science/biology" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
                            ← Exit Lab
                        </a>
                        <div className="h-6 w-px bg-white/10" />
                        <div className="text-sm font-black tracking-tight text-white">Effect of Temperature on Enzymes</div>
                    </div>
                    <div className="flex items-center gap-2 bg-black/30 px-4 py-1.5 rounded-full border border-[#3D3D5C]">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                            {results.length}/3 tests done
                        </span>
                    </div>
                </header>

                <div className="relative z-10 h-[calc(100vh-4rem)] flex">
                    {/* Left: Reagent Shelf */}
                    <aside className="w-64 bg-[#131325]  border-r border-[#3D3D5C] p-6">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">
                            Reagents
                        </div>
                        <div className="space-y-3">
                            {REAGENTS.map((reagent) => (
                                <DraggableReagent key={reagent.id} reagent={reagent} />
                            ))}
                        </div>
                    </aside>

                    {/* Center: Water Baths */}
                    <main className="flex-1 p-8 overflow-y-auto">
                        <div className="grid grid-cols-3 gap-6">
                            {WATER_BATHS.map((bath) => (
                                <WaterBathZone
                                    key={bath.id}
                                    bath={bath}
                                    testTube={testTubes[bath.id] || null}
                                    isHovering={hoveringBath === bath.id}
                                    onTest={() => handleTest(bath.id)}
                                />
                            ))}
                        </div>

                        {/* Spotting Tile Results */}
                        {results.length > 0 && (
                            <div className="mt-8 p-6 rounded-2xl bg-[#131325] border border-[#3D3D5C]">
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">
                                    Spotting Tile Results
                                </div>
                                <div className="flex gap-4">
                                    {results.map((r, i) => {
                                        const bath = WATER_BATHS.find(b => b.id === r.bathId);
                                        return (
                                            <motion.div
                                                key={i}
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                className={`w-16 h-16 rounded-2xl flex flex-col items-center justify-center ${r.color === 'blue_black' ? 'bg-indigo-900' : 'bg-amber-600'
                                                    }`}
                                            >
                                                <span className="text-xs font-black text-white">{bath?.temperature}°C</span>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Particles */}
                        {particles.map((p) => (
                            <motion.div
                                key={p.id}
                                initial={{ x: p.x, y: p.y, scale: 1, opacity: 1 }}
                                animate={{ x: p.x + p.velocity.x, y: p.y + p.velocity.y, scale: 0, opacity: 0 }}
                                transition={{ duration: 0.8 }}
                                className="absolute pointer-events-none rounded-full"
                                style={{ width: p.size, height: p.size, backgroundColor: p.color }}
                            />
                        ))}
                    </main>
                </div>

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeReagent && <DraggableReagent reagent={activeReagent} isOverlay />}
                </DragOverlay>

                {/* Professor Bright */}
                <ProfessorBright state={professor} />
            </div>
        </DndContext>
    );
}
