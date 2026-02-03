'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    useSensor,
    useSensors,
    PointerSensor,
    TouchSensor
} from '@dnd-kit/core';
import ProfessorBright, { useProfessor } from '@/components/science/ProfessorBright';
import { useLabCompletion } from '@/hooks/useLabCompletion';

// ==========================================
// TYPES
// ==========================================

type ActivityLevel = 'rest' | 'walk' | 'jog' | 'sprint';

interface SubjectState {
    activity: ActivityLevel;
    breathRate: number; // Breaths per minute target
    stamina: number; // 0-100
    status: 'idle' | 'exercising' | 'recovering';
}

const ACTIVITIES: { id: ActivityLevel; name: string; targetRate: number; duration: number; color: string; icon: string }[] = [
    { id: 'rest', name: 'Resting', targetRate: 15, duration: 5, color: 'bg-blue-500', icon: '🧘' },
    { id: 'walk', name: 'Light Walk', targetRate: 25, duration: 10, color: 'bg-emerald-500', icon: '🚶' },
    { id: 'jog', name: 'Jogging', targetRate: 45, duration: 15, color: 'bg-orange-500', icon: '🏃' },
    { id: 'sprint', name: 'Sprinting', targetRate: 65, duration: 10, color: 'bg-red-500', icon: '⚡' }
];

// ==========================================
// BREATHING SUBJECT
// ==========================================

function BreathingSubject({
    rate,
    activity,
    isExercising
}: {
    rate: number;
    activity: ActivityLevel;
    isExercising: boolean;
}) {
    // Animation duration for one breath cycle (in seconds)
    // 60 seconds / breaths per minute = seconds per breath
    const cycleDuration = 60 / (rate || 15);

    return (
        <div className="relative w-64 h-96 flex flex-col items-center justify-center">
            {/* Stick Figure / Subject Representation */}
            <div className="relative z-10">
                {/* Head */}
                <div className="w-20 h-20 rounded-full bg-zinc-200 border-4 border-zinc-400 mb-2 relative overflow-hidden">
                    {/* Face Expression */}
                    <div className="absolute top-6 left-5 w-3 h-3 bg-zinc-800 rounded-full" />
                    <div className="absolute top-6 right-5 w-3 h-3 bg-zinc-800 rounded-full" />
                    <div className={`absolute bottom-5 left-1/2 -translate-x-1/2 w-8 h-2 bg-zinc-800 rounded-full transition-all ${rate > 40 ? 'h-6 rounded-3xl' : ''}`} />

                    {/* Sweat Drops */}
                    {(activity === 'jog' || activity === 'sprint') && isExercising && (
                        <motion.div
                            animate={{ y: [0, 20], opacity: [1, 0] }}
                            transition={{ repeat: Infinity, duration: 0.8 }}
                            className="absolute top-2 right-2 text-blue-400 text-xl"
                        >
                            💧
                        </motion.div>
                    )}
                </div>

                {/* Torso (Lungs) */}
                <motion.div
                    animate={{
                        scaleX: [1, 1.15, 1],
                        scaleY: [1, 1.05, 1],
                        backgroundColor: rate > 50 ? '#ef4444' : rate > 30 ? '#f97316' : '#3b82f6'
                    }}
                    transition={{
                        duration: cycleDuration,
                        ease: "easeInOut",
                        repeat: Infinity
                    }}
                    className="w-32 h-40 rounded-3xl bg-blue-500 border-4 border-blue-700 relative z-20 flex items-center justify-center"
                >
                    <div className="text-white/20 font-black text-4xl tracking-tighter">LUNGS</div>
                </motion.div>

                {/* Arms */}
                <motion.div
                    animate={isExercising ? { rotate: [0, 20, -20, 0] } : { rotate: 0 }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="absolute top-24 -left-8 w-8 h-32 bg-zinc-300 rounded-full z-0 origin-top"
                />
                <motion.div
                    animate={isExercising ? { rotate: [0, -20, 20, 0] } : { rotate: 0 }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: 0.25 }}
                    className="absolute top-24 -right-8 w-8 h-32 bg-zinc-300 rounded-full z-0 origin-top"
                />
            </div>

            {/* Ground Shadow */}
            <div className="absolute bottom-0 w-48 h-8 bg-black/20 rounded-full blur-xl" />
        </div>
    );
}

