'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScienceLabLayout from '@/components/science/ScienceLabLayout';
import { BrightLayer, BrightButton } from '@/components/system';
import { simulateReaction, ChemicalId, SubstanceId } from '@/lib/science/chemical-logic';
import { checkSafetyViolation, SafetyViolation, getSafetyLesson } from '@/lib/science/safety-system';
import { scoreEquipmentChoice, EquipmentId } from '@/lib/science/lab-inventory';

interface LabStep {
    id: number;
    title: string;
    instruction: string;
    requiredAction: string;
    completed: boolean;
}

interface LeafState {
    color: 'green' | 'flaccid_green' | 'white' | 'blue_black';
    texture: 'firm' | 'soft' | 'brittle';
    starchPresent: boolean;
}

export default function PhotosynthesisLabPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [score, setScore] = useState(100);
    const [leafState, setLeafState] = useState<LeafState>({
        color: 'green',
        texture: 'firm',
        starchPresent: true
    });
    const [waterTemperature, setWaterTemperature] = useState(25);
    const [bunsenActive, setBunsenActive] = useState(false);
    const [ethanolInWaterBath, setEthanolInWaterBath] = useState(false);
    const [safetyViolation, setSafetyViolation] = useState<SafetyViolation | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [labLog, setLabLog] = useState<string[]>([]);

    const steps: LabStep[] = [
        { id: 0, title: 'Setup', instruction: 'Turn on the Bunsen burner and boil water in a beaker.', requiredAction: 'boil_water', completed: currentStep > 0 },
        { id: 1, title: 'Kill the Leaf', instruction: 'Place the leaf in boiling water for 30 seconds to stop enzyme activity.', requiredAction: 'boil_leaf', completed: currentStep > 1 },
        { id: 2, title: 'Setup Water Bath', instruction: 'Place a boiling tube of ethanol inside a beaker of hot water (water bath).', requiredAction: 'setup_water_bath', completed: currentStep > 2 },
        { id: 3, title: 'Decolorize', instruction: 'Place the leaf in the ethanol to remove chlorophyll.', requiredAction: 'decolorize', completed: currentStep > 3 },
        { id: 4, title: 'Rinse', instruction: 'Dip the brittle white leaf in warm water to soften it.', requiredAction: 'rinse', completed: currentStep > 4 },
        { id: 5, title: 'Stain', instruction: 'Add iodine solution to the leaf and observe the color change.', requiredAction: 'stain', completed: currentStep > 5 }
    ];

    const addLog = useCallback((entry: string) => {
        setLabLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${entry}`]);
    }, []);

    // Temperature simulation
    useEffect(() => {
        if (bunsenActive && waterTemperature < 100) {
            const timer = setInterval(() => {
                setWaterTemperature(prev => Math.min(prev + 5, 100));
            }, 500);
            return () => clearInterval(timer);
        }
    }, [bunsenActive, waterTemperature]);

    const handleAction = (action: string) => {
        switch (action) {
            case 'toggle_bunsen':
                setBunsenActive(!bunsenActive);
                addLog(bunsenActive ? 'Bunsen burner turned OFF' : 'Bunsen burner ignited');
                break;

            case 'boil_water':
                if (waterTemperature >= 100) {
                    setCurrentStep(1);
                    addLog('Water is boiling at 100°C. Ready for next step.');
                }
                break;

            case 'boil_leaf':
                if (waterTemperature >= 100 && currentStep === 1) {
                    setLeafState(prev => ({ ...prev, texture: 'soft', color: 'flaccid_green' }));
                    setCurrentStep(2);
                    addLog('Leaf placed in boiling water for 30s. Enzymes denatured, leaf now flaccid.');
                }
                break;

            case 'heat_ethanol_direct':
                // SAFETY VIOLATION
                const violation = checkSafetyViolation({
                    action: 'heat',
                    substance: 'ethanol',
                    heatingMethod: 'direct_flame'
                });
                if (violation) {
                    setSafetyViolation(violation);
                    addLog('⚠️ CRITICAL ERROR: Attempted to heat ethanol with direct flame.');
                }
                break;

            case 'setup_water_bath':
                setEthanolInWaterBath(true);
                setCurrentStep(3);
                addLog('Ethanol placed safely in water bath. Ready for decolorization.');
                break;

            case 'decolorize':
                if (ethanolInWaterBath && currentStep === 3) {
                    setLeafState(prev => ({ ...prev, color: 'white', texture: 'brittle' }));
                    setCurrentStep(4);
                    addLog('Leaf decolorized. Chlorophyll removed. Leaf is now white and brittle.');
                }
                break;

            case 'rinse':
                if (currentStep === 4) {
                    setLeafState(prev => ({ ...prev, texture: 'soft' }));
                    setCurrentStep(5);
                    addLog('Leaf rinsed in warm water. It is now soft and ready for testing.');
                }
                break;

            case 'stain':
                if (currentStep === 5) {
                    const result = simulateReaction({
                        chemical: 'iodine' as ChemicalId,
                        targetSubstance: 'leaf_decolorized' as SubstanceId
                    });
                    setLeafState(prev => ({ ...prev, color: 'blue_black' }));
                    setCurrentStep(6);
                    addLog(`Iodine added. Result: ${result.resultColor}. ${result.observation}`);
                    setShowSuccess(true);
                }
                break;
        }
    };

    const getLeafColor = () => {
        switch (leafState.color) {
            case 'green': return 'bg-green-500';
            case 'flaccid_green': return 'bg-green-400/70';
            case 'white': return 'bg-gray-200';
            case 'blue_black': return 'bg-indigo-900';
            default: return 'bg-green-500';
        }
    };

    if (safetyViolation) {
        return (
            <div className="fixed inset-0 z-[200] bg-black flex items-center justify-center">
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="text-center max-w-2xl px-8"
                >
                    {safetyViolation.animationTrigger === 'fire' && (
                        <motion.div
                            animate={{ scale: [1, 1.2, 1], opacity: [1, 0.8, 1] }}
                            transition={{ repeat: Infinity, duration: 0.5 }}
                            className="text-9xl mb-8"
                        >
                            🔥
                        </motion.div>
                    )}
                    <h1 className="text-4xl md:text-6xl font-black text-red-500 mb-6 uppercase tracking-tight">
                        Lab Safety Violation
                    </h1>
                    <p className="text-xl text-white mb-8 leading-relaxed">
                        {safetyViolation.message}
                    </p>
                    <div className="p-6 rounded-3xl bg-red-500/10 border-2 border-red-500/30 mb-8">
                        <div className="text-[10px] font-black uppercase tracking-widest text-red-500 mb-3">What You Should Have Done</div>
                        <p className="text-zinc-300 font-medium leading-relaxed">
                            {safetyViolation.lesson}
                        </p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-10 py-4 rounded-2xl bg-red-500 text-white font-black uppercase tracking-widest hover:bg-red-400 transition-colors"
                    >
                        Restart Lab Session
                    </button>
                </motion.div>
            </div>
        );
    }

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
                        🧪✅
                    </motion.div>
                    <h1 className="text-4xl md:text-6xl font-black text-emerald-400 mb-4 uppercase tracking-tight">
                        Practical Complete
                    </h1>
                    <p className="text-xl text-zinc-300 mb-8 leading-relaxed">
                        You successfully demonstrated that <span className="text-white font-bold">green leaves contain starch</span>,
                        which is evidence of <span className="text-emerald-400 font-bold">photosynthesis</span>.
                    </p>

                    <div className="grid grid-cols-2 gap-6 mb-10 max-w-md mx-auto">
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Final Score</div>
                            <div className="text-3xl font-black text-emerald-400">{score}/100</div>
                        </div>
                        <div className="p-6 rounded-3xl bg-white/5 border border-white/10">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">XP Earned</div>
                            <div className="text-3xl font-black text-amber-400">+150</div>
                        </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-indigo-900/30 border border-indigo-500/20 text-left mb-8">
                        <div className="text-[10px] font-black uppercase tracking-widest text-indigo-400 mb-3">Result Observation</div>
                        <p className="text-zinc-200 font-medium">
                            The leaf turned <span className="text-indigo-400 font-bold">blue-black</span> when iodine was added.
                            This indicates the presence of <span className="text-white font-bold">starch</span>, which is produced
                            during photosynthesis and stored in the leaf.
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
            labTitle="Testing a Leaf for Starch"
            syllabusSection="Section B: Life Processes"
            objectives={[
                'Demonstrate that green leaves produce starch during photosynthesis',
                'Safely decolorize a leaf using ethanol in a water bath',
                'Use iodine to test for the presence of starch'
            ]}
            equipment={[
                { name: 'Bunsen Burner', icon: '🔥' },
                { name: 'Water Bath', icon: '♨️' },
                { name: 'Boiling Tube', icon: '🧫' },
                { name: 'Forceps', icon: '🥢' },
                { name: 'Dropper', icon: '💧' },
                { name: 'Ethanol', icon: '🧪' },
                { name: 'Iodine Solution', icon: '🟤' }
            ]}
            currentStep={currentStep}
            totalSteps={6}
        >
            <div className="h-full flex flex-col p-8 overflow-y-auto">
                {/* Active Step Instruction */}
                <div className="mb-8">
                    <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Step {currentStep + 1} of 6</span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-white mb-2">
                        {steps[Math.min(currentStep, 5)].title}
                    </h2>
                    <p className="text-zinc-400 font-medium">
                        {steps[Math.min(currentStep, 5)].instruction}
                    </p>
                </div>

                {/* Workbench Visualization */}
                <div className="flex-1 grid grid-cols-3 gap-8">
                    {/* Left: Bunsen Burner & Beaker */}
                    <div className="flex flex-col items-center justify-center">
                        <BrightLayer variant="elevated" padding="lg" className="w-full text-center relative overflow-hidden">
                            <div className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-widest text-zinc-500">
                                Heating Station
                            </div>

                            {/* Flame */}
                            {bunsenActive && (
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
                                    transition={{ repeat: Infinity, duration: 0.3 }}
                                    className="absolute bottom-20 left-1/2 -translate-x-1/2 w-8 h-16"
                                >
                                    <div className="w-full h-full bg-gradient-to-t from-blue-500 via-orange-400 to-yellow-300 rounded-full blur-sm" />
                                </motion.div>
                            )}

                            <div className="text-6xl mb-4">🧪</div>
                            <div className="text-sm font-black text-white mb-2">Water Beaker</div>
                            <div className={`text-2xl font-black ${waterTemperature >= 100 ? 'text-red-500' : 'text-blue-400'}`}>
                                {waterTemperature}°C
                            </div>
                            {waterTemperature >= 100 && (
                                <div className="text-[10px] font-black uppercase tracking-widest text-red-400 mt-2 animate-pulse">
                                    BOILING
                                </div>
                            )}

                            <button
                                onClick={() => handleAction('toggle_bunsen')}
                                className={`mt-6 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${bunsenActive
                                        ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                                    }`}
                            >
                                {bunsenActive ? 'Turn Off Flame' : 'Ignite Bunsen'}
                            </button>
                        </BrightLayer>
                    </div>

                    {/* Center: Leaf Specimen */}
                    <div className="flex flex-col items-center justify-center">
                        <BrightLayer variant="elevated" padding="lg" className="w-full text-center">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">
                                Specimen
                            </div>

                            <motion.div
                                animate={{
                                    rotate: leafState.texture === 'soft' ? [0, 5, -5, 0] : 0,
                                    scale: leafState.texture === 'brittle' ? 0.9 : 1
                                }}
                                className={`w-32 h-32 mx-auto rounded-[2rem] ${getLeafColor()} shadow-2xl flex items-center justify-center text-5xl transition-all duration-500 relative overflow-hidden`}
                            >
                                {leafState.color === 'blue_black' && (
                                    <div className="absolute inset-0 bg-[radial-gradient(circle,transparent_30%,rgba(0,0,0,0.5)_100%)]" />
                                )}
                                🍃
                            </motion.div>

                            <div className="mt-6 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-500 font-bold">Color:</span>
                                    <span className="text-white font-black capitalize">{leafState.color.replace('_', ' ')}</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-zinc-500 font-bold">Texture:</span>
                                    <span className="text-white font-black capitalize">{leafState.texture}</span>
                                </div>
                            </div>
                        </BrightLayer>
                    </div>

                    {/* Right: Action Buttons */}
                    <div className="flex flex-col gap-4">
                        {currentStep === 1 && waterTemperature >= 100 && (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => handleAction('boil_leaf')}
                                className="p-6 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 text-left hover:bg-emerald-500/20 transition-all"
                            >
                                <div className="text-2xl mb-2">🥢</div>
                                <div className="text-sm font-black text-white">Place Leaf in Boiling Water</div>
                                <div className="text-[10px] font-bold text-zinc-400 mt-1">Hold for 30 seconds</div>
                            </motion.button>
                        )}

                        {currentStep === 2 && (
                            <>
                                <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={() => handleAction('heat_ethanol_direct')}
                                    className="p-6 rounded-3xl bg-red-500/10 border-2 border-red-500/30 text-left hover:bg-red-500/20 transition-all"
                                >
                                    <div className="text-2xl mb-2">🔥</div>
                                    <div className="text-sm font-black text-red-400">Heat Ethanol Directly</div>
                                    <div className="text-[10px] font-bold text-zinc-500 mt-1">⚠️ CAUTION</div>
                                </motion.button>

                                <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    onClick={() => handleAction('setup_water_bath')}
                                    className="p-6 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 text-left hover:bg-emerald-500/20 transition-all"
                                >
                                    <div className="text-2xl mb-2">♨️</div>
                                    <div className="text-sm font-black text-emerald-400">Use Water Bath</div>
                                    <div className="text-[10px] font-bold text-zinc-400 mt-1">Safe method for ethanol</div>
                                </motion.button>
                            </>
                        )}

                        {currentStep === 3 && ethanolInWaterBath && (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => handleAction('decolorize')}
                                className="p-6 rounded-3xl bg-emerald-500/10 border-2 border-emerald-500/30 text-left hover:bg-emerald-500/20 transition-all"
                            >
                                <div className="text-2xl mb-2">🧪</div>
                                <div className="text-sm font-black text-white">Place Leaf in Ethanol</div>
                                <div className="text-[10px] font-bold text-zinc-400 mt-1">Remove chlorophyll</div>
                            </motion.button>
                        )}

                        {currentStep === 4 && (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => handleAction('rinse')}
                                className="p-6 rounded-3xl bg-blue-500/10 border-2 border-blue-500/30 text-left hover:bg-blue-500/20 transition-all"
                            >
                                <div className="text-2xl mb-2">💧</div>
                                <div className="text-sm font-black text-white">Rinse in Warm Water</div>
                                <div className="text-[10px] font-bold text-zinc-400 mt-1">Soften the brittle leaf</div>
                            </motion.button>
                        )}

                        {currentStep === 5 && (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={() => handleAction('stain')}
                                className="p-6 rounded-3xl bg-amber-500/10 border-2 border-amber-500/30 text-left hover:bg-amber-500/20 transition-all"
                            >
                                <div className="text-2xl mb-2">🟤</div>
                                <div className="text-sm font-black text-white">Add Iodine Solution</div>
                                <div className="text-[10px] font-bold text-zinc-400 mt-1">Test for starch presence</div>
                            </motion.button>
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
