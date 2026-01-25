'use client';

import { BusinessState, Employee } from '@/lib/economy/economy-types';
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system';
import { doc, updateDoc, arrayRemove, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface OrgChartProps {
    business: BusinessState;
}

export default function OrgChart({ business }: OrgChartProps) {
    const employees = business.employees || [];

    const handleFire = async (employee: Employee) => {
        if (!confirm(`Are you sure you want to fire ${employee.name}?`)) return;

        const bizRef = doc(db, 'businesses', business.id);
        await updateDoc(bizRef, {
            employees: arrayRemove(employee),
            staffCount: increment(-1)
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end px-2">
                <BrightHeading level={3}>Organizational Chart</BrightHeading>
                <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">{employees.length} Active Staff</span>
            </div>

            {employees.length === 0 ? (
                <BrightLayer variant="glass" padding="lg" className="text-center border-dashed border-2 border-[var(--border-subtle)]">
                    <p className="text-[var(--text-muted)] font-bold">No employees hired yet.</p>
                    <p className="text-sm text-[var(--text-secondary)] mt-2">Visit the Recruitment Center below to build your team.</p>
                </BrightLayer>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {employees.map((emp) => (
                        <BrightLayer key={emp.id} variant="elevated" padding="md" className="relative group border border-[var(--border-subtle)] hover:border-[var(--brand-primary)] transition-all">
                            {/* Header */}
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-elevated)] rounded-full flex items-center justify-center text-lg border border-[var(--border-subtle)] shadow-inner">
                                        👤
                                    </div>
                                    <div>
                                        <p className="font-bold text-[var(--text-primary)] text-sm leading-tight">{emp.name}</p>
                                        <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded mt-0.5
                                            ${emp.role === 'manager' ? 'bg-purple-500/20 text-purple-400' :
                                                emp.role === 'speedster' ? 'bg-blue-500/20 text-blue-400' :
                                                    emp.role === 'specialist' ? 'bg-green-500/20 text-green-400' :
                                                        'bg-[var(--bg-secondary)] text-[var(--text-muted)]'}`}>
                                            {emp.role}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="space-y-2 bg-[var(--bg-primary)]/50 p-2 rounded-lg mb-2">
                                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[var(--text-muted)]">
                                    <span>Speed</span>
                                    <span>{emp.stats.speed}</span>
                                </div>
                                <div className="h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${emp.stats.speed}%` }} />
                                </div>

                                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[var(--text-muted)] mt-2">
                                    <span>Quality</span>
                                    <span>{emp.stats.quality}</span>
                                </div>
                                <div className="h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                    <div className="h-full bg-purple-500" style={{ width: `${emp.stats.quality}%` }} />
                                </div>

                                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[var(--text-muted)] mt-2">
                                    <span>Morale</span>
                                    <span className={emp.stats.morale > 50 ? 'text-[var(--state-success)]' : 'text-[var(--state-error)]'}>
                                        {emp.stats.morale}%
                                    </span>
                                </div>
                                <div className="h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                    <div className={`h-full ${emp.stats.morale > 50 ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${emp.stats.morale}%` }} />
                                </div>
                            </div>

                            <p className="text-[10px] text-[var(--text-muted)] text-right font-mono">
                                Salary: ฿{emp.salaryPerDay}/d
                            </p>

                            <button
                                onClick={() => handleFire(emp)}
                                className="absolute top-2 right-2 p-1.5 text-[var(--state-error)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--state-error)]/10 rounded-md"
                                title="Fire Employee"
                            >
                                <span className="text-xs font-bold uppercase">✕</span>
                            </button>
                        </BrightLayer>
                    ))}
                </div>
            )}
        </div>
    );
}
