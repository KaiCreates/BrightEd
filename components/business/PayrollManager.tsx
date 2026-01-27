'use client';

import { Employee, BusinessState } from '@/lib/economy/economy-types';
import { BrightLayer, BrightButton, BrightHeading } from '@/components/system';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import EmployeeIDCard from '@/components/business/EmployeeIDCard';
import { motion, AnimatePresence } from 'framer-motion';

interface PayrollManagerProps {
    business: BusinessState;
}

export default function PayrollManager({ business }: PayrollManagerProps) {
    const employees = business.employees || [];
    const totalOwed = employees.reduce((sum, e) => sum + (e.unpaidWages || 0), 0);

    const handlePayEmployee = async (employee: Employee) => {
        if (!employee || employee.unpaidWages <= 0) return;

        if (business.cashBalance < employee.unpaidWages) {
            alert("Insufficient funds to pay this employee!");
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
                        // Gradual morale boost: +10 instead of +20
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

    const handlePayAll = async () => {
        if (totalOwed <= 0) return;
        if (business.cashBalance < totalOwed) {
            alert("Insufficient funds to pay all staff!");
            return;
        }

        const bizRef = doc(db, 'businesses', business.id);
        const updatedEmployees = employees.map(e => ({
            ...e,
            unpaidWages: 0,
            stats: {
                ...e.stats,
                // Small bonus boost for bulk pay: +12
                morale: Math.min(100, (e.stats.morale || 0) + 12)
            }
        }));

        await updateDoc(bizRef, {
            employees: updatedEmployees,
            cashBalance: increment(-totalOwed),
            balance: increment(-totalOwed)
        });
    };

    return (
        <BrightLayer variant="glass" padding="lg" className="h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <BrightHeading level={3}>My Team</BrightHeading>
                    <p className="text-xs text-[var(--text-secondary)] mt-1">Manage payroll and staff performance.</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tight">Total Outstanding</p>
                    <p className={`text-2xl font-black ${totalOwed > 0 ? 'text-[var(--state-warning)]' : 'text-[var(--text-primary)]'}`}>
                        ฿{totalOwed.toLocaleString()}
                    </p>
                    {totalOwed > 0 && (
                        <button
                            onClick={handlePayAll}
                            className="text-[10px] font-bold text-[var(--brand-primary)] hover:underline mt-1"
                        >
                            PAY ALL
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 sleek-scrollbar max-h-[600px]">
                {employees.length === 0 ? (
                    <div className="h-40 flex flex-col items-center justify-center text-[var(--text-muted)] bg-[var(--bg-elevated)]/10 rounded-2xl border border-dashed border-[var(--border-subtle)]">
                        <span className="text-2xl mb-2">👥</span>
                        <p className="text-[10px] font-black uppercase tracking-widest">No employees hired yet</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <AnimatePresence mode="popLayout">
                            {employees.map((emp) => (
                                <motion.div
                                    key={emp.id}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                >
                                    <EmployeeIDCard
                                        employee={emp}
                                        mode="managing"
                                        onAction={() => handlePayEmployee(emp)}
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
        </BrightLayer>
    );
}
