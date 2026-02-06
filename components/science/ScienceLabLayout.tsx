'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { BrightLayer, BrightHeading } from '@/components/system';

interface ScienceLabLayoutProps {
    children: React.ReactNode;
    labTitle: string;
    syllabusSection: string;
    objectives: string[];
    equipment: { name: string; icon: string }[];
    currentStep: number;
    totalSteps: number;
    onExit?: () => void;
}

export default function ScienceLabLayout({
    children,
    labTitle,
    syllabusSection,
    objectives,
    equipment,
    currentStep,
    totalSteps,
    onExit
}: ScienceLabLayoutProps) {
    const [showInventory, setShowInventory] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    return (
        <div className="fixed inset-0 bg-[#0A0F18] text-white overflow-hidden flex flex-col z-[100]">
            {/* Immersive Background */}
            <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-emerald-500/10 blur-[150px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-1/3 h-1/3 bg-blue-500/10 blur-[130px] rounded-full" />
            </div>

            {/* Laboratory Header */}
            <header className="relative z-20 h-16 bg-white/[0.03]  border-b border-[#3D3D5C] flex items-center justify-between px-6">
                <div className="flex items-center gap-6">
                    <button
                        onClick={() => onExit ? onExit() : window.history.back()}
                        className="text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-white transition-colors"
                    >
                        ← Terminate Session
                    </button>
                    <div className="h-6 w-px bg-white/10" />
                    <div className="flex flex-col">
                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 opacity-80">{syllabusSection}</div>
                        <div className="text-sm font-black tracking-tight">{labTitle}</div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-black/40 px-4 py-1.5 rounded-full border border-[#3D3D5C]">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-300">
                            System Stable • {currentStep}/{totalSteps}
                        </span>
                    </div>
                    <button
                        onClick={() => setShowReport(!showReport)}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showReport ? 'bg-emerald-500 text-white' : 'bg-white/5 text-zinc-400 hover:bg-white/10 border border-[#3D3D5C]'
                            }`}
                    >
                        Notebook
                    </button>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative z-10">
                {/* Left Toolbar: Equipment & Inventory */}
                <aside className="w-64 border-r border-[#3D3D5C] bg-black/20 -sm flex flex-col p-6">
                    <div className="mb-10">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-6">Equipment Room</h3>
                        <div className="space-y-3">
                            {equipment.map((item, i) => (
                                <div
                                    key={i}
                                    className="group flex items-center gap-4 p-3 rounded-2xl bg-white/[0.03] border border-white/5 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all cursor-crosshair"
                                >
                                    <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300 group-hover:text-white">{item.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="mt-auto">
                        <div className="p-4 rounded-3xl bg-emerald-500/5 border border-emerald-500/20">
                            <div className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mb-2">Safety Protocol</div>
                            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
                                Ensure all virtual specimen are handled with the proper laboratory tools.
                            </p>
                        </div>
                    </div>
                </aside>

                {/* Main Experimentation Area */}
                <main className="flex-1 relative overflow-hidden bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]">
                    {children}
                </main>

                {/* Right Sidebar: Objectives & Checklist */}
                <aside className="w-80 border-l border-[#3D3D5C] bg-black/20 -sm p-6 flex flex-col gap-6 overflow-y-auto">
                    <div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-4">Scientific Aim</h3>
                        <div className="space-y-4">
                            {objectives.map((obj, i) => (
                                <div key={i} className="flex gap-4 group">
                                    <div className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 transition-all ${i < currentStep ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'
                                        }`} />
                                    <p className={`text-[11px] font-medium leading-relaxed transition-colors ${i < currentStep ? 'text-zinc-400 line-through' : 'text-zinc-200'
                                        }`}>
                                        {obj}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Quick Stats / Environment Monitor */}
                    <div className="mt-auto space-y-4">
                        <div className="p-5 rounded-[2rem] bg-[#131325] border border-[#3D3D5C] space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Stability</span>
                                <span className="text-[10px] font-black text-emerald-400">100%</span>
                            </div>
                            <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: '100%' }}
                                    className="h-full bg-emerald-500"
                                />
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Lab Notebook Overlay */}
            <AnimatePresence>
                {showReport && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute inset-x-0 bottom-0 top-16 z-50 p-8 flex items-center justify-center bg-black/60 "
                    >
                        <div className="w-full max-w-4xl h-full max-h-[800px] bg-[#fdfdfd] text-zinc-900 rounded-[2.5rem] shadow-2xl p-12 overflow-y-auto relative border-[12px] border-white/20">
                            <button
                                onClick={() => setShowReport(false)}
                                className="absolute top-8 right-8 w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-xl hover:bg-zinc-200 transition-colors"
                            >
                                ✕
                            </button>

                            <div className="border-b-2 border-zinc-200 pb-8 mb-8">
                                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-2">School-Based Assessment (SBA)</div>
                                <h1 className="text-4xl font-serif font-bold italic tracking-tight">{labTitle}</h1>
                                <div className="mt-4 flex gap-6 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                                    <span>Subject: Biology</span>
                                    <span>Date: {isMounted ? new Date().toLocaleDateString() : '--/--/--'}</span>
                                </div>
                            </div>

                            <div className="space-y-10 font-serif">
                                <section>
                                    <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 mb-4 border-b border-zinc-100 pb-2">Apparatus & Materials</h2>
                                    <ul className="grid grid-cols-2 gap-4">
                                        {equipment.map((e, i) => (
                                            <li key={i} className="flex items-center gap-3 text-sm text-zinc-500">
                                                <span className="text-emerald-500">✓</span> {e.name}
                                            </li>
                                        ))}
                                    </ul>
                                </section>

                                <section>
                                    <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 mb-4 border-b border-zinc-100 pb-2">Method / Procedure</h2>
                                    <p className="text-sm text-zinc-500 italic leading-relaxed">
                                        Procedure is automatically generated based on the virtual session actions.
                                    </p>
                                </section>

                                <section>
                                    <h2 className="text-sm font-black uppercase tracking-widest text-zinc-900 mb-4 border-b border-zinc-100 pb-2">Results & Observations</h2>
                                    <div className="p-10 rounded-3xl bg-zinc-50 border-2 border-dashed border-zinc-200 text-center">
                                        <p className="text-xs font-black uppercase tracking-widest text-zinc-400">Complete the virtual experiment to generate results</p>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
