'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ProfessorBright, { useProfessor } from '@/components/science/ProfessorBright';
import { useLabCompletion } from '@/hooks/useLabCompletion';

// ==========================================
// TYPES
// ==========================================

type ActivityState = 'rest' | 'light' | 'intense';

interface HeartRateData {
    time: number;
    bpm: number;
}

const ACTIVITIES: { id: ActivityState; name: string; targetBPM: number; icon: string; description: string }[] = [
    { id: 'rest', name: 'Resting', targetBPM: 70, icon: '🧘', description: 'Sit quietly and relax.' },
    { id: 'light', name: 'Light Exercise', targetBPM: 110, icon: '🚶', description: 'Walk in place for 1 minute.' },
    { id: 'intense', name: 'Intense Exercise', targetBPM: 150, icon: '🏃', description: 'Jumping jacks for 1 minute!' }
];

// ==========================================
// PULSE VISUALIZER
// ==========================================

function PulseVisualizer({ bpm, isActive }: { bpm: number; isActive: boolean }) {
    // Calculate pulse duration in seconds (e.g., 60bpm = 1s, 120bpm = 0.5s)
    const duration = 60 / (bpm || 60);

    return (
        <div className="relative w-64 h-64 flex items-center justify-center">
            {/* Heart Icon with Pulse Animation */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    color: bpm > 130 ? '#ef4444' : bpm > 100 ? '#f97316' : '#ec4899'
                }}
                transition={{
                    duration: duration,
                    ease: "easeInOut",
                    repeat: Infinity,
                    times: [0, 0.2, 1] // Quick beat, slower relax
                }}
                className="text-9xl relative z-10 drop-shadow-[0_0_30px_rgba(236,72,153,0.5)]"
            >
                ❤️
            </motion.div>

            {/* Ripple Rings */}
            <AnimatePresence>
                {isActive && (
                    <>
                        <motion.div
                            animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                            transition={{ duration: 1, repeat: Infinity, ease: "easeOut" }}
                            className="absolute inset-0 rounded-full border-2 border-pink-500/50"
                        />
                        <motion.div
                            animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
                            transition={{ duration: 1, repeat: Infinity, delay: 0.2, ease: "easeOut" }}
                            className="absolute inset-0 rounded-full border border-pink-500/30"
                        />
                    </>
                )}
            </AnimatePresence>

            {/* BPM Display */}
            <div className="absolute -bottom-12 text-center">
                <div className="text-4xl font-black text-white font-mono">{Math.round(bpm)}</div>
                <div className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Est. BPM</div>
            </div>
        </div>
    );
}

// ==========================================
// TAP TEMPO BUTTON
// ==========================================

function TapCounter({ onComplete }: { onComplete: (bpm: number) => void }) {
    const [taps, setTaps] = useState<number[]>([]);
    const [calculatedBPM, setCalculatedBPM] = useState(0);

    const handleTap = () => {
        const now = Date.now();
        setTaps(prev => {
            // Keep only taps within last 5 seconds for moving average
            const newTaps = [...prev, now].filter(t => now - t < 5000);

            if (newTaps.length > 2) {
                // Calculate BPM based on intervals
                const intervals = [];
                for (let i = 1; i < newTaps.length; i++) {
                    intervals.push(newTaps[i] - newTaps[i - 1]);
                }
                const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                const bpm = Math.round(60000 / avgInterval);
                setCalculatedBPM(bpm);
            }
            return newTaps;
        });
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <button
                onClick={handleTap}
                className="w-48 h-48 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 border-4 border-white/20 shadow-2xl active:scale-95 transition-transform flex flex-col items-center justify-center group"
            >
                <span className="text-4xl mb-2 group-active:scale-125 transition-transform">👆</span>
                <span className="text-sm font-black text-white uppercase tracking-widest">Tap Pulse</span>
            </button>
            <div className="text-center">
                <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Measured BPM</div>
                <div className={`text-3xl font-black font-mono ${calculatedBPM > 0 ? 'text-white' : 'text-zinc-600'}`}>
                    {calculatedBPM > 0 ? calculatedBPM : '--'}
                </div>
            </div>
            {calculatedBPM > 0 && (
                <button
                    onClick={() => onComplete(calculatedBPM)}
                    className="px-8 py-2 rounded-xl bg-emerald-500 text-white text-xs font-black uppercase tracking-widest hover:bg-emerald-400"
                >
                    Confirm Measurement
                </button>
            )}
        </div>
    );
}

// ==========================================
// MAIN LAB: PULSE RATE
// ==========================================

