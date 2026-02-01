'use client';

import React, { useState, useMemo, useCallback } from 'react';
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

// ==========================================
// TYPES
// ==========================================

interface WeedPatch {
    id: string;
    x: number;
    y: number;
}

interface QuadratSample {
    id: number;
    position: { x: number; y: number };
    count: number;
}

// ==========================================
// DRAGGABLE QUADRAT TOOL
// ==========================================

function DraggableQuadrat({ isOverlay }: { isOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: 'quadrat'
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
        p-6 rounded-2xl cursor-grab active:cursor-grabbing
        bg-yellow-500/20  border-2 border-yellow-500/50
        transition-all select-none text-center
        hover:bg-yellow-500/30 hover:border-yellow-500
        ${isOverlay ? 'shadow-2xl shadow-yellow-500/30 scale-110' : ''}
      `}
        >
            <div className="text-4xl mb-2">🔲</div>
            <div className="text-sm font-black text-yellow-400">1m² Quadrat</div>
            <div className="text-[9px] text-yellow-400/70 mt-1">Drag to field</div>
        </motion.div>
    );
}

// ==========================================
// FIELD DROP ZONE
// ==========================================

function FieldZone({
    weeds,
    samples,
    isHovering,
    hoverPosition
}: {
    weeds: WeedPatch[];
    samples: QuadratSample[];
    isHovering: boolean;
    hoverPosition: { x: number; y: number } | null;
}) {
    const { setNodeRef } = useDroppable({ id: 'field' });

    return (
        <motion.div
            ref={setNodeRef}
            className="relative w-full h-full rounded-[2rem] overflow-hidden border-2 border-[#3D3D5C]"
        >
            {/* Grass Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-green-900/60 to-green-950/80">
                <div
                    className="absolute inset-0 opacity-40"
                    style={{
                        backgroundImage: `radial-gradient(circle, #22c55e 1px, transparent 1px)`,
                        backgroundSize: '12px 12px'
                    }}
                />
            </div>

            {/* Weed Patches */}
            {weeds.map((weed) => (
                <div
                    key={weed.id}
                    className="absolute text-xl transition-transform hover:scale-125"
                    style={{ left: `${weed.x}%`, top: `${weed.y}%` }}
                >
                    🌿
                </div>
            ))}

            {/* Previous Quadrat Samples */}
            {samples.map((sample) => (
                <motion.div
                    key={sample.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.3 }}
                    className="absolute w-[18%] h-[18%] border-2 border-dashed border-yellow-500/50 bg-yellow-500/5 rounded-lg"
                    style={{ left: `${sample.position.x}%`, top: `${sample.position.y}%` }}
                />
            ))}

            {/* Hover Preview */}
            {isHovering && hoverPosition && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute w-[18%] h-[18%] border-4 border-yellow-400 bg-yellow-400/20 rounded-lg pointer-events-none"
                    style={{ left: `${hoverPosition.x}%`, top: `${hoverPosition.y}%` }}
                >
                    <div className="absolute -top-6 left-0 text-[9px] font-black uppercase tracking-widest text-yellow-400 bg-black/60 px-2 py-1 rounded">
                        Drop Here
                    </div>
                </motion.div>
            )}

            {/* Field Label */}
            <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-lg">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/70">
                    Virtual Field (5m × 5m)
                </span>
            </div>
        </motion.div>
    );
}

// ==========================================
// MAIN QUADRAT LAB V2
// ==========================================

