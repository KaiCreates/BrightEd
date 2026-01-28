'use client'

import { motion } from 'framer-motion'

interface PathConnectorProps {
    fromIndex: number
    isCompleted: boolean
    isNext: boolean
    fromOffset: number
    toOffset: number
}

export default function PathConnector({
    fromIndex,
    isCompleted,
    isNext,
    fromOffset,
    toOffset
}: PathConnectorProps) {
    // Height of the connector space
    const height = 80;
    // Difference in horizontal position
    const diff = toOffset - fromOffset;

    // SVG path logic: we use a cubic bezier curve for a smoother "winding" path
    // The connector div itself is centered, so we draw relative to 150 (half of 300)
    const pathData = `M ${150 + fromOffset} 0 C ${150 + fromOffset} ${height / 2}, ${150 + toOffset} ${height / 2}, ${150 + toOffset} ${height}`;

    return (
        <div className="relative w-[300px] flex justify-center overflow-visible" style={{ height: `${height}px` }}>
            <svg
                width="300"
                height={height}
                viewBox={`0 0 300 ${height}`}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="overflow-visible"
            >
                {/* Background Shadow Path */}
                <path
                    d={pathData}
                    stroke="var(--border-subtle)"
                    strokeWidth="12"
                    strokeLinecap="round"
                    className="opacity-20"
                />

                {/* Base Path */}
                <path
                    d={pathData}
                    stroke="var(--border-subtle)"
                    strokeWidth="8"
                    strokeLinecap="round"
                />

                {/* Completed / Active Path */}
                {(isCompleted || isNext) && (
                    <motion.path
                        d={pathData}
                        stroke={isCompleted ? "var(--state-success)" : "var(--brand-primary)"}
                        strokeWidth="8"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.8, delay: fromIndex * 0.05 }}
                    />
                )}

                {/* Animated Particles for Active Path */}
                {isNext && !isCompleted && (
                    <motion.path
                        d={pathData}
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray="1, 20"
                        animate={{ strokeDashoffset: [0, -40] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        className="opacity-60"
                    />
                )}
            </svg>

            {/* Dots decoration at the middle of the path */}
            <div
                className="absolute top-1/2 flex gap-1 pointer-events-none"
                style={{
                    transform: `translate(${(fromOffset + toOffset) / 2}px, -50%)`
                }}
            >
                {[...Array(2)].map((_, i) => (
                    <motion.div
                        key={i}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: fromIndex * 0.1 + i * 0.1 }}
                        className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-[var(--state-success)]' : 'bg-[var(--border-subtle)]'}`}
                    />
                ))}
            </div>
        </div>
    )
}
