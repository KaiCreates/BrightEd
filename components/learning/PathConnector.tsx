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

    // Road surface gradient
    const roadGradient = isCompleted
        ? "url(#roadGradientCompleted)"
        : "url(#roadGradientDefault)";

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
                    <linearGradient id="roadGradientDefault" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#d1d5db" />
                        <stop offset="100%" stopColor="#9ca3af" />
                    </linearGradient>
                    <linearGradient id="roadGradientCompleted" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#86efac" />
                        <stop offset="100%" stopColor="#22c55e" />
                    </linearGradient>
                </defs>

                {/* Shadow */}
                <path
                    d={pathData}
                    stroke={isCompleted ? "#166534" : "#4b5563"}
                    strokeWidth="16"
                    strokeLinecap="round"
                    fill="none"
                    transform="translate(0, 4)"
                    opacity="0.2"
                />

                {/* Main Surface */}
                <path
                    d={pathData}
                    stroke={roadGradient}
                    strokeWidth="12"
                    strokeLinecap="round"
                    fill="none"
                />

                {/* Markings */}
                <path
                    d={pathData}
                    stroke="rgba(255,255,255,0.5)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeDasharray="6 8"
                    fill="none"
                />

                {/* Animation */}
                {isNext && !isCompleted && (
                    <motion.path
                        d={pathData}
                        stroke="#ffffff"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeDasharray="4 8"
                        fill="none"
                        initial={{ strokeDashoffset: 0 }}
                        animate={{ strokeDashoffset: -12 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        filter="drop-shadow(0 0 2px white)"
                    />
                )}
            </svg>
        </div>
    )
}
