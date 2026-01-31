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
    // Determine state colors (Duolingo Style)
    let borderColor = 'border-[var(--border-subtle)]'
    let bottomBorderColor = 'border-b-[#e5e5e5]'
    let bgColor = 'bg-[var(--bg-elevated)]'
    let textColor = 'text-[var(--text-primary)]'
    let numberBg = 'bg-white border-2 border-[var(--border-subtle)]'
    let numberText = 'text-[var(--text-muted)]'

    // State logic
    if (showResult) {
        if (isCorrect) {
            borderColor = 'border-[#58CC02]'
            bottomBorderColor = 'border-b-[#46A302]'
            bgColor = 'bg-[#D7FFB8]'
            textColor = 'text-[#46A302]'
            numberBg = 'bg-[#58CC02] border-[#58CC02]'
            numberText = 'text-white'
        } else if (isSelected) {
            borderColor = 'border-[#FF4B4B]'
            bottomBorderColor = 'border-b-[#D33131]'
            bgColor = 'bg-[#FFDFE0]'
            textColor = 'text-[#D33131]'
            numberBg = 'bg-[#FF4B4B] border-[#FF4B4B]'
            numberText = 'text-white'
        } else {
            bgColor = 'opacity-40 grayscale-[0.5]'
        }
    } else if (isSelected) {
        borderColor = 'border-[#84D8FF]'
        bottomBorderColor = 'border-b-[#1CB0F6]'
        bgColor = 'bg-[#DDF4FF]'
        textColor = 'text-[#1899D6]'
        numberBg = 'bg-white border-[#84D8FF]'
        numberText = 'text-[#1899D6]'
    }

    return (
        <motion.button
            onClick={onSelect}
            disabled={disabled}
            whileTap={!disabled && !showResult ? { scale: 0.96 } : {}}
            className={`
                relative w-full text-left group
                p-4 md:p-5 rounded-2xl border-2 border-b-4 transition-all duration-200
                ${borderColor} ${bottomBorderColor} ${bgColor} ${textColor}
                ${!disabled && !showResult ? 'hover:bg-black/5 active:border-b-2 active:translate-y-[2px]' : ''}
                ${isSelected && !showResult ? 'translate-y-[2px] border-b-2' : ''}
                ${showResult ? 'cursor-default' : 'cursor-pointer'}
            `}
        >
            <div className="flex items-center gap-4">
                {/* Option Number/Letter */}
                <div className={`
                    w-8 h-8 md:w-10 md:h-10 rounded-xl flex items-center justify-center font-black text-lg
                    transition-colors duration-200 shrink-0
                    ${numberBg} ${numberText}
                    ${!showResult && !isSelected ? 'group-hover:bg-[var(--border-subtle)] shadow-[0_2px_0_rgba(0,0,0,0.1)]' : ''}
                `}>
                    {index + 1}
                </div>

                {/* Option Text */}
                <div className="flex-1">
                    <span className="text-base md:text-lg font-bold leading-snug">
                        {option}
                    </span>
                </div>
            </div>
        </motion.button>
    )
}
