'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
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
import {
    LabItem,
    ReactionRule,
    itemVariants,
    successVariants,
    shakeVariants,
    createParticles,
    Particle
} from '@/lib/science/virtual-lab.types';
import ProfessorBright, { useProfessor } from './ProfessorBright';

// ==========================================
// DRAGGABLE ITEM COMPONENT
// ==========================================

interface DraggableItemProps {
    item: LabItem;
    isOverlay?: boolean;
}

function DraggableItem({ item, isOverlay }: DraggableItemProps) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: item.id,
        disabled: !item.isDraggable
    });

    return (
        <motion.div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            variants={itemVariants}
            initial="hidden"
            animate={isDragging ? "dragging" : "visible"}
            whileHover={item.isDraggable ? "hover" : undefined}
            className={`
        p-4 rounded-2xl cursor-grab active:cursor-grabbing
        bg-[#1B1B2F]  border border-[#3D3D5C]
        transition-all select-none
        ${isDragging ? 'opacity-50' : ''}
        ${item.isDraggable ? 'hover:bg-white/[0.08] hover:border-emerald-500/30' : 'opacity-60 cursor-not-allowed'}
        ${isOverlay ? 'shadow-2xl shadow-emerald-500/20' : ''}
      `}
        >
            <div className="flex items-center gap-3">
                <span className="text-2xl">{item.icon}</span>
                <div>
                    <div className="text-sm font-black text-white">{item.name}</div>
                    <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                        {item.type} • {item.properties.state}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}

// ==========================================
// DROPPABLE ZONE COMPONENT
// ==========================================

interface DroppableZoneProps {
    id: string;
    item?: LabItem;
    label?: string;
    acceptTypes?: string[];
    onDrop?: (itemId: string) => void;
    className?: string;
    children?: React.ReactNode;
}

function DroppableZone({ id, item, label, className, children }: DroppableZoneProps) {
    const { isOver, setNodeRef } = useDroppable({ id });
    const controls = useAnimation();

    return (
        <motion.div
            ref={setNodeRef}
            animate={controls}
            className={`
        relative rounded-3xl border-2 border-dashed transition-all duration-300
        ${isOver
                    ? 'border-emerald-500 bg-emerald-500/10 scale-[1.02]'
                    : 'border-white/20 bg-[#131325]'
                }
        ${className}
      `}
        >
            {label && !item && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                        {label}
                    </span>
                </div>
            )}
            {children}
        </motion.div>
    );
}

// ==========================================
// PARTICLE EFFECT COMPONENT
// ==========================================

interface ParticleEffectProps {
    particles: Particle[];
}

function ParticleEffect({ particles }: ParticleEffectProps) {
    return (
        <>
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
        </>
    );
}

// ==========================================
// MAIN LAB WORKBENCH COMPONENT
// ==========================================

interface LabWorkbenchProps {
    labTitle: string;
    initialInventory: LabItem[];
    reactionRules: ReactionRule[];
    objectives: { id: string; description: string; completed: boolean }[];
    onComplete?: () => void;
    hints?: string[];
}

