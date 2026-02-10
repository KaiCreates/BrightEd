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
    mastery?: number
    icon: string
    color: string
    index: number
    isUnlocking?: boolean
    onClick?: () => void
    showMascot?: boolean
}

// =============================================================================
// NODE STYLES CONFIG
// =============================================================================

const NODE_STYLES: Record<NodeType, {
    gradient: string
    shadowColor: string
    glowColor: string
    badge: string | null
    icon: string
}> = {
    standard: {
        gradient: 'from-[#58cc02] to-[#46a302]',
        shadowColor: '#46a302',
        glowColor: 'rgba(88, 204, 2, 0.4)',
        badge: null,
        icon: '📚',
    },
    crunch: {
        gradient: 'from-[#ce82ff] to-[#a568cc]',
        shadowColor: '#a568cc',
        glowColor: 'rgba(206, 130, 255, 0.4)',
        badge: '⚡ SPEED',
        icon: '⚡',
    },
    crisis: {
        gradient: 'from-[#ff4b4b] to-[#cc3c3c]',
        shadowColor: '#cc3c3c',
        glowColor: 'rgba(255, 75, 75, 0.4)',
        badge: '⚠️ HARD',
        icon: '🎯',
    },
    boss: {
        gradient: 'from-[#ffc800] to-[#e6b400]',
        shadowColor: '#cca000',
        glowColor: 'rgba(255, 200, 0, 0.4)',
        badge: null,
        icon: '🏆',
    },
    maintenance: {
        gradient: 'from-[#64748b] to-[#475569]',
        shadowColor: '#475569',
        glowColor: 'rgba(100, 116, 139, 0.4)',
        badge: '� REVIEW',
        icon: '🔧',
    },
}

// =============================================================================
// STAR DISPLAY COMPONENT
// =============================================================================