// ==========================================
// MAIN LAB: BREATHING RATE
// ==========================================

export default function BreathingRateLabPage() {
    const [status, setStatus] = useState<SubjectState['status']>('idle');
    const [activeActivity, setActiveActivity] = useState<ActivityLevel>('rest');
    const [currentRate, setCurrentRate] = useState(15);
    const [exerciseTimer, setExerciseTimer] = useState(0);

    // Stopwatch
    const [stopwatchTime, setStopwatchTime] = useState(0);
    const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);

    // Data
    const [recordedData, setRecordedData] = useState<{ activity: string; rate: number }[]>([]);
    const [userGuess, setUserGuess] = useState("");
    const [showSuccess, setShowSuccess] = useState(false);

    const { professor, showSuccess: showProfessorSuccess, showWarning, showHint } = useProfessor({
        initialMessage: "Select an activity to perform, then use the stopwatch to count the breathing rate!"
    });

    const { completeLab, result } = useLabCompletion();

    // Exercise Simulation
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (status === 'exercising') {
            interval = setInterval(() => {
                setExerciseTimer(prev => {
                    const next = prev - 1;
                    if (next <= 0) {
                        setStatus('recovering');
                        // Set target rate based on activity
                        const target = ACTIVITIES.find(a => a.id === activeActivity)?.targetRate || 15;
                        setCurrentRate(target);
                        showProfessorSuccess("Exercise complete! Measure the breathing rate now.");
                        return 0;
                    }
                    return next;
                });
            }, 1000);
        } else if (status === 'recovering') {
            // Slowly return to rest rate over time
            interval = setInterval(() => {
                setCurrentRate(prev => {
                    if (prev <= 15) {
                        setStatus('idle');
                        return 15;
                    }
                    return prev - 0.5; // Cool down
                });
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [status, activeActivity]);

    // Stopwatch logic
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isStopwatchRunning) {
            interval = setInterval(() => {
                setStopwatchTime(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isStopwatchRunning]);

    const handleStartExercise = (activityId: ActivityLevel) => {
        if (status === 'exercising') return;

        const activity = ACTIVITIES.find(a => a.id === activityId);
        if (!activity) return;

        setActiveActivity(activityId);
        setExerciseTimer(activity.duration);
        setStatus('exercising');
        // Ramp up rate visually during exercise
        setCurrentRate(activity.targetRate);
    };

    const handleRecord = () => {
        const rate = parseInt(userGuess);
        if (isNaN(rate) || rate <= 0) {
            showWarning("Enter a valid number for breaths per minute.");
            return;
        }

        // Logic check: Is the guess close to the actual rate? (Simulated margin of error)
        // Rate changes during recovery so we check against currentRate
        const margin = 10;
        if (Math.abs(rate - currentRate) > margin) {
            showHint(`That seems off. Count the chest movements for 15 seconds and multiply by 4. (Current approx: ~${Math.round(currentRate)})`);
        } else {
            setRecordedData(prev => [...prev, { activity: ACTIVITIES.find(a => a.id === activeActivity)?.name || 'Unknown', rate }]);
            showProfessorSuccess(`Great measurement! ${rate} bpm recorded.`);
            setUserGuess("");

            if (recordedData.length >= 2) {
                setTimeout(() => handleFinish(), 2000);
            }
        }
    };

    const handleFinish = async () => {
        await completeLab('bio-breathing-rate', 250);
        setShowSuccess(true);
    };

    if (showSuccess) {
        return (
            <div className="fixed inset-0 z-[200] bg-gradient-to-br from-red-900 to-black flex items-center justify-center">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center max-w-3xl px-8"
                >
                    <div className="text-9xl mb-8">🫁✅</div>
                    <h1 className="text-4xl md:text-6xl font-black text-red-400 mb-4 uppercase tracking-tight">
                        Physiology Lab Complete!
                    </h1>
                    <p className="text-xl text-zinc-300 mb-8">
                        You&apos;ve analyzed the relationship between physical activity and respiration rate.
                    </p>

                    <div className="grid grid-cols-2 gap-6 mb-10 max-w-md mx-auto">
                        <div className="p-6 rounded-3xl bg-white/5 border border-[#3D3D5C]">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Data Points</div>
                            <div className="text-3xl font-black text-white">{recordedData.length}</div>
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
                    <div className="text-sm font-black tracking-tight text-white">Respiration & Exercise</div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden">
                {/* Left Controls */}
                <aside className="w-80 bg-[#131325] border-r-4 border-[#3D3D5C] p-6 flex flex-col gap-8 overflow-y-auto">

                    {/* Activity Select */}
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Select Activity</div>
                        <div className="grid grid-cols-1 gap-3">
                            {ACTIVITIES.map(act => (
                                <button
                                    key={act.id}
                                    onClick={() => handleStartExercise(act.id)}
                                    disabled={status === 'exercising'}
                                    className={`
                                        p-4 rounded-2xl border-2 text-left transition-all
                                        ${activeActivity === act.id ? 'border-white bg-white/10' : 'border-[#3D3D5C] bg-[#1B1B2F] hover:bg-white/5'}
                                        ${status === 'exercising' ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${act.color} bg-opacity-20 text-white`}>
                                            {act.icon}
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-white">{act.name}</div>
                                            <div className="text-[10px] text-zinc-500">Target: ~{act.targetRate} bpm</div>
                                        </div>
                                    </div>
                                    {status === 'exercising' && activeActivity === act.id && (
                                        <div className="mt-2 w-full h-1 bg-zinc-800 rounded-full overflow-hidden">
                                            <motion.div
                                                className="h-full bg-emerald-500"
                                                initial={{ width: '100%' }}
                                                animate={{ width: '0%' }}
                                                transition={{ duration: act.duration, ease: 'linear' }}
                                            />
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stopwatch Tool */}
                    <div className="p-6 rounded-3xl bg-black/40 border border-white/10">
                        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Stopwatch</div>
                        <div className="text-4xl font-mono font-black text-white text-center mb-6">
                            00:{stopwatchTime.toString().padStart(2, '0')}
                        </div>
                        <div className="flex gap-2">
                            {!isStopwatchRunning ? (
                                <button
                                    onClick={() => setIsStopwatchRunning(true)}
                                    className="flex-1 py-3 rounded-xl bg-emerald-500 text-white font-black text-xs uppercase tracking-widest hover:bg-emerald-400"
                                >
                                    Start
                                </button>
                            ) : (
                                <button
                                    onClick={() => setIsStopwatchRunning(false)}
                                    className="flex-1 py-3 rounded-xl bg-red-500 text-white font-black text-xs uppercase tracking-widest hover:bg-red-400"
                                >
                                    Stop
                                </button>
                            )}
                            <button
                                onClick={() => { setIsStopwatchRunning(false); setStopwatchTime(0); }}
                                className="px-4 py-3 rounded-xl bg-zinc-700 text-white font-black text-xs uppercase tracking-widest hover:bg-zinc-600"
                            >
                                Reset
                            </button>
                        </div>
                    </div>

                </aside>

                {/* Main View */}
                <main className="flex-1 flex flex-col items-center justify-center relative bg-gradient-to-b from-blue-900/20 to-black/20">

                    <div className="mb-8 p-12 bg-white/5 rounded-[3rem] border border-white/10 shadow-2xl backdrop-blur-sm">
                        <BreathingSubject
                            rate={currentRate}
                            activity={activeActivity}
                            isExercising={status === 'exercising'}
                        />
                    </div>

                    {/* Data Entry */}
                    <div className="absolute bottom-8 left-8 right-8 flex justify-center">
                        <div className="bg-[#131325] p-2 rounded-2xl border border-[#3D3D5C] flex items-center gap-2 max-w-md w-full shadow-2xl">
                            <input
                                type="number"
                                placeholder="Enter Breaths per Minute..."
                                value={userGuess}
                                onChange={(e) => setUserGuess(e.target.value)}
                                className="flex-1 bg-transparent px-4 py-3 text-white placeholder-zinc-500 outline-none font-bold"
                            />
                            <button
                                onClick={handleRecord}
                                className="px-6 py-3 rounded-xl bg-blue-600 text-white font-black text-xs uppercase tracking-widest hover:bg-blue-500"
                            >
                                Record
                            </button>
                        </div>
                    </div>
                </main>
            </div>

            <ProfessorBright state={professor} />
        </div>
    );
}