export default function QuadratLabV2Page() {
    const [samples, setSamples] = useState<QuadratSample[]>([]);
    const [hoveringField, setHoveringField] = useState(false);
    const [hoverPosition, setHoverPosition] = useState<{ x: number; y: number } | null>(null);
    const [isDraggingQuadrat, setIsDraggingQuadrat] = useState(false);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [currentCount, setCurrentCount] = useState<number | null>(null);

    const { professor, showSuccess: showProfessorSuccess, showWarning, showHint, resetToIdle } = useProfessor({
        initialMessage: "Drag the quadrat onto the field to sample different areas. We need at least 10 samples for reliable data!"
    });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
    );

    // Generate random weed patches
    const weeds = useMemo(() => {
        const patches: WeedPatch[] = [];
        const numWeeds = 50 + Math.floor(Math.random() * 30);
        for (let i = 0; i < numWeeds; i++) {
            patches.push({
                id: `weed-${i}`,
                x: Math.random() * 95,
                y: Math.random() * 95
            });
        }
        return patches;
    }, []);

    // Count weeds in a quadrat at position
    const countWeedsInQuadrat = useCallback((x: number, y: number): number => {
        const quadratSize = 18; // 18% of field
        return weeds.filter(w =>
            w.x >= x && w.x <= x + quadratSize &&
            w.y >= y && w.y <= y + quadratSize
        ).length;
    }, [weeds]);

    const averageCount = useMemo(() => {
        if (samples.length === 0) return 0;
        return +(samples.reduce((sum, s) => sum + s.count, 0) / samples.length).toFixed(1);
    }, [samples]);

    const estimatedPopulation = useMemo(() => {
        return Math.round(averageCount * 25); // 25 quadrats fit in field
    }, [averageCount]);

    const handleDragStart = (event: DragStartEvent) => {
        if (event.active.id === 'quadrat') {
            setIsDraggingQuadrat(true);
        }
    };

    const handleDragOver = (event: any) => {
        if (event.over?.id === 'field') {
            setHoveringField(true);
            // Random position for preview
            setHoverPosition({
                x: Math.random() * 75,
                y: Math.random() * 75
            });
        } else {
            setHoveringField(false);
            setHoverPosition(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { over } = event;
        setIsDraggingQuadrat(false);
        setHoveringField(false);

        if (over?.id !== 'field') {
            setHoverPosition(null);
            return;
        }

        // Random placement
        const x = Math.random() * 75;
        const y = Math.random() * 75;
        const count = countWeedsInQuadrat(x, y);

        const newSample: QuadratSample = {
            id: samples.length + 1,
            position: { x, y },
            count
        };

        setSamples(prev => [...prev, newSample]);
        setCurrentCount(count);

        // Particle effect
        setParticles(createParticles(400, 300, 20, '#22C55E'));
        setTimeout(() => setParticles([]), 1000);

        showProfessorSuccess(`Sample #${newSample.id}: ${count} organisms counted!`);

        // Check completion
        if (samples.length + 1 >= 10) {
            setTimeout(() => resetToIdle("Great work! You have enough samples. Click 'Complete Study' when ready."), 1500);
        }

        setHoverPosition(null);
    };

    const handleComplete = () => {
        if (samples.length < 5) {
            showWarning("You need at least 5 samples for any meaningful data!");
            return;
        }
        setShowSuccess(true);
    };

    if (showSuccess) {
        return (
            <div className="fixed inset-0 z-[200] bg-gradient-to-br from-green-900 to-black flex items-center justify-center">
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
                        🌿✅
                    </motion.div>
                    <h1 className="text-4xl md:text-6xl font-black text-emerald-400 mb-4 uppercase tracking-tight">
                        Field Study Complete!
                    </h1>
                    <p className="text-xl text-zinc-300 mb-8">
                        Using <span className="text-emerald-400 font-bold">random sampling</span>, you estimated the weed population!
                    </p>

                    <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg mx-auto">
                        <div className="p-4 rounded-2xl bg-white/5 border border-[#3D3D5C]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Samples</div>
                            <div className="text-2xl font-black text-white">{samples.length}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-[#3D3D5C]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Avg/m²</div>
                            <div className="text-2xl font-black text-emerald-400">{averageCount}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-[#3D3D5C]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Est. Total</div>
                            <div className="text-2xl font-black text-amber-400">{estimatedPopulation}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-10 max-w-md mx-auto">
                        <div className="p-6 rounded-3xl bg-white/5 border border-[#3D3D5C]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">XP Earned</div>
                            <div className="text-3xl font-black text-amber-400">+200</div>
                        </div>
                        <div className="p-6 rounded-3xl bg-white/5 border border-[#3D3D5C]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Reliability</div>
                            <div className="text-3xl font-black text-emerald-400">{samples.length >= 10 ? 'High' : 'Medium'}</div>
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
                    <div className="absolute top-0 left-1/3 w-1/2 h-1/3 bg-green-500/5 blur-[200px] rounded-full" />
                </div>

                {/* Header */}
                <header className="relative z-50 h-16 bg-[#131325]  border-b-4 border-[#3D3D5C] flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <a href="/practicals/science/biology" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
                            ← Exit Lab
                        </a>
                        <div className="h-6 w-px bg-white/10" />
                        <div className="text-sm font-black tracking-tight text-white">Quadrat Sampling</div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            Samples: <span className={samples.length >= 10 ? 'text-emerald-400' : 'text-amber-400'}>{samples.length}</span>
                        </div>
                        {samples.length >= 5 && (
                            <button
                                onClick={handleComplete}
                                className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/30"
                            >
                                Complete Study
                            </button>
                        )}
                    </div>
                </header>

                <div className="relative z-10 h-[calc(100vh-4rem)] flex">
                    {/* Left: Tool Shelf */}
                    <aside className="w-72 bg-[#131325]  border-r border-[#3D3D5C] p-6">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">
                            Equipment
                        </div>
                        <DraggableQuadrat />

                        {/* Live Stats */}
                        <div className="mt-8 p-4 rounded-2xl bg-white/5 border border-[#3D3D5C]">
                            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-4">Live Data</div>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-xs text-zinc-400">Avg. per m²:</span>
                                    <span className="text-sm font-black text-emerald-400">{averageCount}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-zinc-400">Est. Total:</span>
                                    <span className="text-sm font-black text-white">{estimatedPopulation}</span>
                                </div>
                            </div>
                        </div>

                        {/* Sample Log */}
                        <div className="mt-6 p-4 rounded-2xl bg-white/5 border border-[#3D3D5C] max-h-40 overflow-y-auto">
                            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-3">Sample Log</div>
                            <div className="space-y-2 text-xs">
                                {samples.slice(-5).map((s) => (
                                    <div key={s.id} className="text-zinc-400">
                                        #{s.id}: {s.count} organisms
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>

                    {/* Center: Field */}
                    <main className="flex-1 p-8 relative">
                        <FieldZone
                            weeds={weeds}
                            samples={samples}
                            isHovering={hoveringField}
                            hoverPosition={hoverPosition}
                        />

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
                    {isDraggingQuadrat && <DraggableQuadrat isOverlay />}
                </DragOverlay>

                {/* Professor Bright */}
                <ProfessorBright state={professor} />
            </div>
        </DndContext>
    );
}
