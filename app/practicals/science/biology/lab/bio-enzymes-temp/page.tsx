'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScienceLabLayout from '@/components/science/ScienceLabLayout';
import { BrightLayer } from '@/components/system';
import { simulateReaction } from '@/lib/science/chemical-logic';

interface WaterBath {
    id: string;
    name: string;
    temperature: number;
    icon: string;
    color: string;
}

interface SpottingTileSlot {
    time: number; // seconds elapsed
    color: string;
    starchPresent: boolean;
}

interface EnzymeTest {
    bathId: string;
    slots: SpottingTileSlot[];
    enzymeActive: boolean;
    completed: boolean;
}

export default function EnzymeLabPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [score, setScore] = useState(100);
    const [activeTestBath, setActiveTestBath] = useState<string | null>(null);
    const [tests, setTests] = useState<Record<string, EnzymeTest>>({});
    const [timer, setTimer] = useState(0);
    const [timerRunning, setTimerRunning] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [labLog, setLabLog] = useState<string[]>([]);

    const waterBaths: WaterBath[] = [
        { id: 'cold', name: 'Ice Bath', temperature: 0, icon: '🧊', color: 'bg-blue-400' },
        { id: 'room', name: 'Room Temp', temperature: 30, icon: '🌡️', color: 'bg-emerald-500' },
        { id: 'boiling', name: 'Boiling', temperature: 100, icon: '♨️', color: 'bg-red-500' }
    ];

    const addLog = useCallback((entry: string) => {
        setLabLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${entry}`]);
    }, []);

    // Timer effect
    useEffect(() => {
        if (timerRunning && activeTestBath) {
            const interval = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 100); // Speed up for simulation (1 real second = 10 game seconds)
            return () => clearInterval(interval);
        }
    }, [timerRunning, activeTestBath]);

    const handleStartTest = (bathId: string) => {
        setActiveTestBath(bathId);
        setTests(prev => ({
            ...prev,
            [bathId]: {
                bathId,
                slots: [],
                enzymeActive: bathId !== 'boiling', // Enzyme is denatured at 100°C
                completed: false
            }
        }));
        setTimer(0);
        setTimerRunning(true);
        setCurrentStep(2);

        const bath = waterBaths.find(b => b.id === bathId);
        addLog(`Started enzyme test in ${bath?.name} (${bath?.temperature}°C). Amylase + Starch mixed.`);
    };

    const handleTakeDroplet = () => {
        if (!activeTestBath) return;

        const test = tests[activeTestBath];
        const bath = waterBaths.find(b => b.id === activeTestBath);

        // Simulate reaction based on temperature
        let starchPresent = true;
        let color = 'Blue-Black';

        if (bath) {
            if (bath.temperature >= 90) {
                // Enzyme denatured - starch never breaks down
                starchPresent = true;
                color = 'Blue-Black';
            } else if (bath.temperature >= 30 && bath.temperature <= 40) {
                // Optimum - fast reaction
                starchPresent = timer < 60; // Starch gone after ~60 seconds
                color = starchPresent ? 'Blue-Black' : 'Yellow-Brown';
            } else if (bath.temperature < 10) {
                // Too cold - very slow
                starchPresent = timer < 300; // Takes much longer
                color = starchPresent ? 'Blue-Black' : 'Yellow-Brown';
            } else {
                // Moderate
                starchPresent = timer < 120;
                color = starchPresent ? 'Blue-Black' : 'Yellow-Brown';
            }
        }

        const newSlot: SpottingTileSlot = {
            time: timer,
            color,
            starchPresent
        };

        setTests(prev => ({
            ...prev,
            [activeTestBath]: {
                ...prev[activeTestBath],
                slots: [...prev[activeTestBath].slots, newSlot]
            }
        }));

        addLog(`Droplet taken at ${timer}s: ${color} (Starch ${starchPresent ? 'Present' : 'Absent'})`);
    };

    const handleCompleteTest = () => {
        if (!activeTestBath) return;

        const bath = waterBaths.find(b => b.id === activeTestBath);
        setTests(prev => ({
            ...prev,
            [activeTestBath]: {
                ...prev[activeTestBath],
                completed: true
            }
        }));

        setTimerRunning(false);
        setActiveTestBath(null);
        addLog(`Test in ${bath?.name} completed. ${tests[activeTestBath]?.slots.length} samples recorded.`);

        // Check if all 3 tests are done
        const completedCount = Object.values({ ...tests, [activeTestBath]: { completed: true } }).filter(t => t.completed).length;
        if (completedCount >= 3) {
            setCurrentStep(3);
        } else {
            setCurrentStep(1);
        }
    };

    const handleFinish = () => {
        setShowSuccess(true);
    };

    const getSlotColor = (color: string) => {
        if (color === 'Blue-Black') return 'bg-indigo-900';
        if (color === 'Yellow-Brown') return 'bg-amber-600';
        return 'bg-zinc-600';
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
                        Practical Complete
                    </h1>
                    <p className="text-xl text-zinc-300 mb-8 leading-relaxed">
                        You demonstrated how <span className="text-emerald-400 font-bold">temperature affects enzyme activity</span>.
                        Enzymes have an <span className="text-white font-bold">optimum temperature</span> and
                        <span className="text-red-400 font-bold"> denature at high heat</span>.
                    </p>

                    <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg mx-auto">
                        <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                            <div className="text-2xl mb-2">🧊</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-blue-400">0°C</div>
                            <div className="text-xs text-zinc-400">Very Slow</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                            <div className="text-2xl mb-2">✅</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">30-40°C</div>
                            <div className="text-xs text-zinc-400">Optimum</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                            <div className="text-2xl mb-2">❌</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-red-400">100°C</div>
                            <div className="text-xs text-zinc-400">Denatured</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mb-10 max-w-md mx-auto">
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Final Score</div>
                            <div className="text-3xl font-black text-emerald-400">{score}/100</div>
                        </div>
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">XP Earned</div>
                            <div className="text-3xl font-black text-amber-400">+300</div>
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
            labTitle="Effect of Temperature on Enzymes"
            syllabusSection="Section B: Life Processes"
            objectives={[
                'Set up water baths at different temperatures',
                'Mix amylase and starch in each bath',
                'Test for starch breakdown using iodine',
                'Explain enzyme denaturation'
            ]}
            equipment={[
                { name: 'Water Bath (3)', icon: '♨️' },
                { name: 'Thermometer', icon: '🌡️' },
                { name: 'Test Tubes', icon: '🧫' },
                { name: 'Spotting Tile', icon: '⬜' },
                { name: 'Dropper', icon: '💧' },
                { name: 'Stopwatch', icon: '⏱️' },
                { name: 'Iodine Solution', icon: '🟤' }
            ]}
            currentStep={currentStep}
            totalSteps={4}
        >
            <div className="h-full flex flex-col p-8 overflow-y-auto">
                {/* Active Step Instruction */}
                <div className="mb-8">
                    <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                            Step {currentStep + 1} of 4
                        </span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-white mb-2">
                        {currentStep === 0 && 'Prepare Water Baths'}
                        {currentStep === 1 && 'Select a Temperature Test'}
                        {currentStep === 2 && 'Run Iodine Test'}
                        {currentStep === 3 && 'Analyze Results'}
                    </h2>
                    <p className="text-zinc-400 font-medium">
                        {currentStep === 0 && 'Review the three water baths at 0°C, 30°C, and 100°C.'}
                        {currentStep === 1 && 'Click a water bath to start testing enzyme activity.'}
                        {currentStep === 2 && 'Take droplets every 30 seconds and test with iodine.'}
                        {currentStep === 3 && 'Compare results across all temperatures.'}
                    </p>
                </div>

                {/* Main Workbench */}
                <div className="flex-1 grid grid-cols-3 gap-6">
                    {waterBaths.map((bath) => {
                        const test = tests[bath.id];
                        const isActive = activeTestBath === bath.id;
                        const isCompleted = test?.completed;

                        return (
                            <BrightLayer
                                key={bath.id}
                                variant={isActive ? "elevated" : "glass"}
                                padding="lg"
                                className={`flex flex-col transition-all ${isActive ? 'ring-2 ring-emerald-500' : ''
                                    } ${isCompleted ? 'opacity-60' : ''}`}
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div className={`w-14 h-14 rounded-2xl ${bath.color} flex items-center justify-center text-3xl`}>
                                        {bath.icon}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-white">{bath.temperature}°C</div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">{bath.name}</div>
                                    </div>
                                </div>

                                {/* Spotting Tile Visualization */}
                                <div className="flex-1 mb-6">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-3">Spotting Tile</div>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[...Array(8)].map((_, i) => {
                                            const slot = test?.slots[i];
                                            return (
                                                <div
                                                    key={i}
                                                    className={`aspect-square rounded-xl border-2 flex items-center justify-center text-[8px] font-black ${slot
                                                            ? `${getSlotColor(slot.color)} border-transparent`
                                                            : 'border-zinc-700 border-dashed'
                                                        }`}
                                                >
                                                    {slot && `${slot.time}s`}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Actions */}
                                {currentStep === 0 && (
                                    <button
                                        onClick={() => setCurrentStep(1)}
                                        className="w-full py-3 rounded-xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest text-zinc-400"
                                    >
                                        Baths Ready
                                    </button>
                                )}

                                {currentStep === 1 && !isCompleted && !activeTestBath && (
                                    <button
                                        onClick={() => handleStartTest(bath.id)}
                                        className="w-full py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-xs font-black uppercase tracking-widest text-emerald-400 hover:bg-emerald-500/30 transition-all"
                                    >
                                        Start Test
                                    </button>
                                )}

                                {isActive && (
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-bold text-zinc-400">Timer:</span>
                                            <span className="font-black text-white">{timer}s</span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleTakeDroplet}
                                                disabled={test?.slots.length >= 8}
                                                className="flex-1 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-xs font-black uppercase tracking-widest text-amber-400 hover:bg-amber-500/30 transition-all disabled:opacity-50"
                                            >
                                                Take Sample
                                            </button>
                                            <button
                                                onClick={handleCompleteTest}
                                                className="px-4 py-3 rounded-xl bg-emerald-500 text-xs font-black uppercase tracking-widest text-white hover:bg-emerald-400 transition-all"
                                            >
                                                Done
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {isCompleted && (
                                    <div className="text-center py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                        <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
                                            ✅ Test Complete
                                        </span>
                                    </div>
                                )}
                            </BrightLayer>
                        );
                    })}
                </div>

                {/* Results Panel */}
                {currentStep === 3 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8"
                    >
                        <BrightLayer variant="elevated" padding="lg">
                            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-4">Results Summary</div>
                            <div className="grid grid-cols-3 gap-6 mb-6">
                                {waterBaths.map(bath => {
                                    const test = tests[bath.id];
                                    const lastSlot = test?.slots[test.slots.length - 1];
                                    return (
                                        <div key={bath.id} className="text-center">
                                            <div className="text-lg font-black text-white mb-2">{bath.temperature}°C</div>
                                            <div className={`text-sm font-bold ${lastSlot?.starchPresent === false ? 'text-emerald-400' : 'text-red-400'
                                                }`}>
                                                {lastSlot?.starchPresent === false ? 'Starch Digested' : 'Starch Remained'}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 mb-6">
                                <p className="text-sm text-zinc-300 font-medium">
                                    At <span className="text-red-400 font-bold">100°C</span>, the enzyme was <span className="text-red-400 font-bold">denatured</span> -
                                    its active site lost its shape and could no longer catalyze the breakdown of starch.
                                </p>
                            </div>

                            <button
                                onClick={handleFinish}
                                className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest hover:bg-emerald-400 transition-all"
                            >
                                Complete Lab
                            </button>
                        </BrightLayer>
                    </motion.div>
                )}

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
