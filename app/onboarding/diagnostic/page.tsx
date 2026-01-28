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
  difficulty: number // 1-10
  tags: string[]
  options: string[]
  correctAnswer: number
}

// Extended Question Bank for Adaptive Tuning
const ADAPTIVE_BANK: Record<string, DiagnosticQuestion[]> = {
  Mathematics: [
    { id: 'm_easy_1', difficulty: 2, tags: ['math', 'arithmetic'], question: 'Solve: 15 - (3 × 2)', options: ['24', '9', '6', '12'], correctAnswer: 1 },
    { id: 'm_easy_2', difficulty: 3, tags: ['math', 'algebra'], question: 'If x + 5 = 12, what is x?', options: ['5', '7', '17', '60'], correctAnswer: 1 },
    { id: 'm_med_1', difficulty: 5, tags: ['math', 'fractions'], question: 'Which is largest?', options: ['1/2', '3/5', '4/9', '0.55'], correctAnswer: 1 },
    { id: 'm_med_2', difficulty: 6, tags: ['math', 'geometry'], question: 'Area of a triangle with base 10 and height 5?', options: ['50', '25', '15', '100'], correctAnswer: 1 },
    { id: 'm_hard_1', difficulty: 8, tags: ['math', 'functions'], question: 'f(x) = 2x + 1. Find f(f(2)).', options: ['5', '11', '9', '10'], correctAnswer: 1 },
    { id: 'm_hard_2', difficulty: 9, tags: ['math', 'trigonometry'], question: 'sin(90°) = ?', options: ['0', '1', '0.5', 'Undefined'], correctAnswer: 1 },
  ],
  'Principles of Business': [
    { id: 'pob_easy_1', difficulty: 2, tags: ['business', 'types'], question: 'Sole proprietorships have:', options: ['Unlimited Liability', 'No Liability', 'Shared Liability', 'State Liability'], correctAnswer: 0 },
    { id: 'pob_med_1', difficulty: 5, tags: ['business', 'management'], question: 'Which is a democratic leadeship style?', options: ['Autocratic', 'Participative', 'Laissez-faire', 'Dictatorial'], correctAnswer: 1 },
    { id: 'pob_hard_1', difficulty: 8, tags: ['business', 'finance'], question: 'Working Capital ratio is:', options: ['Assets - Liabilities', 'Current Assets / Current Liabilities', 'Gross Profit / Sales', 'Debt / Equity'], correctAnswer: 1 },
  ],
  Economics: [
    { id: 'eco_easy_1', difficulty: 3, tags: ['economics', 'scarcity'], question: 'The basic economic problem is:', options: ['Inflation', 'Scarcity', 'Unemployment', 'Taxes'], correctAnswer: 1 },
    { id: 'eco_med_1', difficulty: 6, tags: ['economics', 'market'], question: 'In perfect competition, products are:', options: ['Unique', 'Homogeneous', 'Branded', 'Expensive'], correctAnswer: 1 },
    { id: 'eco_hard_1', difficulty: 9, tags: ['economics', 'macro'], question: 'Fiscal policy involves:', options: ['Interest rates', 'Money supply', 'Govt spending & tax', 'Exchange rates'], correctAnswer: 2 },
  ],
  'Information Technology': [
    { id: 'it_easy_1', difficulty: 2, tags: ['it', 'hardware'], question: 'Which is an input device?', options: ['Monitor', 'Printer', 'Mouse', 'Speaker'], correctAnswer: 2 },
    { id: 'it_med_1', difficulty: 5, tags: ['it', 'data'], question: '8 bits equal:', options: ['1 Byte', '1 Kilobyte', '1 Nibble', '1 Bit'], correctAnswer: 0 },
    { id: 'it_hard_1', difficulty: 8, tags: ['it', 'programming'], question: 'Which is NOT a high-level language?', options: ['Python', 'Java', 'Assembly', 'C++'], correctAnswer: 2 },
  ],
  'English A': [
    { id: 'eng_easy_1', difficulty: 2, tags: ['english', 'grammar'], question: 'Choose the correct verb: "The team __ winning."', options: ['is', 'are', 'were', 'have'], correctAnswer: 0 },
    { id: 'eng_med_1', difficulty: 5, tags: ['english', 'vocab'], question: 'Synonym for "Benevolent":', options: ['Cruel', 'Kind', 'Rich', 'Poor'], correctAnswer: 1 },
    { id: 'eng_hard_1', difficulty: 8, tags: ['english', 'analysis'], question: 'Tone refers to:', options: ['The writer\'s attitude', 'The volume of speech', 'The sentence structure', 'The plot'], correctAnswer: 0 },
  ],
}