export default function LabWorkbench({
    labTitle,
    initialInventory,
    reactionRules,
    objectives,
    onComplete,
    hints = []
}: LabWorkbenchProps) {
    const [inventory, setInventory] = useState<LabItem[]>(initialInventory);
    const [workbenchItems, setWorkbenchItems] = useState<LabItem[]>([]);
    const [activeItem, setActiveItem] = useState<LabItem | null>(null);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [shake, setShake] = useState(false);
    const [hintIndex, setHintIndex] = useState(0);

    const { professor, showSuccess, showWarning, showHint, resetToIdle, recordInteraction } = useProfessor({
        initialMessage: "Welcome to the lab! Drag items from the shelf to the workbench."
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 8 }
        }),
        useSensor(TouchSensor, {
            activationConstraint: { delay: 200, tolerance: 8 }
        })
    );

    // Find a matching reaction rule
    const findReaction = useCallback((sourceId: string, targetId: string): ReactionRule | null => {
        return reactionRules.find(
            rule => rule.sourceId === sourceId && rule.targetId === targetId
        ) || null;
    }, [reactionRules]);

    const handleDragStart = (event: DragStartEvent) => {
        const item = inventory.find(i => i.id === event.active.id) ||
            workbenchItems.find(i => i.id === event.active.id);
        setActiveItem(item || null);
        recordInteraction();
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveItem(null);

        if (!over) return;

        const sourceItem = inventory.find(i => i.id === active.id) ||
            workbenchItems.find(i => i.id === active.id);

        if (!sourceItem) return;

        // Dropping onto workbench
        if (over.id === 'workbench' && !workbenchItems.find(i => i.id === sourceItem.id)) {
            setInventory(prev => prev.filter(i => i.id !== sourceItem.id));
            setWorkbenchItems(prev => [...prev, sourceItem]);
            return;
        }

        // Check for reaction
        const reaction = findReaction(sourceItem.id, over.id as string);

        if (reaction) {
            // SUCCESS! Apply reaction
            const particleColor = reaction.result.particleColor || '#10B981';
            const newParticles = createParticles(300, 200, 25, particleColor);
            setParticles(newParticles);

            // Clear particles after animation
            setTimeout(() => setParticles([]), 1000);

            // Update items based on reaction result
            // (This would replace the target with the outcome)
            showSuccess(reaction.result.professorComment);
        } else if (over.id !== 'workbench' && over.id !== 'shelf') {
            // Invalid combination
            setShake(true);
            setTimeout(() => setShake(false), 400);

            const failRule = reactionRules.find(r => r.sourceId === sourceItem.id)?.failResult;
            if (failRule) {
                showWarning(failRule.professorComment);
            }
        }
    };

    const handleHintRequest = () => {
        if (hints.length > 0) {
            showHint(hints[hintIndex % hints.length]);
            setHintIndex(prev => prev + 1);
        }
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="fixed inset-0 bg-[#050A12] overflow-hidden">
                {/* Lab Bench Background */}
                <div className="absolute inset-0">
                    {/* Grid pattern */}
                    <div
                        className="absolute inset-0 opacity-[0.03]"
                        style={{
                            backgroundImage: `
                linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
              `,
                            backgroundSize: '50px 50px'
                        }}
                    />
                    {/* Ambient glow */}
                    <div className="absolute top-0 left-1/4 w-1/2 h-1/3 bg-emerald-500/5 blur-[150px] rounded-full" />
                    <div className="absolute bottom-0 right-1/4 w-1/3 h-1/4 bg-blue-500/5 blur-[120px] rounded-full" />
                </div>

                {/* Header */}
                <header className="relative z-20 h-16 bg-[#131325]  border-b border-[#3D3D5C] flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <a href="/practicals/science/biology" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
                            ← Exit Lab
                        </a>
                        <div className="h-6 w-px bg-white/10" />
                        <div className="text-sm font-black tracking-tight text-white">{labTitle}</div>
                    </div>
                    <div className="flex items-center gap-3 bg-black/30 px-4 py-1.5 rounded-full border border-[#3D3D5C]">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                            Lab Active
                        </span>
                    </div>
                </header>

                <div className="relative z-10 flex h-[calc(100vh-4rem)]">
                    {/* Left Sidebar: The Shelf */}
                    <aside className="w-72 bg-[#131325]  border-r border-[#3D3D5C] p-6 overflow-y-auto">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">
                            Equipment Shelf
                        </div>
                        <div className="space-y-3">
                            {inventory.map((item) => (
                                <DraggableItem key={item.id} item={item} />
                            ))}
                        </div>
                    </aside>

                    {/* Center: The Workbench (Main Drop Zone) */}
                    <main className="flex-1 p-8 relative">
                        <motion.div
                            animate={shake ? "shake" : undefined}
                            variants={shakeVariants}
                        >
                            <DroppableZone
                                id="workbench"
                                label="Drop items here to work"
                                className="h-full min-h-[400px] p-6"
                            >
                                <div className="text-[9px] font-black uppercase tracking-widest text-zinc-600 mb-6">
                                    Workbench
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    {workbenchItems.map((item) => (
                                        <DraggableItem key={item.id} item={item} />
                                    ))}
                                </div>
                            </DroppableZone>
                        </motion.div>

                        {/* Particle Effects */}
                        <ParticleEffect particles={particles} />
                    </main>

                    {/* Right Sidebar: The Notebook */}
                    <aside className="w-80 bg-[#131325]  border-l border-[#3D3D5C] p-6 overflow-y-auto">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">
                            Lab Notebook
                        </div>

                        {/* Objectives */}
                        <div className="space-y-3">
                            {objectives.map((obj, i) => (
                                <div
                                    key={obj.id}
                                    className={`p-4 rounded-2xl border transition-all ${obj.completed
                                            ? 'bg-emerald-500/10 border-emerald-500/30'
                                            : 'bg-[#131325] border-[#3D3D5C]'
                                        }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center text-xs ${obj.completed
                                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                                : 'border-zinc-600'
                                            }`}>
                                            {obj.completed ? '✓' : i + 1}
                                        </div>
                                        <p className={`text-xs font-medium ${obj.completed ? 'text-emerald-400' : 'text-zinc-400'
                                            }`}>
                                            {obj.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </aside>
                </div>

                {/* Drag Overlay */}
                <DragOverlay>
                    {activeItem ? (
                        <DraggableItem item={activeItem} isOverlay />
                    ) : null}
                </DragOverlay>

                {/* Professor Bright */}
                <ProfessorBright
                    state={professor}
                    onHintRequest={handleHintRequest}
                />
            </div>
        </DndContext>
    );
}
