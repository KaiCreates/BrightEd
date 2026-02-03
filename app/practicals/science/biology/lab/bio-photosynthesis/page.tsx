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

type LeafState = 'fresh' | 'boiled' | 'decolorized' | 'rinsed' | 'stained';
type LeafColor = 'green' | 'pale_green' | 'white' | 'soft_white' | 'blue_black';

interface LabTool {
    id: string;
    name: string;
    icon: string;
    type: 'solution' | 'heat' | 'tool';
}

const TOOLS: LabTool[] = [
    { id: 'boiling_water', name: 'Boiling Water', icon: '♨️', type: 'heat' },
    { id: 'water_bath', name: 'Water Bath', icon: '🫧', type: 'heat' },
    { id: 'ethanol', name: 'Ethanol', icon: '🧪', type: 'solution' },
    { id: 'warm_water', name: 'Warm Water', icon: '💧', type: 'solution' },
    { id: 'iodine', name: 'Iodine', icon: '🟤', type: 'solution' },
    { id: 'forceps', name: 'Forceps', icon: '🥢', type: 'tool' },
];

// ==========================================
// DRAGGABLE TOOL
// ==========================================

function DraggableTool({ tool, isOverlay }: { tool: LabTool; isOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: tool.id
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
                <span className="text-2xl">{tool.icon}</span>
                <span className="text-sm font-black text-white">{tool.name}</span>
            </div>
        </motion.div>
    );
}

// ==========================================
// LEAF SPECIMEN (DROP TARGET)
// ==========================================

function LeafSpecimen({
    state,
    color,
    isHovering,
    isReject
}: {
    state: LeafState;
    color: LeafColor;
    isHovering: boolean;
    isReject: boolean;
}) {
    const { setNodeRef } = useDroppable({ id: 'leaf' });

    const colorMap: Record<LeafColor, string> = {
        green: 'bg-green-500',
        pale_green: 'bg-green-400/70',
        white: 'bg-gray-200',
        soft_white: 'bg-gray-100',
        blue_black: 'bg-indigo-900'
    };

    const stateLabels: Record<LeafState, string> = {
        fresh: 'Fresh Leaf',
        boiled: 'Boiled (Enzymes Killed)',
        decolorized: 'Decolorized (Chlorophyll Removed)',
        rinsed: 'Rinsed (Softened)',
        stained: 'Stained with Iodine'
    };

    return (
        <motion.div
            ref={setNodeRef}
            animate={
                isReject
                    ? { x: [0, -10, 10, -10, 10, 0], borderColor: 'rgba(239, 68, 68, 0.5)' }
                    : isHovering
                        ? { scale: 1.05, borderColor: 'rgba(16, 185, 129, 0.8)' }
                        : { scale: 1, borderColor: 'rgba(255, 255, 255, 0.1)' }
            }
            className={`
        relative p-8 rounded-[3rem] border-4 transition-all
        bg-gradient-to-br from-white/5 to-white/[0.02] 
        flex flex-col items-center justify-center min-h-[300px]
        ${isHovering ? 'shadow-2xl shadow-emerald-500/30' : ''}
      `}
        >
            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">
                Specimen
            </div>

            <motion.div
                animate={{
                    rotate: state === 'boiled' ? [0, 2, -2, 0] : 0,
                    scale: state === 'stained' ? [1, 1.05, 1] : 1
                }}
                transition={{ duration: 0.5 }}
                className={`
          w-40 h-40 rounded-[2.5rem] ${colorMap[color]} 
          flex items-center justify-center text-6xl
          shadow-2xl transition-all duration-500 relative overflow-hidden
        `}
            >
                {color === 'blue_black' && (
                    <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_30%,rgba(0,0,0,0.5)_100%)]" />
                )}
                🍃
            </motion.div>

            <div className="mt-6 text-center">
                <div className="text-lg font-black text-white">{stateLabels[state]}</div>
                <div className="text-[10px] text-zinc-500 mt-1 uppercase tracking-widest">
                    Color: {color.replace('_', ' ')}
                </div>
            </div>
        </motion.div>
    );
}

// ==========================================
// MAIN PHOTOSYNTHESIS LAB V2
// ==========================================

