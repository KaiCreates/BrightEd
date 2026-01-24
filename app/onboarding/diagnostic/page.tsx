'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { updateSkillMetrics, UserSkillStats, PerformanceSnapshot } from '@/lib/learning-algorithm'
import { BrightButton, BrightLayer, BrightHeading } from '@/components/system'

interface DiagnosticQuestion {
  id: string
  question: string
  difficulty: number
  tags: string[]
  options: string[]
  correctAnswer: number
}

const diagnosticQuestions: DiagnosticQuestion[] = [
  {
    id: 'd1',
    question: 'If a business increases its price by 20% and demand decreases by 10%, what happens to total revenue?',
    difficulty: 3.5,
    tags: ['economics', 'revenue'],
    options: [
      'Revenue increases',
      'Revenue decreases',
      'Revenue stays the same',
      'Cannot determine',
    ],
    correctAnswer: 0,
  },
  {
    id: 'd2',
    question: 'Solve for x: 2x + 5 = 15. Then determine x^2.',
    difficulty: 2.0,
    tags: ['math', 'logic'],
    options: ['25', '100', '10', '50'],
    correctAnswer: 0,
  },
  {
    id: 'd3',
    question: 'A supplier increases the cost of materials by 15%. If you maintain your price, your profit margin will:',
    difficulty: 4.0,
    tags: ['finance', 'profit-margin'],
    options: ['Increase', 'Decrease', 'Stay fixed', 'Scale with volume'],
    correctAnswer: 1,
  },
  {
    id: 'd4',
    question: 'Which of these best describes "Opportunity Cost"?',
    difficulty: 5.0,
    tags: ['economics', 'logic'],
    options: [
      'The actual cash cost of an item',
      'The value of the next best alternative given up',
      'The cost of hiring a second employee',
      'The tax paid on business revenue'
    ],
    correctAnswer: 1,
  }
]

export default function DiagnosticPage() {
  const router = useRouter()
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [stats, setStats] = useState<UserSkillStats>({
    generalLevel: 3.0, // Start at mid-low
    consistency: 0.5,
    topicMastery: {},
    behavioralSignals: {
      avgResponseTime: 0,
      perfectStreaks: 0,
      rapidGuessPenalty: 0,
    }
  })

  const questionStartTime = useRef<number>(Date.now())

  useEffect(() => {
    questionStartTime.current = Date.now()
  }, [currentQuestionIdx])

  const handleAnswer = (answerIndex: number) => {
    const question = diagnosticQuestions[currentQuestionIdx]
    const endTime = Date.now()
    const responseTime = (endTime - questionStartTime.current) / 1000

    const snapshot: PerformanceSnapshot = {
      correct: answerIndex === question.correctAnswer,
      responseTime,
      questionDifficulty: question.difficulty,
      tags: question.tags
    }

    const updatedStats = updateSkillMetrics(stats, snapshot)
    setStats(updatedStats)

    if (currentQuestionIdx < diagnosticQuestions.length - 1) {
      setCurrentQuestionIdx(currentQuestionIdx + 1)
    } else {
      setIsComplete(true)
    }
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--brand-primary)]/10 rounded-full blur-[120px]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-2xl"
        >
          <BrightLayer variant="elevated" padding="lg" className="text-center">
            <div className="text-6xl mb-8">🚀</div>
            <BrightHeading level={2} className="mb-6">
              Profile Initialized!
            </BrightHeading>
            <div className="space-y-4 mb-10 text-left">
              <div className="p-6 bg-[var(--bg-secondary)] rounded-3xl border border-[var(--border-subtle)]">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.2em]">Calculated Mastery</span>
                  <span className="text-[var(--brand-primary)] font-black text-xl">{stats.generalLevel.toFixed(1)}/10</span>
                </div>
                <div className="h-2 w-full bg-[var(--bg-primary)] rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${stats.generalLevel * 10}%` }}
                    className="h-full bg-[var(--brand-primary)] shadow-[0_0_15px_var(--brand-primary)]/30"
                  />
                </div>
              </div>
              <p className="text-[var(--text-secondary)] text-center font-medium leading-relaxed px-4">
                We&apos;ve tuned your learning algorithm based on your speed, accuracy, and logic. Your path is ready.
              </p>
            </div>
            <BrightButton
              onClick={() => {
                localStorage.setItem('brighted_user_stats', JSON.stringify(stats))
                router.push('/home')
              }}
              className="w-full"
              size="lg"
            >
              Enter Platform
            </BrightButton>
          </BrightLayer>
        </motion.div>
      </div>
    )
  }

  const question = diagnosticQuestions[currentQuestionIdx]
  const progress = ((currentQuestionIdx + 1) / diagnosticQuestions.length) * 100

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--brand-secondary)]/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-2xl relative z-10 transition-colors duration-300">
        <div className="mb-8">
          <div className="flex justify-between items-end mb-3 px-2">
            <div>
              <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-[0.2em] mb-1">Diagnostic Mode</p>
              <h3 className="text-[var(--text-primary)] font-black text-lg">Question {currentQuestionIdx + 1} <span className="text-[var(--text-muted)]">/ {diagnosticQuestions.length}</span></h3>
            </div>
            <span className="text-[var(--brand-primary)] font-black text-sm">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-[var(--bg-secondary)] rounded-full h-1.5 overflow-hidden p-[2px] border border-[var(--border-subtle)]">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="bg-[var(--brand-primary)] h-full rounded-full shadow-[0_0_10px_var(--brand-primary)]/30"
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIdx}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
          >
            <BrightLayer variant="elevated" padding="lg">
              <div className="flex gap-2 mb-6">
                {question.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest rounded-full">
                    {tag}
                  </span>
                ))}
              </div>

              <BrightHeading level={2} className="mb-10 leading-tight">
                {question.question}
              </BrightHeading>

              <div className="grid gap-4">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    className="group relative w-full text-left p-6 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] rounded-3xl hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 transition-all duration-300"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-10 h-10 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] font-black group-hover:bg-[var(--brand-primary)] group-hover:text-white group-hover:border-[var(--brand-primary)] transition-all">
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
                        {option}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </BrightLayer>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
