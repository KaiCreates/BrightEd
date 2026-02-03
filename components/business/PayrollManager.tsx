'use client';

import { useState } from 'react';
import { Employee, BusinessState } from '@/lib/economy/economy-types';
import { BrightHeading, useDialog } from '@/components/system';
import EmployeeIDCard from '@/components/business/EmployeeIDCard';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import {
    DndContext,
    DragEndEvent,
    DragStartEvent,
    DragOverlay,
    useSensor,
    useSensors,
    PointerSensor,
    TouchSensor,
    useDraggable,
    useDroppable
} from '@dnd-kit/core';
import ProfessorBright, { useProfessor } from '@/components/science/ProfessorBright';

interface PayrollManagerProps {
    business: BusinessState;
}

// Draggable Cash Stack
function DraggableCash({ id, isOverlay }: { id: string; isOverlay?: boolean }) {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id });

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`
                cursor-grab active:cursor-grabbing p-4 rounded-full bg-emerald-500 text-white font-black shadow-lg flex items-center justify-center
                ${isOverlay ? 'scale-110 shadow-2xl z-50 ring-4 ring-emerald-300' : 'hover:scale-105 active:scale-95 transition-transform'}
                ${isDragging ? 'opacity-0' : 'opacity-100'}
            `}
            style={{ width: '80px', height: '80px' }}
        >
            <span className="text-4xl">💵</span>
        </div>
    );
}

// Droppable Employee Wrapper
function DroppableEmployee({ children, employee }: { children: React.ReactNode; employee: Employee }) {
    const { setNodeRef, isOver } = useDroppable({
        id: employee.id,
        disabled: employee.unpaidWages <= 0
    });

    return (
        <div ref={setNodeRef} className="relative h-full">
            {isOver && employee.unpaidWages > 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 z-10 bg-emerald-500/20 rounded-3xl border-4 border-emerald-500 flex items-center justify-center backdrop-blur-[2px]"
                >
                    <div className="bg-emerald-500 text-white px-6 py-2 rounded-full font-black text-xs uppercase shadow-xl animate-bounce">
                        Release Payment
                    </div>
                </motion.div>
            )}
            {children}
        </div>
    );
}

export default function PayrollManager({ business }: PayrollManagerProps) {
    const employees = business.employees || [];
    const totalOwed = employees.reduce((sum, e) => sum + (e.unpaidWages || 0), 0);
    const { showAlert, showConfirm } = useDialog();
    const [activeId, setActiveId] = useState<string | null>(null);
    const { user } = useAuth();

    const { professor, showSuccess: showProfessorSuccess, showWarning, showHint } = useProfessor({
        initialMessage: "Drag the cash stack to an employee card to pay their wages instantly!"
    });

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
    );

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

    const handlePayEmployee = async (employee: Employee) => {
        if (!employee || employee.unpaidWages <= 0) return;

        if (business.cashBalance < employee.unpaidWages) {
            showWarning("Insufficient funds! Earn more revenue first.");
            return;
        }

        try {
            await postEmployeeAction({
                businessId: business.id,
                action: 'pay',
                employeeId: employee.id
            });
            showProfessorSuccess(`Paid ฿${employee.unpaidWages.toLocaleString()} to ${employee.name}!`);
        } catch (error: any) {
            console.error('Failed to pay employee:', error);
            showAlert(error.message || 'Failed to pay employee. Please try again.');
        }
    };

    const handleFire = (employee: Employee) => {
        showConfirm(
            `Terminate ${employee.name}'s employment? All outstanding wages (฿${employee.unpaidWages}) will be forfeited.`,
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

    const handlePayAll = async () => {
        if (totalOwed <= 0) return;
        if (business.cashBalance < totalOwed) {
            showAlert("Insufficient funds to pay all staff! Current debt exceeds your liquid cash.", { title: 'LIQUIDITY CRISIS' });
            return;
        }

        showConfirm(
            `Are you sure you want to disburse ฿${totalOwed.toLocaleString()} in total wages?`,
            async () => {
                try {
                    await postEmployeeAction({
                        businessId: business.id,
                        action: 'pay_all'
                    });
                    showProfessorSuccess("All salaries paid! Employee morale boosted.");
                } catch (error: any) {
                    console.error('Failed to pay all employees:', error);
                    showAlert(error.message || 'Failed to process payroll. Please try again.');
                }
            },
            { title: 'DISBURSE PAYROLL', confirmLabel: 'PAY ALL' }
        );
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveId(null);
        const { over } = event;

        if (over) {
            const employee = employees.find(e => e.id === over.id);
            if (employee) {
                handlePayEmployee(employee);
            }
        }
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="duo-card p-8 h-full flex flex-col relative overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10 relative z-10">
                    <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-primary)] mb-1">Human Resources</div>
                        <BrightHeading level={2} className="text-3xl m-0">Payroll & Staff</BrightHeading>
                        <p className="text-xs text-[var(--text-secondary)] font-bold mt-1 opacity-70">Drag cash to employees to pay wages.</p>
                    </div>

                    <div className="bg-[var(--bg-secondary)] p-6 rounded-3xl border-2 border-[var(--border-subtle)] border-b-4 flex flex-col items-end w-full sm:w-auto">
                        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Outstanding Wages</p>
                        <div className="flex items-center gap-3">
                            <p className={`text-4xl font-black ${totalOwed > 0 ? 'text-orange-500' : 'text-[var(--text-primary)]'}`}>
                                ฿{totalOwed.toLocaleString()}
                            </p>
                            {totalOwed > 0 && (
                                <button
                                    onClick={handlePayAll}
                                    className="duo-btn duo-btn-primary px-6 py-2 text-[10px]"
                                >
                                    PAY ALL
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-4 sleek-scrollbar min-h-[500px] relative z-10 pb-24">
                    {employees.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-[var(--text-muted)] bg-[var(--bg-secondary)]/30 rounded-[2.5rem] border-2 border-dashed border-[var(--border-subtle)]">
                            <span className="text-5xl mb-4 grayscale opacity-30">👥</span>
                            <p className="text-xs font-black uppercase tracking-widest opacity-50">No employees hired yet</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 auto-rows-fr">
                            <AnimatePresence mode="popLayout">
                                {employees.map((emp) => (
                                    <motion.div
                                        key={emp.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="h-full"
                                    >
                                        <DroppableEmployee employee={emp}>
                                            <EmployeeIDCard
                                                employee={emp}
                                                mode="managing"
                                                onAction={() => handlePayEmployee(emp)}
                                                onFire={() => handleFire(emp)}
                                                actionLabel={emp.unpaidWages > 0 ? 'PAY WAGES' : 'PAID UP'}
                                                disabled={emp.unpaidWages <= 0}
                                                currencyContext={business.cashBalance}
                                            />
                                        </DroppableEmployee>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Floating Cash Dispenser */}
                <div className="absolute bottom-6 right-6 z-20">
                    <DraggableCash id="cash-stack" />
                </div>

                <DragOverlay>
                    {activeId ? <DraggableCash id="cash-stack-overlay" isOverlay /> : null}
                </DragOverlay>

                {/* Professor Guide */}
                <ProfessorBright state={professor} />
            </div>
        </DndContext>
    );
}
