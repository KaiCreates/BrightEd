'use client'

import { motion } from 'framer-motion'
import { useMemo } from 'react'

const buildBriefId = (seed: string) => {
    let hash = 0
    for (let i = 0; i < seed.length; i += 1) {
        hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
    }
    return hash.toString(36).toUpperCase().padStart(6, '0').slice(-6)
}

interface ScenarioBriefProps {
    content: string
    difficulty?: number
    subject?: string
}

export default function ScenarioBrief({ content, difficulty = 1, subject }: ScenarioBriefProps) {
    const subjectLabel = subject || 'GENERAL'
    const briefId = useMemo(
        () => buildBriefId(`${subjectLabel}-${difficulty}-${content}`),
        [subjectLabel, difficulty, content]
    )

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative mb-8"
        >
            {/* Decorative File Header */}
            <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[var(--text-secondary)] text-[var(--bg-primary)] text-[10px] font-black uppercase tracking-[0.2em]">
                        📁 CASE FILE: {subjectLabel}
                    </span>
                    {difficulty > 3 && (
                        <span className="px-2 py-0.5 rounded-md bg-red-500/20 text-red-500 border border-red-500/30 text-[10px] font-black uppercase tracking-[0.2em]">
                            ⚠️ HIGH PRIORITY
                        </span>
                    )}
                </div>
                <div className="text-[10px] font-mono text-[var(--text-muted)]">
                    ID: {briefId}
                </div>
            </div>

            {/* Main Content Card */}
            <div className="relative p-6 md:p-8 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)] shadow-sm overflow-hidden group">
                {/* Tech Decor - Corner accents */}
                <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-[var(--border-subtle)] group-hover:border-[var(--brand-primary)] transition-colors" />
                <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-[var(--border-subtle)] group-hover:border-[var(--brand-primary)] transition-colors" />
                <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-[var(--border-subtle)] group-hover:border-[var(--brand-primary)] transition-colors" />
                <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-[var(--border-subtle)] group-hover:border-[var(--brand-primary)] transition-colors" />

                {/* Typing effect simulation */}
                <div className="relative z-10">
                    <h2 className="text-xl md:text-2xl font-medium leading-relaxed font-serif text-[var(--text-primary)]">
                        {content}
                    </h2>
                </div>

                {/* Background 'Data' noise */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('/noise.png')]" />
            </div>
        </motion.div>
    )
}
