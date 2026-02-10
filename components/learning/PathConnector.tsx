'use client'

import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

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
    // Fixed constants for alignment
    const width = 300;
    const center = width / 2; // 150
    const height = 160; // Fixed height to match container spacing

    // Calculate start and end X coordinates relative to the svg center
    // The SVG is centered on the current node (offset handled by parent)
    const diff = toOffset - fromOffset;
    const startX = center;
    const endX = center + diff;

    // Bezier curve control points
    // We want a smooth S-curve that starts vertical and ends vertical
    const cp1y = height * 0.5;
    const cp2y = height * 0.5;

    const pathData = `M ${startX} 0 
                      C ${startX} ${cp1y}, 
                        ${endX} ${cp2y}, 
                        ${endX} ${height}`;

    // Road surface gradient - use fromIndex for unique IDs to prevent duplicate SVG ID conflicts
    const roadGradient = isCompleted
        ? `url(#roadGradientCompleted-${fromIndex})`
        : `url(#roadGradientDefault-${fromIndex})`;

    return (
        <div
            className="absolute top-[48px] left-1/2 -ml-[150px] w-[300px] -z-10 pointer-events-none"
            style={{ height: `${height}px` }}
        >
            <svg
                width={width}
                height={height}
                viewBox={`0 0 ${width} ${height}`}
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="overflow-visible"
            >
                <defs>
                    <linearGradient id={`roadGradientDefault-${fromIndex}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#e2e8f0" />
                        <stop offset="100%" stopColor="#cbd5e1" />
                    </linearGradient>
                    <linearGradient id={`roadGradientCompleted-${fromIndex}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#58cc02" />
                        <stop offset="100%" stopColor="#46a302" />
                    </linearGradient>
                </defs>

                {/* Outer Shadow/Path Border */}
                <path
                    d={pathData}
                    stroke={isCompleted ? "#2d6a01" : "#cbd5e1"}
                    strokeWidth="20"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.3"
                />

                {/* Main Surface */}
                <path
                    d={pathData}
                    stroke={roadGradient}
                    strokeWidth="16"
                    strokeLinecap="round"
                    fill="none"
                />

                {/* Inner Border/Highlight */}
                <path
                    d={pathData}
                    stroke="rgba(255,255,255,0.3)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    fill="none"
                    transform="translate(0, -2)"
                />

                {/* Animation for next path */}
                {isNext && !isCompleted && (
                    <motion.path
                        d={pathData}
                        stroke="#ffffff"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray="1 12"
                        fill="none"
                        initial={{ strokeDashoffset: 0 }}
                        animate={{ strokeDashoffset: -24 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        filter="drop-shadow(0 0 4px white)"
                    />
                )}
            </svg>
        </div>
    )
}
