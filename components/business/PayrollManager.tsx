'use client';

import { Employee, BusinessState } from '@/lib/economy/economy-types';
import { BrightHeading, useDialog } from '@/components/system';
import { doc, updateDoc, increment, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EmployeeIDCard from '@/components/business/EmployeeIDCard';
import { motion, AnimatePresence } from 'framer-motion';

interface PayrollManagerProps {
    business: BusinessState;
}

export default function PayrollManager({ business }: PayrollManagerProps) {
    const employees = business.employees || [];
    const totalOwed = employees.reduce((sum, e) => sum + (e.unpaidWages || 0), 0);
    const { showAlert, showConfirm } = useDialog();

    const handlePayEmployee = async (employee: Employee) => {
        if (!employee || employee.unpaidWages <= 0) return;

        if (business.cashBalance < employee.unpaidWages) {
            showAlert("Insufficient funds to pay this employee! Earn more revenue or liquidate assets first.", { title: 'INSUFFICIENT FUNDS' });
            return;
        }

        const bizRef = doc(db, 'businesses', business.id);
        const updatedEmployees = employees.map(e => {
            if (e.id === employee.id) {
                return {
                    ...e,
                    unpaidWages: 0,
                    stats: {
                        ...e.stats,
                        morale: Math.min(100, (e.stats.morale || 0) + 10)
                    }
                };
            }
            return e;
        });

        await updateDoc(bizRef, {
            employees: updatedEmployees,
            cashBalance: increment(-employee.unpaidWages),
            balance: increment(-employee.unpaidWages)
        });
    };

    const handleFire = (employee: Employee) => {
        showConfirm(
            `Terminate ${employee.name}'s employment? All outstanding wages (฿${employee.unpaidWages}) will be forfeited.`,
            async () => {
                const bizRef = doc(db, 'businesses', business.id);
                await updateDoc(bizRef, {
                    employees: arrayRemove(employee),
                    staffCount: increment(-1)
                });
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
                const bizRef = doc(db, 'businesses', business.id);
                const updatedEmployees = employees.map(e => ({
                    ...e,
                    unpaidWages: 0,
                    stats: {
                        ...e.stats,
                        morale: Math.min(100, (e.stats.morale || 0) + 12)
                    }
                }));

                await updateDoc(bizRef, {
                    employees: updatedEmployees,
                    cashBalance: increment(-totalOwed),
                    balance: increment(-totalOwed)
                });
            },
            { title: 'DISBURSE PAYROLL', confirmLabel: 'PAY ALL' }
        );
    };

    return (
        <div className="duo-card p-8 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10">
                <div>
                    <div className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-primary)] mb-1">Human Resources</div>
                    <BrightHeading level={2} className="text-3xl m-0">Payroll & Staff</BrightHeading>
                    <p className="text-xs text-[var(--text-secondary)] font-bold mt-1 opacity-70">Manage wages and employee performance.</p>
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

            <div className="flex-1 overflow-y-auto pr-4 sleek-scrollbar min-h-[500px]">
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
                                    <EmployeeIDCard
                                        employee={emp}
                                        mode="managing"
                                        onAction={() => handlePayEmployee(emp)}
                                        onFire={() => handleFire(emp)}
                                        actionLabel={emp.unpaidWages > 0 ? 'PAY WAGES' : 'PAID UP'}
                                        disabled={emp.unpaidWages <= 0}
                                        currencyContext={business.cashBalance}
                                    />
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                )}
            </div>
        </div>
    );
}
