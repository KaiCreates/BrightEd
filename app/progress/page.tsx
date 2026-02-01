'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system'
import { TopicMasteryDashboard, TopicMastery } from '@/components/learning'
import { useAuth } from '@/lib/auth-context' // Assuming auth context exists
import { StreakCelebration, ProfessorBrightMascot } from '@/components/learning'
import { FeedbackResponse } from '@/lib/professor-bright'

export default function ProgressPage() {
    const router = useRouter()
    const { user, userData, loading: authLoading } = useAuth()

    const [loading, setLoading] = useState(true)
    const [topics, setTopics] = useState<TopicMastery[]>([])
    const [overallStats, setOverallStats] = useState({
        mastery: 0,
        confidence: 0,
        streak: 0,
        totalSkills: 0
    })
    const [mascotFeedback, setMascotFeedback] = useState<FeedbackResponse | null>(null)

    useEffect(() => {
        if (authLoading) return
        if (!user) {
            router.push('/login')
            return
        }

        const fetchData = async () => {
            try {
                const token = await user.getIdToken()
                const res = await fetch('/api/nable/status', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                })

                if (res.ok) {
                    const data = await res.json()

                    // Transform NABLE data to TopicMastery format
                    // Assuming NABLE skills are essentially topics or can be mapped
                    // For this implementation, we'll treat top-level skill entries as topics
                    // In a real app, you might want a mapping of skill ID -> Topic Name

                    const transformedTopics: TopicMastery[] = (data.skills?.details || []).map((skill: any) => ({
                        topicId: skill.id,
                        topicName: formatTopicName(skill.id),
                        mastery: skill.mastery / 100,
                        subSkills: [], // If NABLE had hierarchy, we'd populate this
                        questionsCompleted: skill.streak * 5,
                        totalQuestions: Math.max(100, (skill.streak * 5) + 20)
                    }))

                    setTopics(transformedTopics)

                    setOverallStats({
                        mastery: data.overview?.overallMastery || 0,
                        confidence: data.overview?.overallConfidence || 0,
                        streak: typeof userData?.streak === 'number' ? userData.streak : (data.session?.currentStreak || 0),
                        totalSkills: data.overview?.totalSkillsTracked || 0
                    })

                    // Mascot Feedback Logic
                    const mastery = data.overview?.overallMastery || 0
                    setTimeout(() => {
                        setMascotFeedback({
                            tone: mastery > 70 ? 'celebratory' : 'supportive',
                            message: mastery > 70
                                ? "Look at those stats! You're becoming a pro! 🌟"
                                : "Consistency is key. Keep building that knowledge! 🧠",
                            emoji: mastery > 70 ? '🌟' : '📈',
                            spriteClass: mastery > 70 ? 'owl-happy' : 'owl-neutral'
                        })
                    }, 1000)
                }
            } catch (error) {
                console.error('Failed to fetch progress:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [user, authLoading, router])

    // Helper to make IDs looks like names (e.g., "algebra_basics" -> "Algebra Basics")
    const formatTopicName = (id: string) => {
        return id
            .split(/[-_]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
    }

    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <div className="animate-pulse text-[var(--brand-primary)]">Loading Progress...</div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] safe-padding pb-20">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Header Section */}
                <div className="mb-8">
                    <BrightHeading level={1}>Your Progress</BrightHeading>
                    <p className="text-[var(--text-secondary)] mt-2">
                        Track your mastery across all subjects and topics.
                    </p>
                </div>

                {/* Stats Overview */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                    <StatsCard
                        label="Overall Mastery"
                        value={`${overallStats.mastery}%`}
                        icon="🏆"
                        trend={overallStats.mastery > 50 ? 'positive' : 'neutral'}
                    />
                    <StatsCard
                        label="Confidence"
                        value={`${overallStats.confidence}%`}
                        icon="🧠"
                        trend="neutral"
                    />
                    <StatsCard
                        label="Current Streak"
                        value={overallStats.streak.toString()}
                        icon="🔥"
                        trend="positive"
                    />
                    <StatsCard
                        label="Skills Tracked"
                        value={overallStats.totalSkills.toString()}
                        icon="📚"
                        trend="neutral"
                    />
                </div>

                {/* Main Dashboard */}
                <TopicMasteryDashboard
                    topics={topics}
                    onTopicClick={(topicId) => router.push(`/learn?topic=${topicId}`)}
                />

                {/* Empty State */}
                {topics.length === 0 && (
                    <BrightLayer variant="glass" padding="lg" className="text-center mt-8">
                        <div className="text-4xl mb-4">🌱</div>
                        <h3 className="text-xl font-bold mb-2">No Data Yet</h3>
                        <p className="text-[var(--text-secondary)] mb-6">
                            Start practicing to track your progress!
                        </p>
                        <BrightButton onClick={() => router.push('/learn')}>
                            Start Learning
                        </BrightButton>
                    </BrightLayer>
                )}
            </div>
            {/* Professor Bright Mascot */}
            <ProfessorBrightMascot feedback={mascotFeedback} webMode={true} />
        </div>
    )
}

function StatsCard({ label, value, icon, trend }: { label: string, value: string, icon: string, trend: 'positive' | 'negative' | 'neutral' }) {
    return (
        <BrightLayer variant="elevated" padding="md" className="flex flex-col items-center text-center">
            <span className="text-2xl mb-2">{icon}</span>
            <span className="text-sm text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">{label}</span>
            <span className={`text-2xl font-black ${trend === 'positive' ? 'text-green-500' :
                trend === 'negative' ? 'text-red-500' : 'text-[var(--text-primary)]'
                }`}>
                {value}
            </span>
        </BrightLayer>
    )
}