export default function PulseRateLabPage() {
    const [step, setStep] = useState<number>(0); // 0: Select, 1: Activity, 2: Measure, 3: Results
    const [currentActivity, setCurrentActivity] = useState<ActivityState>('rest');
    const [recordedData, setRecordedData] = useState<{ activity: string; bpm: number }[]>([]);

    const [simulationBPM, setSimulationBPM] = useState(70);
    const [isExercising, setIsExercising] = useState(false);
    const [exerciseTimer, setExerciseTimer] = useState(0);

    const [showSuccess, setShowSuccess] = useState(false);

    const { professor, showSuccess: showProfessorSuccess, showWarning, showHint } = useProfessor({
        initialMessage: "Let's investigate how exercise affects your heart rate. Start by measuring your resting pulse!"
    });

    const { completeLab, result } = useLabCompletion();

    // Simulation Loop
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (isExercising) {
            interval = setInterval(() => {
                setExerciseTimer(prev => {
                    if (prev <= 0) {
                        setIsExercising(false);
                        setStep(2); // Go to Measure
                        showProfessorSuccess("Time's up! Quickly measure your pulse now.");
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [isExercising]);

    const selectActivity = (activity: ActivityState) => {
        // If we already did this activity, warn
        if (recordedData.find(d => d.activity === ACTIVITIES.find(a => a.id === activity)?.name)) {
            showHint("You've already measured this. Try a different intensity!");
            // Allow retry if they really want, but hint strongly.
        }

        const act = ACTIVITIES.find(a => a.id === activity)!;
        setCurrentActivity(activity);

        if (activity === 'rest') {
            setSimulationBPM(70);
            setStep(2); // Skip straight to measure for rest
            showProfessorSuccess("Relax... Now tap the button in time with your pulse.");
        } else {
            setSimulationBPM(act.targetBPM);
            setExerciseTimer(10); // Short burst for simulation
            setStep(1); // Go to exercise
        }
    };

    const startExercise = () => {
        setIsExercising(true);
    };

    const handleMeasurement = (bpm: number) => {
        const actName = ACTIVITIES.find(a => a.id === currentActivity)?.name || 'Unknown';

        // Validation (Simulated logic)
        // If the user taps terribly off rhythm compared to the "target" (simulationBPM), we could warn?
        // But for gameplay fairness, we accept their measurement if it's within reason, 
        // OR we just assume they are measuring the *simulated* pulse which isn't there?
        // Actually, this lab is tricky virtually.
        // Let's assume the "Tap Pulse" button *generates* a simulated pulse haptic/visual cue they must match?
        // OR simpler: The TapCounter *IS* the measurement tool. They just tap at a steady rhythm they "feel".
        // Let's refine: We show the PulseVisualizer pulsating at the TARGET rate. The user must TAP to match it.

        const diff = Math.abs(bpm - simulationBPM);
        if (diff > 20) {
            showHint(`Your measurement (${bpm}) is quite far from the expected pulse (~${simulationBPM}). Try to tap in sync with the heart animation!`);
        } else {
            setRecordedData(prev => [...prev, { activity: actName, bpm }]);
            setStep(0); // Back to menu
            showProfessorSuccess(`Recorded ${bpm} BPM for ${actName}.`);

            if (recordedData.length + 1 >= 3) {
                setTimeout(() => handleFinish(), 1500);
            }
        }
    };

    const handleFinish = async () => {
        await completeLab('bio-pulse-rate', 250);
        setShowSuccess(true);
    };

    if (showSuccess) {
        return (
            <div className="fixed inset-0 z-[200] bg-gradient-to-br from-pink-900 to-black flex items-center justify-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center max-w-3xl px-8"
                >
                    <div className="text-9xl mb-8">💓✅</div>
                    <h1 className="text-4xl md:text-6xl font-black text-pink-400 mb-4 uppercase tracking-tight">
                        Heart Rate Analyzed!
                    </h1>
                    <p className="text-xl text-zinc-300 mb-8">
                        You confirmed that heart rate increases with exercise intensity to supply more oxygen to muscles.
                    </p>

                    <div className="grid grid-cols-2 gap-6 mb-10 max-w-md mx-auto">
                        <div className="p-6 rounded-3xl bg-white/5 border border-[#3D3D5C]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Activities</div>
                            <div className="text-3xl font-black text-white">{recordedData.length}/3</div>
                        </div>
                        <div className="p-6 rounded-3xl bg-white/5 border border-[#3D3D5C]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">XP Earned</div>
                            <div className="text-3xl font-black text-amber-400">
                                {result?.xpGain !== undefined ? `+${result.xpGain}` : '+250'}
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
        <div className="fixed inset-0 bg-gradient-to-b from-[#0A1628] to-[#050A12] overflow-hidden flex flex-col">
            {/* Header */}
            <header className="relative z-50 h-16 bg-[#131325] border-b-4 border-[#3D3D5C] flex items-center justify-between px-6 shrink-0">
                <div className="flex items-center gap-4">
                    <a href="/practicals/science/biology" className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors">
                        ← Exit Lab
                    </a>
                    <div className="h-6 w-px bg-zinc-700" />
                    <div className="text-sm font-black tracking-tight text-white">Pulse Rate Investigation</div>
                </div>
                <div className="flex gap-2">
                    {recordedData.map((d, i) => (
                        <div key={i} className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] text-zinc-400">
                            {d.activity}: <span className="text-pink-400 font-bold">{d.bpm}</span>
                        </div>
                    ))}
                </div>
            </header>

            <main className="flex-1 flex flex-col items-center justify-center p-8 relative">

                {/* Background Beat */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    {/* Can place a giant ECG line graphic here */}
                </div>

                <AnimatePresence mode="wait">

                    {/* STEP 0: SELECT ACTIVITY */}
                    {step === 0 && (
                        <motion.div
                            key="select"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="w-full max-w-4xl grid grid-cols-3 gap-6"
                        >
                            {ACTIVITIES.map(act => (
                                <button
                                    key={act.id}
                                    onClick={() => selectActivity(act.id)}
                                    className="group relative p-8 rounded-[2.5rem] bg-[#1B1B2F] border-2 border-[#3D3D5C] hover:border-pink-500 hover:bg-pink-500/10 transition-all text-left flex flex-col gap-4 overflow-hidden"
                                >
                                    <div className="text-6xl mb-4 group-hover:scale-110 transition-transform duration-500">{act.icon}</div>
                                    <div className="relative z-10">
                                        <div className="text-xl font-black text-white mb-2">{act.name}</div>
                                        <div className="text-xs text-zinc-400 font-medium leading-relaxed">{act.description}</div>
                                    </div>
                                    <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-white">➜</div>
                                    </div>
                                </button>
                            ))}
                        </motion.div>
                    )}

                    {/* STEP 1: EXERCISE SIMULATION */}
                    {step === 1 && (
                        <motion.div
                            key="exercise"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 1.1, opacity: 0 }}
                            className="text-center"
                        >
                            <h2 className="text-4xl font-black text-white mb-12 uppercase tracking-tight">
                                Perform Activity: <span className="text-pink-400">{ACTIVITIES.find(a => a.id === currentActivity)?.name}</span>
                            </h2>

                            {!isExercising ? (
                                <button
                                    onClick={startExercise}
                                    className="px-16 py-8 rounded-full bg-pink-600 text-white font-black text-2xl uppercase tracking-widest hover:bg-pink-500 shadow-[0_0_50px_rgba(236,72,153,0.4)] animate-pulse"
                                >
                                    Start {exerciseTimer}s Timer
                                </button>
                            ) : (
                                <div className="text-9xl font-black font-mono text-white tabular-nums">
                                    00:{exerciseTimer.toString().padStart(2, '0')}
                                </div>
                            )}

                            <p className="mt-12 text-zinc-500 max-w-md mx-auto">
                                Run in place visually represented by the timer. Get your heart rate up!
                            </p>
                        </motion.div>
                    )}

                    {/* STEP 2: MEASURE PULSE */}
                    {step === 2 && (
                        <motion.div
                            key="measure"
                            className="flex flex-col items-center gap-12"
                        >
                            <div className="text-center">
                                <h3 className="text-zinc-400 font-bold uppercase tracking-widest mb-2">Measurement Phase</h3>
                                <h2 className="text-3xl font-black text-white">Sync your tap with the heart!</h2>
                            </div>

                            <div className="flex items-center gap-24">
                                {/* Visual Target (The "Patient's Pulse") */}
                                <div className="flex flex-col items-center">
                                    <div className="text-[10px] font-black uppercase text-zinc-500 mb-4 tracking-widest">Target Rhythm</div>
                                    <PulseVisualizer bpm={simulationBPM} isActive={true} />
                                </div>

                                {/* Arrow */}
                                <div className="text-4xl text-zinc-700">➜</div>

                                {/* User Input */}
                                <TapCounter onComplete={handleMeasurement} />
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>

            </main>

            <ProfessorBright state={professor} />
        </div>
    );
}
