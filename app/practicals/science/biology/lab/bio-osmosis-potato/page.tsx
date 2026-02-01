'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScienceLabLayout from '@/components/science/ScienceLabLayout';
import { BrightLayer } from '@/components/system';
import { simulateOsmosis } from '@/lib/science/chemical-logic';
import { scoreEquipmentChoice } from '@/lib/science/lab-inventory';

interface PotatoStrip {
    id: string;
    initialLength: number;
    currentLength: number;
    solution: 'hypotonic' | 'isotonic' | 'hypertonic' | null;
    texture: 'turgid' | 'normal' | 'flaccid';
}

interface DataEntry {
    solution: string;
    initialLength: number;
    finalLength: number;
    change: number;
    changePercent: number;
}

export default function OsmosisLabPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [score, setScore] = useState(100);
    const [strips, setStrips] = useState<PotatoStrip[]>([]);
    const [cuttingActive, setCuttingActive] = useState(false);
    const [stripLength, setStripLength] = useState<number>(5.0);
    const [showResults, setShowResults] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [labLog, setLabLog] = useState<string[]>([]);

    const solutions = [
        { id: 'hypotonic', name: 'Distilled Water', color: 'bg-blue-400', icon: '💧' },
        { id: 'isotonic', name: '0.5M Sucrose', color: 'bg-gray-400', icon: '🧂' },
        { id: 'hypertonic', name: '1M Sucrose', color: 'bg-amber-500', icon: '🧂' }
    ];

    const addLog = useCallback((entry: string) => {
        setLabLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${entry}`]);
    }, []);

    const handleCutStrip = () => {
        if (strips.length >= 3) {
            addLog('Maximum 3 strips cut. Proceed to the next step.');
            return;
        }

        // Check for uniformity
        const variance = Math.abs(Math.random() * 0.4 - 0.2); // Simulate cutting precision
        const actualLength = +(stripLength + variance).toFixed(1);

        const newStrip: PotatoStrip = {
            id: `strip-${strips.length + 1}`,
            initialLength: actualLength,
            currentLength: actualLength,
            solution: null,
            texture: 'normal'
        };

        setStrips(prev => [...prev, newStrip]);
        addLog(`Potato strip #${strips.length + 1} cut to ${actualLength} cm.`);

        if (strips.length === 2) {
            // After 3rd strip, advance
            setCurrentStep(1);
        }
    };

    const handlePlaceInSolution = (stripId: string, solutionType: 'hypotonic' | 'isotonic' | 'hypertonic') => {
        setStrips(prev => prev.map(strip => {
            if (strip.id === stripId) {
                addLog(`Strip #${stripId.split('-')[1]} placed in ${solutionType === 'hypotonic' ? 'Distilled Water' : solutionType === 'isotonic' ? '0.5M Sucrose' : '1M Sucrose'}.`);
                return { ...strip, solution: solutionType };
            }
            return strip;
        }));

        // Check if all strips are placed
        const allPlaced = strips.filter(s => s.solution !== null).length === 2;
        if (allPlaced) {
            setCurrentStep(2);
        }
    };

    const handleFastForward = () => {
        addLog('Fast-forwarding 45 minutes...');
        setCurrentStep(3);

        // Simulate osmosis for each strip
        setStrips(prev => prev.map(strip => {
            if (strip.solution) {
                const result = simulateOsmosis(strip.solution, strip.initialLength, 45);
                return {
                    ...strip,
                    currentLength: result.finalLength,
                    texture: result.texture
                };
            }
            return strip;
        }));

        addLog('Time elapsed. Strips are ready for measurement.');
    };

    const handleMeasure = () => {
        setShowResults(true);
        setCurrentStep(4);
        addLog('All strips measured. Compiling results into data table.');
    };

    const data: DataEntry[] = useMemo(() => {
        return strips.map(strip => ({
            solution: strip.solution === 'hypotonic' ? 'Distilled Water' : strip.solution === 'isotonic' ? '0.5M Sucrose' : '1M Sucrose',
            initialLength: strip.initialLength,
            finalLength: strip.currentLength,
            change: +(strip.currentLength - strip.initialLength).toFixed(1),
            changePercent: +((strip.currentLength - strip.initialLength) / strip.initialLength * 100).toFixed(1)
        }));
    }, [strips]);

    const handleComplete = () => {
        setShowSuccess(true);
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
                        🥔✅
                    </motion.div>
                    <h1 className="text-4xl md:text-6xl font-black text-emerald-400 mb-4 uppercase tracking-tight">
                        Practical Complete
                    </h1>
                    <p className="text-xl text-zinc-300 mb-8 leading-relaxed">
                        You demonstrated that water moves by <span className="text-emerald-400 font-bold">osmosis</span> from
                        regions of high water potential to regions of low water potential.
                    </p>

                    <div className="grid grid-cols-2 gap-6 mb-10 max-w-md mx-auto">
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Final Score</div>
                            <div className="text-3xl font-black text-emerald-400">{score}/100</div>
                        </div>
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">XP Earned</div>
                            <div className="text-3xl font-black text-amber-400">+250</div>
                        </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-blue-900/30 border border-blue-500/20 text-left mb-8">
                        <div className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-3">Key Conclusion</div>
                        <p className="text-zinc-200 font-medium">
                            In <span className="text-blue-400 font-bold">hypotonic solutions</span> (distilled water), water enters the potato cells, making them turgid.
                            In <span className="text-amber-400 font-bold">hypertonic solutions</span> (concentrated salt), water leaves the cells, causing them to become flaccid.
                        </p>
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
        <ScienceLabLayout
            labTitle="Osmosis: Potato Strip Experiment"
            syllabusSection="Section B: Life Processes"
            objectives={[
                'Cut uniform potato strips',
                'Place strips in solutions of varying concentrations',
                'Measure changes in length and texture',
                'Graph and analyze results'
            ]}
            equipment={[
                { name: 'Cork Borer', icon: '⭕' },
                { name: 'Ruler', icon: '📏' },
                { name: 'Scalpel', icon: '🔪' },
                { name: 'Beakers (3)', icon: '🫙' },
                { name: 'Distilled Water', icon: '💧' },
                { name: 'Sucrose Solutions', icon: '🧂' },
                { name: 'Forceps', icon: '🥢' }
            ]}
            currentStep={currentStep}
            totalSteps={5}
        >
            <div className="h-full flex flex-col p-8 overflow-y-auto">
                {/* Active Step Instruction */}
                <div className="mb-8">
                    <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Step {currentStep + 1} of 5</span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-white mb-2">
                        {currentStep === 0 && 'Cut Potato Strips'}
                        {currentStep === 1 && 'Place Strips in Solutions'}
                        {currentStep === 2 && 'Wait for Osmosis'}
                        {currentStep === 3 && 'Measure & Record'}
                        {currentStep === 4 && 'Analyze Results'}
                    </h2>
                    <p className="text-zinc-400 font-medium">
                        {currentStep === 0 && 'Use the cork borer to cut 3 uniform potato strips of identical length.'}
                        {currentStep === 1 && 'Drag each strip into a different solution beaker.'}
                        {currentStep === 2 && 'Fast-forward time to allow osmosis to occur.'}
                        {currentStep === 3 && 'Measure the final length of each strip.'}
                        {currentStep === 4 && 'Review the data table and answer the analysis question.'}
                    </p>
                </div>

                {/* Main Workbench */}
                <div className="flex-1 grid grid-cols-2 gap-8">
                    {/* Left: Cutting Station / Strips */}
                    <div>
                        {currentStep === 0 && (
                            <BrightLayer variant="elevated" padding="lg" className="h-full">
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">Cutting Station</div>

                                <div className="flex flex-col items-center justify-center h-[calc(100%-4rem)]">
                                    <div className="w-48 h-48 bg-amber-700 rounded-3xl flex items-center justify-center text-6xl mb-8 shadow-2xl">
                                        🥔
                                    </div>

                                    <div className="w-full max-w-xs mb-6">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2 block">Target Length (cm)</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="range"
                                                min={3}
                                                max={7}
                                                step={0.5}
                                                value={stripLength}
                                                onChange={(e) => setStripLength(parseFloat(e.target.value))}
                                                className="flex-1 accent-emerald-500"
                                            />
                                            <span className="text-xl font-black text-white w-16 text-center">{stripLength}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleCutStrip}
                                        disabled={strips.length >= 3}
                                        className={`px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all ${strips.length >= 3
                                                ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                                                : 'bg-emerald-500 text-white hover:bg-emerald-400'
                                            }`}
                                    >
                                        Cut Strip ({strips.length}/3)
                                    </button>
                                </div>
                            </BrightLayer>
                        )}

                        {currentStep >= 1 && currentStep < 4 && (
                            <BrightLayer variant="elevated" padding="lg" className="h-full">
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">Potato Strips</div>
                                <div className="space-y-4">
                                    {strips.map((strip, i) => (
                                        <div key={strip.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${strip.texture === 'turgid' ? 'bg-blue-500' : strip.texture === 'flaccid' ? 'bg-amber-800' : 'bg-amber-600'
                                                    }`}>
                                                    🥔
                                                </div>
                                                <div>
                                                    <div className="text-sm font-black text-white">Strip #{i + 1}</div>
                                                    <div className="text-xs text-zinc-400">
                                                        {strip.solution ? (
                                                            <span className={`${strip.solution === 'hypotonic' ? 'text-blue-400' : strip.solution === 'hypertonic' ? 'text-amber-400' : 'text-zinc-400'}`}>
                                                                In {strip.solution === 'hypotonic' ? 'Distilled Water' : strip.solution === 'isotonic' ? '0.5M Sucrose' : '1M Sucrose'}
                                                            </span>
                                                        ) : 'Not placed'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-black text-white">{strip.currentLength} cm</div>
                                                {currentStep >= 3 && strip.solution && (
                                                    <div className={`text-xs font-black ${strip.currentLength > strip.initialLength ? 'text-blue-400' : strip.currentLength < strip.initialLength ? 'text-red-400' : 'text-zinc-400'}`}>
                                                        {strip.currentLength > strip.initialLength ? '+' : ''}{(strip.currentLength - strip.initialLength).toFixed(1)} cm
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {currentStep === 2 && (
                                    <button
                                        onClick={handleFastForward}
                                        className="mt-8 w-full px-8 py-4 rounded-2xl bg-blue-500 text-white font-black text-sm uppercase tracking-widest hover:bg-blue-400 transition-all"
                                    >
                                        ⏩ Fast Forward 45 Minutes
                                    </button>
                                )}

                                {currentStep === 3 && (
                                    <button
                                        onClick={handleMeasure}
                                        className="mt-8 w-full px-8 py-4 rounded-2xl bg-emerald-500 text-white font-black text-sm uppercase tracking-widest hover:bg-emerald-400 transition-all"
                                    >
                                        📏 Measure All Strips
                                    </button>
                                )}
                            </BrightLayer>
                        )}

                        {currentStep === 4 && (
                            <BrightLayer variant="elevated" padding="lg" className="h-full">
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">Data Table</div>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                            <th className="pb-4">Solution</th>
                                            <th className="pb-4">Initial (cm)</th>
                                            <th className="pb-4">Final (cm)</th>
                                            <th className="pb-4">Change (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {data.map((row, i) => (
                                            <tr key={i} className="border-t border-white/5">
                                                <td className="py-3 font-bold text-white">{row.solution}</td>
                                                <td className="py-3 text-zinc-400">{row.initialLength}</td>
                                                <td className="py-3 text-zinc-400">{row.finalLength}</td>
                                                <td className={`py-3 font-black ${row.changePercent > 0 ? 'text-emerald-400' : row.changePercent < 0 ? 'text-red-400' : 'text-zinc-400'}`}>
                                                    {row.changePercent > 0 ? '+' : ''}{row.changePercent}%
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </BrightLayer>
                        )}
                    </div>

                    {/* Right: Solutions / Analysis */}
                    <div>
                        {currentStep === 1 && (
                            <BrightLayer variant="elevated" padding="lg" className="h-full">
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">Solution Beakers</div>
                                <div className="space-y-4">
                                    {solutions.map((sol) => {
                                        const stripInSolution = strips.find(s => s.solution === sol.id);
                                        return (
                                            <div
                                                key={sol.id}
                                                className={`p-6 rounded-3xl border-2 transition-all ${stripInSolution
                                                        ? 'border-emerald-500/50 bg-emerald-500/5'
                                                        : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-12 h-12 rounded-2xl ${sol.color} flex items-center justify-center text-2xl`}>
                                                            {sol.icon}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-black text-white">{sol.name}</div>
                                                            <div className="text-[10px] font-bold text-zinc-500 uppercase">
                                                                {sol.id === 'hypotonic' ? 'Hypotonic' : sol.id === 'isotonic' ? 'Isotonic' : 'Hypertonic'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {stripInSolution && (
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">✓ Strip Added</span>
                                                    )}
                                                </div>
                                                {!stripInSolution && (
                                                    <div className="flex gap-2">
                                                        {strips.filter(s => !s.solution).map((strip, i) => (
                                                            <button
                                                                key={strip.id}
                                                                onClick={() => handlePlaceInSolution(strip.id, sol.id as any)}
                                                                className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-xs font-black text-zinc-300 hover:bg-white/10 transition-all"
                                                            >
                                                                Add Strip #{i + 1}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </BrightLayer>
                        )}

                        {currentStep === 4 && (
                            <BrightLayer variant="elevated" padding="lg" className="h-full flex flex-col">
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">Analysis Question</div>

                                <div className="p-6 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 mb-6">
                                    <p className="text-white font-medium leading-relaxed">
                                        Why did the potato strip in the <span className="text-amber-400 font-bold">concentrated sucrose solution</span> become shorter and floppier?
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <button
                                        onClick={() => {
                                            addLog('Incorrect answer selected: Sugar entered the potato.');
                                            setScore(prev => prev - 10);
                                        }}
                                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-left hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                                    >
                                        <span className="text-sm font-bold text-zinc-300">A) Sugar entered the potato cells.</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            addLog('Correct answer: Water left the potato by osmosis.');
                                            handleComplete();
                                        }}
                                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-left hover:bg-emerald-500/10 hover:border-emerald-500/20 transition-all"
                                    >
                                        <span className="text-sm font-bold text-zinc-300">B) Water left the potato cells by osmosis, moving to the region of lower water potential.</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            addLog('Incorrect answer selected.');
                                            setScore(prev => prev - 10);
                                        }}
                                        className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 text-left hover:bg-red-500/10 hover:border-red-500/20 transition-all"
                                    >
                                        <span className="text-sm font-bold text-zinc-300">C) The potato cells absorbed salt.</span>
                                    </button>
                                </div>
                            </BrightLayer>
                        )}
                    </div>
                </div>

                {/* Lab Log */}
                <div className="mt-8 p-4 rounded-2xl bg-black/40 border border-white/5 max-h-32 overflow-y-auto font-mono text-xs text-zinc-400">
                    {labLog.length === 0 ? (
                        <div className="text-zinc-600">Lab session started. Awaiting actions...</div>
                    ) : (
                        labLog.map((entry, i) => <div key={i}>{entry}</div>)
                    )}
                </div>
            </div>
        </ScienceLabLayout>
    );
}
