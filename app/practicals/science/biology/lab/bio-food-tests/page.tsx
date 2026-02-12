'use client';

import React, { useState, useEffect, useMemo } from 'react';
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

type Nutrient = 'starch' | 'protein' | 'lipid' | 'sugar' | 'none';
type ReagentType = 'iodine' | 'biuret' | 'benedicts' | 'ethanol' | 'water';

interface FoodSample {
    id: string;
    name: string;
    icon: string;
    nutrients: Nutrient[];
    color: string;
}

interface Reagent {
    id: ReagentType;
    name: string;
    color: string; // TailWind class for liquid color
}

interface TestTube {
    id: string;
    contents: {
        food: string | null;
        reagent: ReagentType | null;
        heated: boolean;
    };
    color: string; // Current visual color
    result: 'none' | 'positive' | 'negative' | 'cloudy';
}

const FOODS: FoodSample[] = [
    { id: 'potato', name: 'Potato Slice', icon: '🥔', nutrients: ['starch'], color: 'bg-amber-100' },
    { id: 'egg', name: 'Egg White', icon: '🥚', nutrients: ['protein'], color: 'bg-yellow-50' },
    { id: 'oil', name: 'Cooking Oil', icon: '🌻', nutrients: ['lipid'], color: 'bg-yellow-200' },
    { id: 'glucose', name: 'Glucose Solution', icon: '🍬', nutrients: ['sugar'], color: 'bg-blue-50' } // Clear liquid initially
];

const REAGENTS: Reagent[] = [
    { id: 'iodine', name: 'Iodine Solution', color: 'bg-amber-700' },
    { id: 'biuret', name: 'Biuret Reagent', color: 'bg-blue-500' },
    { id: 'benedicts', name: 'Benedict\'s Solution', color: 'bg-blue-400' },
    { id: 'ethanol', name: 'Ethanol', color: 'bg-gray-100' }, // Clear
    { id: 'water', name: 'Distilled Water', color: 'bg-blue-100' }
];

// ==========================================
// DRAGGABLES
// ==========================================

function DraggableItem({ id, name, icon, isOverlay, type }: { id: string; name: string; icon: string; isOverlay?: boolean; type: 'food' | 'reagent' }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

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
            <span className="text-2xl">{icon}</span>
            <div>
                <div className="text-sm font-black text-white">{name}</div>
                <div className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{type}</div>
            </div>
        </motion.div>
    );
}

// ==========================================
// TEST TUBE ZONE
// ==========================================

function TestTubeZone({
    tube,
    isHovering,
    onClick
}: {
    tube: TestTube;
    isHovering: boolean;
    onClick: () => void;
}) {
    const { setNodeRef } = useDroppable({ id: tube.id });

    return (
        <div className="flex flex-col items-center">
            <motion.div
                ref={setNodeRef}
                animate={isHovering ? { scale: 1.05, borderColor: '#3B82F6' } : { scale: 1 }}
                onClick={onClick}
                className={`
          relative w-16 h-48 rounded-b-3xl border-x-4 border-b-4 border-zinc-600/50 
          bg-zinc-800/20 overflow-hidden cursor-pointer transition-colors
          ${isHovering ? 'border-zinc-500' : ''}
        `}
            >
                {/* Liquid Content */}
                {tube.color && (
                    <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: tube.contents.reagent ? '60%' : tube.contents.food ? '30%' : '0%', backgroundColor: tube.color }}
                        className={`absolute bottom-0 w-full transition-all duration-1000 ${tube.contents.reagent ? '' : 'opacity-80'}`}
                        style={{ backgroundColor: tube.color }} // Use inline style for dynamic hex colors if needed
                    />
                )}

                {/* Cloudy Effect for Lipids */}
                {tube.result === 'cloudy' && (
                    <div className="absolute inset-0 bg-white/30 backdrop-blur-sm bottom-0 h-3/5 top-auto" />
                )}

            </motion.div>
            <div className="mt-3 text-center">
                <div className="text-[10px] font-black uppercase text-zinc-500">Tube {tube.id.split('-')[1]}</div>
                <div className="text-[9px] text-zinc-600">
                    {tube.contents.food ? FOODS.find(f => f.id === tube.contents.food)?.name : 'Empty'}
                </div>
            </div>
        </div>
    );
}

