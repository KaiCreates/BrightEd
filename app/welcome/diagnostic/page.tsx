'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { updateSkillMetrics, UserSkillStats, PerformanceSnapshot } from '@/lib/learning-algorithm'
import { BrightButton, BrightLayer, BrightHeading } from '@/components/system'
import { useAuth } from '@/lib/auth-context'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'

// --- Types & Definitions ---

interface DiagnosticQuestion {
    id: string
    question: string
    difficulty: number // 1-10
    tags: string[]
    options: string[]
    correctAnswer: number
}

const ADAPTIVE_BANK: Record<string, DiagnosticQuestion[]> = {
    Mathematics: [
        { id: 'm_easy_1', difficulty: 2, tags: ['math'], question: 'What is the sum of 1/4 and 1/2?', options: ['3/4', '2/6', '1/6', '1/8'], correctAnswer: 0 },
        { id: 'm_med_1', difficulty: 5, tags: ['math', 'geometry'], question: 'If the radius of a circle is 7, what is its approximate circumference? (Use π ≈ 22/7)', options: ['22', '44', '154', '49'], correctAnswer: 1 },
        { id: 'm_hard_1', difficulty: 8, tags: ['math', 'algebra'], question: 'Simplify: (x^2 - 4) / (x + 2)', options: ['x + 2', 'x - 2', 'x^2', '4'], correctAnswer: 1 },
    ],
    'Principles of Business': [
        { id: 'pob_easy_1', difficulty: 3, tags: ['business'], question: 'Which is a primary function of management?', options: ['Planning', 'Manufacturing', 'Spending', 'Competing'], correctAnswer: 0 },
        { id: 'pob_med_1', difficulty: 6, tags: ['business', 'marketing'], question: 'The "Four Ps" of marketing are Product, Price, Place, and:', options: ['Personnel', 'Promotion', 'Packaging', 'Profit'], correctAnswer: 1 },
        { id: 'pob_hard_1', difficulty: 9, tags: ['business', 'logistics'], question: 'A document allowing a buyer to take possession of goods before payment is:', options: ['Invoice', 'Bill of Lading', 'Credit Note', 'Debit Note'], correctAnswer: 1 },
    ],
    'Principles of Accounts': [
        { id: 'poa_easy_1', difficulty: 3, tags: ['accounts'], question: 'The accounting equation is: Assets = Liabilities + ___', options: ['Expenses', 'Capital', 'Revenue', 'Drawings'], correctAnswer: 1 },
        { id: 'poa_med_1', difficulty: 6, tags: ['accounts'], question: 'Which account usually has a debit balance?', options: ['Accounts Payable', 'Sales', 'Rent Expense', 'Bank Loan'], correctAnswer: 2 },
    ],
    'Information Technology': [
        { id: 'it_easy_1', difficulty: 3, tags: ['it'], question: 'What does HTTP stand for?', options: ['High Tech Text Protocol', 'HyperText Transfer Protocol', 'Helpful Tool Transfer Process', 'Hyper Transfer Text Path'], correctAnswer: 1 },
        { id: 'it_med_1', difficulty: 6, tags: ['it', 'programming'], question: 'In programming, a logic error is also known as a:', options: ['Syntax Error', 'Runtime Error', 'Semantic Bug', 'Hardware Failure'], correctAnswer: 2 },
        { id: 'it_hard_1', difficulty: 9, tags: ['it', 'networking'], question: 'Which layer of the OSI model is responsible for IP addressing?', options: ['Data Link', 'Transport', 'Network', 'Physical'], correctAnswer: 2 },
    ],
    'English A': [
        { id: 'eng_easy_1', difficulty: 3, tags: ['english'], question: 'Select the correctly spelled word:', options: ['Accomodate', 'Accommodate', 'Acommodate', 'Acomodate'], correctAnswer: 1 },
        { id: 'eng_med_1', difficulty: 6, tags: ['english'], question: 'What is the "Thesis Statement" of an essay?', options: ['The conclusion', 'The central argument', 'A summary of facts', 'A list of references'], correctAnswer: 1 },
    ],
    'Physics': [
        { id: 'phy_med_1', difficulty: 5, tags: ['physics'], question: 'Power is defined as the rate of doing:', options: ['Force', 'Work', 'Velocity', 'Acceleration'], correctAnswer: 1 },
        { id: 'phy_hard_1', difficulty: 8, tags: ['physics'], question: 'What is the SI unit of Magnetic Flux?', options: ['Tesla', 'Weber', 'Henry', 'Farad'], correctAnswer: 1 },
    ],
    'Chemistry': [
        { id: 'chem_med_1', difficulty: 6, tags: ['chemistry'], question: 'What is the pH of a neutral solution?', options: ['1', '14', '7', '0'], correctAnswer: 2 },
    ],
    Biology: [
        { id: 'bio_med_1', difficulty: 6, tags: ['biology'], question: 'Which organelle is responsible for cellular respiration?', options: ['Ribosome', 'Mitochondria', 'Golgi Body', 'Lysosome'], correctAnswer: 1 },
    ],
}