function StarDisplay({ earned, total = 3 }: { earned: number; total?: number }) {
    return (
        <div className="flex gap-1">
            {Array.from({ length: total }).map((_, i) => (
                <motion.span
                    key={i}
                    initial={i < earned ? { scale: 0, rotate: -180 } : { scale: 1 }}
                    animate={i < earned ? { scale: 1, rotate: 0 } : { scale: 1 }}
                    transition={{ delay: i * 0.1, type: 'spring', stiffness: 300 }}
                    className={`text-lg ${i < earned ? 'opacity-100' : 'opacity-30 grayscale'}`}
                >
                    ⭐
                </motion.span>
            ))}
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
    mastery = 0,
}: LearningPathNodeProps) {
    const config = NODE_STYLES[nodeType]
    const isLocked = status === 'locked'
    const isCompleted = status === 'completed'
    const isCurrent = status === 'current'

    const href = !isLocked
        ? `/lesson?objectiveId=${id}&subjectId=${encodeURIComponent(subject)}`
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
                transition={{ delay: index * 0.05, type: 'spring', stiffness: 200 }}
                className="relative z-10 w-full max-w-md mx-auto my-8"
            >
                <Link
                    href={href}
                    className={`block ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                    {/* Glow effect */}
                    {!isLocked && (
                        <div
                            className="absolute inset-0 rounded-3xl blur-xl opacity-40 -z-10"
                            style={{ background: `linear-gradient(135deg, ${config.glowColor}, transparent)` }}
                        />
                    )}

                    <motion.div
                        whileHover={!isLocked ? { scale: 1.02, y: -4 } : {}}
                        whileTap={!isLocked ? { scale: 0.98, y: 2 } : {}}
                        className={`
                            relative p-6 rounded-3xl border-2 transition-all
                            ${isLocked
                                ? 'bg-slate-700/80 border-slate-500 shadow-[0_4px_0_#475569]'
                                : `bg-gradient-to-br ${config.gradient} border-transparent shadow-[0_8px_0_${config.shadowColor}]`
                            }
                        `}
                        style={{ boxShadow: !isLocked ? `0 8px 0 ${config.shadowColor}` : '0 4px 0 #475569' }}
                    >
                        <div className="flex items-center gap-4">
                            {/* Trophy Icon */}
                            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center text-4xl">
                                {isCompleted ? '👑' : isLocked ? '🔒' : '🏆'}
                            </div>

                            {/* Content */}
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                                        Boss Level
                                    </span>
                                    {isCompleted && (
                                        <span className="text-xs font-bold uppercase tracking-wider text-white/90 bg-white/20 px-2 py-0.5 rounded-full">
                                            ✓ Complete
                                        </span>
                                    )}
                                </div>
                                <h3 className={`font-black text-lg ${isLocked ? 'text-slate-300' : 'text-white'}`}>
                                    {title}
                                </h3>
                                {!isLocked && <StarDisplay earned={stars} />}
                            </div>
                        </div>
                    </motion.div>
                </Link>
            </motion.div>
        )
    }

    // ==========================================================================
    // RENDER: STANDARD/CRISIS/CRUNCH/MAINTENANCE NODES
    // ==========================================================================
    return (
        <motion.div
            initial={{ opacity: 0, y: 30, scale: isUnlocking ? 0 : 0.9 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{
                delay: index * 0.05,
                type: 'spring',
                stiffness: isUnlocking ? 300 : 200
            }}
            className="relative z-10 my-2 flex flex-col items-center"
        >
            {/* Badge above node */}
            {config.badge && !isLocked && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -top-8 text-xs font-bold px-3 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-lg"
                >
                    {config.badge}
                </motion.div>
            )}

            <Link
                href={href}
                className={`group relative flex flex-col items-center ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
            >
                {/* Current node pulse ring */}
                {isCurrent && (
                    <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{
                            background: config.glowColor,
                            filter: 'blur(15px)',
                        }}
                        animate={{
                            scale: [1, 1.3, 1],
                            opacity: [0.4, 0.2, 0.4]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: 'easeInOut'
                        }}
                    />
                )}

                {/* Node Circle */}
                <motion.div
                    whileHover={!isLocked ? { scale: 1.1, y: -4 } : {}}
                    whileTap={!isLocked ? { scale: 0.95, y: 2 } : {}}
                    className={`
                        relative w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all
                        ${isLocked
                            ? 'bg-slate-700/80 border-4 border-slate-500 shadow-[0_4px_0_#475569,inset_0_2px_0_rgba(255,255,255,0.1)]'
                            : `bg-gradient-to-b ${config.gradient} border-t-2 border-white/40 shadow-inner`
                        }
                        ${isCurrent ? 'ring-4 ring-white/30 ring-offset-2 ring-offset-[var(--bg-primary)]' : ''}
                    `}
                    style={{
                        boxShadow: !isLocked
                            ? `0 8px 0 ${config.shadowColor}, inset 0 -4px 0 rgba(0,0,0,0.2)`
                            : '0 4px 0 #475569, inset 0 2px 0 rgba(255,255,255,0.1)'
                    }}
                >
                    {/* Gloss Reflection */}
                    {!isLocked && (
                        <div className="absolute top-2 left-3 right-3 h-4 bg-white/20 rounded-full blur-[2px]" />
                    )}

                    {/* Subtle shine for locked nodes */}
                    {isLocked && (
                        <div className="absolute top-2 left-4 right-4 h-3 bg-white/10 rounded-full blur-[1px]" />
                    )}

                    {/* Icon */}
                    <span className={`drop-shadow-lg transition-all duration-300 ${isLocked ? 'opacity-70 grayscale-[0.3]' : ''}`}>
                        {isCompleted ? '✓' : isLocked ? '🔒' : icon || config.icon}
                    </span>

                    {/* Completed checkmark badge */}
                    {isCompleted && (
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-[#58cc02] border-2 border-white flex items-center justify-center shadow-lg"
                        >
                            <span className="text-white text-sm font-bold">✓</span>
                        </motion.div>
                    )}

                    {/* Current indicator */}
                    {isCurrent && !isCompleted && (
                        <motion.div
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                            className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-white shadow-lg"
                        />
                    )}
                </motion.div>

                {/* Stars below node */}
                {!isLocked && stars > 0 && (
                    <div className="mt-2">
                        <StarDisplay earned={stars} />
                    </div>
                )}

                {/* Hover tooltip */}
                {!isLocked && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        whileHover={{ opacity: 1, y: 0 }}
                        className="absolute top-full mt-3 opacity-0 group-hover:opacity-100 transition-all z-50 pointer-events-none"
                    >
                        <div className="bg-[var(--bg-elevated)] px-4 py-2 rounded-xl text-sm font-bold border border-[var(--border-subtle)] shadow-xl max-w-[200px] text-center whitespace-normal">
                            {title}
                            {mastery > 0 && (
                                <div className="text-xs text-[var(--text-muted)] mt-1">
                                    {Math.round(mastery * 100)}% mastery
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </Link>
        </motion.div>
    )
}
