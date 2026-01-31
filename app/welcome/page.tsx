'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { BrightHeading, BrightButton, BrightLayer } from '@/components/system'
import Link from 'next/link'

// --- Definitions ---

const SUBJECTS = [
    { id: 'Mathematics', name: 'Mathematics', icon: '📐' },
    { id: 'English A', name: 'English A', icon: '📖' },
    { id: 'English B', name: 'English B', icon: '🎭' },
    { id: 'Principles of Business', name: 'Principles of Business', icon: '💼' },
    { id: 'Principles of Accounts', name: 'Principles of Accounts', icon: '📊' },
    { id: 'Social Studies', name: 'Social Studies', icon: '🌍' },
    { id: 'Spanish', name: 'Spanish', icon: '🇪🇸' },
    { id: 'French', name: 'French', icon: '🇫🇷' },
    { id: 'Geography', name: 'Geography', icon: '🗺️' },
    { id: 'Theatre Arts', name: 'Theatre Arts', icon: '🎭' },
    { id: 'Music', name: 'Music', icon: '🎵' },
    { id: 'Information Technology', name: 'Information Technology', icon: '💻' },
    { id: 'Physics', name: 'Physics', icon: '⚛️' },
    { id: 'Chemistry', name: 'Chemistry', icon: '🧪' },
    { id: 'Biology', name: 'Biology', icon: '🧬' },
    { id: 'Economics', name: 'Economics', icon: '📈' },
    { id: 'History', name: 'History', icon: '📜' },
    { id: 'Physical Education', name: 'Physical Education', icon: '⚽' },
]

const SOURCES = [
    { id: 'tiktok', name: 'TikTok', icon: '📱' },
    { id: 'google', name: 'Google Search', icon: '🔍' },
    { id: 'friends', name: 'Friends/Family', icon: '🤝' },
    { id: 'youtube', name: 'YouTube', icon: '📺' },
    { id: 'social', name: 'Facebook/Instagram', icon: '🤳' },
    { id: 'news', name: 'News/Blog', icon: '📰' },
    { id: 'other', name: 'Other', icon: '✨' },
]

const PROFICIENCY_LEVELS = [
    { id: '1', label: "I'm new to this", desc: "Starting from ground zero", icon: '🌱' },
    { id: '2', label: "I know some basics", desc: "I can handle simple concepts", icon: '🌿' },
    { id: '3', label: "I'm intermediate", desc: "I understand core theories", icon: '🌳' },
    { id: '4', label: "I'm advanced", desc: "I'm ready for exam-style challenges", icon: '🚀' },
]

// --- Sub-Components (Steps) ---

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

