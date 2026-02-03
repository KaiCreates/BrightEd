'use client';

import React, { useState, useCallback } from 'react';
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

interface Organism {
    id: string;
    name: string;
    icon: string;
    kingdom: 'Plantae' | 'Animalia' | 'Fungi';
    features: string[];
}

const ORGANISMS: Organism[] = [
    { id: 'fern', name: 'Fern', icon: '🌿', kingdom: 'Plantae', features: ['Non-flowering', 'Spore reproduction', 'Vascular'] },
    { id: 'hibiscus', name: 'Hibiscus', icon: '🌺', kingdom: 'Plantae', features: ['Flowering', 'Dicot', 'Broad leaves'] },
    { id: 'corn', name: 'Corn', icon: '🌽', kingdom: 'Plantae', features: ['Flowering', 'Monocot', 'Parallel veins'] },
    { id: 'mushroom', name: 'Mushroom', icon: '🍄', kingdom: 'Fungi', features: ['No chlorophyll', 'Spore reproduction', 'Decomposer'] },
    { id: 'butterfly', name: 'Butterfly', icon: '🦋', kingdom: 'Animalia', features: ['Invertebrate', 'Exoskeleton', 'Metamorphosis'] },
    { id: 'lizard', name: 'Lizard', icon: '🦎', kingdom: 'Animalia', features: ['Vertebrate', 'Cold-blooded', 'Scales'] },
];

// ==========================================
// DRAGGABLE SPECIMEN
// ==========================================