// Fallback logic / IQ
const GENERAL_BANK: DiagnosticQuestion[] = [
  { id: 'g_1', difficulty: 4, tags: ['logic'], question: 'Sequence: 2, 4, 8, 16, ...', options: ['24', '30', '32', '64'], correctAnswer: 2 },
  { id: 'g_2', difficulty: 6, tags: ['logic'], question: 'If All A are B, and some B are C...', options: ['All A are C', 'Some A are C', 'No A are C', 'Cannot determine'], correctAnswer: 3 },
]

export default function DiagnosticPage() {
  const router = useRouter()
  const { user, userData, loading: authLoading } = useAuth()

  // State
  const [phase, setPhase] = useState<'ready' | 'testing' | 'analyzing' | 'complete'>('ready')
  const [currentQuestion, setCurrentQuestion] = useState<DiagnosticQuestion | null>(null)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [stats, setStats] = useState<UserSkillStats>({
    generalLevel: 3.0,
    consistency: 0.5,
    topicMastery: {},
    behavioralSignals: { avgResponseTime: 0, perfectStreaks: 0, rapidGuessPenalty: 0 }
  })

  // Stores IDs of questions already answered to avoid repeats
  const [history, setHistory] = useState<Set<string>>(new Set())
  const questionStartTime = useRef<number>(Date.now())

  // Initial Setup
  useEffect(() => {
    if (authLoading) return
    if (!user) router.push('/login')
    if (userData?.onboardingCompleted !== true) router.push('/onboarding')
  }, [user, userData, authLoading, router])

  const startDiagnostic = () => {
    setPhase('testing')
    pickNextQuestion()
  }

  // Adaptive Selection Engine
  const pickNextQuestion = () => {
    // 1. Determine eligible subjects
    const userSubjects = userData?.subjects || []
    const eligibleBanks = userSubjects.length > 0
      ? userSubjects.map((s: string) => ADAPTIVE_BANK[s]).filter(Boolean)
      : [GENERAL_BANK] // Fallback

    // Flatten into one pool
    const pool = eligibleBanks.flat().concat(GENERAL_BANK)

    // 2. Filter out unseen
    const unseen = pool.filter(q => !history.has(q.id))

    if (unseen.length === 0 || questionIndex >= 7) {
      setPhase('analyzing')
      setTimeout(() => setPhase('complete'), 3000) // Fake "crunching numbers" delay
      return
    }

    // 3. Find best match for current level
    // We want difficulty within +/- 2 of user's current level
    const targetDifficulty = stats.generalLevel

    const bestMatch = unseen.reduce((prev, curr) => {
      const prevDiff = Math.abs(prev.difficulty - targetDifficulty)
      const currDiff = Math.abs(curr.difficulty - targetDifficulty)
      return currDiff < prevDiff ? curr : prev
    })

    setCurrentQuestion(bestMatch)
    setHistory(prev => new Set(prev).add(bestMatch.id))
    setQuestionIndex(prev => prev + 1)
    questionStartTime.current = Date.now()
  }

  const handleAnswer = (answerIndex: number) => {
    if (!currentQuestion) return

    const endTime = Date.now()
    const responseTime = (endTime - questionStartTime.current) / 1000

    const snapshot: PerformanceSnapshot = {
      correct: answerIndex === currentQuestion.correctAnswer,
      responseTime,
      questionDifficulty: currentQuestion.difficulty,
      tags: currentQuestion.tags
    }

    // Update Algorithm
    const updatedStats = updateSkillMetrics(stats, snapshot)
    setStats(updatedStats)

    // Move next
    pickNextQuestion()
  }

  // Render: Intro
  if (phase === 'ready') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <BrightLayer variant="elevated" padding="lg" className="text-center max-w-md w-full">
          <div className="text-6xl mb-6">⚡</div>
          <BrightHeading level={2} className="mb-4">Calibration Mode</BrightHeading>
          <p className="text-[var(--text-secondary)] mb-8">
            This quiz adapts to you in real-time. If you get one right, it gets harder.
            Don&apos;t worry if you miss some — that&apos;s how we find your edge.
          </p>
          <BrightButton onClick={startDiagnostic} size="lg" className="w-full">
            Begin Calibration
          </BrightButton>
        </BrightLayer>
      </div>
    )
  }

  // Render: Analyzing
  if (phase === 'analyzing') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="text-6xl mb-8"
        >
          ⚙️
        </motion.div>
        <BrightHeading level={2} className="mb-2">Tuning Algorithm...</BrightHeading>
        <p className="text-[var(--text-muted)] animate-pulse">Analyzing response times & logic patterns</p>
      </div>
    )
  }

  // Render: Complete
  if (phase === 'complete') {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 relative overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-2xl"
        >
          <BrightLayer variant="elevated" padding="lg" className="text-center">
            <div className="text-6xl mb-8">🎯</div>
            <BrightHeading level={2} className="mb-6">
              Optimal Level Found: {stats.generalLevel.toFixed(1)}
            </BrightHeading>

            <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl mb-8">
              <div className="flex justify-between text-sm font-bold text-[var(--text-muted)] mb-2">
                <span>Novice</span>
                <span>Expert</span>
              </div>
              <div className="h-4 bg-[var(--bg-primary)] rounded-full overflow-hidden relative">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.generalLevel * 10}%` }}
                  transition={{ duration: 1.5, ease: "circOut" }}
                  className="h-full bg-gradient-to-r from-blue-500 to-[var(--brand-primary)]"
                />
              </div>
              We&apos;ve unlocked the <strong>{stats.generalLevel > 6 ? 'Advanced' : 'Foundational'}</strong> learning path based on your performance.
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
                  localStorage.setItem('brighted_diagnostic_complete', 'true')
                  localStorage.setItem('onboarding_status', 'complete')
                  router.push('/home')
                } catch (error) {
                  console.error('Failed to save:', error)
                }
              }}
              className="w-full"
              size="lg"
            >
              Enter Learning Hub
            </BrightButton>
          </BrightLayer>
        </motion.div>
      </div>
    )
  }

  // Render: Testing (Question)
  if (!currentQuestion) return null

  const progress = (questionIndex / 8) * 100 // 8 max questions

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4 pb-20 safe-padding">

      <div className="w-full max-w-2xl mb-8">
        <div className="flex justify-between items-center mb-2 px-1">
          <span className="text-xs font-black uppercase tracking-widest text-[var(--brand-primary)]">Adaptive Difficulty: {currentQuestion.difficulty}/10</span>
          <span className="text-xs font-bold text-[var(--text-muted)]">Q{questionIndex}</span>
        </div>
        <div className="duo-progress-bar">
          <motion.div
            animate={{ width: `${progress}%` }}
            className="duo-progress-fill"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion.id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="w-full max-w-2xl"
        >
          <BrightLayer variant="elevated" padding="lg" className="min-h-[400px] flex flex-col justify-center">
            <BrightHeading level={2} className="mb-10 leading-tight">
              {currentQuestion.question}
            </BrightHeading>

            <div className="grid gap-4">
              {currentQuestion.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAnswer(idx)}
                  className="duo-card w-full text-left py-5 px-6 font-bold hover:bg-[var(--bg-secondary)] active:scale-[0.98] flex items-center gap-4 transition-all"
                >
                  <div className="w-8 h-8 rounded-lg bg-[var(--bg-primary)] border-2 border-[var(--border-subtle)] flex items-center justify-center text-xs">
                    {String.fromCharCode(65 + idx)}
                  </div>
                  {opt}
                </button>
              ))}
            </div>
          </BrightLayer>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
