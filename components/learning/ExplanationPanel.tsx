'use client'

import { motion } from 'framer-motion'

interface ExplanationPanelProps {
  question: string
  selectedAnswer: string
  correctAnswer: string
  explanation: string
  isCorrect: boolean
  relatedConcepts?: string[]
  onContinue: () => void
  onTryAgain?: () => void
}

export default function ExplanationPanel({
  question,
  selectedAnswer,
  correctAnswer,
  explanation,
  isCorrect,
  relatedConcepts = [],
  onContinue,
  onTryAgain
}: ExplanationPanelProps) {

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 50 }}
      className="w-full max-w-2xl mx-auto pb-24"
    >
      {/* Result Status Banner */}
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className={`rounded-3xl p-6 mb-6 text-center border-b-[6px] ${isCorrect
            ? 'bg-[#d7ffb8] border-[#58cc02] text-[#58cc02]'
            : 'bg-[#ffdfe0] border-[#ea2b2b] text-[#ea2b2b]'
          }`}
      >
        <div className="text-6xl mb-4 animate-bounce-subtle">
          {isCorrect ? '🎉' : '🤔'}
        </div>
        <h2 className="text-3xl font-black mb-2">
          {isCorrect ? 'Correct!' : 'Not quite...'}
        </h2>
        {isCorrect && (
          <p className="font-bold opacity-90 text-lg">
            XP +50 &nbsp;•&nbsp; Streak +1
          </p>
        )}
      </motion.div>

      {/* Explanation Card */}
      <div className="bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] rounded-3xl p-6 md:p-8 shadow-sm">
        <h3 className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-4">
          Explanation
        </h3>

        <div className="mb-8 leading-relaxed font-medium text-lg">
          {explanation}
        </div>

        {/* Correct Answer Display (if wrong) */}
        {!isCorrect && (
          <div className="bg-[#f0f9ff] border-2 border-[#1cb0f6] rounded-2xl p-4 mb-6">
            <span className="text-xs font-black uppercase tracking-wider text-[#1cb0f6] block mb-1">
              Correct Answer
            </span>
            <span className="font-bold text-lg text-[var(--text-primary)]">
              {correctAnswer}
            </span>
          </div>
        )}

        {/* Related Concepts Chips */}
        {relatedConcepts.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {relatedConcepts.map((concept, index) => (
              <span
                key={index}
                className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs font-bold uppercase tracking-wide border border-[var(--border-subtle)]"
              >
                {concept}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Action Area */}
      <div className="mt-8 flex flex-col gap-3">
        <button
          onClick={onContinue}
          className={`
            w-full py-4 rounded-2xl font-black text-white text-xl uppercase tracking-widest border-b-[6px] active:border-b-0 active:translate-y-[4px] transition-all shadow-xl
            bg-[#58cc02] border-[#46a302] hover:bg-[#61e002]
          `}
        >
          Continue
        </button>

        {!isCorrect && onTryAgain && (
          <button
            onClick={onTryAgain}
            className="w-full py-4 rounded-2xl font-black text-[var(--text-secondary)] text-lg uppercase tracking-widest hover:bg-[var(--bg-secondary)] transition-all"
          >
            Try Similar Question
          </button>
        )}
      </div>
    </motion.div>
  )
}
