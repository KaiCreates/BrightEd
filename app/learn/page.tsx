'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useState, Suspense } from 'react'
import { getSubjectFromSourceFile, getSubjectStyle } from '@/lib/subject-utils'
import { useAuth } from '@/lib/auth-context'
import { LearningPathNode, PathConnector, DailyTip, type NodeType, GuidebookModal, type GuidebookObjective } from '@/components/learning'

interface SyllabusObjective {
  id: string
  objective: string
  section: string
  subsection: string
  content: string
  difficulty: number
  source_file: string
}

interface LearningModule {
  id: string | number
  title: string
  subject: string
  level: number
  status: 'completed' | 'current' | 'locked'
  stars: number
  icon: string
  color: string
  borderColor: string
  nodeType: NodeType
  lastVisited?: string
  mastery?: number
}

// =============================================================================
// SKELETON LOADER COMPONENT
// =============================================================================

function SkeletonNode({ index }: { index: number }) {
  const offsets = [0, -80, 0, 80]
  const offset = offsets[index % 4]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="flex flex-col items-center my-4"
      style={{ marginLeft: offset }}
    >
      <div className="w-20 h-20 rounded-full skeleton" />
      <div className="w-16 h-4 rounded-full skeleton mt-3" />
    </motion.div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      {/* Header skeleton */}
      <div className="text-center mb-12">
        <div className="w-48 h-10 skeleton mx-auto mb-4" />
        <div className="w-64 h-5 skeleton mx-auto" />
      </div>

      {/* Subject filter skeleton */}
      <div className="flex gap-3 mb-8 overflow-hidden">
        {[1, 2, 3].map(i => (
          <div key={i} className="w-28 h-12 skeleton rounded-full flex-shrink-0" />
        ))}
      </div>

      {/* Nodes skeleton */}
      <div className="relative">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonNode key={i} index={i} />
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// STATS BAR COMPONENT
// =============================================================================

function StatsBar({ userData }: { userData: any }) {
  const streak = userData?.streak || 0
  const totalXp = userData?.totalXp || 0

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex justify-center gap-6 mb-8"
    >
      {/* Streak */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
        <span className="text-2xl">🔥</span>
        <div>
          <div className="font-black text-lg text-orange-500">{streak}</div>
          <div className="text-xs font-bold text-[var(--text-muted)] uppercase">Streak</div>
        </div>
      </div>

      {/* XP */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
        <span className="text-2xl">⚡</span>
        <div>
          <div className="font-black text-lg text-[var(--brand-primary)]">{totalXp.toLocaleString()}</div>
          <div className="text-xs font-bold text-[var(--text-muted)] uppercase">XP</div>
        </div>
      </div>
    </motion.div>
  )
}

// =============================================================================
// SUBJECT FILTER COMPONENT
// =============================================================================

function SubjectFilter({
  subjects,
  selected,
  onSelect
}: {
  subjects: string[]
  selected: string | null
  onSelect: (subject: string | null) => void
}) {
  if (subjects.length <= 1) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="relative px-6 mb-8"
    >
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        <button
          onClick={() => onSelect(null)}
          className={`filter-pill ${selected === null ? 'filter-pill-active' : 'filter-pill-inactive'}`}
        >
          All Subjects
        </button>
        {subjects.map((subject) => (
          <button
            key={subject}
            onClick={() => onSelect(subject)}
            className={`filter-pill ${selected === subject ? 'filter-pill-active' : 'filter-pill-inactive'}`}
          >
            {subject}
          </button>
        ))}
      </div>
    </motion.div>
  )
}

// =============================================================================
// HELPER FUNCTION
// =============================================================================

const getHorizontalOffset = (index: number, nodeType: NodeType) => {
  if (nodeType === 'boss') return 0
  const pattern = [0, -100, 0, 100]
  return pattern[index % 4]
}

// =============================================================================
// MAIN PAGE COMPONENTS
// =============================================================================

export default function LearnPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <LearnContent />
    </Suspense>
  )
}

function LearnContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const shouldAnimateUnlock = isMounted && searchParams?.get('animation') === 'unlock'
  const { user, userData, loading: authLoading } = useAuth()
  const onboardingCompleted = userData?.onboardingCompleted === true

  const [learningModules, setLearningModules] = useState<LearningModule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<string[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [guidebookState, setGuidebookState] = useState<{
    isOpen: boolean
    moduleNumber: number
    title: string
    objectives: GuidebookObjective[]
    theme: 'startup' | 'growth' | 'mastery' | 'default'
  }>({
    isOpen: false,
    moduleNumber: 1,
    title: '',
    objectives: [],
    theme: 'default'
  })

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push('/')
      return
    }

    const currentUser = user

    async function fetchLearningPath() {
      try {
        setLoading(true)

        const onboardingData = localStorage.getItem('brighted_onboarding')
        const uid = currentUser.uid
        const token = await currentUser.getIdToken()

        let userProgress: Record<string, any> = {}
        try {
          const progressRes = await fetch(`/api/progress?userId=${uid}`, {
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-store'
          })
          if (progressRes.ok) {
            const progressJson = await progressRes.json()
            userProgress = progressJson?.progress && typeof progressJson.progress === 'object'
              ? progressJson.progress
              : {}
          }
        } catch {
          userProgress = {}
        }

        let userSubjects: string[] = []
        const firestoreSubjects = userData?.subjects
        if (Array.isArray(firestoreSubjects) && firestoreSubjects.length > 0) {
          userSubjects = firestoreSubjects
        } else if (onboardingData) {
          const data = JSON.parse(onboardingData)
          userSubjects = data.subjects || []
        }

        const params = new URLSearchParams()
        if (userSubjects.length > 0) params.set('subjects', userSubjects.join(','))

        const res = await fetch('/api/learning-path?' + params, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (!res.ok) throw new Error('Failed to fetch learning path')

        const pathData = await res.json()
        const pathsBySubject: { [subject: string]: SyllabusObjective[] } = pathData.paths || {}

        const availableSubjects = Object.keys(pathsBySubject)
        setSubjects(availableSubjects)

        let currentSubject = selectedSubject
        if (!currentSubject && availableSubjects.length > 0) {
          currentSubject = availableSubjects[0]
          setSelectedSubject(currentSubject)
        }

        let objectives: SyllabusObjective[] = []
        if (currentSubject && pathsBySubject[currentSubject]) {
          objectives = pathsBySubject[currentSubject]
        } else {
          objectives = Object.values(pathsBySubject).flat()
        }

        const mappedModules: LearningModule[] = objectives.map((obj, index) => {
          const style = getSubjectStyle(getSubjectFromSourceFile(obj.source_file))
          const progress = userProgress[obj.id]
          const prevObj = index > 0 ? objectives[index - 1] : null
          const prevProgress = prevObj ? userProgress[prevObj.id] : null
          const stars = progress?.stars ?? 0
          const prevStars = prevProgress?.stars ?? 0

          const subjectName = getSubjectFromSourceFile(obj.source_file)
          const isProgressEmpty = Object.keys(userProgress).length === 0

          let title = obj.objective || 'Untitled Objective'
          title = title.replace(/\(.*?mark.*?\)/gi, '').trim()
          title = title.replace(/^[•\-\*]\s*/, '').trim()

          if (isProgressEmpty && index === 0) {
            title = "Module 1: Orientation"
          }
          if (title.length > 50) title = title.substring(0, 47) + '...'
          if (title.length === 0) title = `Objective ${obj.id}`

          let status: LearningModule['status'] = 'locked'
          if (index === 0) {
            status = stars >= 3 ? 'completed' : 'current'
          } else if (prevStars >= 3) {
            status = stars >= 3 ? 'completed' : 'current'
          }

          let nodeType: NodeType = 'standard'
          if ((index + 1) % 5 === 0) {
            nodeType = 'boss'
          } else if (obj.difficulty >= 3 && Math.random() < 0.15) {
            nodeType = 'crisis'
          } else if (
            obj.content?.toLowerCase().includes('rapid') ||
            obj.content?.toLowerCase().includes('speed') ||
            Math.random() < 0.1
          ) {
            nodeType = 'crunch'
          } else if (status === 'completed' && progress?.lastVisited) {
            const daysSinceVisit = Math.floor(
              (Date.now() - new Date(progress.lastVisited).getTime()) / (1000 * 60 * 60 * 24)
            )
            if (daysSinceVisit >= 3) {
              nodeType = 'maintenance'
            }
          }

          return {
            id: obj.id,
            title,
            subject: getSubjectFromSourceFile(obj.source_file),
            level: obj.difficulty || 1,
            status,
            stars,
            mastery: progress?.mastery || 0,
            nodeType,
            lastVisited: progress?.lastVisited,
            ...style
          }
        })

        setLearningModules(mappedModules)
      } catch (err) {
        console.error("Error fetching learning path:", err)
        setError(err instanceof Error ? err.message : 'Failed to load learning path.')
      } finally {
        setLoading(false)
      }
    }

    fetchLearningPath()
  }, [selectedSubject, user, userData, authLoading, router])

  const handleResetProgress = async () => {
    if (!confirm('Are you sure you want to reset your learning progress? This cannot be undone.')) {
      return
    }

    try {
      if (!user) throw new Error('Not authenticated')
      const token = await user.getIdToken()
      await fetch(`/api/progress?userId=${user.uid}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      window.location.reload()
    } catch (e) {
      alert('Failed to reset progress')
      console.error(e)
    }
  }

  // Loading state
  if (loading) {
    return <LoadingSkeleton />
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md p-8 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
        >
          <div className="text-6xl mb-4">😅</div>
          <h2 className="text-2xl font-black mb-2 text-[var(--text-primary)]">Oops!</h2>
          <p className="text-[var(--text-secondary)] mb-6">{error}</p>
          {!onboardingCompleted ? (
            <Link href="/welcome" className="duo-btn duo-btn-primary">
              Complete Onboarding
            </Link>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="duo-btn duo-btn-primary"
            >
              Try Again
            </button>
          )}
        </motion.div>
      </div>
    )
  }

  // Empty state
  if (learningModules.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md p-8 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]"
        >
          <div className="text-6xl mb-4">📚</div>
          <h2 className="text-2xl font-black mb-2 text-[var(--text-primary)]">No Lessons Yet</h2>
          <p className="text-[var(--text-secondary)] mb-6">Complete your onboarding to start learning!</p>
          <Link href="/welcome" className="duo-btn duo-btn-primary">
            Get Started
          </Link>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-x-hidden">
      {/* Gradient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--brand-primary)]/5 via-transparent to-transparent" />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative pt-8 pb-4 px-6"
      >
        <div className="max-w-2xl mx-auto text-center">
          <motion.h1
            className="text-4xl md:text-5xl font-black mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span className="text-gradient">Learning Path</span>
          </motion.h1>
          <motion.p
            className="text-[var(--text-secondary)] text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            Your personalized journey to CXC success
          </motion.p>
        </div>
      </motion.header>

      {/* Stats Bar */}
      <StatsBar userData={userData} />

      {/* Subject Filter */}
      <SubjectFilter
        subjects={subjects}
        selected={selectedSubject}
        onSelect={setSelectedSubject}
      />

      {/* Daily Tip */}
      <div className="relative px-6 mb-8">
        <div className="max-w-2xl mx-auto">
          <DailyTip />
        </div>
      </div>

      {/* Learning Path */}
      <div className="relative max-w-2xl mx-auto px-6 pb-32 flex flex-col items-center w-full">
        {learningModules.map((module, index) => {
          const isUnlocking = shouldAnimateUnlock && module.status === 'current' && index > 0
          const isNext = module.status === 'current' ||
            (module.status === 'locked' && index > 0 && learningModules[index - 1].status === 'completed')

          const currentOffset = getHorizontalOffset(index, module.nodeType)
          const nextModule = index < learningModules.length - 1 ? learningModules[index + 1] : null
          const nextOffset = nextModule ? getHorizontalOffset(index + 1, nextModule.nodeType) : 0

          return (
            <div
              key={module.id}
              className="relative flex flex-col items-center z-10 w-full min-h-[160px]"
              style={{ transform: `translateX(${currentOffset}px)` }}
            >
              <LearningPathNode
                {...module}
                id={String(module.id)}
                index={index}
                isUnlocking={isUnlocking}
              />

              {/* Path Connector */}
              {index < learningModules.length - 1 && (
                <PathConnector
                  fromIndex={index}
                  fromOffset={currentOffset}
                  toOffset={nextOffset}
                  isCompleted={module.status === 'completed'}
                  isNext={isNext}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Reset Progress Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <details className="bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl shadow-xl">
          <summary className="px-4 py-2 cursor-pointer text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            ⚙️ Options
          </summary>
          <div className="p-4 border-t border-[var(--border-subtle)]">
            <button
              onClick={handleResetProgress}
              className="text-sm font-bold text-red-500 hover:text-red-400"
            >
              Reset Progress
            </button>
          </div>
        </details>
      </div>

      {/* Guidebook Modal */}
      <GuidebookModal
        isOpen={guidebookState.isOpen}
        onClose={() => setGuidebookState(prev => ({ ...prev, isOpen: false }))}
        moduleNumber={guidebookState.moduleNumber}
        title={guidebookState.title}
        subject={selectedSubject || 'General'}
        objectives={guidebookState.objectives}
        theme={guidebookState.theme}
      />
    </div>
  )
}