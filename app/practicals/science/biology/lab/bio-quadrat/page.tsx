'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScienceLabLayout from '@/components/science/ScienceLabLayout';
import { BrightLayer } from '@/components/system';

interface WeedPatch {
    x: number;
    y: number;
    counted: boolean;
}

interface QuadratThrow {
    x: number;
    y: number;
    count: number;
}

export default function QuadratLabPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [score, setScore] = useState(100);
    const [throws, setThrows] = useState<QuadratThrow[]>([]);
    const [quadratPosition, setQuadratPosition] = useState<{ x: number; y: number } | null>(null);
    const [weedsInQuadrat, setWeedsInQuadrat] = useState<WeedPatch[]>([]);
    const [countedWeeds, setCountedWeeds] = useState(0);
    const [showSuccess, setShowSuccess] = useState(false);
    const [labLog, setLabLog] = useState<string[]>([]);

    // Generate random weed patches for the field
    const fieldWeeds = useMemo(() => {
        const weeds: WeedPatch[] = [];
        const numWeeds = 40 + Math.floor(Math.random() * 30); // 40-70 weeds
        for (let i = 0; i < numWeeds; i++) {
            weeds.push({
                x: Math.random() * 100,
                y: Math.random() * 100,
                counted: false
            });
        }
        return weeds;
    }, []);

    const addLog = useCallback((entry: string) => {
        setLabLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${entry}`]);
    }, []);

    const handleThrowQuadrat = () => {
        // Random position for the 20x20 quadrat (in percentage of field)
        const x = Math.random() * 80; // Leave room for quadrat size
        const y = Math.random() * 80;

        setQuadratPosition({ x, y });

        // Find weeds within the quadrat
        const quadratSize = 20; // 20% of field = 1m² in a 5m × 5m field
        const inQuadrat = fieldWeeds.filter(weed =>
            weed.x >= x && weed.x <= x + quadratSize &&
            weed.y >= y && weed.y <= y + quadratSize
        ).map(w => ({ ...w, counted: false }));

        setWeedsInQuadrat(inQuadrat);
        setCountedWeeds(0);
        setCurrentStep(1);

        addLog(`Quadrat thrown at position (${x.toFixed(0)}%, ${y.toFixed(0)}%). ${inQuadrat.length} organisms visible.`);
    };

    const handleCountWeed = (index: number) => {
        setWeedsInQuadrat(prev => prev.map((w, i) =>
            i === index ? { ...w, counted: true } : w
        ));
        setCountedWeeds(prev => prev + 1);
    };

    const handleRecordThrow = () => {
        const newThrow: QuadratThrow = {
            x: quadratPosition?.x || 0,
            y: quadratPosition?.y || 0,
            count: countedWeeds
        };

        setThrows(prev => [...prev, newThrow]);
        addLog(`Sample #${throws.length + 1} recorded: ${countedWeeds} organisms counted.`);

        // Reset for next throw
        setQuadratPosition(null);
        setWeedsInQuadrat([]);
        setCountedWeeds(0);

        if (throws.length + 1 >= 10) {
            setCurrentStep(2);
        } else {
            setCurrentStep(0);
        }
    };

    const averageCount = useMemo(() => {
        if (throws.length === 0) return 0;
        return +(throws.reduce((sum, t) => sum + t.count, 0) / throws.length).toFixed(1);
    }, [throws]);

    // Estimate total population
    // Field is 5m × 5m = 25m², quadrat is 1m²
    const estimatedPopulation = useMemo(() => {
        return Math.round(averageCount * 25);
    }, [averageCount]);

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
                        🌿✅
                    </motion.div>
                    <h1 className="text-4xl md:text-6xl font-black text-emerald-400 mb-4 uppercase tracking-tight">
                        Field Study Complete
                    </h1>
                    <p className="text-xl text-zinc-300 mb-8 leading-relaxed">
                        You estimated the population of weeds in a {5}m × {5}m field using
                        <span className="text-emerald-400 font-bold"> random sampling</span> with a quadrat.
                    </p>

                    <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg mx-auto">
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Samples</div>
                            <div className="text-2xl font-black text-white">{throws.length}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Avg. Count</div>
                            <div className="text-2xl font-black text-emerald-400">{averageCount}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Est. Population</div>
                            <div className="text-2xl font-black text-amber-400">{estimatedPopulation}</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-10 max-w-md mx-auto">
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Final Score</div>
                            <div className="text-3xl font-black text-emerald-400">{score}/100</div>
                        </div>
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">XP Earned</div>
                            <div className="text-3xl font-black text-amber-400">+200</div>
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
        <ScienceLabLayout
            labTitle="Estimating Population with a Quadrat"
            syllabusSection="Section A: Living Organisms"
            objectives={[
                'Throw a quadrat randomly onto the field',
                'Count organisms within the quadrat',
                'Repeat at least 10 times for reliability',
                'Calculate average and estimate population'
            ]}
            equipment={[
                { name: 'Quadrat (1m²)', icon: '🔲' },
                { name: 'Tally Counter', icon: '🔢' },
                { name: 'Field Notebook', icon: '📓' },
                { name: 'Calculator', icon: '🧮' }
            ]}
            currentStep={currentStep}
            totalSteps={3}
        >
            <div className="h-full flex flex-col p-8 overflow-y-auto">
                {/* Active Step Instruction */}
                <div className="mb-8">
                    <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                            Samples: {throws.length}/10 (min)
                        </span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-white mb-2">
                        {currentStep === 0 && 'Throw the Quadrat'}
                        {currentStep === 1 && 'Count Organisms'}
                        {currentStep === 2 && 'Analyze Data'}
                    </h2>
                    <p className="text-zinc-400 font-medium">
                        {currentStep === 0 && 'Click the button to throw the quadrat randomly onto the field.'}
                        {currentStep === 1 && 'Click on each weed inside the quadrat to count it. Apply the >50% rule for border organisms.'}
                        {currentStep === 2 && 'Review your data and calculate the estimated population.'}
                    </p>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-8">
                    {/* Left: Virtual Field */}
                    <div className="relative">
                        <BrightLayer variant="elevated" padding="none" className="h-full overflow-hidden">
                            <div className="absolute top-4 left-4 z-10 text-[9px] font-black uppercase tracking-widest text-zinc-500 bg-black/60 px-3 py-1 rounded-full">
                                Virtual Field (5m × 5m)
                            </div>

                            {/* Field Background */}
                            <div className="absolute inset-0 bg-gradient-to-br from-green-900 to-green-950">
                                {/* Grass texture simulation */}
                                <div className="absolute inset-0 opacity-30" style={{
                                    backgroundImage: `radial-gradient(circle, #22c55e 1px, transparent 1px)`,
                                    backgroundSize: '8px 8px'
                                }} />
                            </div>

                            {/* Weed Patches */}
                            {fieldWeeds.map((weed, i) => (
                                <div
                                    key={i}
                                    className="absolute w-3 h-3 text-xs"
                                    style={{ left: `${weed.x}%`, top: `${weed.y}%` }}
                                >
                                    🌿
                                </div>
                            ))}

                            {/* Quadrat Overlay */}
                            {quadratPosition && (
                                <motion.div
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="absolute border-4 border-yellow-400 bg-yellow-400/10"
                                    style={{
                                        left: `${quadratPosition.x}%`,
                                        top: `${quadratPosition.y}%`,
                                        width: '20%',
                                        height: '20%'
                                    }}
                                >
                                    <div className="absolute -top-6 left-0 text-[8px] font-black uppercase tracking-widest text-yellow-400 bg-black/60 px-2 py-1 rounded">
                                        1m² Quadrat
                                    </div>
                                </motion.div>
                            )}

                            {/* Action Button */}
                            {currentStep === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <button
                                        onClick={handleThrowQuadrat}
                                        className="px-10 py-4 rounded-2xl bg-yellow-500 text-black font-black text-sm uppercase tracking-widest hover:bg-yellow-400 transition-all shadow-2xl"
                                    >
                                        🎲 Throw Quadrat Randomly
                                    </button>
                                </div>
                            )}
                        </BrightLayer>
                    </div>

                    {/* Right: Counting Interface / Data */}
                    <div>
                        {currentStep === 1 && (
                            <BrightLayer variant="elevated" padding="lg" className="h-full flex flex-col">
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">
                                    Organisms in Quadrat
                                </div>

                                <div className="flex-1 grid grid-cols-4 gap-3 overflow-y-auto mb-6">
                                    {weedsInQuadrat.map((weed, i) => (
                                        <button
                                            key={i}
                                            onClick={() => !weed.counted && handleCountWeed(i)}
                                            disabled={weed.counted}
                                            className={`aspect-square rounded-2xl flex items-center justify-center text-2xl transition-all ${weed.counted
                                                    ? 'bg-emerald-500/20 border-2 border-emerald-500 scale-95'
                                                    : 'bg-white/5 border-2 border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/5'
                                                }`}
                                        >
                                            {weed.counted ? '✅' : '🌿'}
                                        </button>
                                    ))}
                                    {weedsInQuadrat.length === 0 && (
                                        <div className="col-span-4 text-center text-zinc-500 py-10">
                                            No organisms in this quadrat area.
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10 mb-4">
                                    <span className="text-sm font-bold text-zinc-400">Count:</span>
                                    <span className="text-2xl font-black text-emerald-400">{countedWeeds}</span>
                                </div>

                                <button
                                    onClick={handleRecordThrow}
                                    className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest hover:bg-emerald-400 transition-all"
                                >
                                    Record & Continue
                                </button>
                            </BrightLayer>
                        )}

                        {currentStep === 2 && (
                            <BrightLayer variant="elevated" padding="lg" className="h-full flex flex-col">
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">
                                    Sample Data
                                </div>

                                <div className="flex-1 overflow-y-auto mb-6">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-left text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                <th className="pb-3">Sample #</th>
                                                <th className="pb-3">Count</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {throws.map((t, i) => (
                                                <tr key={i} className="border-t border-white/5">
                                                    <td className="py-2 text-zinc-400">Sample {i + 1}</td>
                                                    <td className="py-2 font-black text-white">{t.count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex justify-between">
                                        <span className="text-sm font-bold text-zinc-400">Average per m²:</span>
                                        <span className="text-lg font-black text-emerald-400">{averageCount}</span>
                                    </div>
                                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex justify-between">
                                        <span className="text-sm font-bold text-zinc-400">Est. Total (25m²):</span>
                                        <span className="text-lg font-black text-white">{estimatedPopulation} weeds</span>
                                    </div>
                                </div>

                                {throws.length < 10 ? (
                                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center mb-4">
                                        <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                                            ⚠️ Low Reliability: Take at least 10 samples
                                        </span>
                                    </div>
                                ) : null}

                                <button
                                    onClick={handleComplete}
                                    disabled={throws.length < 5}
                                    className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest transition-all ${throws.length >= 5
                                            ? 'bg-emerald-500 text-white hover:bg-emerald-400'
                                            : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                                        }`}
                                >
                                    Complete Field Study
                                </button>
                            </BrightLayer>
                        )}

                        {currentStep === 0 && throws.length > 0 && (
                            <BrightLayer variant="elevated" padding="lg" className="h-full">
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">
                                    Samples Collected
                                </div>
                                <div className="space-y-3">
                                    {throws.map((t, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-white/5 border border-white/10">
                                            <span className="text-sm font-bold text-zinc-400">Sample {i + 1}</span>
                                            <span className="font-black text-emerald-400">{t.count} organisms</span>
                                        </div>
                                    ))}
                                </div>

                                {throws.length >= 10 && (
                                    <button
                                        onClick={() => setCurrentStep(2)}
                                        className="w-full mt-6 py-4 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest hover:bg-emerald-400 transition-all"
                                    >
                                        Analyze Results
                                    </button>
                                )}
                            </BrightLayer>
                        )}
                    </div>
                </div>

                {/* Lab Log */}
                <div className="mt-8 p-4 rounded-2xl bg-black/40 border border-white/5 max-h-32 overflow-y-auto font-mono text-xs text-zinc-400">
                    {labLog.length === 0 ? (
                        <div className="text-zinc-600">Field study started. Awaiting actions...</div>
                    ) : (
                        labLog.map((entry, i) => <div key={i}>{entry}</div>)
                    )}
                </div>
            </div>
        </ScienceLabLayout>
    );
}
