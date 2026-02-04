'use client';

import { Employee } from '@/lib/economy/economy-types';
import { motion } from 'framer-motion';
import { DuoContextMenu } from '@/components/system';
import { getDicebearAvatarUrl } from '@/lib/avatars';

interface EmployeeIDCardProps {
    employee: Employee;
    mode: 'hiring' | 'managing';
    onAction: (e: Employee) => void;
    onSecondaryAction?: (e: Employee) => void;
    onFire?: (e: Employee) => void;
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
    onFire,
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

    const avatarUrl = getDicebearAvatarUrl(employee.id);

    const contextMenuItems = [
        {
            label: actionLabel,
            icon: mode === 'hiring' ? '🤝' : '💰',
            onClick: () => onAction(employee),
            variant: 'primary' as const
        },
        ...(onSecondaryAction ? [{
            label: secondaryLabel || 'Action',
            icon: '⚡',
            onClick: () => onSecondaryAction(employee)
        }] : []),
        ...(onFire ? [{
            label: 'Terminate',
            icon: '✕',
            onClick: () => onFire(employee),
            variant: 'danger' as const
        }] : [])
    ];

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="duo-card p-0 overflow-hidden flex flex-col h-full relative group min-w-0 w-full"
        >
            {/* Top Header Section */}
            <div className={`h-24 bg-gradient-to-r ${bgGradient} relative p-4 flex justify-between items-start border-b-2 border-black/10`}>
                <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat"></div>

                <div className="relative z-10 flex flex-col gap-1">
                    <div className="px-3 py-1 bg-black/40 backdrop-blur-sm rounded-xl text-[10px] font-black uppercase text-white tracking-widest border border-white/10 w-fit">
                        {employee.role}
                    </div>
                    {mode === 'managing' && (
                        <div className="px-3 py-1 bg-black/40 backdrop-blur-sm rounded-xl text-[10px] font-black uppercase text-white tracking-widest border border-white/10 flex items-center gap-2 w-fit">
                            <span>{getMoraleEmoji(employee.stats.morale)}</span>
                            <span>{employee.stats.morale}%</span>
                        </div>
                    )}
                </div>

                <div className="relative z-20">
                    <DuoContextMenu
                        trigger={
                            <button className="w-8 h-8 rounded-full bg-black/20 hover:bg-black/40 flex items-center justify-center text-white transition-colors">
                                <span className="text-xl leading-none">⋮</span>
                            </button>
                        }
                        items={contextMenuItems}
                    />
                </div>
            </div>

            {/* Avatar & Key Metric */}
            <div className="px-6 -mt-10 mb-4 relative z-10 flex justify-between items-end">
                <div className="w-24 h-24 rounded-[2rem] bg-[var(--bg-primary)] border-4 border-[var(--bg-elevated)] shadow-xl overflow-hidden relative">
                    <img
                        src={avatarUrl}
                        alt={employee.name}
                        className="w-full h-full object-cover z-10 relative"
                    />
                    <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} opacity-5`}></div>
                </div>

                <div className="text-right">
                    <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.15em] mb-1">
                        {mode === 'hiring' ? 'Starting Rate' : 'Unpaid Wages'}
                    </p>
                    <p className={`text-2xl font-black ${(mode === 'hiring' ? (currencyContext >= (cost || 0)) : (employee.unpaidWages === 0)) ? 'text-[var(--text-primary)]' : 'text-orange-500'}`}>
                        ฿{((mode === 'hiring' ? cost : employee.unpaidWages) || 0).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Content Section */}
            <div className="px-6 pb-6 flex-1 flex flex-col">
                <div className="mb-4">
                    <h3 className="text-xl font-black text-[var(--text-primary)] leading-tight">{employee.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">ID: {employee.id.substring(0, 8).toUpperCase()}</span>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="space-y-4 mb-4 bg-[var(--bg-secondary)]/50 p-4 rounded-2xl border-2 border-[var(--border-subtle)]">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">
                                <span>Speed</span>
                                <span className="text-[var(--text-primary)]">{employee.stats.speed}%</span>
                            </div>
                            <div className="w-full h-2 bg-[var(--bg-primary)] rounded-full border-b-2 border-black/5 overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${employee.stats.speed}%` }} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-[10px] font-black uppercase text-[var(--text-muted)] tracking-widest">
                                <span>Quality</span>
                                <span className="text-[var(--text-primary)]">{employee.stats.quality}%</span>
                            </div>
                            <div className="w-full h-2 bg-[var(--bg-primary)] rounded-full border-b-2 border-black/5 overflow-hidden">
                                <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${employee.stats.quality}%` }} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-auto">
                    <button
                        onClick={() => onAction(employee)}
                        disabled={disabled}
                        className={`duo-btn duo-btn-primary w-full py-3 truncate text-[10px] ${disabled ? 'opacity-50 grayscale' : ''}`}
                    >
                        {actionLabel}
                    </button>
                </div>
            </div>

            {/* Decorative Lanyard Thread */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-12 bg-black/20 rounded-b-full -mt-2 group-hover:bg-black/30 transition-colors pointer-events-none"></div>
        </motion.div>
    );
}
