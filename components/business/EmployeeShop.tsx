'use client';

import { useState } from 'react';
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system';
import { BusinessState, Employee, JobRole } from '@/lib/economy/economy-types';
import { BCoinIcon } from '@/components/BCoinIcon';
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface EmployeeShopProps {
    business: BusinessState;
}

export default function EmployeeShop({ business }: EmployeeShopProps) {
    const candidates = business.recruitmentPool || [];

    const handleHire = async (candidate: Employee) => {
        const hiringCost = candidate.salaryPerDay * 7;

        if (business.cashBalance < hiringCost) {
            alert(`Need ฿${hiringCost} (Sign-on Bonus) to hire!`);
            return;
        }

        const bizRef = doc(db, 'businesses', business.id);

        // Transaction style update: remove from pool, add to employees, pay cost
        const newPool = candidates.filter(c => c.id !== candidate.id);

        await updateDoc(bizRef, {
            cashBalance: increment(-hiringCost),
            employees: arrayUnion(candidate),
            recruitmentPool: newPool,
            staffCount: increment(1)
        });
    };

    const handleDecline = async (candidate: Employee) => {
        const bizRef = doc(db, 'businesses', business.id);
        const newPool = candidates.filter(c => c.id !== candidate.id);
        await updateDoc(bizRef, {
            recruitmentPool: newPool
        });
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
                <BrightHeading level={3}>Recruitment Center</BrightHeading>
                <div className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest bg-[var(--bg-elevated)] px-2 py-1 rounded border border-[var(--border-subtle)]">
                    {candidates.length} Available Talent
                </div>
            </div>

            <div className="relative group">
                {/* Horizontal Scroll Container */}
                <div className="flex overflow-x-auto gap-5 pb-6 snap-x snap-mandatory no-scrollbar hide-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {candidates.map(candidate => (
                        <div
                            key={candidate.id}
                            className="flex-none w-72 snap-start bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-2xl p-5 hover:border-[var(--brand-primary)] hover:shadow-[0_0_20px_rgba(var(--brand-primary-rgb),0.1)] transition-all duration-300 relative overflow-hidden group/card"
                        >
                            {/* Role Tag */}
                            <div className="absolute top-0 right-0 p-px">
                                <div className="bg-[var(--bg-elevated)] text-[8px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-bl-xl border-l border-b border-[var(--border-subtle)] text-[var(--text-secondary)]">
                                    {candidate.role}
                                </div>
                            </div>

                            {/* Header Row */}
                            <div className="flex items-center gap-4 mb-6 mt-2">
                                <div className="w-14 h-14 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] rounded-2xl flex items-center justify-center text-2xl shadow-lg ring-1 ring-white/10">
                                    👤
                                </div>
                                <div className="overflow-hidden">
                                    <h4 className="font-bold text-[var(--text-primary)] text-lg truncate pr-10">{candidate.name}</h4>
                                    <div className="flex items-baseline gap-1 mt-1">
                                        <span className="text-[var(--brand-accent)] font-black">฿{candidate.salaryPerDay * 7}</span>
                                        <span className="text-[8px] text-[var(--text-muted)] font-black uppercase">Bonus</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stats Row */}
                            <div className="space-y-4 mb-6 px-1">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                                        <span>Operational Speed</span>
                                        <span className="text-[var(--text-primary)]">{candidate.stats.speed}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full" style={{ width: `${candidate.stats.speed}%` }} />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider">
                                        <span>Work Quality</span>
                                        <span className="text-[var(--text-primary)]">{candidate.stats.quality}%</span>
                                    </div>
                                    <div className="w-full h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                                        <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full" style={{ width: `${candidate.stats.quality}%` }} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    className="flex-1 bg-transparent hover:bg-red-500/10 text-red-400 border border-red-500/30 rounded-xl py-2.5 text-xs font-bold transition-all active:scale-95"
                                    onClick={() => handleDecline(candidate)}
                                >
                                    Decline
                                </button>
                                <button
                                    className="flex-[2] bg-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/90 text-white border border-white/10 rounded-xl py-2.5 text-xs font-black shadow-lg shadow-[var(--brand-primary)]/20 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale"
                                    onClick={() => handleHire(candidate)}
                                    disabled={business.cashBalance < candidate.salaryPerDay * 7}
                                >
                                    Hire Now
                                </button>
                            </div>
                        </div>
                    ))}

                    {/* End Spacer */}
                    <div className="flex-none w-4" />
                </div>

                {candidates.length === 0 && (
                    <div className="text-center py-12 bg-[var(--bg-elevated)]/20 rounded-2xl border-2 border-dashed border-[var(--border-subtle)]">
                        <p className="text-sm text-[var(--text-muted)] font-medium">No candidates in the pool.<br />Human resources will update soon.</p>
                    </div>
                )}

                {/* Fade Scroll Indicator */}
                <div className="absolute right-0 top-0 bottom-6 w-16 bg-gradient-to-l from-[var(--bg-primary)] to-transparent pointer-events-none opacity-40" />
            </div>
        </div>
    );
}

