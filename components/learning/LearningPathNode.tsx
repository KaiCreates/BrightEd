'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

// =============================================================================
// TYPES
// =============================================================================

export type NodeType = 'standard' | 'crisis' | 'crunch' | 'boss' | 'maintenance'
export type NodeStatus = 'completed' | 'current' | 'locked'

export interface LearningPathNodeProps {
    id: string
    title: string
    subject: string
    nodeType: NodeType
    status: NodeStatus
    stars: number
    icon: string
    color: string
    index: number
    isUnlocking?: boolean
    onClick?: () => void
}

// =============================================================================
// NODE STYLES CONFIG
// =============================================================================

const NODE_STYLES: Record<NodeType, {
    shape: 'circle' | 'hexagon' | 'card'
    borderColor: string
    bgGradient: string
    glowColor: string
    pulseAnimation: boolean
    badge: string | null
    badgeColor: string
}> = {
    standard: {
        shape: 'circle',
        borderColor: 'var(--brand-primary)',
        bgGradient: 'from-[var(--brand-primary)] to-[var(--brand-secondary)]',
        glowColor: 'var(--brand-primary)',
        pulseAnimation: false,
        badge: null,
        badgeColor: '',
    },
    crunch: {
        shape: 'circle',
        borderColor: '#8B5CF6',
        bgGradient: 'from-purple-500 to-cyan-400',
        glowColor: '#8B5CF6',
        pulseAnimation: false,
        badge: '⚡ SPEED CHALLENGE: 2x XP',
        badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    },
    crisis: {
        shape: 'hexagon',
        borderColor: '#EF4444',
        bgGradient: 'from-red-600 to-amber-500',
        glowColor: '#EF4444',
        pulseAnimation: true,
        badge: '⚠️ HIGH STAKES',
        badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
    boss: {
        shape: 'card',
        borderColor: '#F59E0B',
        bgGradient: 'from-amber-500 to-yellow-400',
        glowColor: '#F59E0B',
        pulseAnimation: false,
        badge: null,
        badgeColor: '',
    },
    maintenance: {
        shape: 'circle',
        borderColor: '#6B7280',
        bgGradient: 'from-gray-500 to-gray-600',
        glowColor: '#6B7280',
        pulseAnimation: false,
        badge: '🔧 REPAIR REQUIRED',
        badgeColor: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    },
}

// =============================================================================
// HEXAGON COMPONENT
// =============================================================================

function HexagonNode({ children, className, style }: {
    children: React.ReactNode
    className?: string
    style?: React.CSSProperties
}) {
    return (
        <div
            className={`relative ${className}`}
            style={{
                clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
                ...style
            }}
        >
            {children}
        </div>
    )
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function LearningPathNode({
    id,
    title,
    subject,
    nodeType,
    status,
    stars,
    icon,
    index,
    isUnlocking = false,
}: LearningPathNodeProps) {
    const config = NODE_STYLES[nodeType]
    const isLocked = status === 'locked'
    const isCompleted = status === 'completed'

    // Calculate offset for "winding" effect
    let xOffset = 0
    if (nodeType !== 'boss') {
        if (index % 4 === 1) xOffset = -120
        if (index % 4 === 3) xOffset = 120
    }

    const href = !isLocked
        ? `/simulate?objectiveId=${id}&subjectId=${encodeURIComponent(subject)}`
        : '#'

    // ==========================================================================
    // RENDER: BOSS NODE (Wide Card)
    // ==========================================================================
    if (nodeType === 'boss') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
                className="relative z-10 w-full max-w-md mx-auto"
            >
                <Link href={href} className={isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}>
                    <div className={`
            relative p-6 rounded-2xl border-4 transition-all
            ${isLocked
                            ? 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] opacity-60'
                            : 'bg-gradient-to-br from-amber-900/40 to-yellow-900/40 border-amber-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-amber-500/20'
                        }
          `}>
                        {/* Gold Ticket Pattern */}
                        <div className="absolute inset-0 opacity-10 pointer-events-none">
                            <div className="absolute top-0 left-0 w-8 h-full bg-gradient-to-r from-amber-400/50 to-transparent" />
                            <div className="absolute top-0 right-0 w-8 h-full bg-gradient-to-l from-amber-400/50 to-transparent" />
                            <div className="absolute inset-x-0 top-0 h-4 bg-gradient-to-b from-amber-400/30 to-transparent" />
                        </div>

                        {/* Content */}
                        <div className="relative z-10">
                            <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-md mb-3 border border-amber-500/30">
                                🏆 BOSS GATE
                            </span>
                            <h3 className={`text-xl font-black mb-2 ${isLocked ? 'text-[var(--text-muted)]' : 'text-white'}`}>
                                PROJECT: {title}
                            </h3>
                            <p className="text-sm text-amber-200/70">
                                Complete this challenge to unlock the next module
                            </p>

                            {/* Stars */}
                            {!isLocked && (
                                <div className="flex gap-2 mt-4">
                                    {[...Array(3)].map((_, i) => (
                                        <span
                                            key={i}
                                            className={`text-xl ${i < stars ? 'text-amber-400' : 'text-gray-600'}`}
                                        >
                                            ★
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Lock Icon */}
                            {isLocked && (
                                <div className="absolute top-1/2 right-6 -translate-y-1/2 text-4xl opacity-50">
                                    🔒
                                </div>
                            )}
                        </div>
                    </div>
                </Link>
            </motion.div>
        )
    }

    // ==========================================================================
    // RENDER: CRISIS NODE (Hexagon)
    // ==========================================================================
    if (nodeType === 'crisis') {
        return (
            <motion.div
                initial={{ opacity: 0, y: 50, scale: isUnlocking ? 0 : 1 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
                style={{ transform: `translateX(${xOffset}px)` }}
                className="relative z-10"
            >
                <Link href={href} className={`group relative flex flex-col items-center ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>

                    {/* Hover Badge */}
                    {config.badge && !isLocked && (
                        <div className={`absolute -top-14 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border ${config.badgeColor}`}>
                            {config.badge}
                        </div>
                    )}

                    {/* Tooltip */}
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none px-3 py-1 bg-[var(--bg-elevated)] rounded-xl text-sm font-bold border border-[var(--border-subtle)]">
                        {title}
                    </div>

                    {/* Pulse Animation Ring */}
                    {config.pulseAnimation && !isLocked && (
                        <motion.div
                            animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute inset-0 bg-red-500/30 rounded-full pointer-events-none"
                            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
                        />
                    )}

                    {/* Hexagon Node */}
                    <HexagonNode
                        className={`
              w-24 h-28 flex items-center justify-center text-4xl shadow-xl transition-all
              ${isLocked
                                ? 'bg-[var(--bg-secondary)] grayscale opacity-70'
                                : `bg-gradient-to-br ${config.bgGradient} hover:scale-110`
                            }
            `}
                        style={{
                            boxShadow: !isLocked ? `0 0 30px ${config.glowColor}40` : 'none'
                        }}
                    >
                        {isCompleted ? (
                            <span className="drop-shadow-md text-white">✓</span>
                        ) : isLocked ? (
                            <span className="opacity-50 text-2xl">🔒</span>
                        ) : (
                            <span>⚠️</span>
                        )}
                    </HexagonNode>

                    {/* Stars */}
                    {!isLocked && (
                        <div className="absolute -bottom-6 flex gap-1 bg-[var(--bg-primary)] px-2 py-1 rounded-full border border-[var(--border-subtle)] shadow-sm">
                            {[...Array(3)].map((_, i) => (
                                <span key={i} className={`text-sm ${i < stars ? 'text-red-400' : 'text-[var(--text-muted)] opacity-30'}`}>
                                    ★
                                </span>
                            ))}
                        </div>
                    )}
                </Link>
            </motion.div>
        )
    }

    // ==========================================================================
    // RENDER: STANDARD / CRUNCH / MAINTENANCE NODES (Circle)
    // ==========================================================================
    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: isUnlocking ? 0 : 1 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, type: isUnlocking ? 'spring' : 'tween', stiffness: isUnlocking ? 200 : undefined }}
            style={{ transform: `translateX(${xOffset}px)` }}
            className="relative z-10"
        >
            {/* Unlock Celebration Ring */}
            {isUnlocking && (
                <motion.div
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                    className="absolute inset-0 bg-[var(--brand-accent)] rounded-full opacity-0 z-0 pointer-events-none"
                />
            )}

            <Link href={href} className={`group relative flex flex-col items-center ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>

                {/* Hover Badge */}
                {config.badge && !isLocked && (
                    <div className={`absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider border ${config.badgeColor}`}>
                        {config.badge}
                    </div>
                )}

                {/* Tooltip */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none px-3 py-1 bg-[var(--bg-elevated)] rounded-xl text-sm font-bold border border-[var(--border-subtle)]">
                    {title}
                </div>

                {/* Glow Ring for Crunch nodes */}
                {nodeType === 'crunch' && !isLocked && (
                    <motion.div
                        animate={{ boxShadow: ['0 0 20px #8B5CF6', '0 0 40px #06B6D4', '0 0 20px #8B5CF6'] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="absolute inset-0 rounded-full pointer-events-none"
                    />
                )}

                {/* Maintenance Cracked Overlay */}
                {nodeType === 'maintenance' && !isLocked && (
                    <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                        <span className="text-3xl drop-shadow-lg">🔧</span>
                    </div>
                )}

                {/* Node Circle */}
                <div
                    className={`
            w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-xl transition-all transform active:scale-95 border-b-[6px] border-4
            ${isLocked
                            ? 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] grayscale opacity-70 text-[var(--text-muted)]'
                            : nodeType === 'maintenance'
                                ? 'bg-gradient-to-br from-gray-500 to-gray-600 border-gray-500 opacity-80'
                                : `bg-gradient-to-br ${config.bgGradient} border-[${config.borderColor}] text-white hover:scale-110 hover:shadow-2xl`
                        }
            ${isCompleted && nodeType === 'standard' ? 'border-[var(--state-success)] from-[var(--state-success)] to-green-400' : ''}
          `}
                    style={{
                        borderColor: !isLocked ? config.borderColor : undefined,
                        boxShadow: !isLocked && nodeType === 'crunch' ? `0 0 30px ${config.glowColor}60` : undefined
                    }}
                >
                    {isCompleted ? (
                        <span className="drop-shadow-md">✓</span>
                    ) : isLocked ? (
                        <span className="opacity-50 text-2xl">🔒</span>
                    ) : nodeType === 'crunch' ? (
                        <span>⚡</span>
                    ) : nodeType === 'maintenance' ? (
                        <span className="opacity-30">{icon}</span>
                    ) : (
                        <span className="animate-pulse">{icon}</span>
                    )}
                </div>

                {/* Stars */}
                {!isLocked && (
                    <div className="absolute -bottom-6 flex gap-1 bg-[var(--bg-primary)] px-2 py-1 rounded-full border border-[var(--border-subtle)] shadow-sm">
                        {[...Array(3)].map((_, i) => (
                            <span
                                key={i}
                                className={`text-sm transition-all ${i < stars
                                    ? nodeType === 'crunch' ? 'text-purple-400'
                                        : nodeType === 'maintenance' ? 'text-gray-400'
                                            : 'text-[var(--brand-accent)]'
                                    : 'text-[var(--text-muted)] opacity-30'
                                    }`}
                            >
                                ★
                            </span>
                        ))}
                    </div>
                )}
            </Link>
        </motion.div>
    )
}
