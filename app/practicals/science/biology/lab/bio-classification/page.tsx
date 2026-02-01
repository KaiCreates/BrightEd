'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ScienceLabLayout from '@/components/science/ScienceLabLayout';
import { BrightLayer } from '@/components/system';

interface Organism {
    id: string;
    name: string;
    icon: string;
    kingdom: 'Plantae' | 'Animalia' | 'Fungi';
    features: string[];
    classification?: {
        kingdom: string;
        phylum?: string;
        class?: string;
    };
    collected: boolean;
    classified: boolean;
}

export default function ClassificationLabPage() {
    const [currentStep, setCurrentStep] = useState(0);
    const [organisms, setOrganisms] = useState<Organism[]>([
        { id: 'fern', name: 'Fern', icon: '🌿', kingdom: 'Plantae', features: ['Non-flowering', 'Spore reproduction', 'Vascular'], collected: false, classified: false },
        { id: 'hibiscus', name: 'Hibiscus', icon: '🌺', kingdom: 'Plantae', features: ['Flowering', 'Dicot', 'Broad leaves'], collected: false, classified: false },
        { id: 'corn', name: 'Corn Plant', icon: '🌽', kingdom: 'Plantae', features: ['Flowering', 'Monocot', 'Parallel veins'], collected: false, classified: false },
        { id: 'mushroom', name: 'Mushroom', icon: '🍄', kingdom: 'Fungi', features: ['No chlorophyll', 'Spore reproduction', 'Decomposer'], collected: false, classified: false },
        { id: 'butterfly', name: 'Butterfly', icon: '🦋', kingdom: 'Animalia', features: ['Invertebrate', 'Exoskeleton', 'Metamorphosis'], collected: false, classified: false },
        { id: 'lizard', name: 'Lizard', icon: '🦎', kingdom: 'Animalia', features: ['Vertebrate', 'Cold-blooded', 'Scales'], collected: false, classified: false },
    ]);
    const [selectedOrganism, setSelectedOrganism] = useState<Organism | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [labLog, setLabLog] = useState<string[]>([]);
    const [score, setScore] = useState(100);

    const kingdomOptions = ['Plantae', 'Animalia', 'Fungi'];

    const addLog = (entry: string) => {
        setLabLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${entry}`]);
    };

    const handleCollect = (id: string) => {
        setOrganisms(prev => prev.map(o =>
            o.id === id ? { ...o, collected: true } : o
        ));
        const org = organisms.find(o => o.id === id);
        if (org) {
            addLog(`Collected specimen: ${org.name}`);
        }

        const collectedCount = organisms.filter(o => o.collected).length + 1;
        if (collectedCount === organisms.length) {
            setCurrentStep(1);
        }
    };

    const handleSelectForClassification = (org: Organism) => {
        setSelectedOrganism(org);
    };

    const handleClassify = (kingdom: string) => {
        if (!selectedOrganism) return;

        const correct = selectedOrganism.kingdom === kingdom;

        setOrganisms(prev => prev.map(o =>
            o.id === selectedOrganism.id ? {
                ...o,
                classified: true,
                classification: { kingdom }
            } : o
        ));

        if (correct) {
            addLog(`✓ ${selectedOrganism.name} correctly classified as ${kingdom}`);
        } else {
            addLog(`✗ ${selectedOrganism.name} incorrectly classified as ${kingdom} (correct: ${selectedOrganism.kingdom})`);
            setScore(prev => prev - 10);
        }

        setSelectedOrganism(null);

        // Check if all are classified
        const classifiedCount = organisms.filter(o => o.classified).length + 1;
        if (classifiedCount === organisms.length) {
            setCurrentStep(2);
        }
    };

    const collectedOrganisms = useMemo(() => organisms.filter(o => o.collected), [organisms]);
    const unclassifiedOrganisms = useMemo(() => organisms.filter(o => o.collected && !o.classified), [organisms]);

    const plantaeGroup = useMemo(() => organisms.filter(o => o.classified && o.classification?.kingdom === 'Plantae'), [organisms]);
    const animaliaGroup = useMemo(() => organisms.filter(o => o.classified && o.classification?.kingdom === 'Animalia'), [organisms]);
    const fungiGroup = useMemo(() => organisms.filter(o => o.classified && o.classification?.kingdom === 'Fungi'), [organisms]);

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
                        🔬✅
                    </motion.div>
                    <h1 className="text-4xl md:text-6xl font-black text-emerald-400 mb-4 uppercase tracking-tight">
                        Classification Complete
                    </h1>
                    <p className="text-xl text-zinc-300 mb-8 leading-relaxed">
                        You successfully identified and classified organisms into their correct
                        <span className="text-emerald-400 font-bold"> kingdoms</span>.
                    </p>

                    <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg mx-auto">
                        <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
                            <div className="text-2xl mb-2">🌿</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-green-400">Plantae</div>
                            <div className="text-lg font-black text-white">{plantaeGroup.length}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20">
                            <div className="text-2xl mb-2">🦎</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-orange-400">Animalia</div>
                            <div className="text-lg font-black text-white">{animaliaGroup.length}</div>
                        </div>
                        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20">
                            <div className="text-2xl mb-2">🍄</div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-purple-400">Fungi</div>
                            <div className="text-lg font-black text-white">{fungiGroup.length}</div>
                        </div>
                    </div>

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
            labTitle="Classification of Organisms"
            syllabusSection="Section A: Living Organisms"
            objectives={[
                'Collect specimens from the virtual garden',
                'Observe distinguishing features',
                'Classify organisms into kingdoms',
                'Identify monocots vs dicots'
            ]}
            equipment={[
                { name: 'Hand Lens', icon: '🔍' },
                { name: 'Forceps', icon: '🥢' },
                { name: 'Collection Jar', icon: '🫙' },
                { name: 'Field Notebook', icon: '📓' },
                { name: 'Classification Key', icon: '🔑' }
            ]}
            currentStep={currentStep}
            totalSteps={3}
        >
            <div className="h-full flex flex-col p-8 overflow-y-auto">
                {/* Active Step Instruction */}
                <div className="mb-8">
                    <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                            Step {currentStep + 1} of 3
                        </span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tight text-white mb-2">
                        {currentStep === 0 && 'Explore the Garden'}
                        {currentStep === 1 && 'Classify Specimens'}
                        {currentStep === 2 && 'Review Results'}
                    </h2>
                    <p className="text-zinc-400 font-medium">
                        {currentStep === 0 && 'Click on organisms in the virtual garden to collect them.'}
                        {currentStep === 1 && 'Observe each specimen and assign it to the correct kingdom.'}
                        {currentStep === 2 && 'Review your classification groups.'}
                    </p>
                </div>

                <div className="flex-1 grid grid-cols-2 gap-8">
                    {/* Left: Garden / Collection */}
                    {currentStep === 0 && (
                        <BrightLayer variant="elevated" padding="lg" className="relative overflow-hidden">
                            <div className="absolute top-4 left-4 z-10 text-[9px] font-black uppercase tracking-widest text-zinc-500 bg-black/60 px-3 py-1 rounded-full">
                                Virtual Garden
                            </div>

                            {/* Garden Background */}
                            <div className="absolute inset-0 bg-gradient-to-b from-green-900/50 to-green-950" />

                            {/* Organisms in Garden */}
                            <div className="relative h-full grid grid-cols-3 gap-4 p-4 pt-12">
                                {organisms.map((org) => (
                                    <button
                                        key={org.id}
                                        onClick={() => !org.collected && handleCollect(org.id)}
                                        disabled={org.collected}
                                        className={`aspect-square rounded-3xl flex flex-col items-center justify-center transition-all ${org.collected
                                                ? 'bg-emerald-500/10 border-2 border-emerald-500/30 opacity-50'
                                                : 'bg-white/5 border-2 border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:scale-105'
                                            }`}
                                    >
                                        <span className="text-4xl mb-2">{org.icon}</span>
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                            {org.collected ? '✓ Collected' : org.name}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </BrightLayer>
                    )}

                    {currentStep >= 1 && (
                        <BrightLayer variant="elevated" padding="lg">
                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">
                                {currentStep === 1 ? 'Specimens to Classify' : 'Classified Specimens'}
                            </div>

                            {currentStep === 1 && (
                                <div className="space-y-3">
                                    {unclassifiedOrganisms.map((org) => (
                                        <button
                                            key={org.id}
                                            onClick={() => handleSelectForClassification(org)}
                                            className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all ${selectedOrganism?.id === org.id
                                                    ? 'bg-emerald-500/20 border-2 border-emerald-500'
                                                    : 'bg-white/5 border-2 border-white/10 hover:border-white/20'
                                                }`}
                                        >
                                            <span className="text-3xl">{org.icon}</span>
                                            <div className="text-left">
                                                <div className="font-black text-white">{org.name}</div>
                                                <div className="text-[10px] text-zinc-500">{org.features.join(', ')}</div>
                                            </div>
                                        </button>
                                    ))}
                                    {unclassifiedOrganisms.length === 0 && (
                                        <div className="text-center py-10 text-zinc-500">
                                            All specimens classified!
                                        </div>
                                    )}
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="space-y-6">
                                    {/* Plantae */}
                                    <div className="p-4 rounded-2xl bg-green-500/5 border border-green-500/20">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-3">Kingdom Plantae</div>
                                        <div className="flex flex-wrap gap-2">
                                            {plantaeGroup.map(o => (
                                                <span key={o.id} className="px-3 py-1 rounded-full bg-green-500/10 text-sm font-bold text-green-300">
                                                    {o.icon} {o.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Animalia */}
                                    <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/20">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-3">Kingdom Animalia</div>
                                        <div className="flex flex-wrap gap-2">
                                            {animaliaGroup.map(o => (
                                                <span key={o.id} className="px-3 py-1 rounded-full bg-orange-500/10 text-sm font-bold text-orange-300">
                                                    {o.icon} {o.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    {/* Fungi */}
                                    <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/20">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-3">Kingdom Fungi</div>
                                        <div className="flex flex-wrap gap-2">
                                            {fungiGroup.map(o => (
                                                <span key={o.id} className="px-3 py-1 rounded-full bg-purple-500/10 text-sm font-bold text-purple-300">
                                                    {o.icon} {o.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleComplete}
                                        className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest hover:bg-emerald-400 transition-all"
                                    >
                                        Complete Lab
                                    </button>
                                </div>
                            )}
                        </BrightLayer>
                    )}

                    {/* Right: Collection / Classification Interface */}
                    <div>
                        {currentStep === 0 && (
                            <BrightLayer variant="elevated" padding="lg" className="h-full">
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">
                                    Collection Jar ({collectedOrganisms.length}/{organisms.length})
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    {collectedOrganisms.map((org) => (
                                        <div key={org.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
                                            <span className="text-2xl">{org.icon}</span>
                                            <div className="text-xs font-bold text-zinc-400 mt-2">{org.name}</div>
                                        </div>
                                    ))}
                                </div>
                            </BrightLayer>
                        )}

                        {currentStep === 1 && selectedOrganism && (
                            <BrightLayer variant="elevated" padding="lg" className="h-full flex flex-col">
                                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">
                                    Specimen Details
                                </div>

                                <div className="flex-1">
                                    <div className="text-center mb-8">
                                        <span className="text-6xl">{selectedOrganism.icon}</span>
                                        <h3 className="text-xl font-black text-white mt-4">{selectedOrganism.name}</h3>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-6">
                                        <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-2">Observed Features</div>
                                        <div className="flex flex-wrap gap-2">
                                            {selectedOrganism.features.map((f, i) => (
                                                <span key={i} className="px-3 py-1 rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-400">
                                                    {f}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-3">Classify Into Kingdom</div>
                                    <div className="space-y-3">
                                        {kingdomOptions.map((kingdom) => (
                                            <button
                                                key={kingdom}
                                                onClick={() => handleClassify(kingdom)}
                                                className={`w-full p-4 rounded-2xl border-2 transition-all text-left ${kingdom === 'Plantae'
                                                        ? 'bg-green-500/5 border-green-500/20 hover:border-green-500'
                                                        : kingdom === 'Animalia'
                                                            ? 'bg-orange-500/5 border-orange-500/20 hover:border-orange-500'
                                                            : 'bg-purple-500/5 border-purple-500/20 hover:border-purple-500'
                                                    }`}
                                            >
                                                <span className="text-sm font-black text-white">{kingdom}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </BrightLayer>
                        )}

                        {currentStep === 1 && !selectedOrganism && (
                            <BrightLayer variant="elevated" padding="lg" className="h-full flex items-center justify-center">
                                <div className="text-center text-zinc-500">
                                    <div className="text-4xl mb-4">🔍</div>
                                    <p className="text-sm font-bold">Select a specimen to classify</p>
                                </div>
                            </BrightLayer>
                        )}
                    </div>
                </div>

                {/* Lab Log */}
                <div className="mt-8 p-4 rounded-2xl bg-black/40 border border-white/5 max-h-32 overflow-y-auto font-mono text-xs text-zinc-400">
                    {labLog.length === 0 ? (
                        <div className="text-zinc-600">Lab session started. Explore the garden to collect specimens...</div>
                    ) : (
                        labLog.map((entry, i) => <div key={i}>{entry}</div>)
                    )}
                </div>
            </div>
        </ScienceLabLayout>
    );
}