const StepHeader = ({ progress, onBack }: { progress: number, onBack?: () => void }) => (
    <header className="fixed top-0 left-0 w-full bg-white z-50 px-6 py-4 flex items-center justify-center border-b-2 border-slate-100">
        <div className="max-w-5xl w-full flex items-center gap-4">
            <div className="flex items-center gap-2 mr-2">
                <MascotOwl pose="owl-happy" size="sm" />
                <span className="font-heading font-extrabold text-xl text-[var(--state-success)] tracking-tighter hidden sm:block">BrightEd</span>
            </div>

            {onBack && (
                <button onClick={onBack} className="text-slate-400 hover:text-slate-600 transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                </button>
            )}
            <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-[var(--state-success)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                    style={{ boxShadow: '0 4px 0 rgba(0,0,0,0.1) inset' }}
                />
            </div>
            <button className="text-slate-300 hover:text-slate-500 font-bold uppercase tracking-widest text-xs ml-4">
                Help
            </button>
        </div>
    </header>
)

const StepSubjectSelection = ({ selected, onToggle, onNext }: { selected: string[], onToggle: (id: string) => void, onNext: () => void }) => (
    <div className="max-w-4xl mx-auto pt-28 pb-32">
        <div className="flex flex-col items-center gap-4 mb-10">
            <MascotOwl pose="owl-happy" size="md" />
            <h1 className="text-3xl font-extrabold text-slate-700 text-center">I want to learn...</h1>
            <p className="text-slate-400 font-bold">Pick one or more subjects to get started!</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-4">
            {SUBJECTS.map((s) => {
                const isSelected = selected.includes(s.id);
                return (
                    <button
                        key={s.id}
                        onClick={() => onToggle(s.id)}
                        className={`relative p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 active:translate-y-1 group ${isSelected
                            ? 'border-[var(--brand-primary)] bg-blue-50 text-blue-700'
                            : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                            }`}
                        style={{ boxShadow: isSelected ? 'none' : '0 4px 0 #e2e8f0' }}
                    >
                        <span className="text-4xl group-hover:scale-110 transition-transform">{s.icon}</span>
                        <span className="font-bold text-base text-center">{s.name}</span>
                        {isSelected && (
                            <div className="absolute top-2 right-2 bg-[var(--brand-primary)] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                ✓
                            </div>
                        )}
                    </button>
                )
            })}
        </div>

        <div className="fixed bottom-0 left-0 w-full bg-white border-t-2 border-slate-100 p-6 flex justify-center z-50">
            <button
                onClick={onNext}
                disabled={selected.length === 0}
                className="max-w-md w-full bg-[var(--state-success)] hover:bg-green-600 text-white font-extrabold py-4 rounded-2xl border-b-4 border-green-700 active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 tracking-widest uppercase shadow-lg shadow-green-100"
            >
                CONTINUE
            </button>
        </div>
    </div>
)

const StepSourceSelection = ({ onSelect }: { onSelect: (id: string) => void }) => (
    <div className="max-w-2xl mx-auto pt-28">
        <div className="flex flex-col items-center gap-6 mb-12">
            <MascotOwl pose="owl-smart" size="lg" />
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 relative shadow-sm max-w-sm">
                <p className="font-extrabold text-slate-700 text-xl text-center">How did you hear about BrightEd?</p>
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-l-2 border-b-2 border-slate-200 rotate-45" />
            </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4">
            {SOURCES.map((s) => (
                <button
                    key={s.id}
                    onClick={() => onSelect(s.id)}
                    className="p-5 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-4 transition-all active:translate-y-1 border-b-4 font-bold text-slate-600 hover:text-slate-900 group"
                >
                    <span className="text-3xl group-hover:scale-110 transition-transform">{s.icon}</span>
                    <span className="text-lg">{s.name}</span>
                </button>
            ))}
        </div>
    </div>
)

const StepProficiency = ({ subject, onSelect }: { subject: string, onSelect: (id: string) => void }) => (
    <div className="max-w-2xl mx-auto pt-28">
        <div className="flex flex-col items-center gap-6 mb-12">
            <MascotOwl pose="owl-reading" size="lg" />
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 relative shadow-sm max-w-sm">
                <p className="font-extrabold text-slate-700 text-xl text-center">How much <span className="text-[var(--brand-primary)]">{subject}</span> do you know?</p>
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-l-2 border-b-2 border-slate-200 rotate-45" />
            </div>
        </div>
        <div className="flex flex-col gap-4 px-4">
            {PROFICIENCY_LEVELS.map((l) => (
                <button
                    key={l.id}
                    onClick={() => onSelect(l.id)}
                    className="p-6 rounded-3xl border-2 border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-6 transition-all active:translate-y-1 border-b-4 text-left group"
                >
                    <span className="text-4xl group-hover:scale-110 transition-transform">{l.icon}</span>
                    <div>
                        <p className="font-extrabold text-slate-700 text-lg">{l.label}</p>
                        <p className="text-slate-400 font-bold">{l.desc}</p>
                    </div>
                </button>
            ))}
        </div>
    </div>
)

const StepPlacement = ({ onChoice }: { onChoice: (type: 'scratch') => void }) => (
    <div className="max-w-2xl mx-auto pt-28 text-center px-4">
        <MascotOwl pose="owl-happy" size="md" />
        <h1 className="text-3xl font-extrabold text-slate-700 mt-6 mb-4">Now let's find the best place to start!</h1>
        <p className="text-slate-400 font-bold mb-12 text-lg">We'll do a quick evaluation with easy questions to calibrate your learning path.</p>

        <div className="flex flex-col gap-6 max-w-md mx-auto">
            <button
                onClick={() => onChoice('scratch')}
                className="group p-8 rounded-3xl border-2 border-slate-200 bg-white hover:bg-slate-50 flex items-center gap-8 transition-all active:translate-y-1 border-b-4 text-left"
            >
                <div className="w-16 h-16 bg-[var(--brand-primary)]/10 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">🚀</div>
                <div>
                    <h3 className="text-xl font-extrabold text-slate-700">Start Evaluation</h3>
                    <p className="text-slate-400 font-bold">Begin with simple questions to find your level.</p>
                </div>
            </button>
        </div>
    </div>
)

// --- Navigation Layout Wrapper ---

function WelcomeContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const step = (searchParams && searchParams.get('step')) || 'selection'
    const profIndex = parseInt((searchParams && searchParams.get('si')) || '0')

    // Local state for results
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([])
    const [source, setSource] = useState<string | null>(null)
    const [proficiencies, setProficiencies] = useState<Record<string, string>>({})

    const toggleSubject = (id: string) => {
        setSelectedSubjects(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        )
    }

    const nextStep = (next: string) => {
        router.push(`/welcome?step=${next}`)
    }

    const goBack = () => {
        router.back()
    }

    const logMetadata = async () => {
        try {
            await fetch('/api/metadata', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subjects: selectedSubjects,
                    source,
                    proficiencies,
                    timestamp: new Date().toISOString()
                })
            })
        } catch (err) {
            console.error('Failed to log metadata:', err)
        }
    }

    const onComplete = async (to: string) => {
        await logMetadata()

        const params = new URLSearchParams()
        params.set('subjects', selectedSubjects.join(','))
        if (source) params.set('source', source)
        // For the next steps (diagnostic/signup), we might just send the first subject as "current" 
        // or a consolidated level. For now, let's just pass the data.
        params.set('lvls', JSON.stringify(proficiencies))

        router.push(`${to}?${params.toString()}`)
    }

    // Determine progress
    const stepsOrder = ['selection', 'source', 'proficiency', 'placement']
    const currentIndex = stepsOrder.indexOf(step)

    // Calculate total mini-steps if in proficiency
    let displayProgress = ((currentIndex) / stepsOrder.length) * 100
    if (step === 'proficiency') {
        const subProgress = (profIndex / selectedSubjects.length) / stepsOrder.length
        displayProgress += subProgress * 100
    }

    return (
        <div className="min-h-screen bg-white">
            <StepHeader progress={displayProgress} onBack={currentIndex > 0 ? goBack : undefined} />

            <main className="p-6">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={step + (step === 'proficiency' ? profIndex : '')}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {step === 'selection' && (
                            <StepSubjectSelection
                                selected={selectedSubjects}
                                onToggle={toggleSubject}
                                onNext={() => nextStep('source')}
                            />
                        )}
                        {step === 'source' && (
                            <StepSourceSelection
                                onSelect={(id) => { setSource(id); nextStep('proficiency') }}
                            />
                        )}
                        {step === 'proficiency' && (
                            <StepProficiency
                                subject={selectedSubjects[profIndex] || "Learning"}
                                onSelect={(id) => {
                                    const subj = selectedSubjects[profIndex]
                                    setProficiencies(prev => ({ ...prev, [subj]: id }))
                                    if (profIndex < selectedSubjects.length - 1) {
                                        router.push(`/welcome?step=proficiency&si=${profIndex + 1}`)
                                    } else {
                                        nextStep('placement')
                                    }
                                }}
                            />
                        )}
                        {step === 'placement' && (
                            <StepPlacement
                                onChoice={() => onComplete('/welcome/diagnostic')}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </main>
        </div>
    )
}

export default function WelcomePage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400 font-bold">Loading...</div>}>
            <WelcomeContent />
        </Suspense>
    )
}
