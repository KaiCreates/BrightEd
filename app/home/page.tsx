'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Image from 'next/image'
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system'
import { useAuth } from '@/lib/auth-context'
import { db } from '@/lib/firebase'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { ProfessorBrightMascot } from '@/components/learning'
import { FeedbackResponse } from '@/lib/professor-bright'
import { ALL_ACHIEVEMENTS, checkAchievement } from '@/lib/achievements'
import { resolveMasteryPercent } from '@/lib/user-stats'

export default function HomePage() {
    const router = useRouter()
    const { user, userData, loading: authLoading } = useAuth()
    const [learningPath, setLearningPath] = useState<any[]>([])
    const [welcomeText, setWelcomeText] = useState<string>('Keep Shining')
    const [mascotFeedback, setMascotFeedback] = useState<FeedbackResponse | null>(null)

    const [leaderPreview, setLeaderPreview] = useState<{
        xpTop: { name: string; value: number } | null
        streakTop: { name: string; value: number } | null
        topBusiness: { name: string; value: number } | null
        loading: boolean
    }>({ xpTop: null, streakTop: null, topBusiness: null, loading: true })

    const masteryPercent = resolveMasteryPercent(userData);

    const HOME_STATS = [
        { label: 'Mastery', value: masteryPercent.toString(), unit: '%', icon: '🧠', color: 'text-purple-500' },
        { label: 'Consistency', value: Math.round(userData?.consistency || 0).toString(), unit: '%', icon: '📈', color: 'text-blue-500' },
        { label: 'Streak', value: (userData?.streak || 0).toString(), unit: 'Days', icon: '🔥', color: 'text-orange-500' },
        { label: 'Wealth', value: (userData?.xp || 0).toLocaleString(), unit: 'Total', icon: '⚡', color: 'text-yellow-500' },
    ]

    const ACHIEVEMENT_PREVIEWS = ALL_ACHIEVEMENTS.slice(0, 4).map(ach => ({
        ...ach,
        unlocked: checkAchievement(ach, userData, leaderPreview.topBusiness?.value || 0),
        progress: 0 // We can add progress calculation logic later if needed
    }))

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            router.push('/')
            return
        }

        // Mascot Greeting
        const timer = setTimeout(() => {
            const streak = userData?.streak || 0
            const firstName = userData?.firstName || 'Explorer'

            setMascotFeedback({
                tone: 'encouraging',
                message: streak > 0
                    ? `Day ${streak}! Keep that fire burning, ${firstName}! 🔥`
                    : `Welcome back, ${firstName}! Ready to conquer the day? 🚀`,
                emoji: streak > 0 ? '🔥' : '👋',
                spriteClass: streak > 0 ? 'owl-magic' : 'owl-neutral'
            })
        }, 1500)

        // Fetch Learning Path Preview (Real-time data comes from userData)
        // Use AbortController to prevent duplicate calls
        const abortController = new AbortController();
        const subjects = userData?.subjectProgress ? Object.keys(userData.subjectProgress) : []

        if (subjects.length > 0) {
            // Get auth token for the API call
            user.getIdToken().then(token => {
                fetch('/api/learning-path?' + new URLSearchParams({
                    subjects: subjects.join(',')
                }), {
                    signal: abortController.signal,
                    cache: 'force-cache', // Use browser cache
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
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
                            console.error('Learning path error:', err);
                            // Silent fail - learning path is not critical
                        }
                    })
            }).catch(err => {
                console.error('Token error:', err);
            });
        }

        return () => {
            abortController.abort();
            clearTimeout(timer);
        };

    }, [user, userData, authLoading, router])

    useEffect(() => {
        if (authLoading) return
        if (!user) return

        let cancelled = false

        const load = async () => {
            setLeaderPreview((p) => ({ ...p, loading: true }))
            try {
                const token = await user.getIdToken()

                const [xpRes, streakRes, bizSnap] = await Promise.all([
                    fetch(`/api/leaderboards?` + new URLSearchParams({ type: 'xp', limit: '1' }), {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    fetch(`/api/leaderboards?` + new URLSearchParams({ type: 'streak', limit: '1' }), {
                        headers: { Authorization: `Bearer ${token}` },
                    }),
                    getDocs(query(collection(db, 'businesses'), orderBy('valuation', 'desc'), limit(1))),
                ])

                if (cancelled) return

                const [xpJson, streakJson] = await Promise.all([xpRes.json(), streakRes.json()])

                const xpEntry = (xpJson?.entries?.[0] as any) || null
                const streakEntry = (streakJson?.entries?.[0] as any) || null

                const topBizDoc = bizSnap.docs[0]
                const topBiz = topBizDoc ? topBizDoc.data() : null

                setLeaderPreview({
                    xpTop: xpEntry ? { name: String(xpEntry.name || 'Explorer'), value: Number(xpEntry.value || 0) } : null,
                    streakTop: streakEntry ? { name: String(streakEntry.name || 'Explorer'), value: Number(streakEntry.value || 0) } : null,
                    topBusiness: topBiz ? { name: String(topBiz.name || 'Business'), value: Number(topBiz.valuation || 0) } : null,
                    loading: false,
                })
            } catch {
                if (cancelled) return
                setLeaderPreview((p) => ({ ...p, loading: false }))
            }
        }

        load()
        return () => {
            cancelled = true
        }
    }, [authLoading, user])

    useEffect(() => {
        if (!user) return
        const options = [
            'Keep Shining',
            'You’ve Got This',
            'Let’s Level Up',
            'Today Is Yours',
            'Small Steps, Big Wins',
            'Stay Locked In',
            'Build Your Future',
            'Make Today Count',
        ]
        setWelcomeText(options[Math.floor(Math.random() * options.length)] || 'Keep Shining')
    }, [user])

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

    const dailyGoal = userData?.dailyGoal || 500
    const xpToday = userData?.xp_today || 0
    const dailyGoalPercent = dailyGoal > 0 ? Math.min(100, Math.round((xpToday / dailyGoal) * 100)) : 0
    const dailyGoalRemaining = Math.max(0, dailyGoal - xpToday)

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]" />
            </div>
        )
    }

    return (
        <div className="min-h-screen min-h-[100dvh] bg-[var(--bg-primary)] pb-24 safe-padding">
            <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-10">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 md:gap-8">
                    {/* Main Content Area */}
                    <div className="lg:col-span-3 space-y-12">
                        {/* Welcome Card */}
                        <BrightLayer variant="glass" padding="none" className="p-8 relative overflow-hidden group border-b-[8px] border-[var(--brand-primary)]">
                            <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--brand-primary)] opacity-[0.05] group-hover:opacity-[0.10] rounded-full blur-3xl transition-opacity animate-pulse-slow" />
                            <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-[var(--brand-accent)] opacity-[0.03] rounded-full blur-2xl" />

                            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                                <div className="max-w-xl">
                                    <div className="inline-flex items-center gap-2 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest mb-4">
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-primary)] opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--brand-primary)]"></span>
                                        </span>
                                        Live Status: Learning
                                    </div>
                                    <BrightHeading level={1} className="mb-4 text-center md:text-left leading-tight">
                                        {welcomeText}, <span className="text-[var(--brand-primary)]">{userData?.firstName || 'Explorer'}</span>! 🚀
                                    </BrightHeading>
                                    <p className="text-[var(--text-secondary)] font-medium text-lg md:text-xl text-center md:text-left mb-6 leading-relaxed">
                                        {learningPath.length > 0
                                            ? `You're crushing ${learningPath[0]?.subject}. Just ${dailyGoalRemaining} more XP to hit your daily goal!`
                                            : 'Your journey to financial mastery starts here. Ready for today\'s challenge?'}
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start w-full">
                                        <Link href="/learn" className="w-full sm:w-auto">
                                            <BrightButton variant="primary" size="lg" className="w-full sm:min-w-[180px] border-b-[6px] border-[#1F7A85] active:border-b-0 active:translate-y-[6px]">
                                                Resume Journey
                                            </BrightButton>
                                        </Link>
                                        <Link href="/leaderboard" className="w-full sm:w-auto">
                                            <BrightButton variant="outline" size="lg" className="w-full sm:min-w-[180px] border-b-[6px] active:border-b-2 active:translate-y-[4px]">
                                                View Rankings
                                            </BrightButton>
                                        </Link>
                                    </div>
                                </div>
                                <div className="relative w-48 h-48 md:w-56 md:h-56 lg:w-64 lg:h-64">
                                    <motion.div
                                        animate={{
                                            y: [0, -15, 0],
                                            rotate: [0, 3, -3, 0],
                                            scale: [1, 1.05, 1]
                                        }}
                                        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                                        className="relative w-full h-full"
                                    >
                                        <div className="absolute inset-0 bg-[var(--brand-primary)] opacity-20 blur-2xl rounded-full scale-75 animate-pulse" />
                                        {/* Professor Bright Sprite */}
                                        <div
                                            className="owl-sprite owl-happy relative z-10 filter drop-shadow-2xl"
                                            style={{
                                                transform: 'scale(1.35) translateY(10%)',
                                                width: '100%',
                                                height: '100%'
                                            }}
                                        />
                                    </motion.div>

                                    {/* Professor Bright Badge */}
                                    <div className="absolute -bottom-6 -right-6 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl shadow-xl border border-black/5 flex items-center gap-2 transform rotate-[-6deg] z-20">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)] flex items-center justify-center text-white text-xs font-black">
                                            PB
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Mascot</span>
                                            <span className="text-sm font-black text-[var(--brand-primary)]">Professor Bright</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </BrightLayer>

                        {/* Duolingo-Style Statistics Grid */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                            {HOME_STATS.map((stat, i) => (
                                <BrightLayer key={i} variant="elevated" padding="md" className="flex flex-col items-center hover:scale-105 transition-transform cursor-pointer border-b-[6px] border-black/10 active:border-b-0 active:translate-y-[6px]">
                                    <span className={`text-3xl mb-2 ${stat.color}`}>{stat.icon}</span>
                                    <span className="text-2xl font-black text-[var(--text-primary)]">{stat.value}{stat.unit === '%' ? '%' : ''}</span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{stat.label}</span>
                                </BrightLayer>
                            ))}
                        </div>

                        {/* Achievements Row */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-end pl-2">
                                <div>
                                    <BrightHeading level={2} className="text-xl">Achievements</BrightHeading>
                                    <p className="text-[var(--text-muted)] text-sm font-bold">Your latest milestones</p>
                                </div>
                                <Link href="/achievements" className="text-[var(--brand-primary)] font-black uppercase text-xs tracking-widest hover:underline">View All</Link>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {ACHIEVEMENT_PREVIEWS.map((ach) => (
                                    <BrightLayer key={ach.id} variant="glass" padding="md" className={`group ${ach.unlocked ? 'border-[var(--brand-primary)]' : ''}`}>
                                        <div className="flex items-center gap-4">
                                            <div className={`text-4xl group-hover:scale-110 transition-transform ${!ach.unlocked && 'grayscale opacity-50'}`}>{ach.icon}</div>
                                            <div className="flex-1">
                                                <div className="flex justify-between mb-1">
                                                    <span className="font-black text-sm">{ach.name}</span>
                                                    <span className="text-[var(--brand-primary)] text-xs font-black">{ach.unlocked ? '100%' : 'Locked'}</span>
                                                </div>
                                                <div className="w-full bg-white/5 rounded-full h-2.5 border border-white/5">
                                                    <div className={`${ach.unlocked ? 'bg-[var(--brand-primary)]' : 'bg-white/10'} h-full rounded-full transition-all duration-1000`} style={{ width: ach.unlocked ? '100%' : '5%' }} />
                                                </div>
                                                <p className="text-[10px] font-bold text-[var(--text-muted)] mt-1 uppercase tracking-wider">{ach.description}</p>
                                            </div>
                                        </div>
                                    </BrightLayer>
                                ))}
                            </div>
                        </div>

                        {/* Hall of Fame Preview Section */}
                        <div className="relative overflow-hidden group">
                            <div className="flex justify-between items-end mb-6 pl-2">
                                <div>
                                    <BrightHeading level={2} className="mb-2">
                                        Leaderboard
                                    </BrightHeading>
                                    <p className="text-[var(--text-secondary)] font-medium">Top performers are making moves. See where you stand!</p>
                                </div>
                                <Link href="/leaderboard" className="text-[var(--brand-primary)] font-black uppercase text-sm tracking-widest hover:underline flex items-center gap-2">
                                    See All <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                </Link>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <BrightLayer variant="elevated" className="border-b-[6px] hover:border-[var(--brand-primary)] transition-all cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="text-3xl">🥇</div>
                                        <div>
                                            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">Global Rank #1</p>
                                            <p className="text-lg font-bold">{leaderPreview.xpTop?.name || (leaderPreview.loading ? 'Loading...' : '—')}</p>
                                            <p className="text-[var(--brand-primary)] font-black text-xs">{leaderPreview.xpTop ? `${leaderPreview.xpTop.value.toLocaleString()} XP` : (leaderPreview.loading ? '—' : '0 XP')}</p>
                                        </div>
                                    </div>
                                </BrightLayer>
                                <BrightLayer variant="elevated" className="border-b-[6px] hover:border-[var(--brand-accent)] transition-all cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="text-3xl">💹</div>
                                        <div>
                                            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">Top Business</p>
                                            <p className="text-lg font-bold">{leaderPreview.topBusiness?.name || (leaderPreview.loading ? 'Loading...' : '—')}</p>
                                            <p className="text-[var(--brand-accent)] font-black text-xs">{leaderPreview.topBusiness ? `$${leaderPreview.topBusiness.value.toLocaleString()} Value` : (leaderPreview.loading ? '—' : '$0 Value')}</p>
                                        </div>
                                    </div>
                                </BrightLayer>
                                <BrightLayer variant="elevated" className="border-b-[6px] hover:border-purple-500 transition-all cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="text-3xl">🔥</div>
                                        <div>
                                            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">Streak Leader</p>
                                            <p className="text-lg font-bold">{leaderPreview.streakTop?.name || (leaderPreview.loading ? 'Loading...' : '—')}</p>
                                            <p className="text-purple-500 font-black text-xs">{leaderPreview.streakTop ? `${leaderPreview.streakTop.value.toLocaleString()} Day Streak` : (leaderPreview.loading ? '—' : '0 Day Streak')}</p>
                                        </div>
                                    </div>
                                </BrightLayer>
                            </div>
                        </div>

                        {/* Learning Path Preview */}
                        <div className="relative">
                            <div className="absolute left-10 top-20 bottom-0 w-1 bg-gradient-to-b from-[var(--brand-primary)] to-transparent opacity-20 hidden sm:block" />
                            <BrightHeading level={2} className="mb-8 pl-2 flex items-center gap-4">
                                <span className="bg-[var(--brand-primary)] text-white w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-lg shadow-[var(--brand-primary)]/40">📍</span>
                                Your Active Missions
                            </BrightHeading>
                            {learningPath.length > 0 ? (
                                <div className="space-y-6">
                                    {learningPath.map((skill, index) => (
                                        <Link
                                            key={index}
                                            href={`/lesson?objectiveId=${skill.objectiveId}&subject=${encodeURIComponent(skill.subject)}`}
                                            className="block"
                                        >
                                            <motion.div
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.2 + index * 0.1 }}
                                            >
                                                <BrightLayer variant="elevated" padding="md" className="group border-b-[8px] hover:border-[var(--brand-primary)] active:border-b-2 active:translate-y-[4px] cursor-pointer relative overflow-hidden">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand-primary)] opacity-0 group-hover:opacity-[0.03] rounded-full blur-2xl transition-opacity" />

                                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 relative z-10">
                                                        <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-[2rem] ${skill.color} flex items-center justify-center text-4xl sm:text-5xl shadow-xl shadow-black/20 text-white flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                                            {skill.icon}
                                                        </div>
                                                        <div className="flex-1 w-full space-y-4">
                                                            <div className="flex flex-col sm:flex-row justify-between items-center sm:items-start gap-2">
                                                                <div>
                                                                    <BrightHeading level={3} className="text-2xl group-hover:text-[var(--brand-primary)] transition-colors text-center sm:text-left">
                                                                        {skill.title}
                                                                    </BrightHeading>
                                                                    <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-wider">{skill.subject}</p>
                                                                </div>
                                                                <span className="bg-[var(--brand-accent)] text-[var(--bg-primary)] text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-[var(--brand-accent)]/20">
                                                                    Level {skill.level}
                                                                </span>
                                                            </div>
                                                            <div className="space-y-2">
                                                                <div className="flex justify-between text-xs font-black uppercase tracking-widest mb-1">
                                                                    <span className="text-[var(--text-muted)]">Mastery Progress</span>
                                                                    <span className="text-[var(--brand-primary)]">{skill.progress}%</span>
                                                                </div>
                                                                <div className="w-full bg-[var(--bg-secondary)] rounded-2xl h-4 overflow-hidden border border-[var(--border-subtle)] p-1">
                                                                    <motion.div
                                                                        initial={{ width: 0 }}
                                                                        animate={{ width: `${Math.min(skill.progress || 0, 100)}%` }}
                                                                        transition={{ duration: 1, delay: 0.5 }}
                                                                        className={`h-full rounded-full ${skill.color} shadow-lg relative`}
                                                                    >
                                                                        <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                                                    </motion.div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="hidden lg:flex items-center justify-center w-12 h-12 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--text-muted)] group-hover:bg-[var(--brand-primary)] group-hover:text-white group-hover:scale-110 transition-all self-center">
                                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M9 5l7 7-7 7" />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </BrightLayer>
                                            </motion.div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <BrightLayer variant="elevated" padding="md" className="border-b-[8px] border-[var(--border-subtle)]">
                                    <div className="space-y-4 text-center">
                                        <BrightHeading level={3} className="text-2xl">Your missions are loading</BrightHeading>
                                        <p className="text-[var(--text-muted)] text-sm font-bold">Jump into a lesson to generate your first mission preview.</p>
                                        <Link href="/learn" className="inline-block">
                                            <BrightButton variant="primary" size="lg" className="border-b-[6px] border-[#1F7A85] active:border-b-0 active:translate-y-[6px]">
                                                Start Learning
                                            </BrightButton>
                                        </Link>
                                    </div>
                                </BrightLayer>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Daily Goal */}
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <BrightLayer variant="elevated" padding="md" className="border-b-[6px] border-[var(--brand-accent)] bg-[#0F172A] relative overflow-hidden group">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--brand-accent)] opacity-[0.05] rounded-full blur-2xl" />

                                <div className="flex items-center justify-between mb-8">
                                    <BrightHeading level={3}>Daily Goal</BrightHeading>
                                    {userData?.streak && userData.streak > 0 && (
                                        <div className="flex flex-col items-end">
                                            <span className="text-[var(--brand-accent)] font-black text-xs uppercase tracking-widest animate-bounce">Streak Flame</span>
                                            <span className="text-2xl font-black text-white">{userData.streak}🔥</span>
                                        </div>
                                    )}
                                </div>
                                <div className="relative w-48 h-48 mx-auto group-hover:scale-105 transition-transform">
                                    <svg className="w-full h-full transform -rotate-90">
                                        <circle cx="96" cy="96" r="85" stroke="rgba(255,255,255,0.05)" strokeWidth="16" fill="none" />
                                        <motion.circle
                                            cx="96" cy="96" r="85"
                                            stroke="var(--brand-accent)"
                                            strokeWidth="16"
                                            fill="none"
                                            strokeLinecap="round"
                                            initial={{ strokeDashoffset: 2 * Math.PI * 85 }}
                                            animate={{ strokeDashoffset: 2 * Math.PI * 85 * (1 - Math.min(1, xpToday / dailyGoal)) }}
                                            transition={{ duration: 1.5, ease: "easeOut" }}
                                            strokeDasharray={`${2 * Math.PI * 85}`}
                                            className="drop-shadow-[0_0_10px_rgba(255,165,0,0.5)]"
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-5xl font-black text-white tracking-tighter">
                                            {dailyGoalPercent}%
                                        </span>
                                        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.3em]">Missions Clear</span>
                                    </div>
                                </div>
                                <div className="mt-8 text-center bg-white/5 rounded-2xl p-4">
                                    <p className="text-white font-bold text-sm">{xpToday} / {dailyGoal} XP</p>
                                    <p className="text-[var(--text-muted)] text-[10px] uppercase font-black tracking-widest mt-1">Today&apos;s Progress</p>
                                </div>
                            </BrightLayer>
                        </motion.div>

                        {/* Quick Stats Grid */}
                        <div className="grid grid-cols-1 gap-4">
                            {/* XP Summary */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.2 }}
                            >
                                <BrightLayer variant="elevated" padding="md" className="border-b-[6px] border-[var(--brand-primary)] bg-[#0F172A]">
                                    <BrightHeading level={4} className="mb-2">Total Wealth (XP)</BrightHeading>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-[var(--brand-primary)] tracking-tighter">
                                            {(userData?.xp || 0).toLocaleString()}
                                        </span>
                                        <span className="text-[var(--text-muted)] text-xs font-bold uppercase">XP</span>
                                    </div>
                                </BrightLayer>
                            </motion.div>

                            {/* B-Coins */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 }}
                            >
                                <BrightLayer variant="elevated" padding="md" className="border-b-[6px] border-yellow-500 bg-[#0F172A]">
                                    <BrightHeading level={4} className="mb-2">Business Cash</BrightHeading>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-yellow-500 tracking-tighter">
                                            {(userData?.bCoins || 0).toLocaleString()}
                                        </span>
                                        <span className="text-[var(--text-muted)] text-xs font-bold uppercase">B-Coins</span>
                                    </div>
                                </BrightLayer>
                            </motion.div>
                        </div>

                        {/* Achievement Teaser */}
                        <Link href="/achievements">
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.4 }}
                                className="block"
                            >
                                <BrightLayer variant="glass" padding="md" className="border-b-[6px] border-purple-500 hover:scale-[1.02] transition-transform text-center cursor-pointer">
                                    <div className="text-4xl mb-2">🏆</div>
                                    <BrightHeading level={4}>The Locker Room</BrightHeading>
                                    <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mt-2">See your trophies »</p>
                                </BrightLayer>
                            </motion.div>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Professor Bright Pop-out Mascot */}
            <ProfessorBrightMascot feedback={mascotFeedback} />
        </div>
    )
}