// ==========================================
// MAIN LAB: FOOD TESTS
// ==========================================

export default function FoodTestsLabPage() {
    const [tubes, setTubes] = useState<TestTube[]>([
        { id: 'tube-1', contents: { food: null, reagent: null, heated: false }, color: '', result: 'none' },
        { id: 'tube-2', contents: { food: null, reagent: null, heated: false }, color: '', result: 'none' },
        { id: 'tube-3', contents: { food: null, reagent: null, heated: false }, color: '', result: 'none' },
        { id: 'tube-4', contents: { food: null, reagent: null, heated: false }, color: '', result: 'none' }
    ]);

    const [activeId, setActiveId] = useState<string | null>(null);
    const [hoveringTube, setHoveringTube] = useState<string | null>(null);
    const [particles, setParticles] = useState<Particle[]>([]);
    const [showSuccess, setShowSuccess] = useState(false);
    const [completedTests, setCompletedTests] = useState<string[]>([]); // Track nutrients identified

    const { professor, showSuccess: showProfessorSuccess, showWarning, showHint } = useProfessor({
        initialMessage: "Identify the nutrients in these food samples using the correct reagents!"
    });

    const { completeLab, result } = useLabCompletion();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
    );

    const activeItem = useMemo(() => {
        const food = FOODS.find(f => f.id === activeId);
        if (food) return { ...food, type: 'food' as const };
        const reagent = REAGENTS.find(r => r.id === activeId);
        if (reagent) return { ...reagent, icon: '🧪', type: 'reagent' as const };
        return null;
    }, [activeId]);

    const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

    const handleDragOver = (event: any) => {
        setHoveringTube(event.over?.id ? (event.over.id as string) : null);
    };

    const calculateResult = (tube: TestTube): TestTube => {
        const { food: foodId, reagent, heated } = tube.contents;
        if (!foodId || !reagent) return tube;

        const food = FOODS.find(f => f.id === foodId)!;
        if (!food) return tube;

        let newColor = tube.color;
        let newResult: 'none' | 'positive' | 'negative' | 'cloudy' = 'none';
        let message = '';

        // Iodine -> Starch (Blue-Black)
        if (reagent === 'iodine') {
            if (food.nutrients.includes('starch')) {
                newColor = '#1e1b4b'; // Indigo-950
                newResult = 'positive';
                message = `Blue-Black! ${food.name} contains Starch.`;
            } else {
                newColor = '#b45309'; // Amber-700 (Iodine color)
                newResult = 'negative';
                message = `No change (Amber). ${food.name} has no Starch.`;
            }
        }

        // Biuret -> Protein (Purple)
        else if (reagent === 'biuret') {
            if (food.nutrients.includes('protein')) {
                newColor = '#9333ea'; // Purple-600
                newResult = 'positive';
                message = `Purple! ${food.name} contains Protein.`;
            } else {
                newColor = '#3b82f6'; // Blue-500 (Biuret color)
                newResult = 'negative';
                message = `Stays Blue. ${food.name} has no Protein.`;
            }
        }

        // Ethanol -> Lipids (White Emulsion)
        else if (reagent === 'ethanol') {
            // Need water added too? For sim simplicity, let's assume ethanol + water step combined or just ethanol check
            // Standard: Ethanol -> Shake -> Water -> Cloudy. 
            // Let's make it simpler: Add Ethanol -> Result.
            if (food.nutrients.includes('lipid')) {
                newColor = '#ffffff';
                newResult = 'cloudy';
                message = `Cloudy Emulsion! ${food.name} contains Lipids.`;
            } else {
                newColor = 'transparent';
                newResult = 'negative';
                message = `Stays Clear. ${food.name} has no Lipids.`;
            }
        }

        // Benedict's -> Glucose (Brick Red IF HEATED)
        else if (reagent === 'benedicts') {
            if (!heated) {
                newColor = '#60a5fa'; // Blue-400
                newResult = 'none'; // Pending heat
                message = `Added Benedict's. Now you must HEAT it!`;
                showHint("Benedict's solution requires heat to work! Click the heat button.");
                return { ...tube, color: newColor, result: newResult };
            } else {
                if (food.nutrients.includes('sugar')) {
                    newColor = '#ef4444'; // Red-500
                    newResult = 'positive';
                    message = `Brick Red! ${food.name} contains Reducing Sugars.`;
                } else {
                    newColor = '#60a5fa'; // Stays Blue
                    newResult = 'negative';
                    message = `Stays Blue. ${food.name} has no Reducing Sugars.`;
                }
            }
        }

        if (message && reagent !== 'benedicts') showProfessorSuccess(message);

        // Track completion
        if (newResult === 'positive' || newResult === 'cloudy') {
            setCompletedTests(prev => Array.from(new Set([...prev, food.nutrients[0]!])));
        }

        return { ...tube, color: newColor, result: newResult };
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        setHoveringTube(null);

        const { active, over } = event;
        if (!over) return;

        const targetTubeId = over.id as string;
        const tubeIndex = tubes.findIndex(t => t.id === targetTubeId);
        if (tubeIndex === -1) return;

        const tube = tubes[tubeIndex]!;
        const draggedId = active.id as string;

        const draggedFood = FOODS.find(f => f.id === draggedId);
        const draggedReagent = REAGENTS.find(r => r.id === draggedId);

        const newTubes = [...tubes];
        let updatedTube = { ...tube };

        if (draggedFood) {
            if (tube.contents.food) {
                showWarning("Tube already contains food! Use a fresh tube.");
                return;
            }
            updatedTube.contents = { ...tube.contents, food: draggedFood.id };
            // Initial color visual (crushed food)
            updatedTube.color = draggedFood.id === 'oil' ? '#fef08a' : '#e5e7eb';
            showProfessorSuccess(`Added ${draggedFood.name} to Tube ${tube.id.split('-')[1]}.`);
        }
        else if (draggedReagent) {
            if (!tube.contents.food) {
                showWarning("Add a food sample first!");
                return;
            }
            if (tube.contents.reagent) {
                showWarning("Reagent already added! Start over for a new test.");
                return;
            }
            updatedTube.contents = { ...tube.contents, reagent: draggedReagent.id };

            // Calculate Reaction
            updatedTube = calculateResult(updatedTube);

            // Particles
            setParticles(createParticles(400, 300, 30, updatedTube.color === 'transparent' ? '#ffffff' : updatedTube.color));
            setTimeout(() => setParticles([]), 1000);
        }

        newTubes[tubeIndex] = updatedTube;
        setTubes(newTubes);

        // Check All Found
        if (completedTests.length >= 4) { // starch, protein, lipid, sugar
            setTimeout(() => setShowSuccess(true), 2000);
        }
    };

    const handleHeat = (tubeId: string) => {
        setTubes(prev => prev.map(tube => {
            if (tube.id !== tubeId) return tube;
            if (!tube.contents.reagent) {
                showWarning("Add reagents first!");
                return tube;
            }
            if (tube.contents.reagent !== 'benedicts') {
                showWarning("Only Benedict's test requires heat!");
                return tube;
            }

            const heatedTube = { ...tube, contents: { ...tube.contents, heated: true } };
            const resultTube = calculateResult(heatedTube);

            if (resultTube.result === 'positive') {
                showProfessorSuccess("Heat Applied! Look at that color change!");
                setParticles(createParticles(400, 300, 40, '#ef4444'));
                setTimeout(() => setParticles([]), 1000);
            } else {
                showProfessorSuccess("Heat Applied! No color change observed.");
            }

            return resultTube;
        }));
    };

    const handleClear = () => {
        setTubes(prev => prev.map(t => ({
            ...t,
            contents: { food: null, reagent: null, heated: false },
            color: '',
            result: 'none'
        })));
    };

    const handleFinish = async () => {
        await completeLab('bio-food-tests', 300);
        setShowSuccess(true);
    };

    if (showSuccess) {
        return (
            <div className="fixed inset-0 z-[200] bg-gradient-to-br from-blue-900 to-black flex items-center justify-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center max-w-3xl px-8"
                >
                    <div className="text-9xl mb-8">🍱✅</div>
                    <h1 className="text-4xl md:text-6xl font-black text-blue-400 mb-4 uppercase tracking-tight">
                        Food Analysis Complete!
                    </h1>
                    <p className="text-xl text-zinc-300 mb-8">
                        You successfully identified <span className="text-blue-400 font-bold">Starch, Protein, Lipids, and Sugars</span>!
                    </p>

                    <div className="grid grid-cols-2 gap-6 mb-10 max-w-md mx-auto">
                        <div className="p-6 rounded-3xl bg-white/5 border border-[#3D3D5C]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Tests Mastered</div>
                            <div className="text-3xl font-black text-white">{completedTests.length}/4</div>
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
                        className="inline-block px-10 py-4 rounded-2xl bg-blue-500 text-white font-black uppercase tracking-widest hover:bg-blue-400 transition-colors"
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
                {/* Header - Solid & High Z-Index */}
                <header className="relative z-50 h-16 bg-[#131325] border-b-4 border-[#3D3D5C] flex items-center justify-between px-6">
                    <div className="flex items-center gap-4">
                        <a href="/practicals/science/biology" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
                            ← Exit Lab
                        </a>
                        <div className="h-6 w-px bg-zinc-700" />
                        <div className="text-sm font-black tracking-tight text-white">Food Tests Practical</div>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleClear}
                            className="px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500/20"
                        >
                            🗑️ Rinse Tubes
                        </button>
                        <div className="flex items-center gap-2 bg-[#1B1B2F] px-4 py-1.5 rounded-full border border-[#3D3D5C]">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                identified:
                            </span>
                            <div className="flex gap-1">
                                {['starch', 'protein', 'lipid', 'sugar'].map(n => (
                                    <div key={n} className={`w-2 h-2 rounded-full ${completedTests.includes(n) ? 'bg-emerald-500' : 'bg-zinc-700'}`} />
                                ))}
                            </div>
                        </div>
                        {completedTests.length >= 4 && (
                            <button
                                onClick={handleFinish}
                                className="px-6 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-400"
                            >
                                Finish
                            </button>
                        )}
                    </div>
                </header>

                <div className="relative z-10 h-[calc(100vh-4rem)] flex">
                    {/* Left: Reagents & Food */}
                    <aside className="w-80 bg-[#131325] border-r-4 border-[#3D3D5C] p-6 overflow-y-auto">

                        <div className="mb-8">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Food Samples</div>
                            <div className="grid grid-cols-1 gap-3">
                                {FOODS.map(f => (
                                    <DraggableItem key={f.id} {...f} type="food" />
                                ))}
                            </div>
                        </div>

                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Reagents</div>
                            <div className="grid grid-cols-1 gap-3">
                                {REAGENTS.map(r => (
                                    <DraggableItem key={r.id} {...r} icon="🧪" type="reagent" />
                                ))}
                            </div>
                        </div>

                    </aside>

                    {/* Center: Test Tube Rack */}
                    <main className="flex-1 p-8 flex flex-col items-center justify-center relative">

                        {/* Rack Visual */}
                        <div className="relative flex justify-center gap-8 p-8 rounded-3xl bg-[#1B1B2F] border border-[#3D3D5C] w-full max-w-4xl">
                            <div className="absolute -top-6 left-0 right-0 h-4 bg-zinc-800 rounded-lg mx-4" /> {/* Top bar sim */}

                            {tubes.map(tube => (
                                <div key={tube.id} className="flex flex-col items-center gap-2">
                                    <TestTubeZone
                                        tube={tube}
                                        isHovering={hoveringTube === tube.id}
                                        onClick={() => { }} // Click interaction if needed
                                    />
                                    {tube.contents.reagent === 'benedicts' && !tube.contents.heated && (
                                        <button
                                            onClick={() => handleHeat(tube.id)}
                                            className="mt-2 text-2xl hover:scale-110 active:scale-90 transition-transform"
                                            title="Heat with Bunsen Burner"
                                        >
                                            🔥
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="mt-12 text-center max-w-xl">
                            <h3 className="text-zinc-400 font-bold mb-2">Instructions</h3>
                            <p className="text-zinc-500 text-xs leading-relaxed">
                                1. Drag a <span className="text-zinc-300">Food Sample</span> into a test tube.<br />
                                2. Drag the correct <span className="text-zinc-300">Reagent</span> to test for nutrients.<br />
                                3. For Benedict&apos;s solution, click the <span className="text-red-400">🔥 Flame</span> icon to heat.<br />
                                4. Observe the color change to identify the nutrient!
                            </p>
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
                    {activeItem && <DraggableItem {...activeItem} isOverlay />}
                </DragOverlay>

                <ProfessorBright state={professor} />
            </div>
        </DndContext>
    );
}
