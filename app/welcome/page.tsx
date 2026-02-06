'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { BrightHeading, BrightButton, BrightLayer } from '@/components/system'
import { useAuth } from '@/lib/auth-context'
import { doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
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

const EXAM_TYPES = [
    { id: 'csec', name: 'CSEC', desc: 'Caribbean Secondary Education Certificate', icon: '📚' },
    { id: 'cape', name: 'CAPE', desc: 'Caribbean Advanced Proficiency Examination', icon: '🎓' },
]

// Schools data imported from JSON
import schoolsData from '@/data/schools.json'
const COUNTRIES = Object.keys(schoolsData) as (keyof typeof schoolsData)[]

const PROFICIENCY_LEVELS = [
    { id: '1', label: "I'm new to this", desc: "Starting from ground zero", icon: '🌱' },
    { id: '2', label: "I know some basics", desc: "I can handle simple concepts", icon: '🌿' },
    { id: '3', label: "I'm intermediate", desc: "I understand core theories", icon: '🌳' },
    { id: '4', label: "I'm advanced", desc: "I'm ready for exam-style challenges", icon: '🚀' },
]

type NotificationStatus = 'default' | 'granted' | 'denied' | 'unsupported' | 'skipped'

const NOTIFICATION_PERKS = [
    {
        id: 'streaks',
        title: 'Streak reminders',
        description: 'Quick nudges from Professor Bright to keep your momentum alive.',
        pose: 'owl-wink'
    },
    {
        id: 'missions',
        title: 'New missions',
        description: 'Get notified when fresh challenges and lessons drop.',
        pose: 'owl-idea'
    },
    {
        id: 'tips',
        title: 'Exam tips',
        description: 'Short bursts of prep help before big assessment days.',
        pose: 'owl-smart'
    }
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
    <header className="fixed top-0 left-0 w-full bg-[var(--bg-primary)]/90 backdrop-blur-md z-50 px-6 py-4 flex items-center justify-center border-b-2 border-[var(--border-subtle)]">
        <div className="max-w-5xl w-full flex items-center gap-4">
            <div className="flex items-center gap-2 mr-2">
                <MascotOwl pose="owl-happy" size="sm" />
                <span className="font-heading font-extrabold text-xl text-[var(--brand-secondary)] tracking-tighter hidden sm:block">BrightEd</span>
            </div>

            {onBack && (
                <button onClick={onBack} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                </button>
            )}
            <div className="flex-1 h-4 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                <motion.div
                    className="h-full bg-[var(--brand-secondary)]"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                    style={{ boxShadow: '0 4px 0 rgba(0,0,0,0.1) inset' }}
                />
            </div>
            <button className="text-[var(--text-muted)] hover:text-[var(--text-secondary)] font-bold uppercase tracking-widest text-xs ml-4">
                Help
            </button>
        </div>
    </header>
)

const StepSubjectSelection = ({ selected, onToggle, onNext }: { selected: string[], onToggle: (id: string) => void, onNext: () => void }) => (
    <div className="max-w-4xl mx-auto pt-28 pb-32">
        <div className="flex flex-col items-center gap-4 mb-10">
            <MascotOwl pose="owl-happy" size="md" />
            <h1 className="text-3xl font-extrabold text-[var(--text-primary)] text-center">I want to learn...</h1>
            <p className="text-[var(--text-secondary)] font-bold">Pick one or more subjects to get started!</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 px-4">
            {SUBJECTS.map((s) => {
                const isSelected = selected.includes(s.id);
                return (
                    <button
                        key={s.id}
                        onClick={() => onToggle(s.id)}
                        className={`relative p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 active:translate-y-1 group ${isSelected
                            ? 'border-[var(--brand-secondary)] bg-[var(--brand-secondary)]/10 text-[var(--brand-secondary)]'
                            : 'border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:border-[var(--brand-secondary)]/50 text-[var(--text-secondary)]'
                            }`}
                        style={{ boxShadow: isSelected ? 'none' : '0 4px 0 var(--border-subtle)' }}
                    >
                        <span className="text-4xl group-hover:scale-110 transition-transform">{s.icon}</span>
                        <span className="font-bold text-base text-center">{s.name}</span>
                        {isSelected && (
                            <div className="absolute top-2 right-2 bg-[var(--brand-secondary)] text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                                ✓
                            </div>
                        )}
                    </button>
                )
            })}
        </div>

        <div className="fixed bottom-0 left-0 w-full bg-[var(--bg-primary)] border-t-2 border-[var(--border-subtle)] p-6 flex justify-center z-50">
            <button
                onClick={onNext}
                disabled={selected.length === 0}
                className="max-w-md w-full bg-[var(--brand-secondary)] hover:bg-[#4f46e5] text-white font-extrabold py-4 rounded-2xl border-b-4 border-[#4338ca] active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 tracking-widest uppercase shadow-lg shadow-indigo-500/10"
            >
                CONTINUE
            </button>
        </div>
    </div>
)

const StepNotifications = ({
    status,
    onEnable,
    onContinue
}: {
    status: NotificationStatus
    onEnable: () => void
    onContinue: () => void
}) => {
    const statusCopy = {
        default: {
            label: 'Optional',
            detail: 'We only send the good stuff: streaks, missions, and exam nudges.'
        },
        granted: {
            label: 'Enabled',
            detail: 'You&apos;re all set! Expect friendly reminders and mission updates.'
        },
        denied: {
            label: 'Blocked',
            detail: 'No worries - you can enable notifications in your browser settings later.'
        },
        unsupported: {
            label: 'Unavailable',
            detail: 'This browser doesn&apos;t support push notifications yet.'
        },
        skipped: {
            label: 'Skipped',
            detail: 'You can always turn notifications on from your profile settings.'
        }
    } as const

    const statusStyles: Record<NotificationStatus, string> = {
        default: 'bg-[var(--brand-secondary)]/10 text-[var(--brand-secondary)] border-[var(--brand-secondary)]/30',
        granted: 'bg-emerald-50 text-emerald-600 border-emerald-200',
        denied: 'bg-red-50 text-red-500 border-red-200',
        unsupported: 'bg-slate-100 text-slate-500 border-slate-200',
        skipped: 'bg-amber-50 text-amber-600 border-amber-200'
    }

    return (
        <div className="max-w-5xl mx-auto pt-28 pb-32">
            <div className="flex flex-col items-center gap-6 text-center mb-12 px-4">
                <MascotOwl pose={status === 'granted' ? 'owl-magic' : 'owl-idea'} size="lg" />
                <div>
                    <h1 className="text-3xl font-extrabold text-[var(--text-primary)]">Turn on push notifications</h1>
                    <p className="text-[var(--text-secondary)] font-bold mt-3 max-w-xl">
                        Get streak reminders, exam alerts, and quick tips - just enough to keep you moving.
                    </p>
                </div>
                <div className={`px-4 py-2 rounded-full border-2 text-xs font-black uppercase tracking-widest ${statusStyles[status]}`}>
                    {statusCopy[status].label}
                </div>
                <p className="text-[var(--text-muted)] font-bold text-sm max-w-md">
                    {statusCopy[status].detail}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-6 px-4">
                <div className="space-y-4">
                    {NOTIFICATION_PERKS.map((perk) => (
                        <div
                            key={perk.id}
                            className="flex items-start gap-4 rounded-3xl border-2 border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-5 shadow-sm"
                        >
                            <div className="bg-[var(--brand-secondary)]/10 rounded-2xl p-2">
                                <MascotOwl pose={perk.pose} size="sm" />
                            </div>
                            <div>
                                <p className="text-lg font-extrabold text-[var(--text-primary)]">{perk.title}</p>
                                <p className="text-[var(--text-secondary)] font-bold">{perk.description}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="relative rounded-3xl border-2 border-[var(--border-subtle)] bg-[var(--bg-elevated)] p-6 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                            <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                            <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                        </div>
                        <span>Browser Prompt</span>
                    </div>

                    <div className="mt-6 flex items-start gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-[var(--brand-secondary)]/10 flex items-center justify-center">
                            <MascotOwl pose="owl-thinking" size="sm" />
                        </div>
                        <div>
                            <p className="text-base font-extrabold text-[var(--text-primary)]">BrightEd wants to send notifications</p>
                            <p className="text-sm font-bold text-[var(--text-secondary)]">Click Allow to get streak nudges and mission drops.</p>
                        </div>
                    </div>

                    <div className="mt-6 flex items-center justify-end gap-3">
                        <button className="px-4 py-2 rounded-xl border-2 border-[var(--border-subtle)] text-[var(--text-secondary)] font-bold bg-[var(--bg-secondary)]">
                            Block
                        </button>
                        <div className="relative">
                            <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest text-[var(--brand-secondary)]">
                                Click Allow
                            </div>
                            <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-[var(--brand-secondary)] animate-ping" />
                            <button className="px-5 py-2 rounded-xl bg-[var(--brand-secondary)] text-white font-extrabold border-b-4 border-[#4338ca]">
                                Allow
                            </button>
                        </div>
                    </div>

                    <div className="absolute -bottom-8 -right-6 opacity-70">
                        <MascotOwl pose="owl-wink" size="sm" />
                    </div>
                </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center px-4">
                <button
                    onClick={onEnable}
                    disabled={status === 'granted' || status === 'unsupported'}
                    className="max-w-md w-full sm:w-auto bg-[var(--brand-secondary)] hover:bg-[#4f46e5] text-white font-extrabold py-4 px-8 rounded-2xl border-b-4 border-[#4338ca] active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed tracking-widest uppercase shadow-lg shadow-indigo-500/10"
                >
                    {status === 'granted' ? 'Notifications Enabled' : 'Enable Notifications'}
                </button>
                <button
                    onClick={onContinue}
                    className="max-w-md w-full sm:w-auto bg-[var(--bg-elevated)] text-[var(--text-secondary)] font-extrabold py-4 px-8 rounded-2xl border-2 border-[var(--border-subtle)] hover:border-[var(--brand-secondary)]/50 active:translate-y-1 transition-all tracking-widest uppercase"
                >
                    Continue
                </button>
            </div>
        </div>
    )
}

const StepSourceSelection = ({ onSelect }: { onSelect: (id: string) => void }) => (
    <div className="max-w-2xl mx-auto pt-28">
        <div className="flex flex-col items-center gap-6 mb-12">
            <MascotOwl pose="owl-smart" size="lg" />
            <div className="bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] rounded-2xl p-6 relative shadow-sm max-w-sm">
                <p className="font-extrabold text-[var(--text-primary)] text-xl text-center">How did you hear about BrightEd?</p>
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[var(--bg-elevated)] border-l-2 border-b-2 border-[var(--border-subtle)] rotate-45" />
            </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-4">
            {SOURCES.map((s) => (
                <button
                    key={s.id}
                    onClick={() => onSelect(s.id)}
                    className="p-5 rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-secondary)] flex items-center gap-4 transition-all active:translate-y-1 border-b-4 font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] group"
                >
                    <span className="text-3xl group-hover:scale-110 transition-transform">{s.icon}</span>
                    <span className="text-lg">{s.name}</span>
                </button>
            ))}
        </div>
    </div>
)

const StepExamSelection = ({ onSelect }: { onSelect: (id: string) => void }) => (
    <div className="max-w-2xl mx-auto pt-28">
        <div className="flex flex-col items-center gap-6 mb-12">
            <MascotOwl pose="owl-studying" size="lg" />
            <div className="bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] rounded-2xl p-6 relative shadow-sm max-w-sm">
                <p className="font-extrabold text-[var(--text-primary)] text-xl text-center">What exam are you preparing for?</p>
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[var(--bg-elevated)] border-l-2 border-b-2 border-[var(--border-subtle)] rotate-45" />
            </div>
        </div>
        <div className="flex flex-col gap-4 px-4">
            {EXAM_TYPES.map((e) => (
                <button
                    key={e.id}
                    onClick={() => onSelect(e.id)}
                    className="p-6 rounded-3xl border-2 border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-secondary)] flex items-center gap-6 transition-all active:translate-y-1 border-b-4 text-left group"
                >
                    <span className="text-4xl group-hover:scale-110 transition-transform">{e.icon}</span>
                    <div>
                        <p className="font-extrabold text-[var(--text-primary)] text-xl">{e.name}</p>
                        <p className="text-[var(--text-secondary)] font-bold">{e.desc}</p>
                    </div>
                </button>
            ))}
        </div>
    </div>
)

const FORM_LEVELS = [
    { id: '1', label: 'Form 1' },
    { id: '2', label: 'Form 2' },
    { id: '3', label: 'Form 3' },
    { id: '4', label: 'Form 4' },
    { id: '5', label: 'Form 5' },
    { id: '6L', label: 'Lower 6' },
    { id: '6U', label: 'Upper 6' },
]

const StepFormSelection = ({ onSelect }: { onSelect: (id: string) => void }) => (
    <div className="max-w-2xl mx-auto pt-28">
        <div className="flex flex-col items-center gap-6 mb-12">
            <MascotOwl pose="owl-thinking" size="lg" />
            <div className="bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] rounded-2xl p-6 relative shadow-sm max-w-sm">
                <p className="font-extrabold text-[var(--text-primary)] text-xl text-center">Which form are you in?</p>
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[var(--bg-elevated)] border-l-2 border-b-2 border-[var(--border-subtle)] rotate-45" />
            </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 px-4">
            {FORM_LEVELS.map((f) => (
                <button
                    key={f.id}
                    onClick={() => onSelect(f.id)}
                    className="p-6 rounded-3xl border-2 border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-secondary)] flex flex-col items-center justify-center transition-all active:translate-y-1 border-b-4 group"
                >
                    <span className="text-xl font-extrabold text-[var(--text-primary)]">{f.label}</span>
                </button>
            ))}
        </div>
    </div>
)

const StepSchoolSelection = ({
    selectedCountry,
    selectedSchool,
    onCountryChange,
    onSchoolChange,
    onNext
}: {
    selectedCountry: string,
    selectedSchool: string,
    onCountryChange: (c: string) => void,
    onSchoolChange: (s: string) => void,
    onNext: () => void
}) => {
    const schools = selectedCountry ? (schoolsData as Record<string, string[]>)[selectedCountry] || [] : []
    const [searchTerm, setSearchTerm] = useState('')
    const filteredSchools = schools.filter(s => s.toLowerCase().includes(searchTerm.toLowerCase()))

    return (
        <div className="max-w-2xl mx-auto pt-28 pb-32">
            <div className="flex flex-col items-center gap-6 mb-8">
                <MascotOwl pose="owl-thinking" size="lg" />
                <div className="bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] rounded-2xl p-6 relative shadow-sm max-w-sm">
                    <p className="font-extrabold text-[var(--text-primary)] text-xl text-center">What school do you attend?</p>
                    <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[var(--bg-elevated)] border-l-2 border-b-2 border-[var(--border-subtle)] rotate-45" />
                </div>
            </div>

            <div className="px-4 space-y-6">
                {/* Country Selection */}
                <div>
                    <label className="block text-sm font-bold text-[var(--text-muted)] mb-2 uppercase tracking-widest">Country</label>
                    <select
                        value={selectedCountry}
                        onChange={(e) => { onCountryChange(e.target.value); onSchoolChange(''); setSearchTerm('') }}
                        className="w-full p-4 rounded-2xl bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] text-[var(--text-primary)] font-bold focus:border-[var(--brand-secondary)] focus:outline-none transition-colors"
                    >
                        <option value="">Select your country...</option>
                        {COUNTRIES.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                {/* School Selection */}
                {selectedCountry && (
                    <div>
                        <label className="block text-sm font-bold text-[var(--text-muted)] mb-2 uppercase tracking-widest">School</label>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search for your school..."
                            className="w-full p-4 rounded-2xl bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] text-[var(--text-primary)] font-bold focus:border-[var(--brand-secondary)] focus:outline-none transition-colors mb-3"
                        />
                        <div className="max-h-64 overflow-y-auto rounded-2xl border-2 border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
                            {filteredSchools.map((school) => (
                                <button
                                    key={school}
                                    onClick={() => { onSchoolChange(school); setSearchTerm(school) }}
                                    className={`w-full p-4 text-left font-bold transition-colors border-b border-[var(--border-subtle)] last:border-b-0 ${selectedSchool === school
                                        ? 'bg-[var(--brand-secondary)]/10 text-[var(--brand-secondary)]'
                                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                                        }`}
                                >
                                    {school}
                                    {selectedSchool === school && <span className="float-right">✓</span>}
                                </button>
                            ))}
                            {filteredSchools.length === 0 && (
                                <div className="p-4 text-center text-[var(--text-muted)] font-bold">No schools found</div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-[var(--bg-primary)] border-t-2 border-[var(--border-subtle)] p-6 flex justify-center z-50">
                <button
                    onClick={onNext}
                    disabled={!selectedSchool}
                    className="max-w-md w-full bg-[var(--brand-secondary)] hover:bg-[#4f46e5] text-white font-extrabold py-4 rounded-2xl border-b-4 border-[#4338ca] active:border-b-0 active:translate-y-1 transition-all disabled:opacity-50 tracking-widest uppercase shadow-lg shadow-indigo-500/10"
                >
                    CONTINUE
                </button>
            </div>
        </div>
    )
}

const StepProficiency = ({ subject, onSelect }: { subject: string, onSelect: (id: string) => void }) => (
    <div className="max-w-2xl mx-auto pt-28">
        <div className="flex flex-col items-center gap-6 mb-12">
            <MascotOwl pose="owl-reading" size="lg" />
            <div className="bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] rounded-2xl p-6 relative shadow-sm max-w-sm">
                <p className="font-extrabold text-[var(--text-primary)] text-xl text-center">How much <span className="text-[var(--brand-secondary)]">{subject}</span> do you know?</p>
                <div className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 bg-[var(--bg-elevated)] border-l-2 border-b-2 border-[var(--border-subtle)] rotate-45" />
            </div>
        </div>
        <div className="flex flex-col gap-4 px-4">
            {PROFICIENCY_LEVELS.map((l) => (
                <button
                    key={l.id}
                    onClick={() => onSelect(l.id)}
                    className="p-6 rounded-3xl border-2 border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-secondary)] flex items-center gap-6 transition-all active:translate-y-1 border-b-4 text-left group"
                >
                    <span className="text-4xl group-hover:scale-110 transition-transform">{l.icon}</span>
                    <div>
                        <p className="font-extrabold text-[var(--text-primary)] text-lg">{l.label}</p>
                        <p className="text-[var(--text-secondary)] font-bold">{l.desc}</p>
                    </div>
                </button>
            ))}
        </div>
    </div>
)

const StepPlacement = ({ onChoice }: { onChoice: () => void }) => (
    <div className="max-w-2xl mx-auto pt-28 text-center px-4">
        <MascotOwl pose="owl-happy" size="md" />
        <h1 className="text-3xl font-extrabold text-[var(--text-primary)] mt-6 mb-4">Now let&apos;s find the best place to start!</h1>
        <p className="text-[var(--text-secondary)] font-bold mb-12 text-lg">We&apos;ll do a quick evaluation with easy questions to calibrate your learning path.</p>

        <div className="flex flex-col gap-6 max-w-md mx-auto">
            <button
                onClick={onChoice}
                className="group p-8 rounded-3xl border-2 border-[var(--border-subtle)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-secondary)] flex items-center gap-8 transition-all active:translate-y-1 border-b-4 text-left"
            >
                <div className="w-16 h-16 bg-[var(--brand-secondary)]/10 rounded-2xl flex items-center justify-center text-4xl group-hover:scale-110 transition-transform">🚀</div>
                <div>
                    <h3 className="text-xl font-extrabold text-[var(--text-primary)]">Start Evaluation</h3>
                    <p className="text-[var(--text-secondary)] font-bold">Begin with simple questions to find your level.</p>
                </div>
            </button>
        </div>
    </div>
)

// --- Navigation Layout Wrapper ---

function WelcomeContent() {
    const router = useRouter()
    const { user } = useAuth()
    const searchParams = useSearchParams()
    const [isMounted, setIsMounted] = useState(false)
    
    useEffect(() => {
        setIsMounted(true)
    }, [])
    
    const step = isMounted ? ((searchParams && searchParams.get('step')) || 'selection') : 'selection'
    const profIndex = isMounted ? parseInt((searchParams && searchParams.get('si')) || '0') : 0

    const [selectedSubjects, setSelectedSubjects] = useState<string[]>(() => {
        const subs = isMounted ? searchParams?.get('subjects') : null
        return subs ? subs.split(',').filter(Boolean) : []
    })
    const [examType, setExamType] = useState<string | null>(() =>
        isMounted ? searchParams?.get('exam') || null : null
    )
    const [selectedCountry, setSelectedCountry] = useState<string>(() =>
        isMounted ? searchParams?.get('country') || '' : ''
    )
    const [selectedSchool, setSelectedSchool] = useState<string>(() =>
        isMounted ? searchParams?.get('school') || '' : ''
    )
    const [source, setSource] = useState<string | null>(() =>
        isMounted ? searchParams?.get('source') || null : null
    )
    const [formLevel, setFormLevel] = useState<string | null>(() =>
        isMounted ? searchParams?.get('form') || null : null
    )
    const [notificationStatus, setNotificationStatus] = useState<NotificationStatus>('default')
    const [proficiencies, setProficiencies] = useState<Record<string, string>>(() => {
        try {
            const lvls = isMounted ? searchParams?.get('lvls') : null
            return lvls ? JSON.parse(lvls) : {}
        } catch (e) {
            return {}
        }
    })

    const toggleSubject = (id: string) => {
        setSelectedSubjects(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        )
    }

    const nextStep = (next: string, extraParams?: Record<string, string>) => {
        const params = new URLSearchParams(searchParams?.toString() || '')
        params.set('step', next)
        if (selectedSubjects.length > 0) {
            params.set('subjects', selectedSubjects.join(','))
        }
        if (extraParams) {
            Object.entries(extraParams).forEach(([k, v]) => params.set(k, v))
        }
        router.push(`/welcome?${params.toString()}`)
    }

    // Sync state from URL params on load/change
    useEffect(() => {
        if (typeof window === 'undefined') return
        if (!('Notification' in window)) {
            setNotificationStatus('unsupported')
            return
        }
        setNotificationStatus(Notification.permission)
    }, [])

    useEffect(() => {
        const subjectsParam = searchParams?.get('subjects')
        if (subjectsParam) {
            const subs = subjectsParam.split(',')
            if (JSON.stringify(subs) !== JSON.stringify(selectedSubjects)) {
                setSelectedSubjects(subs)
            }
        }

        const lvlsParam = searchParams?.get('lvls')
        if (lvlsParam) {
            try {
                const parsed = JSON.parse(lvlsParam)
                if (JSON.stringify(parsed) !== JSON.stringify(proficiencies)) {
                    setProficiencies(parsed)
                }
            } catch (e) {
                console.error("Failed to parse lvls from URL", e)
            }
        }

        const sourceParam = searchParams?.get('source')
        if (sourceParam && sourceParam !== source) {
            setSource(sourceParam)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams])

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

    const requestNotificationPermission = async () => {
        if (typeof window === 'undefined') return
        if (!('Notification' in window)) {
            setNotificationStatus('unsupported')
            return
        }
        const permission = await Notification.requestPermission()
        setNotificationStatus(permission)
    }

    const onComplete = async (to: string, finalNotificationStatus: NotificationStatus = notificationStatus) => {
        await logMetadata()

        // If user is already logged in, update their profile
        if (user) {
            try {
                await updateDoc(doc(db, 'users', user.uid), {
                    subjects: selectedSubjects,
                    examTrack: examType || 'CSEC',
                    country: selectedCountry || 'Trinidad and Tobago',
                    school: selectedSchool || null,
                    formLevel: formLevel || '3',
                    source: source || 'other',
                    proficiencies: proficiencies,
                    notificationPermission: finalNotificationStatus,
                    onboardingCompleted: true,
                    onboardingCompletedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                })
            } catch (err) {
                console.error('Failed to update user profile:', err)
            }
        }

        const params = new URLSearchParams()
        params.set('subjects', selectedSubjects.join(','))
        if (examType) params.set('exam', examType)
        if (selectedCountry) params.set('country', selectedCountry)
        if (selectedSchool) params.set('school', selectedSchool)
        if (formLevel) params.set('form', formLevel)
        if (source) params.set('source', source)
        params.set('lvls', JSON.stringify(proficiencies))
        params.set('notify', finalNotificationStatus)

        if (user && to === '/welcome/diagnostic') {
            router.push(to)
            return
        }

        router.push(`${to}?${params.toString()}`)
    }

    // Determine progress
    const stepsOrder = ['selection', 'exam', 'school', 'form', 'source', 'proficiency', 'placement', 'notifications']
    const currentIndex = stepsOrder.indexOf(step)

    // Calculate total mini-steps if in proficiency
    let displayProgress = ((currentIndex) / stepsOrder.length) * 100
    if (step === 'proficiency') {
        const subProgress = (profIndex / selectedSubjects.length) / stepsOrder.length
        displayProgress += subProgress * 100
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)]">
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
                                onNext={() => nextStep('exam')}
                            />
                        )}
                        {step === 'exam' && (
                            <StepExamSelection
                                onSelect={(id) => {
                                    setExamType(id)
                                    nextStep('school', { exam: id })
                                }}
                            />
                        )}

                        {step === 'school' && (
                            <StepSchoolSelection
                                selectedCountry={selectedCountry}
                                selectedSchool={selectedSchool}
                                onCountryChange={setSelectedCountry}
                                onSchoolChange={setSelectedSchool}
                                onNext={() => nextStep('form', { country: selectedCountry, school: selectedSchool })}
                            />
                        )}
                        {step === 'form' && (
                            <StepFormSelection
                                onSelect={(id) => {
                                    setFormLevel(id)
                                    nextStep('source', { form: id })
                                }}
                            />
                        )}
                        {step === 'source' && (
                            <StepSourceSelection
                                onSelect={(id) => {
                                    setSource(id);
                                    nextStep('proficiency', { source: id })
                                }}
                            />
                        )}
                        {step === 'proficiency' && (
                            <StepProficiency
                                subject={selectedSubjects[profIndex] || "Learning"}
                                onSelect={(id) => {
                                    const subj = selectedSubjects[profIndex]
                                    const nextProficiencies = { ...proficiencies, [subj]: id }
                                    setProficiencies(nextProficiencies)

                                    if (profIndex < selectedSubjects.length - 1) {
                                        nextStep('proficiency', {
                                            si: (profIndex + 1).toString(),
                                            lvls: JSON.stringify(nextProficiencies)
                                        })
                                    } else {
                                        nextStep('placement', {
                                            lvls: JSON.stringify(nextProficiencies)
                                        })
                                    }
                                }}
                            />
                        )}
                        {step === 'placement' && (
                            <StepPlacement
                                onChoice={() => nextStep('notifications')}
                            />
                        )}
                        {step === 'notifications' && (
                            <StepNotifications
                                status={notificationStatus}
                                onEnable={requestNotificationPermission}
                                onContinue={() => {
                                    const finalStatus = notificationStatus === 'default' ? 'skipped' : notificationStatus
                                    setNotificationStatus(finalStatus)
                                    onComplete(user ? '/welcome/diagnostic' : '/signup', finalStatus)
                                }}
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
