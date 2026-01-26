'use client'

import { motion } from 'framer-motion'

interface DecisionCardProps {
    option: string
    index: number
    isSelected: boolean
    isCorrect?: boolean
    showResult: boolean
    onSelect: () => void
    disabled: boolean
}

export default function DecisionCard({
    option,
    index,
    isSelected,
    isCorrect,
    showResult,
    onSelect,
    disabled
}: DecisionCardProps) {
    // Determine state colors
    let borderColor = 'border-[var(--border-subtle)]'
    let bgColor = 'bg-[var(--bg-primary)]'
    let textColor = 'text-[var(--text-primary)]'
    let shadow = ''

    if (showResult) {
        if (isCorrect) {
            borderColor = 'border-[var(--state-success)]'
            bgColor = 'bg-green-500/5'
            textColor = 'text-green-700' // Ensure visibility
            shadow = 'shadow-[0_0_20px_rgba(34,197,94,0.2)]'
        } else if (isSelected) {
            borderColor = 'border-[var(--state-error)]'
            bgColor = 'bg-red-500/5'
            textColor = 'text-red-700'
        } else {
            // Faded state for unselected wrong answers
            bgColor = 'bg-[var(--bg-secondary)]'
            textColor = 'text-[var(--text-muted)] opacity-50'
        }
    } else if (isSelected) {
        // Selected but not confirmed yet (simulate locking in)
        borderColor = 'border-[var(--brand-primary)] border-2' // Thicker border
        shadow = 'shadow-[0_0_15px_rgba(var(--brand-primary-rgb),0.3)]'
    }

    return (
        <motion.button
            onClick={onSelect}
            disabled={disabled}
            whileHover={!disabled && !showResult ? { scale: 1.01, y: -2 } : {}}
            whileTap={!disabled && !showResult ? { scale: 0.98 } : {}}
            className={`
        relative w-full text-left group
        p-6 rounded-xl border-2 transition-all duration-300
        ${borderColor} ${bgColor} ${shadow}
        ${!disabled && !showResult ? 'hover:border-[var(--brand-primary)] hover:shadow-lg hover:bg-[var(--bg-secondary)]' : ''}
      `}
        >
            <div className="flex items-start gap-4">
                {/* Selection Indicator (Radio-like) */}
                <div className={`
          mt-1 flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all
          ${showResult && isCorrect
                        ? 'border-[var(--state-success)] bg-[var(--state-success)] text-white'
                        : showResult && isSelected && !isCorrect
                            ? 'border-[var(--state-error)] bg-[var(--state-error)] text-white'
                            : isSelected
                                ? 'border-[var(--brand-primary)]'
                                : 'border-[var(--border-subtle)] group-hover:border-[var(--brand-primary)]'
                    }
        `}>
                    {showResult ? (
                        isCorrect ? '✓' : isSelected ? '✕' : ''
                    ) : (
                        isSelected && <motion.div layoutId="selection-dot" className="w-3 h-3 rounded-full bg-[var(--brand-primary)]" />
                    )}
                </div>

                {/* Option Text */}
                <div className="flex-1">
                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] block mb-1 opacity-50 ${textColor}`}>
                        OPTION {String.fromCharCode(65 + index)}
                    </span>
                    <span className={`text-base md:text-lg font-medium leading-snug ${textColor}`}>
                        {option}
                    </span>
                </div>

                {/* Hidden hover arrow */}
                {!disabled && !showResult && !isSelected && (
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[var(--brand-primary)]">
                        →
                    </div>
                )}
            </div>
        </motion.button>
    )
}
