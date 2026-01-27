'use client';

import { Employee } from '@/lib/economy/economy-types';
import { motion } from 'framer-motion';
import Image from 'next/image';

interface EmployeeIDCardProps {
    employee: Employee;
    mode: 'hiring' | 'managing';
    onAction: (e: Employee) => void;
    onSecondaryAction?: (e: Employee) => void;
    actionLabel: string;
    secondaryLabel?: string;
    disabled?: boolean;
    cost?: number;
    currencyContext?: number;
}

export default function EmployeeIDCard({
    employee,
    mode,
    onAction,
    onSecondaryAction,
    actionLabel,
    secondaryLabel,
    disabled,
    cost,
    currencyContext = 0
}: EmployeeIDCardProps) {

    // Determine avatar/color based on role
    const roleColors: Record<string, string> = {
        manager: 'from-purple-500 to-indigo-500',
        specialist: 'from-blue-500 to-cyan-500',
        speedster: 'from-amber-500 to-orange-500',
        trainee: 'from-emerald-500 to-teal-500'
    };

    const bgGradient = roleColors[employee.role] || 'from-gray-500 to-slate-500';

    const getMoraleEmoji = (m: number) => {
        if (m >= 80) return '🔥';
        if (m >= 50) return '🙂';
        if (m >= 20) return '😐';
        return '😫';
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-subtle)] rounded-xl overflow-hidden shadow-sm hover:shadow-md hover:border-[var(--brand-primary)]/50 transition-all duration-300 flex flex-col h-full relative group"
        >
            {/* Lanyard / Top Section */}
            <div className={`h-24 bg-gradient-to-r ${bgGradient} relative p-4 flex justify-between items-start`}>
                <div className="absolute inset-0 opacity-20 bg-[url('/patterns/circuit.svg')] bg-repeat opacity-10"></div>

                {/* Badge/Hole */}
                <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-3 bg-white/20 rounded-full blur-[1px]"></div>
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-4 h-8 bg-black/20 rounded-full"></div>

                <div className="relative z-10 px-2 py-1 bg-black/40 backdrop-blur-sm rounded text-[9px] font-black uppercase text-white tracking-widest border border-white/10">
                    {employee.role}
                </div>

                {mode === 'managing' && (
                    <div className="relative z-10 px-2 py-1 bg-black/40 backdrop-blur-sm rounded text-[9px] font-black uppercase text-white tracking-widest border border-white/10 flex items-center gap-1">
                        <span>Morale</span>
                        <span>{getMoraleEmoji(employee.stats.morale)}</span>
                    </div>
                )}
            </div>

            {/* Avatar - Overlapping */}
            <div className="px-5 -mt-10 mb-2 relative z-10 flex justify-between items-end">
                <div className="w-20 h-20 rounded-2xl bg-[var(--bg-elevated)] border-4 border-[var(--bg-primary)] shadow-lg flex items-center justify-center text-3xl overflow-hidden relative">
                    <span className="z-10">👤</span>
                    <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} opacity-10`}></div>
                </div>

                {mode === 'hiring' && cost !== undefined && (
                    <div className="text-right mb-1">
                        <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-wider">Starting Rate</p>
                        <p className={`text-lg font-black ${currencyContext >= cost ? 'text-[var(--text-primary)]' : 'text-[var(--state-error)]'}`}>
                            ฿{cost.toLocaleString()}
                        </p>
                    </div>
                )}

                {mode === 'managing' && (
                    <div className="text-right mb-1">
                        <p className="text-[9px] text-[var(--text-muted)] font-black uppercase tracking-wider">Unpaid Wages</p>
                        <p className={`text-lg font-black ${employee.unpaidWages > 0 ? 'text-[var(--state-warning)]' : 'text-[var(--text-primary)]'}`}>
                            ฿{(employee.unpaidWages || 0).toLocaleString()}
                        </p>
                    </div>
                )}
            </div>

            {/* Info Section */}
            <div className="px-5 pt-1 pb-4 flex-1 flex flex-col">
                <h3 className="text-lg font-black text-[var(--text-primary)] leading-tight mb-1">{employee.name}</h3>
                <p className="text-xs text-[var(--text-muted)] font-bold mb-4 flex items-center gap-2">
                    ID: {employee.id.substring(0, 8).toUpperCase()}
                    {mode === 'managing' && employee.hiredAt && (
                        <span>• Hired: {new Date(employee.hiredAt).toLocaleDateString()}</span>
                    )}
                </p>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3 mb-6 bg-[var(--bg-elevated)]/50 p-3 rounded-lg border border-[var(--border-subtle)]">
                    <div>
                        <div className="flex justify-between text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider mb-1">
                            <span>Efficiency</span>
                            <span>{employee.stats.speed}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${employee.stats.speed}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider mb-1">
                            <span>Quality</span>
                            <span>{employee.stats.quality}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${employee.stats.quality}%` }} />
                        </div>
                    </div>
                    {mode === 'managing' && (
                        <div className="col-span-2">
                            <div className="flex justify-between text-[9px] font-black uppercase text-[var(--text-muted)] tracking-wider mb-1">
                                <span>Morale</span>
                                <span>{employee.stats.morale}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${employee.stats.morale < 30 ? 'bg-red-500' : employee.stats.morale < 60 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${employee.stats.morale}%` }} />
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="mt-auto flex gap-2">
                    {onSecondaryAction && secondaryLabel && (
                        <button
                            onClick={() => onSecondaryAction(employee)}
                            className="flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-wider border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            {secondaryLabel}
                        </button>
                    )}
                    <button
                        onClick={() => onAction(employee)}
                        disabled={disabled}
                        className={`
                            flex-1 py-3 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all shadow-lg
                            ${disabled
                                ? 'bg-[var(--bg-secondary)] text-[var(--text-muted)] cursor-not-allowed opacity-50'
                                : 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary)]/90 hover:scale-[1.02] active:scale-[0.98]'
                            }
                        `}
                    >
                        {actionLabel}
                    </button>
                </div>
            </div>

            {/* Gloss Overlay */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        </motion.div>
    );
}
