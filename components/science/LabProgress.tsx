'use client';

import { motion } from 'framer-motion';
import { BIOLOGY_LABS } from '@/lib/science/biology-labs';
import { BrightHeading, BrightLayer } from '@/components/system';

interface LabProgressProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    userData: any;
}

export default function LabProgress({ userData }: LabProgressProps) {
    const completedLabs = userData?.completedLabs || {};
    const totalXP = Object.keys(completedLabs).reduce((sum, labId) => {
        const lab = BIOLOGY_LABS.find(l => l.id === labId);
        return sum + (lab?.xpReward || 0);
    }, 0);

    const completedCount = Object.keys(completedLabs).length;
    const totalLabs = BIOLOGY_LABS.length;
    const progressPercent = Math.round((completedCount / totalLabs) * 100);

    return (
        <div className="mb-12">
            <div className="flex items-end justify-between mb-6">
                <div>
                    <BrightHeading level={2} className="text-3xl m-0">Science Labs</BrightHeading>
                    <p className="text-[var(--text-secondary)] mt-1">Experimental portfolio status.</p>
                </div>
                <div className="text-right">
                    <div className="text-[10px] uppercase font-black tracking-widest text-[var(--text-muted)]">Total Lab XP</div>
                    <div className="text-3xl font-black text-amber-400">
                        {totalXP} XP
                    </div>
                </div>
            </div>

            <BrightLayer variant="glass" padding="none" className="p-6 md:p-8">
                {/* Progress Bar */}
                <div className="flex items-center gap-4 mb-8">
                    <span className="text-xs font-black uppercase text-[var(--text-muted)]">Completion</span>
                    <div className="flex-1 h-3 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercent}%` }}
                            className="h-full bg-emerald-500"
                        />
                    </div>
                    <span className="text-xs font-black text-emerald-500">{completedCount}/{totalLabs}</span>
                </div>

                {/* Lab Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {BIOLOGY_LABS.map((lab) => {
                        const isCompleted = !!completedLabs[lab.id];
                        return (
                            <div
                                key={lab.id}
                                className={`
                                    relative p-4 rounded-2xl border-2 transition-all
                                    ${isCompleted
                                        ? 'bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10'
                                        : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] opacity-70'}
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-primary)] opacity-50">
                                        {lab.section}
                                    </span>
                                    {isCompleted && (
                                        <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                                            Done
                                        </span>
                                    )}
                                </div>

                                <h4 className={`font-bold mb-1 ${isCompleted ? 'text-white' : 'text-[var(--text-secondary)]'}`}>
                                    {lab.title}
                                </h4>

                                <div className="flex items-center gap-2 mt-4">
                                    <span className="text-xs text-amber-400 font-black flex items-center gap-1">
                                        ⚡ {lab.xpReward} XP
                                    </span>
                                </div>

                                {/* Date completed */}
                                {isCompleted && completedLabs[lab.id] && (
                                    <div className="absolute bottom-4 right-4 text-[9px] text-[var(--text-muted)] uppercase tracking-widest">
                                        Verified
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </BrightLayer>
        </div>
    );
}
