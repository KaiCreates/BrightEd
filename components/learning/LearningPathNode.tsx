'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { getCognitiveLevel, getLevelDotColor } from '@/lib/cognitive-levels'

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
    mastery?: number // NEW: Mastery score 0-1
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
    color: string
    shadowColor: string
    badge: string | null
    badgeColor: string
}> = {
    standard: {
        shape: 'circle',
        color: '#58cc02', // Duolingo Green
        shadowColor: '#46a302',
        badge: null,
        badgeColor: '',
    },
    crunch: {
        shape: 'circle',
        color: '#ce82ff',
        shadowColor: '#a568cc',
        badge: '⚡ SPEED CHALLENGE',
        badgeColor: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    },
    crisis: {
        shape: 'hexagon',
        color: '#ff4b4b',
        shadowColor: '#cc3c3c',
        badge: '⚠️ HIGH STAKES',
        badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
    },
    boss: {
        shape: 'card',
        color: '#ffc800',
        shadowColor: '#cca000',
        badge: null,
        badgeColor: '',
    },
    maintenance: {
        shape: 'circle',
        color: '#afafaf',
        shadowColor: '#8c8c8c',
        badge: '🔧 REVIEW',
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
    mastery, // NEW: Destructure mastery
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
        const isStandardBoss = !isLocked && !isCompleted;
        return (
            <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, type: 'spring', stiffness: 200 }}
                className="relative z-10 w-full max-w-sm mx-auto my-4"
            >
                <Link href={href} className={isLocked ? 'cursor-not-allowed' : 'cursor-pointer group flex flex-col items-center'}>
                    <div className={`
                        w-32 h-32 rounded-[32px] flex items-center justify-center transition-all relative
                        ${isLocked ? 'bg-[#e5e5e5] shadow-[0_8px_0_#afafaf]' : 'bg-[#ffc800] shadow-[0_8px_0_#cca000] group-hover:translate-y-[-4px] group-hover:shadow-[0_12px_0_#cca000] active:translate-y-[4px] active:shadow-none'}
                    `}>
                        <span className="text-6xl drop-shadow-lg">
                            {isCompleted ? '⭐' : isLocked ? '🔒' : '🏆'}
                        </span>
                    </div>
                    <div className="mt-6 text-center">
                        <h3 className={`font-black text-lg uppercase tracking-wider ${isLocked ? 'text-[#afafaf]' : 'text-[var(--text-primary)]'}`}>
                            {title}
                        </h3>
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
                    <HexagonNode
                        className={`
                            w-24 h-28 flex items-center justify-center text-4xl transition-all relative
                            ${isLocked ? 'bg-[#e5e5e5] shadow-[0_8px_0_#afafaf]' : 'bg-[#ff4b4b] shadow-[0_8px_0_#cc3c3c] group-hover:translate-y-[-4px] group-hover:shadow-[0_12px_0_#cc3c3c] active:translate-y-[4px] active:shadow-none'}
                        `}
                    >
                        <span className="drop-shadow-md text-white">
                            {isCompleted ? '✓' : isLocked ? '🔒' : '⚠️'}
                        </span>
                    </HexagonNode>
                </Link>
            </motion.div>
        )
    }

    const isCurrent = status === 'current';

    return (
        <motion.div
            initial={{ opacity: 0, y: 50, scale: isUnlocking ? 0 : 1 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.1, type: isUnlocking ? 'spring' : 'tween', stiffness: isUnlocking ? 200 : undefined }}
            style={{ transform: `translateX(${xOffset}px)` }}
            className="relative z-10 my-4"
        >
            <Link href={href} className={`group relative flex flex-col items-center ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                {/* 3D Physical Node */}
                <div
                    className={`
                        w-20 h-20 rounded-full flex items-center justify-center text-3xl transition-all relative
                        ${isLocked ? 'bg-[#e5e5e5] shadow-[0_8px_0_#afafaf]' : `bg-[${config.color}] shadow-[0_8px_0_${config.shadowColor}] group-hover:translate-y-[-4px] group-hover:shadow-[0_12px_0_${config.shadowColor}] active:translate-y-[4px] active:shadow-none`}
                    `}
                    style={{
                        backgroundColor: !isLocked ? config.color : undefined,
                        boxShadow: !isLocked ? `0 8px 0 ${config.shadowColor}` : undefined
                    }}
                >
                    <span className="drop-shadow-md text-white filter brightness-110">
                        {isCompleted ? '✓' : isLocked ? '🔒' : isCurrent ? icon : icon}
                    </span>
                </div>

                {/* Optional Title Tooltip for Standard Nodes */}
                {!isLocked && (
                    <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-[var(--bg-elevated)] px-3 py-1 rounded-xl text-xs font-bold border border-[var(--border-subtle)]">
                        {title}
                    </div>
                )}
            </Link>
        </motion.div>
    )
}
