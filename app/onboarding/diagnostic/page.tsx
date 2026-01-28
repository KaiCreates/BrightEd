'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { updateSkillMetrics, UserSkillStats, PerformanceSnapshot } from '@/lib/learning-algorithm'
import { BrightButton, BrightLayer, BrightHeading } from '@/components/system'
import { useAuth } from '@/lib/auth-context'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

interface DiagnosticQuestion {
  id: string
  question: string
  difficulty: number
  tags: string[]
  options: string[]
  correctAnswer: number
}

const QUESTION_BANK: Record<string, DiagnosticQuestion[]> = {
  Mathematics: [
    {
      id: 'math_1',
      question: 'Solve for x: 3x + 6 = 21',
      difficulty: 2.0,
      tags: ['math', 'algebra'],
      options: ['3', '5', '7', '9'],
      correctAnswer: 2,
    },
    {
      id: 'math_2',
      question: 'If 20% of a number is 14, what is the number?',
      difficulty: 3.0,
      tags: ['math', 'percentages'],
      options: ['28', '70', '56', '84'],
      correctAnswer: 1,
    },
  ],
  'Principles of Business': [
    {
      id: 'pob_1',
      question: 'Which is an example of a variable cost?',
      difficulty: 2.5,
      tags: ['business', 'costs'],
      options: ['Rent', 'Insurance', 'Raw materials', 'Business license'],
      correctAnswer: 2,
    },
    {
      id: 'pob_2',
      question: 'If price increases and demand decreases slightly, total revenue will most likely:',
      difficulty: 4.0,
      tags: ['business', 'revenue'],
      options: ['Increase', 'Decrease', 'Stay the same', 'Become zero'],
      correctAnswer: 0,
    },
  ],
  Economics: [
    {
      id: 'eco_1',
      question: 'Opportunity cost is best defined as:',
      difficulty: 4.5,
      tags: ['economics', 'concepts'],
      options: [
        'The money you spend',
        'The value of the next best alternative you give up',
        'The amount of profit you earn',
        'The cost of taxes',
      ],
      correctAnswer: 1,
    },
  ],
  'Information Technology': [
    {
      id: 'it_1',
      question: 'Which component stores data permanently in a computer?',
      difficulty: 2.0,
      tags: ['it', 'hardware'],
      options: ['RAM', 'CPU', 'SSD/HDD', 'GPU'],
      correctAnswer: 2,
    },
  ],
  'English A': [
    {
      id: 'eng_1',
      question: 'Which sentence is grammatically correct?',
      difficulty: 2.0,
      tags: ['english', 'grammar'],
      options: [
        'Me and him went to school.',
        'He and I went to school.',
        'Him and I went to school.',
        'He and me went to school.',
      ],
      correctAnswer: 1,
    },
  ],
}

const GENERAL_QUESTIONS: DiagnosticQuestion[] = [
  {
    id: 'gen_1',
    question: 'Solve: 12 ÷ 3 + 4',
    difficulty: 1.5,
    tags: ['logic', 'math'],
    options: ['6', '7', '8', '9'],
    correctAnswer: 1,
  },
  {
    id: 'gen_2',
    question: 'If you buy something for 10 and sell it for 15, your profit is:',
    difficulty: 1.5,
    tags: ['finance', 'logic'],
    options: ['5', '10', '15', '25'],
    correctAnswer: 0,
  },
]

function buildDiagnosticQuestions(selectedSubjects: string[] | undefined): DiagnosticQuestion[] {
  const subs = (selectedSubjects || []).filter(Boolean)

  const maxQuestions = 8
  const out: DiagnosticQuestion[] = []

  for (const q of GENERAL_QUESTIONS) {
    if (out.length >= Math.min(2, maxQuestions)) break
    out.push(q)
  }

  const perSubjectPools: DiagnosticQuestion[][] = subs
    .map((s) => QUESTION_BANK[s] || [])
    .filter((arr) => arr.length > 0)

  let idx = 0
  while (out.length < maxQuestions && perSubjectPools.length > 0) {
    const pool = perSubjectPools[idx % perSubjectPools.length]
    const pick = pool.shift()
    if (pick) out.push(pick)
    idx += 1

    const remaining = perSubjectPools.filter((p) => p.length > 0)
    if (remaining.length !== perSubjectPools.length) {
      perSubjectPools.splice(0, perSubjectPools.length, ...remaining)
      idx = 0
    }
  }

  return out.slice(0, maxQuestions)
}

