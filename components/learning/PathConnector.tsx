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
                {/* 3D Shadow Layer */}
                <path
                    d={pathData}
                    stroke="#e5e5e5"
                    strokeWidth="16"
                    strokeLinecap="round"
                />

                {/* Base Path Layer (Top Road) */}
                <path
                    d={pathData}
                    stroke={isCompleted ? "#58cc02" : "#e5e5e5"}
                    strokeWidth="12"
                    strokeLinecap="round"
                    className="transition-colors duration-500"
                />

                {/* Animated Highlights for Active Path */}
                {isNext && !isCompleted && (
                    <motion.path
                        d={pathData}
                        stroke="#afafaf"
                        strokeWidth="12"
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 1, delay: fromIndex * 0.05 }}
                    />
                )}

                {/* Road Dashed Line (Pavement Markings) */}
                <path
                    d={pathData}
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="1, 15"
                    className="opacity-40"
                />
            </svg>
        </div>
    )
}
