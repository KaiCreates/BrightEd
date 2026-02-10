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
    const width = 400;
    const center = width / 2; // 200
    const height = 140; // Increased height for better connection

    // Calculate start and end X coordinates relative to the svg center
    // The SVG is centered on the current node (offset handled by parent)
    const diff = toOffset - fromOffset;
    const startX = center;
    const endX = center + diff;

    // Bezier curve control points - adjusted for smoother S-curve
    // We want a smooth S-curve that starts vertical and ends vertical
    const cp1y = height * 0.3;
    const cp2y = height * 0.7;

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
            className="absolute top-[60px] left-1/2 -translate-x-1/2 w-[400px] -z-10 pointer-events-none"
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
                        <stop offset="0%" stopColor="#94a3b8" />
                        <stop offset="50%" stopColor="#cbd5e1" />
                        <stop offset="100%" stopColor="#e2e8f0" />
                    </linearGradient>
                    <linearGradient id={`roadGradientCompleted-${fromIndex}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#58cc02" />
                        <stop offset="50%" stopColor="#46a302" />
                        <stop offset="100%" stopColor="#2d6a01" />
                    </linearGradient>
                </defs>

                {/* Glow effect for completed paths */}
                {isCompleted && (
                    <path
                        d={pathData}
                        stroke="rgba(88, 204, 2, 0.3)"
                        strokeWidth="24"
                        strokeLinecap="round"
                        fill="none"
                        filter="blur(4px)"
                    />
                )}

                {/* Outer Shadow/Path Border */}
                <path
                    d={pathData}
                    stroke={isCompleted ? "#1a4d00" : "#64748b"}
                    strokeWidth="18"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.4"
                />

                {/* Main Surface */}
                <path
                    d={pathData}
                    stroke={roadGradient}
                    strokeWidth="14"
                    strokeLinecap="round"
                    fill="none"
                />

                {/* Inner Highlight line */}
                <path
                    d={pathData}
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    transform="translate(0, -3)"
                />

                {/* Bottom shadow line */}
                <path
                    d={pathData}
                    stroke="rgba(0,0,0,0.1)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                    transform="translate(0, 3)"
                />

                {/* Animation for next path */}
                {isNext && !isCompleted && (
                    <motion.path
                        d={pathData}
                        stroke="#ffffff"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray="8 12"
                        fill="none"
                        initial={{ strokeDashoffset: 0 }}
                        animate={{ strokeDashoffset: -40 }}
                        transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                        filter="drop-shadow(0 0 6px rgba(255,255,255,0.8))"
                    />
                )}
            </svg>
        </div>
    )
}