export default function DiagnosticPage() {
  const router = useRouter()
  const { user, userData, loading: authLoading } = useAuth()
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([])
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
    if (authLoading) return
    if (!user) {
      router.push('/login')
      return
    }
    if (userData?.onboardingCompleted !== true) {
      router.push('/onboarding')
      return
    }
    setQuestions(buildDiagnosticQuestions(userData?.subjects))
  }, [user, userData?.subjects, userData?.onboardingCompleted, authLoading, router])

  useEffect(() => {
    questionStartTime.current = Date.now()
  }, [currentQuestionIdx])

  const handleAnswer = (answerIndex: number) => {
    const question = questions[currentQuestionIdx]
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

    if (currentQuestionIdx < questions.length - 1) {
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
              onClick={async () => {
                if (!user) return

                try {
                  const mastery = Math.max(0.1, Math.min(1, stats.generalLevel / 10))
                  await updateDoc(doc(db, 'users', user.uid), {
                    mastery,
                    diagnosticStats: stats,
                    diagnosticCompleted: true,
                    diagnosticCompletedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  })

                  // Sync to localStorage for instant access on next load
                  localStorage.setItem('brighted_diagnostic_complete', 'true')
                  localStorage.setItem('onboarding_status', 'complete')

                  const { toast } = await import('react-hot-toast')
                  toast.success('Profile ready! Welcome to BrightEd 🎉')

                  router.push('/home')
                } catch (error) {
                  console.error('Failed to save diagnostic:', error)
                  const { toast } = await import('react-hot-toast')
                  toast.error('Failed to save progress. Please try again.')
                }
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

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]" />
      </div>
    )
  }

  const question = questions[currentQuestionIdx]
  const progress = ((currentQuestionIdx + 1) / questions.length) * 100

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[var(--bg-primary)] flex items-center justify-center p-4 pb-24 relative overflow-hidden transition-colors duration-300 safe-padding">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--brand-secondary)]/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-2xl relative z-10 transition-colors duration-300">
        {/* Duolingo-style Progress Bar */}
        <div className="mb-6 md:mb-8">
          <div className="flex justify-between items-end mb-3 px-2">
            <div>
              <p className="text-[var(--text-muted)] text-[10px] md:text-xs font-black uppercase tracking-[0.2em] mb-1">Diagnostic Mode</p>
              <h3 className="text-[var(--text-primary)] font-black text-base md:text-lg">
                Question {currentQuestionIdx + 1} <span className="text-[var(--text-muted)]">/ {questions.length}</span>
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[var(--brand-primary)] font-black text-sm md:text-base">{Math.round(progress)}%</span>
              <span className="text-xl duo-streak-flame">🧠</span>
            </div>
          </div>
          {/* Duolingo-style progress bar */}
          <div className="duo-progress-bar">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              className="duo-progress-fill"
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
            <BrightLayer variant="elevated" padding="lg" className="evaluation-container !min-h-0 !p-4 md:!p-8">
              <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
                {question.tags.map(tag => (
                  <span key={tag} className="px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest rounded-full">
                    {tag}
                  </span>
                ))}
              </div>

              <BrightHeading level={2} className="mb-8 md:mb-10 leading-tight question-text">
                {question.question}
              </BrightHeading>

              {/* Question Options - Stack on mobile */}
              <div className="grid gap-3 md:gap-4 question-options">
                {question.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswer(index)}
                    className="group relative w-full text-left p-4 md:p-6 bg-[var(--bg-secondary)] border-2 border-[var(--border-subtle)] rounded-2xl md:rounded-3xl hover:border-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 active:scale-[0.98] transition-all duration-300 min-h-[60px]"
                  >
                    <div className="flex items-center gap-4 md:gap-5">
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-[var(--bg-primary)] border-2 border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] font-black text-sm md:text-base group-hover:bg-[var(--brand-primary)] group-hover:text-white group-hover:border-[var(--brand-primary)] transition-all shrink-0">
                        {String.fromCharCode(65 + index)}
                      </div>
                      <span className="text-base md:text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
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