function DraggableSpecimen({ organism, isOverlay }: { organism: Organism; isOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: organism.id
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
        p-6 rounded-3xl cursor-grab active:cursor-grabbing
        bg-[#1B1B2F]  border border-[#3D3D5C]
        transition-all select-none flex flex-col items-center gap-3
        hover:bg-white/[0.08] hover:border-emerald-500/30
        ${isOverlay ? 'shadow-2xl shadow-emerald-500/20 scale-110' : ''}
      `}
        >
            <span className="text-5xl">{organism.icon}</span>
            <div className="text-center">
                <div className="text-sm font-black text-white">{organism.name}</div>
                <div className="text-[9px] text-zinc-500 mt-1">{organism.features.slice(0, 2).join(' • ')}</div>
            </div>
        </motion.div>
    );
}

// ==========================================
// KINGDOM JAR (DROP TARGET)
// ==========================================

type Kingdom = 'Plantae' | 'Animalia' | 'Fungi';

const kingdomConfig: Record<Kingdom, { color: string; icon: string; bgColor: string }> = {
    Plantae: { color: 'emerald', icon: '🌱', bgColor: 'from-emerald-500/20 to-green-600/20' },
    Animalia: { color: 'orange', icon: '🦁', bgColor: 'from-orange-500/20 to-amber-600/20' },
    Fungi: { color: 'purple', icon: '🍄', bgColor: 'from-purple-500/20 to-violet-600/20' }
};

function KingdomJar({
    kingdom,
    organisms,
    isHovering,
    isReject
}: {
    kingdom: Kingdom;
    organisms: Organism[];
    isHovering: boolean;
    isReject: boolean;
}) {
    const { setNodeRef } = useDroppable({ id: kingdom });
    const config = kingdomConfig[kingdom];

    return (
        <motion.div
            ref={setNodeRef}
            animate={
                isReject
                    ? { x: [0, -5, 5, -5, 5, 0], borderColor: 'rgba(239, 68, 68, 0.5)' }
                    : isHovering
                        ? { scale: 1.05, borderColor: 'rgba(16, 185, 129, 0.8)' }
                        : { scale: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }
            }
            transition={{ duration: 0.3 }}
            className={`
        relative p-6 rounded-[2rem] border-2 transition-all min-h-[250px]
        bg-gradient-to-br ${config.bgColor} 
        ${isHovering ? 'shadow-2xl shadow-emerald-500/20' : ''}
      `}
        >
            {/* Jar Lid Animation */}
            <motion.div
                animate={isHovering ? { y: -10, rotate: -15 } : { y: 0, rotate: 0 }}
                className="absolute -top-4 left-1/2 -translate-x-1/2 w-24 h-6 rounded-t-xl bg-white/10 border border-white/20"
            />

            <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{config.icon}</span>
                <div>
                    <div className="text-lg font-black text-white">{kingdom}</div>
                    <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest">
                        {organisms.length} collected
                    </div>
                </div>
            </div>

            {/* Collected Organisms */}
            <div className="flex flex-wrap gap-2">
                {organisms.map((org) => (
                    <motion.div
                        key={org.id}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-2xl"
                    >
                        {org.icon}
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}

// ==========================================
// MAIN CLASSIFICATION LAB V2
// ==========================================

export default function ClassificationLabV2Page() {
    const [unclassified, setUnclassified] = useState<Organism[]>(ORGANISMS);
    const [classified, setClassified] = useState<Record<Kingdom, Organism[]>>({
        Plantae: [],
        Animalia: [],
        Fungi: []
    });
    const [activeOrganism, setActiveOrganism] = useState<Organism | null>(null);
    const [hoveringKingdom, setHoveringKingdom] = useState<Kingdom | null>(null);
    const [rejectKingdom, setRejectKingdom] = useState<Kingdom | null>(null);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [score, setScore] = useState(100);
    const [showSuccess, setShowSuccess] = useState(false);

    const { professor, showSuccess: showProfessorSuccess, showWarning, showHint, resetToIdle } = useProfessor({
        initialMessage: "Drag each specimen into the correct kingdom jar!"
    });

    const { completeLab, result } = useLabCompletion();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const org = unclassified.find(o => o.id === event.active.id);
        setActiveOrganism(org || null);
    };

    const handleDragOver = (event: any) => {
        const { over, active } = event;
        if (!over || !active) {
            setHoveringKingdom(null);
            setRejectKingdom(null);
            return;
        }

        const organism = unclassified.find(o => o.id === active.id);
        const targetKingdom = over.id as Kingdom;

        if (['Plantae', 'Animalia', 'Fungi'].includes(targetKingdom)) {
            if (organism?.kingdom === targetKingdom) {
                setHoveringKingdom(targetKingdom);
                setRejectKingdom(null);
            } else {
                setHoveringKingdom(null);
                setRejectKingdom(targetKingdom);
            }
        } else {
            setHoveringKingdom(null);
            setRejectKingdom(null);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveOrganism(null);
        setHoveringKingdom(null);
        setRejectKingdom(null);

        if (!over) return;

        const organism = unclassified.find(o => o.id === active.id);
        const targetKingdom = over.id as Kingdom;

        if (!organism || !['Plantae', 'Animalia', 'Fungi'].includes(targetKingdom)) return;

        if (organism.kingdom === targetKingdom) {
            // CORRECT!
            setUnclassified(prev => prev.filter(o => o.id !== organism.id));
            setClassified(prev => ({
                ...prev,
                [targetKingdom]: [...prev[targetKingdom], organism]
            }));

            // Particle explosion
            const color = targetKingdom === 'Plantae' ? '#10B981' :
                targetKingdom === 'Animalia' ? '#F97316' : '#8B5CF6';
            setParticles(createParticles(400, 300, 30, color));
            setTimeout(() => setParticles([]), 1000);

            showProfessorSuccess(`Excellent! ${organism.name} belongs to Kingdom ${targetKingdom}!`);

            // Check if all classified
            if (unclassified.length === 1) {
                completeLab('bio-classification', 150, score);
                setTimeout(() => setShowSuccess(true), 1500);
            }
        } else {
            // WRONG!
            setScore(prev => prev - 10);
            showWarning(`Careful! ${organism.name} doesn't belong in ${targetKingdom}. Look at its features!`);
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
                        🔬✅
                    </motion.div>
                    <h1 className="text-4xl md:text-6xl font-black text-emerald-400 mb-4 uppercase tracking-tight">
                        Classification Complete!
                    </h1>
                    <p className="text-xl text-zinc-300 mb-8">
                        You correctly classified all organisms into their kingdoms!
                    </p>
                    <div className="grid grid-cols-2 gap-6 mb-10 max-w-md mx-auto">
                        <div className="p-6 rounded-3xl bg-white/5 border border-[#3D3D5C]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Score</div>
                            <div className="text-3xl font-black text-emerald-400">{score}/100</div>
                        </div>
                        <div className="p-6 rounded-3xl bg-white/5 border border-[#3D3D5C]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">XP Earned</div>
                            <div className="text-3xl font-black text-amber-400">
                                {result?.xpGain !== undefined ? `+${result.xpGain}` : '+150'}
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
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className="fixed inset-0 bg-gradient-to-b from-[#0A1628] to-[#050A12] overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0">
                    <div className="absolute top-0 left-1/3 w-1/2 h-1/3 bg-emerald-500/5 blur-[200px] rounded-full" />
                    <div className="absolute bottom-0 right-1/4 w-1/3 h-1/3 bg-purple-500/5 blur-[150px] rounded-full" />
                </div>

                {/* Header */}
                <header className="relative z-50 h-16 bg-[#131325]  border-b-4 border-[#3D3D5C] flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <a href="/practicals/science/biology" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
                            ← Exit Lab
                        </a>
                        <div className="h-6 w-px bg-white/10" />
                        <div className="text-sm font-black tracking-tight text-white">Classification of Organisms</div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            Score: <span className="text-emerald-400">{score}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-black/30 px-4 py-1.5 rounded-full border border-[#3D3D5C]">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                {unclassified.length} to classify
                            </span>
                        </div>
                    </div>
                </header>

                <div className="relative z-10 h-[calc(100vh-4rem)] p-8 flex flex-col">
                    {/* Kingdom Jars */}
                    <div className="grid grid-cols-3 gap-6 mb-8">
                        {(['Plantae', 'Animalia', 'Fungi'] as Kingdom[]).map((kingdom) => (
                            <KingdomJar
                                key={kingdom}
                                kingdom={kingdom}
                                organisms={classified[kingdom]}
                                isHovering={hoveringKingdom === kingdom}
                                isReject={rejectKingdom === kingdom}
                            />
                        ))}
                    </div>

                    {/* Specimen Garden */}
                    <div className="flex-1 p-8 rounded-[2rem] bg-gradient-to-b from-green-900/20 to-green-950/30 border border-[#3D3D5C] overflow-hidden relative">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-6">
                            🌳 Virtual Garden — Drag specimens to their kingdom
                        </div>
                        <div className="grid grid-cols-6 gap-4">
                            {unclassified.map((org) => (
                                <DraggableSpecimen key={org.id} organism={org} />
                            ))}
                        </div>

                        {/* Particle Effect */}
                        {particles.map((p) => (
                            <motion.div
                                key={p.id}
                                initial={{ x: p.x, y: p.y, scale: 1, opacity: 1 }}
                                animate={{
                                    x: p.x + p.velocity.x,
                                    y: p.y + p.velocity.y,
                                    scale: 0,
                                    opacity: 0
                                }}
                                transition={{ duration: 0.8, ease: "easeOut" }}
                                className="absolute pointer-events-none rounded-full"
                                style={{
                                    width: p.size,
                                    height: p.size,
                                    backgroundColor: p.color
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeOrganism && (
                        <DraggableSpecimen organism={activeOrganism} isOverlay />
                    )}
                </DragOverlay>

                {/* Professor Bright */}
                <ProfessorBright state={professor} />
            </div>
        </DndContext>
    );
}
