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
        { id: 'm_easy_1', difficulty: 2, tags: ['math', 'arithmetic'], question: 'Solve: 15 - (3 × 2)', options: ['24', '9', '6', '12'], correctAnswer: 1 },
        { id: 'm_easy_2', difficulty: 3, tags: ['math', 'algebra'], question: 'If x + 5 = 12, what is x?', options: ['5', '7', '17', '60'], correctAnswer: 1 },
        { id: 'm_med_1', difficulty: 5, tags: ['math', 'fractions'], question: 'Which is largest?', options: ['1/2', '3/5', '4/9', '0.55'], correctAnswer: 1 },
        { id: 'm_med_2', difficulty: 6, tags: ['math', 'geometry'], question: 'Area of a triangle with base 10 and height 5?', options: ['50', '25', '15', '100'], correctAnswer: 1 },
        { id: 'm_hard_1', difficulty: 8, tags: ['math', 'functions'], question: 'f(x) = 2x + 1. Find f(f(2)).', options: ['5', '11', '9', '10'], correctAnswer: 1 },
        { id: 'm_hard_2', difficulty: 9, tags: ['math', 'trigonometry'], question: 'sin(90°) = ?', options: ['0', '1', '0.5', 'Undefined'], correctAnswer: 1 },
    ],
    'Principles of Business': [
        { id: 'pob_easy_1', difficulty: 2, tags: ['business', 'types'], question: 'In a sole proprietorship, the owner has:', options: ['Unlimited Liability', 'No Liability', 'Shared Liability', 'State Liability'], correctAnswer: 0 },
        { id: 'pob_med_1', difficulty: 5, tags: ['business', 'management'], question: 'Which of these is a democratic leadership style?', options: ['Autocratic', 'Participative', 'Laissez-faire', 'Dictatorial'], correctAnswer: 1 },
        { id: 'pob_hard_1', difficulty: 8, tags: ['business', 'finance'], question: 'The Working Capital ratio is calculated as:', options: ['Assets - Liabilities', 'Current Assets / Current Liabilities', 'Gross Profit / Sales', 'Debt / Equity'], correctAnswer: 1 },
    ],
    Economics: [
        { id: 'eco_easy_1', difficulty: 3, tags: ['economics', 'scarcity'], question: 'The basic economic problem is:', options: ['Inflation', 'Scarcity', 'Unemployment', 'Taxes'], correctAnswer: 1 },
        { id: 'eco_med_1', difficulty: 6, tags: ['economics', 'market'], question: 'In a perfectly competitive market, products are:', options: ['Unique', 'Homogeneous', 'Branded', 'Expensive'], correctAnswer: 1 },
        { id: 'eco_hard_1', difficulty: 9, tags: ['economics', 'macro'], question: 'Fiscal policy primarily involves changes in:', options: ['Interest rates', 'Money supply', 'Govt spending & tax', 'Exchange rates'], correctAnswer: 2 },
    ],
    'Information Technology': [
        { id: 'it_easy_1', difficulty: 2, tags: ['it', 'hardware'], question: 'Which is an example of an input device?', options: ['Monitor', 'Printer', 'Mouse', 'Speaker'], correctAnswer: 2 },
        { id: 'it_med_1', difficulty: 5, tags: ['it', 'data'], question: 'How many bits make up 1 Byte?', options: ['8', '1024', '4', '1'], correctAnswer: 0 },
        { id: 'it_hard_1', difficulty: 8, tags: ['it', 'programming'], question: 'Which of the following is NOT a high-level language?', options: ['Python', 'Java', 'Assembly', 'C++'], correctAnswer: 2 },
    ],
    'English A': [
        { id: 'eng_easy_1', difficulty: 2, tags: ['english', 'grammar'], question: 'Choose the correct verb: "The team __ winning the game."', options: ['is', 'are', 'were', 'have'], correctAnswer: 0 },
        { id: 'eng_med_1', difficulty: 5, tags: ['english', 'vocab'], question: 'What is a synonym for "Benevolent"?', options: ['Cruel', 'Kind', 'Wealthy', 'Gloomy'], correctAnswer: 1 },
        { id: 'eng_hard_1', difficulty: 8, tags: ['english', 'analysis'], question: 'In literature, "Tone" refers to:', options: ['The writer\'s attitude', 'The volume of speech', 'The sentence structure', 'The plot sequence'], correctAnswer: 0 },
    ],
    Biology: [
        { id: 'bio_easy_1', difficulty: 2, tags: ['biology', 'cells'], question: 'Which part of the cell is known as the "control center"?', options: ['Cell Wall', 'Cytoplasm', 'Nucleus', 'Vacuole'], correctAnswer: 2 },
        { id: 'bio_med_1', difficulty: 5, tags: ['biology', 'transport'], question: 'The movement of water through a semi-permeable membrane is called:', options: ['Diffusion', 'Osmosis', 'Active Transport', 'Evaporation'], correctAnswer: 1 },
        { id: 'bio_hard_1', difficulty: 8, tags: ['biology', 'environment'], question: 'Which gas is primarily responsible for the Greenhouse Effect?', options: ['Oxygen', 'Nitrogen', 'Carbon Dioxide', 'Helium'], correctAnswer: 2 },
    ],
    'Social Studies': [
        { id: 'soc_easy_1', difficulty: 2, tags: ['social', 'family'], question: 'A family consisting of parents and their children is a:', options: ['Extended Family', 'Nuclear Family', 'Single-parent Family', 'Blended Family'], correctAnswer: 1 },
        { id: 'soc_med_1', difficulty: 5, tags: ['social', 'regional'], question: 'One of the main objectives of CARICOM is:', options: ['Individual defense', 'Economic cooperation', 'Language uniformity', 'Visual arts promotion'], correctAnswer: 1 },
        { id: 'soc_hard_1', difficulty: 8, tags: ['social', 'development'], question: 'Sustainable development is best defined as:', options: ['Rapid industrialization', 'Meeting current needs without compromising the future', 'Maximizing resource extraction', 'Stopping all urban growth'], correctAnswer: 1 },
    ],
    'English B': [
        { id: 'engb_easy_1', difficulty: 2, tags: ['englishb', 'literary'], question: 'Attributing human qualities to non-human things is called:', options: ['Metaphor', 'Simile', 'Personification', 'Irony'], correctAnswer: 2 },
        { id: 'engb_med_1', difficulty: 5, tags: ['englishb', 'literary'], question: 'A direct comparison using "is" or "was" (e.g., "Life is a journey") is a:', options: ['Simile', 'Metaphor', 'Oxymoron', 'Onomatopoeia'], correctAnswer: 1 },
        { id: 'engb_hard_1', difficulty: 8, tags: ['englishb', 'drama'], question: 'When the audience knows more than the characters, it is called:', options: ['Situational Irony', 'Verbal Irony', 'Dramatic Irony', 'Paradox'], correctAnswer: 2 },
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
    const { user } = useAuth()

    // Params from Welcome Flow
    const subjects = searchParams?.get('subjects')?.split(',') || []
    const source = searchParams?.get('source') || ''
    const lvls = searchParams?.get('lvls') || '{}'

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
            // Save to Firestore if logged in (unlikely in this flow, but good for safety)
            try {
                await updateDoc(doc(db, 'users', user.uid), {
                    mastery,
                    diagnosticStats: stats,
                    diagnosticCompleted: true,
                    diagnosticCompletedAt: new Date().toISOString(),
                })
                router.push('/home')
            } catch (e) {
                console.error(e)
                router.push(`/signup?${params.toString()}`)
            }
        } else {
            router.push(`/signup?${params.toString()}`)
        }
    }

    if (phase === 'ready') {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center max-w-md w-full flex flex-col items-center gap-8">
                    <MascotOwl pose="owl-idea" size="lg" />
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-700 mb-4">Quick Evaluation</h1>
                        <p className="text-slate-400 font-bold mb-8">
                            This short evaluation helps us find the perfect starting point for you.
                            If it seems easy at first, don't worry—it's just calibrating!
                        </p>
                    </div>
                    <button
                        onClick={startDiagnostic}
                        className="w-full bg-[var(--state-success)] hover:bg-green-600 text-white font-extrabold py-4 rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all tracking-widest uppercase shadow-lg shadow-green-100"
                    >
                        START EVALUATION
                    </button>
                </div>
            </div>
        )
    }

    if (phase === 'analyzing') {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
                <div className="animate-spin-slow mb-8">
                    <MascotOwl pose="owl-thinking" size="lg" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-700 mb-2">Finding your level...</h2>
                <p className="text-slate-400 font-bold animate-pulse">Personalizing your learning path</p>
            </div>
        )
    }

    if (phase === 'complete') {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center p-4">
                <div className="text-center max-w-2xl w-full flex flex-col items-center gap-10">
                    <MascotOwl pose="owl-happy" size="lg" />
                    <div>
                        <h2 className="text-4xl font-extrabold text-slate-700 mb-2">Evaluation Complete!</h2>
                        <p className="text-slate-400 font-bold text-xl uppercase tracking-widest">Recommended Level: {stats.generalLevel.toFixed(1)}/10</p>
                    </div>

                    <div className="w-full bg-slate-50 p-8 rounded-3xl border-2 border-slate-100">
                        <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-tighter mb-3">
                            <span>Novice</span>
                            <span>Expert</span>
                        </div>
                        <div className="h-6 bg-slate-200 rounded-full overflow-hidden relative border-b-4 border-slate-300">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${stats.generalLevel * 10}%` }}
                                transition={{ duration: 1.5, ease: "circOut" }}
                                className="h-full bg-gradient-to-r from-blue-400 to-[var(--brand-primary)]"
                            />
                        </div>
                        <p className="mt-6 text-slate-500 font-bold">
                            We've unlocked the <strong>{stats.generalLevel > 6 ? 'Advanced' : 'Foundational'}</strong> learning path based on your performance.
                        </p>
                    </div>

                    <button
                        onClick={handleComplete}
                        className="w-full bg-[var(--brand-primary)] hover:bg-blue-600 text-white font-extrabold py-5 rounded-2xl border-b-4 border-blue-700 active:border-b-0 active:translate-y-1 transition-all tracking-widest uppercase shadow-lg shadow-blue-100"
                    >
                        CREATE PROFILE TO SAVE RESULTS
                    </button>
                </div>
            </div>
        )
    }

    if (!currentQuestion) return null

    const progress = (questionIndex / 10) * 100

    return (
        <div className="min-h-screen bg-white flex flex-col items-center p-6 pt-20">
            <div className="w-full max-w-2xl mb-12">
                <div className="flex justify-between items-end mb-3">
                    <div className="flex items-center gap-3">
                        <MascotOwl pose="owl-reading" size="sm" />
                        <span className="text-xs font-black uppercase tracking-widest text-[var(--brand-primary)]">
                            Difficulty: {currentQuestion.difficulty}/10
                        </span>
                    </div>
                    <span className="text-sm font-black text-slate-300 uppercase">Step {questionIndex}/10</span>
                </div>
                <div className="h-4 bg-slate-100 rounded-full overflow-hidden border-b-2 border-slate-200">
                    <motion.div
                        animate={{ width: `${progress}%` }}
                        className="h-full bg-[var(--state-success)]"
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
                    <div className="bg-white rounded-3xl p-8 mb-10 min-h-[160px] flex items-center justify-center border-2 border-slate-100 shadow-sm relative">
                        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-white border-r-2 border-b-2 border-slate-100 rotate-45" />
                        <h2 className="text-3xl font-extrabold text-slate-700 text-center leading-tight">
                            {currentQuestion.question}
                        </h2>
                    </div>

                    <div className="grid gap-4">
                        {currentQuestion.options.map((opt, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(idx)}
                                className="w-full text-left py-6 px-8 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 active:translate-y-1 border-b-4 flex items-center gap-6 group transition-all"
                            >
                                <div className="w-10 h-10 rounded-xl bg-slate-50 border-2 border-slate-100 flex items-center justify-center font-black text-slate-400 group-hover:text-slate-600 transition-colors">
                                    {String.fromCharCode(65 + idx)}
                                </div>
                                <span className="text-xl font-extrabold text-slate-600 group-hover:text-slate-800 transition-colors">{opt}</span>
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
