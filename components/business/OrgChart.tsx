'use client';

import { BusinessState, Employee } from '@/lib/economy/economy-types';
import { BrightLayer, BrightHeading, useDialog } from '@/components/system';
import { getAvailableSpecializations } from '@/lib/economy/employee-skills';
import { useState } from 'react';
import EmployeeIDCard from '@/components/business/EmployeeIDCard';
import { useAuth } from '@/lib/auth-context';

interface OrgChartProps {
    business: BusinessState;
}

export default function OrgChart({ business }: OrgChartProps) {
    const employees = business.employees || [];
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const { showConfirm, showAlert } = useDialog();
    const { user } = useAuth();

    const postEmployeeAction = async (payload: {
        businessId: string;
        action: 'hire' | 'decline' | 'pay' | 'pay_all' | 'fire' | 'assign_specialization';
        candidateId?: string;
        employeeId?: string;
        specialization?: string;
    }) => {
        if (!user) throw new Error('Not authenticated');

        const token = await user.getIdToken();
        const response = await fetch('/api/business/employees', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || 'Failed to process employee action');
        }
        return data;
    };

    const handleFire = (employee: Employee) => {
        showConfirm(
            `Are you sure you want to fire ${employee.name}? This action cannot be undone and may affect your reputation.`,
            async () => {
                try {
                    await postEmployeeAction({
                        businessId: business.id,
                        action: 'fire',
                        employeeId: employee.id
                    });
                } catch (error: any) {
                    console.error('Failed to fire employee:', error);
                    showAlert(error.message || 'Failed to fire employee. Please try again.');
                }
            },
            { title: 'TERMINATE CONTRACT', type: 'danger', confirmLabel: 'FIRE' }
        );
    };

    const handleAssignSpecialization = async (employee: Employee, specialization: string) => {
        try {
            await postEmployeeAction({
                businessId: business.id,
                action: 'assign_specialization',
                employeeId: employee.id,
                specialization
            });
            setSelectedEmployee(null);
        } catch (error: any) {
            console.error('Failed to assign specialization:', error);
            showAlert(error.message || 'Failed to assign specialization. Please try again.');
        }
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
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {employees.map((emp) => (
                        <EmployeeIDCard
                            key={emp.id}
                            employee={emp}
                            mode="managing"
                            onAction={() => setSelectedEmployee(emp)}
                            onFire={() => handleFire(emp)}
                            actionLabel={emp.specialization ? 'VIEW SKILLS' : 'SELECT SPECIALTY'}
                            disabled={!emp.skills || !Object.values(emp.skills).some(s => s.level >= 3)}
                        />
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
