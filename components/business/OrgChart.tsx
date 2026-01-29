'use client';

import { BusinessState, Employee } from '@/lib/economy/economy-types';
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system';
import { doc, updateDoc, arrayRemove, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getAvailableSpecializations, assignSpecialization } from '@/lib/economy/employee-skills';
import { useState } from 'react';

interface OrgChartProps {
    business: BusinessState;
}

export default function OrgChart({ business }: OrgChartProps) {
    const employees = business.employees || [];
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

    const handleFire = async (employee: Employee) => {
        if (!confirm(`Are you sure you want to fire ${employee.name}?`)) return;

        const bizRef = doc(db, 'businesses', business.id);
        await updateDoc(bizRef, {
            employees: arrayRemove(employee),
            staffCount: increment(-1)
        });
    };

    const handleAssignSpecialization = async (employee: Employee, specialization: string) => {
        const updatedEmployee = assignSpecialization(employee, specialization as any);
        const bizRef = doc(db, 'businesses', business.id);
        const updatedEmployees = employees.map(e => e.id === employee.id ? updatedEmployee : e);
        
        await updateDoc(bizRef, {
            employees: updatedEmployees
        });
        
        setSelectedEmployee(null);
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

                            {/* Specialization Badge */}
                            {emp.specialization && (
                                <div className="mb-2 px-2 py-1 bg-gradient-to-r from-[var(--brand-primary)]/20 to-[var(--brand-accent)]/20 border border-[var(--brand-primary)]/30 rounded-lg">
                                    <div className="text-[9px] font-black uppercase tracking-widest text-[var(--brand-primary)] flex items-center gap-1">
                                        <span>⭐</span>
                                        <span>{emp.specialization.replace(/_/g, ' ')}</span>
                                    </div>
                                </div>
                            )}

                            {/* Skills */}
                            {emp.skills && Object.keys(emp.skills).length > 0 && (
                                <div className="space-y-2 bg-[var(--bg-primary)]/50 p-2 rounded-lg mb-2">
                                    {Object.entries(emp.skills).map(([skillName, skill]) => {
                                        const canUnlock = skill.level >= 3 && !emp.specialization;
                                        return (
                                            <div key={skillName}>
                                                <div className="flex items-center justify-between text-[10px] uppercase font-bold text-[var(--text-muted)]">
                                                    <span className="flex items-center gap-1">
                                                        {skillName.replace(/_/g, ' ')}
                                                        {canUnlock && <span className="text-[var(--brand-accent)] animate-pulse">✨</span>}
                                                    </span>
                                                    <span>Lv.{skill.level}</span>
                                                </div>
                                                <div className="h-1 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)]" 
                                                        style={{ width: `${(skill.experience / (skill.experienceToNext + skill.experience)) * 100}%` }} 
                                                    />
                                                </div>
                                                <div className="text-[8px] text-[var(--text-muted)] mt-0.5">
                                                    {skill.experience}/{skill.experience + skill.experienceToNext} XP
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Base Stats */}
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

                            {/* Specialization Unlock Button */}
                            {emp.skills && Object.values(emp.skills).some(s => s.level >= 3) && !emp.specialization && (
                                <button
                                    onClick={() => setSelectedEmployee(emp)}
                                    className="w-full mb-2 px-3 py-2 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:shadow-lg transition-all"
                                >
                                    ⭐ Unlock Specialization
                                </button>
                            )}

                            <p className="text-[10px] text-[var(--text-muted)] text-right font-mono">
                                Salary: ฿{emp.salaryPerDay}/d • {emp.tasksCompleted || 0} tasks
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

            {/* Specialization Selection Modal */}
            {selectedEmployee && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <BrightLayer variant="elevated" padding="lg" className="max-w-md w-full">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <BrightHeading level={3}>Choose Specialization</BrightHeading>
                                <p className="text-sm text-[var(--text-secondary)]">{selectedEmployee.name}</p>
                            </div>
                            <button 
                                onClick={() => setSelectedEmployee(null)}
                                className="text-[var(--text-muted)] hover:text-white"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-3">
                            {Object.entries(selectedEmployee.skills || {})
                                .filter(([_, skill]) => skill.level >= 3)
                                .flatMap(([skillName]) => getAvailableSpecializations(skillName))
                                .map((spec) => {
                                    const specInfo = {
                                        speed_specialist: { name: 'Speed Specialist', desc: '25% faster fulfillment', icon: '⚡' },
                                        quality_master: { name: 'Quality Master', desc: '25% quality boost', icon: '💎' },
                                        customer_relations: { name: 'Customer Relations', desc: 'Better loyalty impact', icon: '🤝' },
                                        inventory_expert: { name: 'Inventory Expert', desc: 'Reduced waste', icon: '📦' },
                                        multitasker: { name: 'Multitasker', desc: 'Handle 2 orders simultaneously', icon: '🎯' },
                                    }[spec] || { name: spec, desc: '', icon: '⭐' };

                                    return (
                                        <button
                                            key={spec}
                                            onClick={() => handleAssignSpecialization(selectedEmployee, spec)}
                                            className="w-full p-4 bg-[var(--bg-elevated)] hover:bg-[var(--bg-secondary)] border border-[var(--border-subtle)] hover:border-[var(--brand-primary)] rounded-xl text-left transition-all group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="text-2xl">{specInfo.icon}</div>
                                                <div className="flex-1">
                                                    <div className="font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)]">
                                                        {specInfo.name}
                                                    </div>
                                                    <div className="text-xs text-[var(--text-secondary)]">
                                                        {specInfo.desc}
                                                    </div>
                                                </div>
                                            </div>
                                        </button>
                                    );
                                })}
                        </div>
                    </BrightLayer>
                </div>
            )}
        </div>
    );
}
