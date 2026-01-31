'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { BrightButton } from '@/components/system'

export interface GuidebookObjective {
    id: string
    objective: string
    content: string
}

interface GuidebookModalProps {
    isOpen: boolean
    onClose: () => void
    moduleNumber: number
    title: string
    subject: string
    objectives: GuidebookObjective[]
    theme?: 'startup' | 'growth' | 'mastery' | 'default'
}

const THEME_COLORS = {
    startup: '#ff4b4b',
    growth: '#58cc02',
    mastery: '#ffc800',
    default: '#1cb0f6'
}

export function GuidebookModal({
    isOpen,
    onClose,
    moduleNumber,
    title,
    subject,
    objectives,
    theme = 'default'
}: GuidebookModalProps) {
    const bannerColor = THEME_COLORS[theme]

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 cursor-pointer"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="bg-[#1a1c1e] w-full max-w-xl rounded-[32px] overflow-hidden shadow-2xl border-2 border-[#2f3336] relative z-10"
                    >
                        {/* Header */}
                        <div
                            style={{ backgroundColor: bannerColor }}
                            className="p-8 text-white relative"
                        >
                            <button
                                onClick={onClose}
                                className="absolute top-6 right-6 text-white/80 hover:text-white transition-colors"
                            >
                                <span className="text-3xl font-bold">✕</span>
                            </button>
                            <span className="text-sm font-black uppercase tracking-[0.2em] opacity-80 mb-2 block">
                                Section {moduleNumber} Guidebook
                            </span>
                            <h2 className="text-3xl font-black tracking-tight leading-tight">{title}</h2>
                            <div className="mt-4 inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold">
                                <span>📚</span> {subject}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-8 max-h-[50vh] overflow-y-auto no-scrollbar">
                            <div className="space-y-8">
                                <section>
                                    <h4
                                        style={{ color: bannerColor }}
                                        className="font-black uppercase tracking-widest text-xs mb-4"
                                    >
                                        Key Objectives
                                    </h4>
                                    <div className="space-y-4">
                                        {objectives && objectives.length > 0 ? (
                                            objectives.map((obj, i) => (
                                                <div key={obj.id} className="flex gap-4 items-start bg-[#25282b] p-4 rounded-2xl border-b-4 border-black/20">
                                                    <div className="w-8 h-8 rounded-full bg-[#1cb0f6] flex items-center justify-center flex-shrink-0 text-white font-black text-sm">
                                                        {i + 1}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-bold leading-snug mb-1">{obj.objective}</p>
                                                        <p className="text-[#afafaf] text-sm leading-relaxed">{obj.content}</p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8 text-[#afafaf] font-bold bg-[#25282b] rounded-2xl border-2 border-dashed border-[#2f3336]">
                                                No specific objectives for this unit.
                                            </div>
                                        )}
                                    </div>
                                </section>

                                <section>
                                    <h4 className="text-[#58cc02] font-black uppercase tracking-widest text-xs mb-4">Unit Summary</h4>
                                    <div className="bg-[#1cb0f6]/10 border-2 border-[#1cb0f6]/20 p-6 rounded-3xl flex gap-4">
                                        <span className="text-3xl">💡</span>
                                        <div>
                                            <p className="text-[#1cb0f6] font-black mb-1">Study Tip</p>
                                            <p className="text-[#afafaf] text-sm font-medium">
                                                Review these core concepts before starting the challenges. Use the "Got it" button to track your progress!
                                            </p>
                                        </div>
                                    </div>
                                </section>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-[#25282b] border-t-2 border-[#2f3336]">
                            <BrightButton
                                variant="primary"
                                className="w-full py-4 text-base font-black uppercase tracking-widest"
                                style={{ backgroundColor: bannerColor, borderColor: 'rgba(0,0,0,0.2)' }}
                                onClick={onClose}
                            >
                                Got It!
                            </BrightButton>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
