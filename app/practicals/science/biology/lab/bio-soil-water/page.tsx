'use client';

import React, { useState, useCallback, useEffect } from 'react';
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

type SoilType = 'clay' | 'loam' | 'sand';

interface SoilFunnel {
    id: SoilType;
    name: string;
    color: string;
    drainageRate: number; // ml per 10s
    waterRetention: number; // percentage kept
    status: 'empty' | 'draining' | 'complete';
    waterDrained: number;
}

const SOILS: SoilFunnel[] = [
    { id: 'clay', name: 'Clay Soil', color: 'bg-orange-700', drainageRate: 5, waterRetention: 80, status: 'empty', waterDrained: 0 },
    { id: 'loam', name: 'Loam Soil', color: 'bg-amber-800', drainageRate: 15, waterRetention: 50, status: 'empty', waterDrained: 0 },
    { id: 'sand', name: 'Sandy Soil', color: 'bg-yellow-600', drainageRate: 30, waterRetention: 20, status: 'empty', waterDrained: 0 }
];

// ==========================================
// DRAGGABLE WATER BEAKER
// ==========================================

function DraggableWater({ isOverlay }: { isOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: 'water' });

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
        bg-blue-500/20 border-2 border-b-4 border-blue-500
        transition-all select-none text-center
        hover:bg-blue-500/30
        ${isOverlay ? 'shadow-2xl scale-110' : ''}
      `}
        >
            <div className="text-4xl mb-2">💧</div>
            <div className="text-sm font-black text-blue-300">100ml Water</div>
            <div className="text-[9px] text-blue-300/70 mt-1">Drag to funnel</div>
        </motion.div>
    );
}

// ==========================================
// SOIL FUNNEL DROP ZONE
// ==========================================

function SoilFunnelZone({
    soil,
    isHovering,
    drainedWater
}: {
    soil: SoilFunnel;
    isHovering: boolean;
    drainedWater: number;
}) {
    const { setNodeRef } = useDroppable({ id: soil.id });
    const waterHeight = Math.min(80, (drainedWater / 100) * 80);

    return (
        <motion.div
            ref={setNodeRef}
            animate={isHovering ? { scale: 1.02, borderColor: '#3B82F6' } : { scale: 1 }}
            className="relative p-6 rounded-[2rem] border-2 border-b-4 border-[#3D3D5C] bg-[#1B1B2F] min-h-[350px]"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className={`w-12 h-12 rounded-xl ${soil.color} flex items-center justify-center text-2xl`}>🧱</div>
                <div>
                    <div className="text-lg font-black text-white">{soil.name}</div>
                    <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                        {soil.status === 'complete' ? 'Test Complete' : soil.status === 'draining' ? 'Draining...' : 'Add Water'}
                    </div>
                </div>
            </div>

            {/* Funnel Visual */}
            <div className="relative h-32 flex justify-center">
                <div className="w-20 h-full border-l-4 border-r-4 border-b-4 rounded-b-xl border-zinc-600 relative overflow-hidden">
                    {soil.status !== 'empty' && (
                        <motion.div
                            initial={{ height: '100%' }}
                            animate={{ height: `${100 - (drainedWater / 100) * 100}%` }}
                            transition={{ duration: 0.5 }}
                            className="absolute bottom-0 w-full bg-blue-400/60"
                        />
                    )}
                </div>
            </div>

            {/* Collection Beaker */}
            <div className="mt-4 relative h-24 flex justify-center">
                <div className="w-16 h-full border-2 border-zinc-600 rounded-b-lg relative overflow-hidden bg-zinc-900">
                    <motion.div
                        animate={{ height: `${waterHeight}%` }}
                        className="absolute bottom-0 w-full bg-blue-500/80"
                    />
                </div>
            </div>

            <div className="text-center mt-4">
                <div className="text-2xl font-black text-blue-400">{drainedWater}ml</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Collected</div>
            </div>
        </motion.div>
    );
}

// ==========================================
// MAIN SOIL WATER LAB
// ==========================================

export default function SoilWaterLabPage() {
    const [soils, setSoils] = useState(SOILS);
    const [activeWater, setActiveWater] = useState(false);
    const [hoveringFunnel, setHoveringFunnel] = useState<string | null>(null);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [showSuccess, setShowSuccess] = useState(false);

    const { professor, showSuccess: showProfessorSuccess, showWarning } = useProfessor({
        initialMessage: "Pour water into each soil sample and observe the drainage rate!"
    });

    const { completeLab, isSubmitting, result } = useLabCompletion();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
    );

    // Drainage simulation
    useEffect(() => {
        const interval = setInterval(() => {
            setSoils(prev => prev.map(soil => {
                if (soil.status !== 'draining') return soil;

                const newDrained = Math.min(100 - (100 * soil.waterRetention / 100), soil.waterDrained + soil.drainageRate);
                const isComplete = newDrained >= (100 - (100 * soil.waterRetention / 100));

                return {
                    ...soil,
                    waterDrained: Math.round(newDrained),
                    status: isComplete ? 'complete' : 'draining'
                };
            }));
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Check all complete
    useEffect(() => {
        if (soils.every(s => s.status === 'complete') && !showSuccess) {
            setTimeout(() => setShowSuccess(true), 1500);
        }
    }, [soils, showSuccess]);

    const handleDragStart = (event: DragStartEvent) => {
        if (event.active.id === 'water') setActiveWater(true);
    };

    const handleDragOver = (event: any) => {
        const id = event.over?.id;
        if (['clay', 'loam', 'sand'].includes(id)) {
            setHoveringFunnel(id);
        } else {
            setHoveringFunnel(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { over } = event;
        setActiveWater(false);
        setHoveringFunnel(null);

        if (!over || !['clay', 'loam', 'sand'].includes(over.id as string)) return;

        const soilId = over.id as SoilType;
        const soil = soils.find(s => s.id === soilId);

        if (soil?.status !== 'empty') {
            showWarning("This funnel already has water!");
            return;
        }

        setSoils(prev => prev.map(s =>
            s.id === soilId ? { ...s, status: 'draining' } : s
        ));

        setParticles(createParticles(400, 200, 20, '#3B82F6'));
        setTimeout(() => setParticles([]), 1000);

        showProfessorSuccess(`Water added to ${soil?.name}! Watch it drain...`);
    };

    const handleComplete = async () => {
        const res = await completeLab('bio-soil-water', 200);
        if (res?.success) {
            showProfessorSuccess(res.message);
        }
    };

    if (showSuccess) {
        const bestSoil = soils.reduce((a, b) => a.waterRetention > b.waterRetention ? a : b);

        return (
            <div className="fixed inset-0 z-[200] bg-gradient-to-br from-amber-900 to-black flex items-center justify-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center max-w-3xl px-8"
                >
                    <div className="text-9xl mb-8">🌱✅</div>
                    <h1 className="text-4xl md:text-6xl font-black text-amber-400 mb-4 uppercase tracking-tight">
                        Experiment Complete!
                    </h1>
                    <p className="text-xl text-zinc-300 mb-8">
                        <span className="text-amber-400 font-bold">{bestSoil.name}</span> retains the most water,
                        making it ideal for water-loving plants!
                    </p>

                    <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg mx-auto">
                        {soils.map(soil => (
                            <div key={soil.id} className={`p-4 rounded-2xl bg-[#1B1B2F] border border-[#3D3D5C]`}>
                                <div className={`w-10 h-10 rounded-lg ${soil.color} mx-auto mb-2`} />
                                <div className="text-sm font-black text-white">{soil.name}</div>
                                <div className="text-xs text-zinc-400">{soil.waterRetention}% retained</div>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center justify-center gap-6 mb-10">
                        <div className="p-6 rounded-3xl bg-[#1B1B2F] border border-[#3D3D5C]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">XP Earned</div>
                            <div className="text-3xl font-black text-amber-400">
                                {result?.xpGain !== undefined ? `+${result.xpGain}` : '+200'}
                            </div>
                        </div>
                    </div>

                    <a
                        href="/practicals/science/biology"
                        onClick={handleComplete}
                        className="inline-block px-10 py-4 rounded-2xl bg-amber-500 text-white font-black uppercase tracking-widest hover:bg-amber-400 transition-colors"
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
                {/* Header - fixed z-index and no transparency */}
                <header className="relative z-50 h-16 bg-[#131325] border-b-4 border-[#3D3D5C] flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <a href="/practicals/science/biology" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
                            ← Exit Lab
                        </a>
                        <div className="h-6 w-px bg-zinc-700" />
                        <div className="text-sm font-black tracking-tight text-white">Soil Water Capacity</div>
                    </div>
                    <div className="flex items-center gap-2 bg-[#1B1B2F] px-4 py-1.5 rounded-full border border-[#3D3D5C]">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                            {soils.filter(s => s.status === 'complete').length}/3 complete
                        </span>
                    </div>
                </header>

                <div className="relative z-10 h-[calc(100vh-4rem)] flex">
                    {/* Left: Equipment */}
                    <aside className="w-72 bg-[#131325] border-r-4 border-[#3D3D5C] p-6">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">Equipment</div>
                        <DraggableWater />

                        <div className="mt-8 p-4 rounded-2xl bg-[#1B1B2F] border border-[#3D3D5C]">
                            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-3">Instructions</div>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                Pour 100ml of water into each soil type and observe which drains fastest.
                            </p>
                        </div>
                    </aside>

                    {/* Center: Funnels */}
                    <main className="flex-1 p-8">
                        <div className="grid grid-cols-3 gap-6 h-full">
                            {soils.map((soil) => (
                                <SoilFunnelZone
                                    key={soil.id}
                                    soil={soil}
                                    isHovering={hoveringFunnel === soil.id}
                                    drainedWater={soil.waterDrained}
                                />
                            ))}
                        </div>

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

                <DragOverlay>
                    {activeWater && <DraggableWater isOverlay />}
                </DragOverlay>

                <ProfessorBright state={professor} />
            </div>
        </DndContext>
    );
}
