'use client';

import { useState } from 'react';
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system';
import { BusinessState, Employee } from '@/lib/economy/economy-types';
import { doc, updateDoc, arrayUnion, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EmployeeIDCard from '@/components/business/EmployeeIDCard';

interface EmployeeShopProps {
    business: BusinessState;
}

export default function EmployeeShop({ business }: EmployeeShopProps) {
    const candidates = business.recruitmentPool || [];

    const handleHire = async (candidate: Employee) => {
        const hiringCost = Math.floor(candidate.salaryPerDay * 1); // 1 day deposit

        if (business.cashBalance < hiringCost) {
            alert("Insufficient funds for hiring deposit!");
            return;
        }

        const bizRef = doc(db, 'businesses', business.id);
        const newPool = candidates.filter(c => c.id !== candidate.id);

        const employeeRecord = {
            ...candidate,
            unpaidWages: 0,
            hiredAt: new Date().toISOString(),
            stats: {
                ...candidate.stats,
                morale: 100 // Start high
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
            alert("Failed to process hiring. Please try again.");
        }
    };

    const handleDecline = async (candidate: Employee) => {
        const bizRef = doc(db, 'businesses', business.id);
        const newPool = candidates.filter(c => c.id !== candidate.id);
        await updateDoc(bizRef, {
            recruitmentPool: newPool
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center px-2">
                <div>
                    <BrightHeading level={3}>Talent Marketplace</BrightHeading>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Found {candidates.length} candidates available for hire.</p>
                </div>

                {/* Visual Flair */}
                <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="w-8 h-8 rounded-full border-2 border-[var(--bg-primary)] bg-[var(--bg-elevated)] flex items-center justify-center text-[10px] shadow-sm">
                            👤
                        </div>
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-[var(--bg-primary)] bg-[var(--brand-primary)] text-white flex items-center justify-center text-[10px] font-bold shadow-sm z-10">
                        +{candidates.length}
                    </div>
                </div>
            </div>

            {candidates.length === 0 ? (
                <BrightLayer variant="glass" padding="lg" className="text-center border-dashed border-2 border-[var(--border-subtle)]">
                    <div className="text-4xl mb-4 grayscale opacity-50">🕵️‍♀️</div>
                    <BrightHeading level={4} className="mb-2 text-[var(--text-muted)]">No Talent Available</BrightHeading>
                    <p className="text-[var(--text-secondary)]">Headhunters are looking for new candidates. Check back later.</p>
                </BrightLayer>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {candidates.map(candidate => (
                        <div key={candidate.id} className="h-full">
                            <EmployeeIDCard
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
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