export default function PhotosynthesisLabV2Page() {
    const [leafState, setLeafState] = useState<LeafState>('fresh');
    const [leafColor, setLeafColor] = useState<LeafColor>('green');
    const [activeTool, setActiveTool] = useState<LabTool | null>(null);
    const [hoveringLeaf, setHoveringLeaf] = useState(false);
    const [rejectAction, setRejectAction] = useState(false);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [score, setScore] = useState(100);
    const [currentStep, setCurrentStep] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showFailure, setShowFailure] = useState(false);
    const [labLog, setLabLog] = useState<string[]>([]);

    const { professor, showSuccess: showProfessorSuccess, showWarning, showHint, resetToIdle } = useProfessor({
        initialMessage: "We need to test this leaf for starch. Start by boiling it!"
    });

    const { completeLab, result } = useLabCompletion();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
    );

    const addLog = (entry: string) => {
        setLabLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${entry}`]);
    };

    const steps = [
        { id: 0, tool: 'boiling_water', nextState: 'boiled', nextColor: 'pale_green', message: 'Leaf boiled! Enzymes denatured.' },
        { id: 1, tool: 'water_bath', nextState: 'decolorized', nextColor: 'white', message: 'Ethanol in water bath decolorized the leaf!' },
        { id: 2, tool: 'warm_water', nextState: 'rinsed', nextColor: 'soft_white', message: 'Leaf softened in warm water!' },
        { id: 3, tool: 'iodine', nextState: 'stained', nextColor: 'blue_black', message: 'Starch detected! The leaf turned blue-black!' }
    ];

    const handleDragStart = (event: DragStartEvent) => {
        const tool = TOOLS.find(t => t.id === event.active.id);
        setActiveTool(tool || null);
    };

    const handleDragOver = (event: any) => {
        if (event.over?.id === 'leaf') {
            setHoveringLeaf(true);
        } else {
            setHoveringLeaf(false);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveTool(null);
        setHoveringLeaf(false);
        setRejectAction(false);

        if (!over || over.id !== 'leaf') return;

        const toolId = active.id as string;
        const currentStepConfig = steps[currentStep];

        // SAFETY CHECK: Ethanol directly (without water bath first)
        if (toolId === 'ethanol' && currentStep < 1) {
            setShowFailure(true);
            return;
        }

        // Check if correct tool for current step
        if (currentStepConfig && toolId === currentStepConfig.tool) {
            // SUCCESS!
            setLeafState(currentStepConfig.nextState as LeafState);
            setLeafColor(currentStepConfig.nextColor as LeafColor);
            addLog(currentStepConfig.message);

            // Particle effect
            const color = currentStep === 3 ? '#3730A3' : '#10B981';
            setParticles(createParticles(400, 250, 25, color));
            setTimeout(() => setParticles([]), 1000);

            showProfessorSuccess(currentStepConfig.message);
            setCurrentStep(prev => prev + 1);

            if (currentStep === 3) {
                completeLab('bio-photosynthesis', 150, score);
                setTimeout(() => setShowSuccess(true), 2000);
            }
        } else {
            // Wrong tool
            setRejectAction(true);
            setTimeout(() => setRejectAction(false), 500);
            setScore(prev => prev - 5);

            const expectedTool = TOOLS.find(t => t.id === currentStepConfig?.tool);
            showWarning(`That's not the right step! Try using ${expectedTool?.name} first.`);
        }
    };

    if (showFailure) {
        return (
            <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-center max-w-2xl px-8"
                >
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
                        transition={{ repeat: Infinity, duration: 0.5 }}
                        className="text-9xl mb-8"
                    >
                        🔥
                    </motion.div>
                    <h1 className="text-4xl md:text-6xl font-black text-red-500 mb-6 uppercase tracking-tight">
                        Lab Safety Violation!
                    </h1>
                    <p className="text-xl text-white mb-8 leading-relaxed">
                        🧪 Ethanol is highly flammable! Never heat it with a direct flame.
                    </p>
                    <div className="p-6 rounded-3xl bg-red-500/10 border-2 border-red-500/30 mb-8">
                        <div className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-3">What You Should Have Done</div>
                        <p className="text-zinc-300 font-medium leading-relaxed">
                            Use a <span className="text-white font-bold">water bath</span>: Heat water first, then place the ethanol container in the hot water. This indirectly warms the ethanol safely.
                        </p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-10 py-4 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest hover:bg-red-400 transition-colors"
                    >
                        Restart Lab
                    </button>
                </motion.div>
            </div>
        );
    }

    if (showSuccess) {
        return (
            <div className="fixed inset-0 z-[200] bg-gradient-to-br from-indigo-900 to-black flex items-center justify-center">
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
                        🧪✅
                    </motion.div>
                    <h1 className="text-4xl md:text-6xl font-black text-indigo-400 mb-4 uppercase tracking-tight">
                        Starch Detected!
                    </h1>
                    <p className="text-xl text-zinc-300 mb-8">
                        The leaf turned <span className="text-indigo-400 font-bold">blue-black</span>, proving that
                        <span className="text-white font-bold"> photosynthesis</span> occurred and starch was produced!
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
                        className="inline-block px-10 py-4 rounded-2xl bg-indigo-500 text-white font-black uppercase tracking-widest hover:bg-indigo-400 transition-colors"
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
            <div className="fixed inset-0 bg-gradient-to-b from-[#0A1220] to-[#050A12] overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0">
                    <div className="absolute top-0 left-1/4 w-1/2 h-1/3 bg-emerald-500/5 blur-[200px] rounded-full" />
                    <div className="absolute bottom-0 right-1/3 w-1/3 h-1/3 bg-indigo-500/5 blur-[150px] rounded-full" />
                </div>

                {/* Header */}
                <header className="relative z-50 h-16 bg-[#131325]  border-b-4 border-[#3D3D5C] flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <a href="/practicals/science/biology" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
                            ← Exit Lab
                        </a>
                        <div className="h-6 w-px bg-white/10" />
                        <div className="text-sm font-black tracking-tight text-white">Testing a Leaf for Starch</div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            Step: <span className="text-emerald-400">{currentStep + 1}/4</span>
                        </div>
                        <div className="flex items-center gap-2 bg-black/30 px-4 py-1.5 rounded-full border border-[#3D3D5C]">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                Lab Active
                            </span>
                        </div>
                    </div>
                </header>

                <div className="relative z-10 h-[calc(100vh-4rem)] flex">
                    {/* Left: Tool Shelf */}
                    <aside className="w-72 bg-[#131325]  border-r border-[#3D3D5C] p-6 overflow-y-auto">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">
                            Equipment Shelf
                        </div>
                        <div className="space-y-3">
                            {TOOLS.map((tool) => (
                                <DraggableTool key={tool.id} tool={tool} />
                            ))}
                        </div>

                        {/* Step Guide */}
                        <div className="mt-8 p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20">
                            <div className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-2">Current Step</div>
                            <p className="text-xs text-zinc-400">
                                {currentStep === 0 && "Boil the leaf to kill enzymes"}
                                {currentStep === 1 && "Use water bath to decolorize with ethanol"}
                                {currentStep === 2 && "Rinse in warm water to soften"}
                                {currentStep === 3 && "Add iodine to test for starch"}
                            </p>
                        </div>
                    </aside>

                    {/* Center: Workbench */}
                    <main className="flex-1 flex items-center justify-center p-8 relative">
                        <LeafSpecimen
                            state={leafState}
                            color={leafColor}
                            isHovering={hoveringLeaf}
                            isReject={rejectAction}
                        />

                        {/* Particle Effects */}
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
                    </main>

                    {/* Right: Lab Log */}
                    <aside className="w-80 bg-[#131325]  border-l border-[#3D3D5C] p-6 overflow-y-auto">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">
                            Lab Notebook
                        </div>
                        <div className="space-y-2 font-mono text-xs">
                            {labLog.length === 0 ? (
                                <div className="text-zinc-600">Awaiting first action...</div>
                            ) : (
                                labLog.map((entry, i) => (
                                    <div key={i} className="text-zinc-400">{entry}</div>
                                ))
                            )}
                        </div>
                    </aside>
                </div>

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeTool && <DraggableTool tool={activeTool} isOverlay />}
                </DragOverlay>

                {/* Professor Bright */}
                <ProfessorBright state={professor} />
            </div>
        </DndContext>
    );
}
