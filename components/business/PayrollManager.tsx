'use client';

import { Employee, BusinessState } from '@/lib/economy/economy-types';
import { BrightLayer, BrightButton, BrightHeading } from '@/components/system';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { motion, AnimatePresence } from 'framer-motion';

interface PayrollManagerProps {
    business: BusinessState;
}

export default function PayrollManager({ business }: PayrollManagerProps) {
    const employees = business.employees || [];
    const totalOwed = employees.reduce((sum, e) => sum + (e.unpaidWages || 0), 0);

    const handlePayEmployee = async (employeeId: string) => {
        const emp = employees.find(e => e.id === employeeId);
        if (!emp || emp.unpaidWages <= 0) return;

        if (business.cashBalance < emp.unpaidWages) {
            alert("Insufficient funds to pay this employee!");
            return;
        }

        const bizRef = doc(db, 'businesses', business.id);
        const updatedEmployees = employees.map(e => {
            if (e.id === employeeId) {
                return {
                    ...e,
                    unpaidWages: 0,
                    stats: {
                        ...e.stats,
                        morale: Math.min(100, (e.stats.morale || 0) + 20) // Boost morale on pay
                    }
                };
            }
            return e;
        });

        await updateDoc(bizRef, {
            employees: updatedEmployees,
            cashBalance: increment(-emp.unpaidWages),
            balance: increment(-emp.unpaidWages)
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
                morale: Math.min(100, (e.stats.morale || 0) + 25)
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
                    <BrightHeading level={3}>Payroll Management</BrightHeading>
                    <p className="text-xs text-[var(--text-muted)] uppercase font-black tracking-widest mt-1">Manual Wage Disbursement</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-tight">Total Owed</p>
                    <p className={`text-2xl font-black ${totalOwed > 0 ? 'text-[var(--state-warning)]' : 'text-[var(--text-primary)]'}`}>
                        ฿{totalOwed.toLocaleString()}
                    </p>
                </div>
            </div>

            <div className="space-y-3 flex-1 overflow-y-auto pr-2 sleek-scrollbar max-h-[400px]">
                <AnimatePresence mode="popLayout">
                    {employees.map((emp) => (
                        <motion.div
                            key={emp.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            className="bg-[var(--bg-elevated)]/40 border border-[var(--border-subtle)] rounded-xl p-4 flex items-center justify-between group hover:border-[var(--brand-primary)]/40 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-xl">
                                    {emp.stats.morale > 70 ? '😊' : emp.stats.morale > 40 ? '😐' : '😒'}
                                </div>
                                <div>
                                    <p className="font-bold text-sm text-[var(--text-primary)]">{emp.name}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[9px] font-black uppercase text-[var(--text-muted)]">{emp.role}</span>
                                        <span className="w-1 h-1 rounded-full bg-[var(--border-subtle)]" />
                                        <span className={`text-[9px] font-black uppercase ${emp.stats.morale > 50 ? 'text-[var(--state-success)]' : 'text-[var(--state-error)]'}`}>
                                            Morale: {emp.stats.morale}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-6">
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-[var(--text-muted)] uppercase">Subject to pay</p>
                                    <p className={`text-sm font-black ${emp.unpaidWages > 0 ? 'text-[var(--brand-accent)]' : 'text-[var(--text-muted)]'}`}>
                                        ฿{emp.unpaidWages || 0}
                                    </p>
                                </div>
                                <BrightButton
                                    variant={emp.unpaidWages > 0 ? "primary" : "ghost"}
                                    size="sm"
                                    onClick={() => handlePayEmployee(emp.id)}
                                    disabled={emp.unpaidWages <= 0}
                                    className="h-8 px-4 font-black text-[9px]"
                                >
                                    PAY
                                </BrightButton>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {employees.length === 0 && (
                    <div className="h-40 flex flex-col items-center justify-center text-[var(--text-muted)] bg-[var(--bg-elevated)]/10 rounded-2xl border border-dashed border-[var(--border-subtle)]">
                        <span className="text-2xl mb-2">👤</span>
                        <p className="text-[10px] font-black uppercase tracking-widest">No staff registered</p>
                    </div>
                )}
            </div>

            <div className="mt-8 pt-6 border-t border-[var(--border-subtle)]">
                <BrightButton
                    variant="primary"
                    className="w-full font-black py-4 shadow-[0_10px_20px_-5px_rgba(var(--brand-primary-rgb),0.3)]"
                    onClick={handlePayAll}
                    disabled={totalOwed <= 0}
                >
                    CLEAR ALL OUTSTANDING WAGES (฿{totalOwed.toLocaleString()})
                </BrightButton>
                <p className="text-[9px] text-center text-[var(--text-muted)] mt-4 font-bold uppercase tracking-wider">
                    Staff performance is directly tied to their current morale levels.
                </p>
            </div>
        </BrightLayer>
    );
}