const GENERAL_BANK: DiagnosticQuestion[] = [
    { id: 'g_1', difficulty: 4, tags: ['logic'], question: 'Sequence: 2, 4, 8, 16, ...', options: ['24', '30', '32', '64'], correctAnswer: 2 },
    { id: 'g_2', difficulty: 6, tags: ['logic'], question: 'If All A are B, and some B are C...', options: ['All A are C', 'Some A are C', 'No A are C', 'Cannot determine'], correctAnswer: 3 },
]

const MascotOwl = ({ pose = 'owl-happy', size = 'sm' }: { pose?: string, size?: 'sm' | 'md' | 'lg' }) => {
    const sizes = { sm: 48, md: 96, lg: 192 }
    const pixels = sizes[size]

    const poses: Record<string, number> = {
        'owl-happy': 0, 'owl-relieved': 1, 'owl-shocked': 2, 'owl-sad-rain': 3,
        'owl-thinking': 4, 'owl-sad-cloud': 5, 'owl-idea': 6, 'owl-smart': 7,
        'owl-wink': 8, 'owl-confused': 9, 'owl-reading': 10, 'owl-studying': 11,
        'owl-sleeping': 12, 'owl-magic': 13, 'owl-zzz': 14, 'owl-bored': 15
    }
    const index = poses[pose] || 0
    const row = Math.floor(index / 4)
    const col = index % 4

    const posX = (col * 100) / 3
    const posY = (row * 100) / 3

    return (
        <div
            style={{
                width: `${pixels}px`,
                height: `${pixels}px`,
                backgroundImage: "url('/professor-bright-sprite.png')",
                backgroundSize: '400% 400%',
                backgroundPosition: `${posX}% ${posY}%`,
                imageRendering: 'pixelated',
                flexShrink: 0
            }}
            className="shrink-0"
        />
    )
}

// --- Main Components ---

function DiagnosticContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { user, userData } = useAuth()
    const [isMounted, setIsMounted] = useState(false)
    
    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Params from Welcome Flow, fallback to user data
    const subjects = userData?.subjects || (isMounted ? searchParams?.get('subjects')?.split(',') : []) || []
    const source = userData?.source || (isMounted ? searchParams?.get('source') : '') || ''
    const lvlsStr = isMounted ? searchParams?.get('lvls') || '{}' : '{}'
    const lvls = userData?.proficiencies || JSON.parse(lvlsStr)

    // State
    const [phase, setPhase] = useState<'ready' | 'testing' | 'analyzing' | 'complete'>('ready')
    const [currentQuestion, setCurrentQuestion] = useState<DiagnosticQuestion | null>(null)
    const [questionIndex, setQuestionIndex] = useState(0)
    const [stats, setStats] = useState<UserSkillStats>({
        generalLevel: 1.0, // Start from scratch (easiest)
        consistency: 0.5,
        topicMastery: {},
        behavioralSignals: { avgResponseTime: 0, perfectStreaks: 0, rapidGuessPenalty: 0 }
    })

    const [history, setHistory] = useState<Set<string>>(new Set())
    const questionStartTime = useRef<number>(Date.now())

    const startDiagnostic = () => {
        setPhase('testing')
        pickNextQuestion()
    }

    const pickNextQuestion = () => {
        // Determine eligible subjects (only those in the ADAPTIVE_BANK)
        const eligibleBanks = subjects.map((s: string) => ADAPTIVE_BANK[s]).filter(Boolean)
        const pool = eligibleBanks.flat().concat(GENERAL_BANK)
        const unseen = pool.filter(q => !history.has(q.id))

        if (unseen.length === 0 || questionIndex >= 10) {
            setPhase('analyzing')
            setTimeout(() => setPhase('complete'), 3000)
            return
        }

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

        const updatedStats = updateSkillMetrics(stats, snapshot)
        setStats(updatedStats)
        pickNextQuestion()
    }

    const handleComplete = async () => {
        const mastery = Math.max(0.1, Math.min(1, stats.generalLevel / 10))
        const params = new URLSearchParams()
        params.set('subjects', subjects.join(','))
        params.set('source', source)
        params.set('lvls', lvls)
        params.set('diag_stats', JSON.stringify(stats))
        params.set('mastery', mastery.toString())

        if (user) {
            // Save to Firestore since user is logged in
            try {
                await updateDoc(doc(db, 'users', user.uid), {
                    mastery,
                    diagnosticStats: stats,
                    diagnosticCompleted: true,
                    diagnosticCompletedAt: new Date().toISOString(),
                })
            } catch (e) {
                console.error("Failed to save diag results:", e)
            }
            router.push('/home')
        } else {
            // Fallback for unexpected session loss
            router.push(`/home`)
        }
    }

    if (phase === 'ready') {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
                <div className="text-center max-w-md w-full flex flex-col items-center gap-8">
                    <MascotOwl pose="owl-idea" size="lg" />
                    <div>
                        <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mb-4">Quick Evaluation</h1>
                        <p className="text-[var(--text-secondary)] font-bold mb-8">
                            This short evaluation helps us find the perfect starting point for you.
                            If it seems easy at first, don&apos;t worry—it&apos;s just calibrating!
                        </p>
                    </div>
                    <button
                        onClick={startDiagnostic}
                        className="w-full bg-[var(--brand-secondary)] hover:bg-[#4f46e5] text-white font-extrabold py-4 rounded-2xl border-b-4 border-[#4338ca] active:border-b-0 active:translate-y-1 transition-all tracking-widest uppercase shadow-lg shadow-indigo-500/10"
                    >
                        START EVALUATION
                    </button>
                </div>
            </div>
        )
    }

    if (phase === 'analyzing') {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4">
                <div className="animate-spin-slow mb-8">
                    <MascotOwl pose="owl-thinking" size="lg" />
                </div>
                <h2 className="text-3xl font-extrabold text-[var(--text-primary)] mb-2">Finding your level...</h2>
                <p className="text-[var(--text-secondary)] font-bold animate-pulse">Personalizing your learning path</p>
            </div>
        )
    }

    if (phase === 'complete') {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
                <div className="text-center max-w-2xl w-full flex flex-col items-center gap-10">
                    <MascotOwl pose="owl-happy" size="lg" />
                    <div>
                        <h2 className="text-4xl font-extrabold text-[var(--text-primary)] mb-2">Evaluation Complete!</h2>
                        <p className="text-[var(--text-secondary)] font-bold text-xl uppercase tracking-widest">Recommended Level: {stats.generalLevel.toFixed(1)}/10</p>
                    </div>

                    <div className="w-full bg-[var(--bg-elevated)] p-8 rounded-3xl border-2 border-[var(--border-subtle)]">
                        <div className="flex justify-between text-xs font-black text-[var(--text-muted)] uppercase tracking-tighter mb-3">
                            <span>Novice</span>
                            <span>Expert</span>
                        </div>
                        <div className="h-6 bg-[var(--bg-secondary)] rounded-full overflow-hidden relative border-b-4 border-[var(--border-subtle)]">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${stats.generalLevel * 10}%` }}
                                transition={{ duration: 1.5, ease: "circOut" }}
                                className="h-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)]"
                            />
                        </div>
                        <p className="mt-6 text-[var(--text-secondary)] font-bold">
                            We&apos;ve unlocked the <strong>{stats.generalLevel > 6 ? 'Advanced' : 'Foundational'}</strong> learning path based on your performance.
                        </p>
                    </div>

                    <button
                        onClick={handleComplete}
                        className="w-full bg-[var(--brand-secondary)] hover:bg-[#4f46e5] text-white font-extrabold py-5 rounded-2xl border-b-4 border-[#4338ca] active:border-b-0 active:translate-y-1 transition-all tracking-widest uppercase shadow-lg shadow-indigo-500/10"
                    >
                        GO TO DASHBOARD
                    </button>
                </div>
            </div>
        )
    }

    if (!currentQuestion) return null

    const progress = (questionIndex / 10) * 100

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center p-6 pt-36">
            <div className="w-full max-w-2xl mb-12">
                <div className="flex justify-between items-end mb-3">
                    <div className="flex items-center gap-3">
                        <MascotOwl pose="owl-reading" size="sm" />
                        <span className="text-xs font-black uppercase tracking-widest text-[var(--brand-secondary)]">
                            Difficulty: {currentQuestion.difficulty}/10
                        </span>
                    </div>
                    <span className="text-sm font-black text-slate-300 uppercase">Step {questionIndex}/10</span>
                </div>
                <div className="h-4 bg-[var(--bg-secondary)] rounded-full overflow-hidden border-b-2 border-[var(--border-subtle)]">
                    <motion.div
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-[var(--brand-secondary)]"
                        style={{ boxShadow: '0 4px 0 rgba(0,0,0,0.1) inset' }}
                    />
                </div>
            </div>

            <AnimatePresence mode="wait">
                <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="w-full max-w-2xl"
                >
                    <div className="bg-[var(--bg-elevated)] rounded-3xl p-8 mb-10 min-h-[160px] flex items-center justify-center border-2 border-[var(--border-subtle)] shadow-sm relative">
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-[var(--bg-elevated)] border-r-2 border-b-2 border-[var(--border-subtle)] rotate-45" />
                        <h2 className="text-3xl font-extrabold text-[var(--text-primary)] text-center leading-tight">
                            {currentQuestion.question}
                        </h2>
                    </div>

                    <div className="grid gap-4">
                        {currentQuestion.options.map((opt, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                className="w-full text-left py-6 px-8 rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-secondary)] hover:border-[var(--brand-secondary)]/50 active:translate-y-1 border-b-4 flex items-center gap-6 group transition-all"
                            >
                                <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] border-2 border-[var(--border-subtle)] flex items-center justify-center font-black text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
                                    {String.fromCharCode(65 + idx)}
                                </div>
                                <span className="text-xl font-extrabold text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{opt}</span>
                            </button>
                        ))}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

export default function DiagnosticPageWrapper() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400 font-bold">Loading...</div>}>
            <DiagnosticContent />
        </Suspense>
    )
}
