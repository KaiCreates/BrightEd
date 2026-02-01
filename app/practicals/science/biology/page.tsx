'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BIOLOGY_LABS, BiologyLab } from '@/lib/science/biology-labs';
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system';
import { getAllMissionCompletions } from '@/lib/brightos/mission-progress';

export default function BiologyRoadmapPage() {
    const [selectedId, setSelectedId] = useState<string>(BIOLOGY_LABS[0]?.id || '');

    const completions = useMemo(() => getAllMissionCompletions(), []);

    const selected = useMemo(() => {
        return BIOLOGY_LABS.find((l) => l.id === selectedId) || null;
    }, [selectedId]);

    const sections = ['Section A', 'Section B', 'Section C'] as const;

    return (
        <div className="min-h-screen bg-[#050B14] relative overflow-hidden safe-padding pb-32">
            {/* Dynamic Background Elements */}
            <div className="fixed inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse-slow" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-500/5 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-12 pt-20 md:pt-28">
                {/* Breadcrumbs & Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
                    <Link
                        href="/practicals"
                        className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 hover:text-white transition-colors"
                    >
                        <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Practicals
                    </Link>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500/60 bg-emerald-500/5 px-4 py-1.5 rounded-full border border-emerald-500/10 backdrop-blur-sm">
                        Science / <span className="text-emerald-400">Biology Portfolio</span>
                    </div>
                </div>

                <div className="mb-12">
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <BrightHeading level={1} className="text-4xl md:text-6xl font-black tracking-tighter leading-none mb-6">
                            SBA Lab <span className="text-emerald-400">Portfolio</span>
                        </BrightHeading>
                        <p className="text-zinc-400 max-w-2xl text-base md:text-lg leading-relaxed font-medium">
                            Complete the required practical activities for your School-Based Assessment.
                            Earn XP and build a digital record of your observations and reports.
                        </p>
                    </motion.div>
                </div>

                {/* Lab Grid */}
                <div className="grid gap-8 lg:grid-cols-[1fr_450px]">
                    {/* Lab List by Section */}
                    <div className="space-y-12">
                        {sections.map((section) => (
                            <div key={section} className="space-y-6">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-sm font-black uppercase tracking-[0.4em] text-zinc-500">{section}</h2>
                                    <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent" />
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                    {BIOLOGY_LABS.filter(l => l.section === section).map((lab) => {
                                        const isCompleted = completions.some(c => c.objectiveId === `science:biology:${lab.id}`);
                                        const isSelected = selectedId === lab.id;

                                        return (
                                            <button
                                                key={lab.id}
                                                onClick={() => setSelectedId(lab.id)}
                                                className={`text-left group relative transition-all duration-300 ${isSelected ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                                                    }`}
                                            >
                                                <BrightLayer
                                                    variant={isSelected ? "elevated" : "glass"}
                                                    padding="md"
                                                    className={`h-full border-b-[8px] transition-all overflow-hidden ${isSelected
                                                        ? 'border-emerald-500 bg-emerald-500/5'
                                                        : 'border-zinc-800 hover:border-zinc-600 bg-white/[0.02]'
                                                        }`}
                                                >
                                                    <div className="flex flex-col h-full relative z-10">
                                                        <div className="flex items-start justify-between mb-6">
                                                            <div className="space-y-2">
                                                                <div className="flex flex-wrap gap-2">
                                                                    {lab.skills.map(skill => (
                                                                        <span key={skill} className="px-2 py-0.5 rounded bg-zinc-800 text-[8px] font-black uppercase tracking-widest text-zinc-400">
                                                                            {skill}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                                <h3 className={`text-xl font-black tracking-tight leading-tight group-hover:text-emerald-400 transition-colors ${isSelected ? 'text-emerald-400' : 'text-white'
                                                                    }`}>
                                                                    {lab.title}
                                                                </h3>
                                                            </div>
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl transition-all ${isSelected ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-zinc-900 text-zinc-500'
                                                                }`}>
                                                                {isCompleted ? '✅' : '🧪'}
                                                            </div>
                                                        </div>

                                                        <div className="mt-auto flex items-center justify-between pt-4 border-t border-white/5">
                                                            <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                                                                {lab.xpReward} XP Reward
                                                            </div>
                                                            <div className={`text-[10px] font-black uppercase tracking-widest ${isCompleted ? 'text-emerald-500' : 'text-zinc-600'
                                                                }`}>
                                                                {isCompleted ? 'CLEAR' : 'OPEN'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </BrightLayer>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Details Sidebar */}
                    <div className="relative">
                        <div className="sticky top-28 space-y-6">
                            <AnimatePresence mode="wait">
                                {selected && (
                                    <motion.div
                                        key={selected.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                    >
                                        <BrightLayer variant="elevated" padding="lg" className="border-b-[8px] border-emerald-700 bg-gradient-to-br from-emerald-500/5 to-transparent">
                                            <div className="mb-8">
                                                <div className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-4 flex items-center gap-2">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                                    Lab Details
                                                </div>
                                                <h2 className="text-3xl font-black text-white tracking-tighter leading-none mb-4">{selected.title}</h2>
                                                <p className="text-zinc-400 text-sm font-medium leading-relaxed">
                                                    {selected.description}
                                                </p>
                                            </div>

                                            <div className="space-y-6 mb-8">
                                                <div>
                                                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 mb-3">Syllabus Objectives</div>
                                                    <ul className="space-y-3">
                                                        {selected.objectives.map((obj, i) => (
                                                            <li key={i} className="flex gap-3 text-xs text-zinc-300 font-medium">
                                                                <span className="text-emerald-500 font-black">•</span>
                                                                {obj}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-4 rounded-3xl bg-white/[0.03] border border-white/5">
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">Marked Skill</div>
                                                        <div className="text-xs font-black text-white">{selected.skills.join(', ')}</div>
                                                    </div>
                                                    <div className="p-4 rounded-3xl bg-white/[0.03] border border-white/5">
                                                        <div className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mb-1">XP Potential</div>
                                                        <div className="text-xs font-black text-emerald-400">+{selected.xpReward}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <Link href={`/practicals/science/biology/lab/${selected.id}`} className="block">
                                                <BrightButton variant="primary" size="lg" className="w-full h-14 bg-emerald-500 hover:bg-emerald-400 text-[11px] font-black uppercase tracking-[0.3em]">
                                                    Run Practical Session →
                                                </BrightButton>
                                            </Link>
                                        </BrightLayer>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {/* Lab Guidelines Tip */}
                            <BrightLayer variant="glass" padding="md" className="border-zinc-800">
                                <div className="flex gap-4">
                                    <span className="text-2xl">💡</span>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-emerald-500 mb-1">Lab Tip</div>
                                        <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest leading-relaxed">
                                            SBA drawings must use <span className="text-zinc-200">solid lines</span>. Sketching or shading will result in a point deduction.
                                        </p>
                                    </div>
                                </div>
                            </BrightLayer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
