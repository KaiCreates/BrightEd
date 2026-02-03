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
// DRAGGABLE CRYSTAL
// ==========================================

function DraggableCrystal({ isOverlay }: { isOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: 'crystal' });

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
        bg-purple-500/20 border-2 border-b-4 border-purple-500
        transition-all select-none text-center
        hover:bg-purple-500/30
        ${isOverlay ? 'shadow-2xl scale-110' : ''}
      `}
        >
            <div className="text-4xl mb-2">💎</div>
            <div className="text-sm font-black text-purple-300">KMnO₄ Crystal</div>
            <div className="text-[9px] text-purple-300/70 mt-1">Potassium Permanganate</div>
        </motion.div>
    );
}

// ==========================================
// BEAKER DROP ZONE
// ==========================================

function BeakerZone({
    diffusionProgress,
    isHovering,
    hasCrystal
}: {
    diffusionProgress: number;
    isHovering: boolean;
    hasCrystal: boolean;
}) {
    const { setNodeRef } = useDroppable({ id: 'beaker' });

    // Create gradient rings based on diffusion
    const rings = Array.from({ length: 5 }, (_, i) => {
        const size = 20 + i * 30;
        const opacity = Math.max(0, (diffusionProgress - i * 20) / 100);
        return { size, opacity };
    });

    return (
        <motion.div
            ref={setNodeRef}
            animate={isHovering ? { scale: 1.02, borderColor: '#A855F7' } : { scale: 1 }}
            className="relative w-80 h-80 mx-auto rounded-full border-4 border-b-8 border-[#3D3D5C] bg-blue-400/30 overflow-hidden"
        >
            {/* Water */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-300/20 to-blue-500/40" />

            {/* Diffusion Rings */}
            <AnimatePresence>
                {hasCrystal && rings.map((ring, i) => (
                    <motion.div
                        key={i}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: 1,
                            opacity: ring.opacity,
                            transition: { delay: i * 0.5, duration: 2 }
                        }}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-purple-500/60"
                        style={{
                            width: `${ring.size}%`,
                            height: `${ring.size}%`,
                            background: `radial-gradient(circle, rgba(168,85,247,${ring.opacity * 0.8}) 0%, transparent 70%)`
                        }}
                    />
                ))}
            </AnimatePresence>

            {/* Crystal in center */}
            {hasCrystal && (
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-purple-900 rounded-lg shadow-lg"
                />
            )}

            {/* Label */}
            <div className="absolute bottom-4 left-0 right-0 text-center">
                <div className="text-[10px] font-black uppercase tracking-widest text-white/70">
                    {!hasCrystal ? 'Drop Crystal Here' : `Diffusion: ${diffusionProgress}%`}
                </div>
            </div>
        </motion.div>
    );
}

// ==========================================
// MAIN DIFFUSION LAB
// ==========================================

export default function DiffusionLabPage() {
    const [hasCrystal, setHasCrystal] = useState(false);
    const [diffusionProgress, setDiffusionProgress] = useState(0);
    const [activeCrystal, setActiveCrystal] = useState(false);
    const [hoveringBeaker, setHoveringBeaker] = useState(false);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [timeElapsed, setTimeElapsed] = useState(0);

    const { professor, showSuccess: showProfessorSuccess, showWarning } = useProfessor({
        initialMessage: "Drop the potassium permanganate crystal into the water and observe diffusion!"
    });

    const { completeLab, result } = useLabCompletion();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
    );

    // Diffusion simulation
    useEffect(() => {
        if (!hasCrystal || diffusionProgress >= 100) return;

        const interval = setInterval(() => {
            setDiffusionProgress(prev => Math.min(100, prev + 2));
            setTimeElapsed(prev => prev + 1);
        }, 500);

        return () => clearInterval(interval);
    }, [hasCrystal, diffusionProgress]);

    // Check completion
    useEffect(() => {
        if (diffusionProgress >= 100 && !showSuccess) {
            setTimeout(() => setShowSuccess(true), 1000);
        }
    }, [diffusionProgress, showSuccess]);

    const handleDragStart = (event: DragStartEvent) => {
        if (event.active.id === 'crystal') setActiveCrystal(true);
    };

    const handleDragOver = (event: any) => {
        setHoveringBeaker(event.over?.id === 'beaker');
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveCrystal(false);
        setHoveringBeaker(false);

        if (event.over?.id !== 'beaker') return;

        if (hasCrystal) {
            showWarning("Crystal already in the beaker!");
            return;
        }

        setHasCrystal(true);
        setParticles(createParticles(400, 250, 20, '#A855F7'));
        setTimeout(() => setParticles([]), 1000);

        showProfessorSuccess("Watch the purple color spread through the water!");
    };

    const handleComplete = async () => {
        await completeLab('bio-diffusion', 150);
    };

    if (showSuccess) {
        return (
            <div className="fixed inset-0 z-[200] bg-gradient-to-br from-purple-900 to-black flex items-center justify-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center max-w-3xl px-8"
                >
                    <div className="text-9xl mb-8">💧✅</div>
                    <h1 className="text-4xl md:text-6xl font-black text-purple-400 mb-4 uppercase tracking-tight">
                        Diffusion Complete!
                    </h1>
                    <p className="text-xl text-zinc-300 mb-8">
                        You observed <span className="text-purple-400 font-bold">diffusion</span> — particles moving from
                        high to low concentration until evenly distributed!
                    </p>

                    <div className="grid grid-cols-2 gap-6 mb-10 max-w-md mx-auto">
                        <div className="p-6 rounded-3xl bg-[#1B1B2F] border border-[#3D3D5C]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Time</div>
                            <div className="text-3xl font-black text-white">{timeElapsed}s</div>
                        </div>
                        <div className="p-6 rounded-3xl bg-[#1B1B2F] border border-[#3D3D5C]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">XP Earned</div>
                            <div className="text-3xl font-black text-amber-400">
                                {result?.xpGain !== undefined ? `+${result.xpGain}` : '+150'}
                            </div>
                        </div>
                    </div>

                    <a
                        href="/practicals/science/biology"
                        onClick={handleComplete}
                        className="inline-block px-10 py-4 rounded-2xl bg-purple-500 text-white font-black uppercase tracking-widest hover:bg-purple-400 transition-colors"
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
                {/* Header - solid bg, high z-index */}
                <header className="relative z-50 h-16 bg-[#131325] border-b-4 border-[#3D3D5C] flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <a href="/practicals/science/biology" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
                            ← Exit Lab
                        </a>
                        <div className="h-6 w-px bg-zinc-700" />
                        <div className="text-sm font-black tracking-tight text-white">Diffusion in Liquids</div>
                    </div>
                    <div className="flex items-center gap-2 bg-[#1B1B2F] px-4 py-1.5 rounded-full border border-[#3D3D5C]">
                        <div className={`w-2 h-2 rounded-full ${hasCrystal ? 'bg-purple-500 animate-pulse' : 'bg-zinc-600'}`} />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                            {!hasCrystal ? 'Waiting' : diffusionProgress < 100 ? 'Diffusing...' : 'Complete'}
                        </span>
                    </div>
                </header>

                <div className="relative z-10 h-[calc(100vh-4rem)] flex">
                    {/* Left: Equipment */}
                    <aside className="w-72 bg-[#131325] border-r-4 border-[#3D3D5C] p-6">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">Equipment</div>
                        {!hasCrystal && <DraggableCrystal />}
                        {hasCrystal && (
                            <div className="p-6 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-center">
                                <div className="text-[10px] font-black uppercase tracking-widest text-purple-400">
                                    Crystal Added ✓
                                </div>
                            </div>
                        )}

                        <div className="mt-8 p-4 rounded-2xl bg-[#1B1B2F] border border-[#3D3D5C]">
                            <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-3">What&apos;s Happening?</div>
                            <p className="text-xs text-zinc-400 leading-relaxed">
                                KMnO₄ molecules have kinetic energy and move randomly, spreading from high concentration (crystal) to low (water).
                            </p>
                        </div>

                        {hasCrystal && (
                            <div className="mt-6 p-4 rounded-2xl bg-[#1B1B2F] border border-[#3D3D5C]">
                                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">Progress</div>
                                <div className="w-full h-3 rounded-full bg-zinc-800 overflow-hidden">
                                    <motion.div
                                        animate={{ width: `${diffusionProgress}%` }}
                                        className="h-full bg-purple-500"
                                    />
                                </div>
                                <div className="text-center mt-2 text-xs text-zinc-400">
                                    {diffusionProgress}% diffused
                                </div>
                            </div>
                        )}
                    </aside>

                    {/* Center: Beaker */}
                    <main className="flex-1 flex items-center justify-center p-8 relative">
                        <BeakerZone
                            diffusionProgress={diffusionProgress}
                            isHovering={hoveringBeaker}
                            hasCrystal={hasCrystal}
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

                <DragOverlay>
                    {activeCrystal && <DraggableCrystal isOverlay />}
                </DragOverlay>

                <ProfessorBright state={professor} />
            </div>
        </DndContext>
    );
}
