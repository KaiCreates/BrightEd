'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, useInView } from 'framer-motion'
import Image from 'next/image'
import { getTotalXP } from '@/lib/xp-tracker'
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system'
import { useAuth } from '@/lib/auth-context'
import { SocialHubProvider } from '@/lib/social-hub-context'
import { SocialHub } from '@/components/social/SocialHub'

export default function HomePage() {
    const router = useRouter()
    const { user, userData, loading: authLoading } = useAuth()
    const [learningPath, setLearningPath] = useState<any[]>([])
    const socialHubRef = useRef<HTMLDivElement>(null)
    const isInView = useInView(socialHubRef, { once: false, margin: '-100px' })

    useEffect(() => {
        if (authLoading) return

        if (!user) {
            router.push('/landing')
            return
        }

        // Fetch Learning Path Preview (Real-time data comes from userData)
        // Use AbortController to prevent duplicate calls
        const abortController = new AbortController();
        const subjects = userData?.subjectProgress ? Object.keys(userData.subjectProgress) : []

        if (subjects.length > 0) {
            fetch('/api/learning-path?' + new URLSearchParams({
                subjects: subjects.join(',')
            }), {
                signal: abortController.signal,
                cache: 'force-cache' // Use browser cache
            })
                .then(res => res.json())
                .then(pathData => {
                    const allPaths = pathData.paths || {}
                    const preview: any[] = []

                    for (const [subject, objectives] of Object.entries(allPaths)) {
                        const subjectObjectives = objectives as any[]
                        if (subjectObjectives.length > 0) {
                            preview.push({
                                title: subjectObjectives[0].objective?.substring(0, 40) || `${subject} - Objective 1`,
                                subject: subject,
                                level: subjectObjectives[0].difficulty || 1,
                                objectiveId: subjectObjectives[0].id,
                                icon: getSubjectIcon(subject),
                                color: getSubjectColor(subject),
                                // Calculate actual progress from mastery data (0.1-10.0 scale -> 0-100%)
                                progress: userData?.subjectProgress?.[subject]
                                    ? Math.min(100, Math.round(((userData.subjectProgress[subject] || 0.1) / 10.0) * 100))
                                    : 0
                            })
                        }
                    }
                    setLearningPath(preview.slice(0, 3))
                })
                .catch((err) => {
                    // Ignore abort errors
                    if (err.name !== 'AbortError') {
                        // Silent fail - learning path is not critical
                    }
                })
        }

        return () => {
            abortController.abort();
        };

    }, [user, userData, authLoading, router])

    function getSubjectIcon(subject: string): string {
        const lower = subject.toLowerCase()
        if (lower.includes('math')) return '📐'
        if (lower.includes('business')) return '💼'
        if (lower.includes('economic')) return '📊'
        if (lower.includes('english')) return '📝'
        if (lower.includes('science') || lower.includes('biology') || lower.includes('chemistry')) return '🔬'
        if (lower.includes('social')) return '🌍'
        if (lower.includes('it') || lower.includes('information')) return '💻'
        return '📚'
    }

    function getSubjectColor(subject: string): string {
        const lower = subject.toLowerCase()
        if (lower.includes('math')) return 'bg-green-500'
        if (lower.includes('business')) return 'bg-purple-500'
        if (lower.includes('economic')) return 'bg-blue-500'
        if (lower.includes('english')) return 'bg-orange-500'
        if (lower.includes('science') || lower.includes('biology') || lower.includes('chemistry')) return 'bg-teal-500'
        if (lower.includes('social')) return 'bg-yellow-500'
        if (lower.includes('it') || lower.includes('information')) return 'bg-indigo-500'
        return 'bg-gray-500'
    }

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]" />
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-3 space-y-8">
                        {/* Welcome Card */}
                        <BrightLayer variant="glass" padding="none" className="p-8 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-primary)] opacity-[0.03] group-hover:opacity-[0.07] rounded-full blur-3xl transition-opacity" />

                            <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
                                <div>
                                    <BrightHeading level={1} className="mb-2 text-center md:text-left">
                                        Start your streak, {userData?.firstName || 'Student'}! 🚀
                                    </BrightHeading>
                                    <p className="text-[var(--text-secondary)] font-medium text-base md:text-lg text-center md:text-left">
                                        {learningPath.length > 0
                                            ? `Continue with ${learningPath[0]?.subject || 'your learning'}`
                                            : 'Complete simulations to earn XP and badges.'}
                                    </p>
                                </div>
                                <div className="relative w-32 h-32 md:w-40 md:h-40">
                                    <motion.div
                                        animate={{ y: [0, -10, 0], rotate: [0, 2, -2, 0] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                        className="relative w-full h-full"
                                    >
                                        <Image
                                            src="/BrightEdLogo.png"
                                            alt="BrightEd Owl"
                                            fill
                                            className="object-contain drop-shadow-2xl"
                                            priority
                                        />
                                    </motion.div>
                                </div>
                            </div>
                            <div className="mt-8 flex gap-4 flex-wrap">
                                <Link href="/learn" className="flex-1 min-w-[140px]">
                                    <BrightButton variant="primary" size="lg" className="w-full border-b-[6px] border-[#1F7A85] active:border-b-0 active:translate-y-[6px]">
                                        Continue Learning
                                    </BrightButton>
                                </Link>
                                {learningPath.length > 0 && (
                                    <Link
                                        href={`/simulate?objectiveId=${learningPath[0].objectiveId}&subject=${encodeURIComponent(learningPath[0].subject)}`}
                                        className="flex-1 min-w-[140px]"
                                    >
                                        <BrightButton variant="outline" size="lg" className="w-full border-b-[6px] active:border-b-2 active:translate-y-[4px]">
                                            Quick Practice
                                        </BrightButton>
                                    </Link>
                                )}
                            </div>
                        </BrightLayer>

                        {/* Learning Path Preview */}
                        {learningPath.length > 0 && (
                            <div>
                                <BrightHeading level={2} className="mb-6 pl-2">
                                    Your Learning Path
                                </BrightHeading>
                                <div className="space-y-4">
                                    {learningPath.map((skill, index) => (
                                        <Link
                                            key={index}
                                            href={`/simulate?objectiveId=${skill.objectiveId}&subject=${encodeURIComponent(skill.subject)}`}
                                        >
                                            <motion.div
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.2 + index * 0.1 }}
                                            >
                                                <BrightLayer variant="elevated" padding="md" className="group border-b-[6px] hover:border-[var(--brand-primary)] active:border-b-2 active:translate-y-[4px] cursor-pointer">
                                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6">
                                                        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl ${skill.color} flex items-center justify-center text-3xl sm:text-4xl shadow-inner text-white flex-shrink-0`}>
                                                            {skill.icon}
                                                        </div>
                                                        <div className="flex-1 w-full">
                                                            <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start mb-2 gap-2">
                                                                <h3 className="text-lg sm:text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors text-center sm:text-left">
                                                                    {skill.title}
                                                                </h3>
                                                                <span className="bg-[var(--brand-accent)] text-[var(--bg-primary)] text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                                                                    Level {skill.level}
                                                                </span>
                                                            </div>
                                                            <div className="w-full bg-[var(--bg-secondary)] rounded-full h-3 sm:h-4 overflow-hidden border border-[var(--border-subtle)]">
                                                                <div
                                                                    className={`h-full ${skill.color}`}
                                                                    style={{ width: `${Math.min(skill.progress || 0, 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <div className="hidden lg:block text-[var(--text-muted)] group-hover:text-[var(--brand-primary)] transition-colors self-center">
                                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </BrightLayer>
                                            </motion.div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Daily Goal */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <BrightLayer variant="elevated" padding="md" className="border-b-[6px] bg-[#0F172A]">
                                <div className="flex items-center justify-between mb-6">
                                    <BrightHeading level={3}>Daily Goal</BrightHeading>
                                    {userData?.streak && userData.streak > 0 && (
                                        <span className="text-[var(--brand-accent)] font-black text-sm">{userData.streak} day streak 🔥</span>
                                    )}
                                </div>
                                <div className="relative w-40 h-40 mx-auto">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="80" cy="80" r="70" stroke="var(--bg-secondary)" strokeWidth="12" fill="none" />
                                        <motion.circle
                                            cx="80" cy="80" r="70"
                                            stroke="var(--brand-accent)"
                                            strokeWidth="12"
                                            fill="none"
                                            strokeLinecap="round"
                                            initial={{ strokeDashoffset: 2 * Math.PI * 70 }}
                                            animate={{ strokeDashoffset: 2 * Math.PI * 70 * (1 - Math.min(1, (userData?.xp_today || 0) / (userData?.dailyGoal || 500))) }}
                                            transition={{ duration: 1 }}
                                            strokeDasharray={`${2 * Math.PI * 70}`}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-4xl font-black text-[var(--text-primary)]">
                                            {Math.round(((userData?.xp_today || 0) / (userData?.dailyGoal || 500)) * 100)}%
                                        </span>
                                        <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider">Complete</span>
                                    </div>
                                </div>
                            </BrightLayer>
                        </motion.div>

                        {/* XP Summary */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <BrightLayer variant="elevated" padding="md" className="border-b-[6px] bg-[#0F172A]">
                                <BrightHeading level={3} className="mb-4">Total XP</BrightHeading>
                                <div className="text-5xl font-mono font-black text-[var(--brand-primary)] mb-2 tracking-tighter">
                                    {(userData?.xp || 0).toLocaleString()}
                                </div>
                                <p className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wide">Experience points</p>
                            </BrightLayer>
                        </motion.div>
                    </div>
                </div>
            </div>

            {/* Scroll-to-Discover Transition */}
            <div className="w-full flex justify-center my-16">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1 }}
                    className="flex flex-col items-center gap-4"
                >
                    <p className="text-[var(--text-secondary)] font-medium">Scroll to discover</p>
                    <motion.div
                        animate={{ y: [0, 10, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                    >
                        <svg className="w-6 h-6 text-[var(--brand-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                        </svg>
                    </motion.div>
                </motion.div>
            </div>

            {/* Social Hub Section */}
            <div ref={socialHubRef} className="w-full py-16">
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                >
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="mb-8 text-center">
                            <BrightHeading level={2} className="mb-4">
                                Live Campus & Social Hub
                            </BrightHeading>
                            <p className="text-[var(--text-secondary)] font-medium text-lg">
                                Connect with peers, join subject lounges, and collaborate in real-time
                            </p>
                        </div>
                        <SocialHubProvider>
                            <SocialHub />
                        </SocialHubProvider>
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
