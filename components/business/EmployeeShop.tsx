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
        <BrightLayer variant="elevated" padding="lg" className="h-full">
            <div className="flex justify-between items-center mb-6">
                <BrightHeading level={3}>Recruitment Center</BrightHeading>
                <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    {candidates.length} Candidates
                </div>
            </div>

            <div className="space-y-4">
                {candidates.map(candidate => (
                    <div key={candidate.id} className="bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl p-4 hover:border-[var(--brand-primary)] transition-all flex flex-col gap-4 relative overflow-hidden group">

                        {/* Header Row */}
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] rounded-full flex items-center justify-center text-xl shadow-lg">
                                    👤
                                </div>
                                <div>
                                    <h4 className="font-bold text-[var(--text-primary)] leading-tight">{candidate.name}</h4>
                                    <span className="inline-block bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md mt-1 text-[var(--text-secondary)]">
                                        {candidate.role}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase">Sign-on</p>
                                <p className="text-[var(--brand-accent)] font-black">฿{candidate.salaryPerDay * 7}</p>
                            </div>
                        </div>

                        {/* Stats Row */}
                        <div className="grid grid-cols-2 gap-3 bg-[var(--bg-elevated)]/50 p-2 rounded-lg">
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold uppercase text-[var(--text-muted)]">
                                    <span>Speed</span>
                                    <span>{candidate.stats.speed}</span>
                                </div>
                                <div className="w-full h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${candidate.stats.speed}%` }} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between text-[10px] font-bold uppercase text-[var(--text-muted)]">
                                    <span>Quality</span>
                                    <span>{candidate.stats.quality}</span>
                                </div>
                                <div className="w-full h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500 rounded-full" style={{ width: `${candidate.stats.quality}%` }} />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <BrightButton
                                variant="outline"
                                size="sm"
                                className="w-1/3 text-[var(--state-error)] border-[var(--state-error)] hover:bg-[var(--state-error)]/10"
                                onClick={() => handleDecline(candidate)}
                            >
                                Decline
                            </BrightButton>
                            <BrightButton
                                variant="primary"
                                size="sm"
                                className="w-2/3"
                                onClick={() => handleHire(candidate)}
                                disabled={business.cashBalance < candidate.salaryPerDay * 7}
                            >
                                Hire
                            </BrightButton>
                        </div>
                    </div>
                ))}

                {candidates.length === 0 && (
                    <div className="text-center py-8 text-[var(--text-muted)] italic">
                        No active candidates. Check back later.
                    </div>
                )}
            </div>
        </BrightLayer>
    );
}
