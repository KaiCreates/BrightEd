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

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

export default function DecisionCard({
    option,
    index,
    isSelected,
    isCorrect,
    showResult,
    onSelect,
    disabled
}: DecisionCardProps) {
    // Determine visual state
    let cardClass = 'question-card'
    let labelBg = 'bg-[var(--bg-secondary)]'
    let labelText = 'text-[var(--text-secondary)]'
    let iconContent: React.ReactNode = OPTION_LABELS[index] || (index + 1)

    if (showResult) {
        if (isCorrect) {
            cardClass = 'question-card question-card-correct'
            labelBg = 'bg-[#58CC02]'
            labelText = 'text-white'
            iconContent = '✓'
        } else if (isSelected) {
            cardClass = 'question-card question-card-wrong'
            labelBg = 'bg-[#FF4B4B]'
            labelText = 'text-white'
            iconContent = '✗'
        } else {
            cardClass = 'question-card opacity-50'
        }
    } else if (isSelected) {
        cardClass = 'question-card question-card-selected'
        labelBg = 'bg-[#1CB0F6]'
        labelText = 'text-white'
    }

    return (
        <motion.button
            onClick={onSelect}
            disabled={disabled}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            whileTap={!disabled && !showResult ? { scale: 0.98 } : {}}
            className={`${cardClass} w-full text-left ${disabled ? 'cursor-not-allowed' : ''}`}
        >
            <div className="flex items-center gap-4">
                {/* Option Label */}
                <motion.div
                    animate={showResult && (isCorrect || isSelected) ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                    className={`
                        w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center 
                        font-black text-lg transition-all shrink-0
                        ${labelBg} ${labelText}
                    `}
                >
                    {iconContent}
                </motion.div>

                {/* Option Text */}
                <div className="flex-1 min-w-0">
                    <span className="text-base md:text-lg font-bold leading-snug block">
                        {option}
                    </span>
                </div>

                {/* Result indicator */}
                {showResult && isCorrect && (
                    <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 300 }}
                        className="text-2xl"
                    >
                        🎉
                    </motion.div>
                )}
            </div>
        </motion.button>
    )
}
