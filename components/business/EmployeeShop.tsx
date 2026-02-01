'use client';

import { useState } from 'react';
import { BrightHeading, useDialog } from '@/components/system';
import { BusinessState, Employee } from '@/lib/economy/economy-types';
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EmployeeIDCard from '@/components/business/EmployeeIDCard';

interface EmployeeShopProps {
    business: BusinessState;
}

export default function EmployeeShop({ business }: EmployeeShopProps) {
    const candidates = business.recruitmentPool || [];
    const { showAlert, showConfirm } = useDialog();

    const handleHire = (candidate: Employee) => {
        const hiringCost = Math.floor(candidate.salaryPerDay * 1);

        if (business.cashBalance < hiringCost) {
            showAlert("Insufficient funds for hiring deposit! Earn more capital before expanding your team.", { title: 'INSUFFICIENT FUNDS' });
            return;
        }

        showConfirm(
            `Hire ${candidate.name} for a daily rate of ฿${candidate.salaryPerDay}? A 1-day deposit (฿${hiringCost}) is required.`,
            async () => {
                const bizRef = doc(db, 'businesses', business.id);
                const newPool = candidates.filter(c => c.id !== candidate.id);

                const employeeRecord = {
                    ...candidate,
                    unpaidWages: 0,
                    hiredAt: new Date().toISOString(),
                    stats: {
                        ...candidate.stats,
                        morale: 100
                    }
                };

                try {
                    await updateDoc(bizRef, {
                        cashBalance: increment(-hiringCost),
                        balance: increment(-hiringCost),
                        employees: arrayUnion(employeeRecord),
                        recruitmentPool: newPool,
                        staffCount: increment(1)
                    });
                } catch (e) {
                    console.error("Hiring failed:", e);
                    showAlert("Failed to process hiring. Please check your connection and try again.");
                }
            },
            { title: 'CONFIRM HIRING', confirmLabel: 'HIRE' }
        );
    };

    const handleDecline = async (candidate: Employee) => {
        const bizRef = doc(db, 'businesses', business.id);
        const newPool = candidates.filter(c => c.id !== candidate.id);
        await updateDoc(bizRef, {
            recruitmentPool: newPool
        });
    };

    return (
        <div className="duo-card p-8 space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-primary)] mb-1">Recruitment</div>
                    <BrightHeading level={2} className="text-3xl m-0">Talent Marketplace</BrightHeading>
                    <p className="text-xs text-[var(--text-secondary)] font-bold mt-1 opacity-70">Found {candidates.length} candidates available for hire.</p>
                </div>

                {/* Visual Flair - Randomized Avatars */}
                <div className="flex -space-x-3">
                    {candidates.slice(0, 3).map(c => (
                        <div key={c.id} className="w-12 h-12 rounded-2xl border-4 border-[var(--bg-primary)] bg-[var(--bg-elevated)] overflow-hidden shadow-lg transition-transform hover:translate-y-[-4px] hover:z-20">
                            <img
                                src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${c.id}&backgroundColor=b6e3f4,c0aede,d1d4f9&backgroundType=solid`}
                                alt="candidate"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    ))}
                    {candidates.length > 3 && (
                        <div className="w-12 h-12 rounded-2xl border-4 border-[var(--bg-primary)] bg-[var(--brand-primary)] text-white flex items-center justify-center text-xs font-black shadow-lg z-10 transition-transform hover:scale-110">
                            +{candidates.length - 3}
                        </div>
                    )}
                </div>
            </div>

            {candidates.length === 0 ? (
                <div className="py-20 text-center bg-[var(--bg-secondary)]/30 rounded-[3rem] border-2 border-dashed border-[var(--border-subtle)]">
                    <div className="text-6xl mb-6 grayscale opacity-30">🕵️‍♀️</div>
                    <BrightHeading level={3} className="mb-2 text-[var(--text-muted)] tracking-tighter">Market Exhausted</BrightHeading>
                    <p className="text-sm font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50">Headhunters are refreshing the pool...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 auto-rows-fr">
                    {candidates.map(candidate => (
                        <EmployeeIDCard
                            key={candidate.id}
                            employee={candidate}
                            mode="hiring"
                            onAction={() => handleHire(candidate)}
                            onSecondaryAction={() => handleDecline(candidate)}
                            actionLabel={`HIRE (฿${(candidate.salaryPerDay).toLocaleString()})`}
                            secondaryLabel="PASS"
                            cost={candidate.salaryPerDay}
                            currencyContext={business.cashBalance}
                            disabled={business.cashBalance < candidate.salaryPerDay}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

