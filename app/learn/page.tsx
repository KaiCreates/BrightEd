'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { getSubjectFromSourceFile, getSubjectStyle } from '@/lib/subject-utils'
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system'
import { useAuth } from '@/lib/auth-context'
import { LearningPathNode, SectionHeader, PathConnector, type NodeType } from '@/components/learning'

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
  nodeType: NodeType // NEW: Node variant type
  lastVisited?: string // For maintenance detection
}

import { Suspense } from 'react'

export default function LearnPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]"></div>
      </div>
    }>
      <LearnContent />
    </Suspense>
  )
}

function LearnContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const shouldAnimateUnlock = searchParams?.get('animation') === 'unlock'
  const { user, userData, loading: authLoading } = useAuth()

  const onboardingCompleted = userData?.onboardingCompleted === true

  const [learningModules, setLearningModules] = useState<LearningModule[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<string[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      // Redirect if not logged in
      router.push('/landing')
      return
    }

    async function fetchLearningPath() {
      try {
        setLoading(true)
        // Get user's selected subjects from onboarding (prefer Firestore userData; fallback to localStorage)
        const onboardingData = localStorage.getItem('brighted_onboarding')

        // Fetch progress directly from Firestore (Client SDK has Auth)
        const { collection, getDocs } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        const uid = user?.uid || '';

        const progressRef = collection(db, 'users', uid, 'progress');
        const progressSnapshot = await getDocs(progressRef);
        const userProgress: Record<string, any> = {};

        progressSnapshot.forEach(doc => {
          userProgress[doc.id] = doc.data();
        });


        let userSubjects: string[] = []
        const firestoreSubjects = userData?.subjects
        if (Array.isArray(firestoreSubjects) && firestoreSubjects.length > 0) {
          userSubjects = firestoreSubjects
        } else if (onboardingData) {
          const data = JSON.parse(onboardingData)
          userSubjects = data.subjects || []
        }

        // Fetch learning path with subject separation
        const token = await user?.getIdToken();
        const params = new URLSearchParams({})
        if (userSubjects.length > 0) params.set('subjects', userSubjects.join(','))

        const res = await fetch('/api/learning-path?' + params, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (!res.ok) throw new Error('Failed to fetch learning path')

        const pathData = await res.json()
        // ... (rest of logic remains similar)
        const pathsBySubject: { [subject: string]: SyllabusObjective[] } = pathData.paths || {}

        // Get all available subjects
        const availableSubjects = Object.keys(pathsBySubject)
        setSubjects(availableSubjects)

        // If no subject selected, use first available or all
        let currentSubject = selectedSubject
        if (!currentSubject && availableSubjects.length > 0) {
          currentSubject = availableSubjects[0]
          setSelectedSubject(currentSubject)
        }

        // Get objectives for selected subject (or combine all if none selected)
        let objectives: SyllabusObjective[] = []
        if (currentSubject && pathsBySubject[currentSubject]) {
          objectives = pathsBySubject[currentSubject]
          objectives = objectives.filter(obj => {
            const objSubject = getSubjectFromSourceFile(obj.source_file)
            return objSubject === currentSubject
          })
        } else {
          objectives = Object.values(pathsBySubject).flat()
        }

        if (objectives.length === 0) {
          // Fallback or empty state
          console.log("No specific objectives found");
        }

        // Transform to UI format
        const mappedModules: LearningModule[] = objectives
          .filter(obj => {
            if (currentSubject) {
              const objSubject = getSubjectFromSourceFile(obj.source_file)
              return objSubject === currentSubject
            }
            return true
          })
          .map((obj, index) => {
            const style = getSubjectStyle(getSubjectFromSourceFile(obj.source_file))
            const progress = userProgress[obj.id]
            const prevObj = index > 0 ? objectives[index - 1] : null
            const prevProgress = prevObj ? userProgress[prevObj.id] : null

            const stars = progress?.stars ?? 0
            const prevStars = prevProgress?.stars ?? 0

            // Calculate progress from mastery (0.1-10.0 scale -> 0-100%)
            const subjectName = getSubjectFromSourceFile(obj.source_file)
            const masteryProgress = userData?.subjectProgress?.[subjectName] || 0
            const progressPercentage = Math.min(100, Math.round((masteryProgress / 10.0) * 100))

            const isProgressEmpty = Object.keys(userProgress).length === 0;
            let title = obj.objective || 'Untitled Objective'
            title = title.replace(/\(.*?mark.*?\)/gi, '').trim()
            title = title.replace(/^[•\-\*]\s*/, '').trim()

            if (isProgressEmpty && index === 0) {
              title = "Module 1: Orientation";
            }

            if (title.length > 50) title = title.substring(0, 47) + '...'
            if (title.length === 0) title = `Objective ${obj.id}`

            let status: LearningModule['status'] = 'locked'

            if (index === 0) {
              status = stars >= 3 ? 'completed' : 'current'
            } else if (prevStars >= 3) {
              status = stars >= 3 ? 'completed' : 'current'
            }

            // Determine node type for Career Roadmap visualization
            let nodeType: NodeType = 'standard'

            // Boss node every 5th position (indices 4, 9, 14, etc.)
            if ((index + 1) % 5 === 0) {
              nodeType = 'boss'
            }
            // Crisis node for high difficulty objectives (randomly 15% chance)
            else if (obj.difficulty >= 3 && Math.random() < 0.15) {
              nodeType = 'crisis'
            }
            // Crunch node based on keywords or random 10% chance
            else if (
              obj.content?.toLowerCase().includes('rapid') ||
              obj.content?.toLowerCase().includes('speed') ||
              Math.random() < 0.1
            ) {
              nodeType = 'crunch'
            }
            // Maintenance node for completed nodes not visited in 3+ days
            else if (status === 'completed' && progress?.lastVisited) {
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

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-24 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--brand-primary)]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[var(--brand-secondary)]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-2xl mx-auto px-4 py-8 relative z-10">

        {/* Header Area */}
        <div className="text-center mb-10">
          <BrightHeading level={1} className="mb-2">
            Learning Path
          </BrightHeading>
          <p className="text-[var(--text-secondary)] font-medium">Your personalized journey to CXC success</p>
        </div>

        {/* Subject Filter */}
        {subjects.length > 1 && (
          <div className="mb-8 w-full overflow-x-auto pb-4 -mx-4 px-4 flex justify-start sm:justify-center no-scrollbar">
            <div className="flex gap-2 flex-nowrap">
              <button
                onClick={() => setSelectedSubject(null)}
                className={`whitespace-nowrap px-4 py-2 rounded-xl font-bold transition-all border-2 flex-shrink-0 ${selectedSubject === null
                  ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/20'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]'
                  }`}
              >
                All Subjects
              </button>
              {subjects.map((subject) => (
                <button
                  key={subject}
                  onClick={() => setSelectedSubject(subject)}
                  className={`whitespace-nowrap px-4 py-2 rounded-xl font-bold transition-all border-2 flex-shrink-0 ${selectedSubject === subject
                    ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/20'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]'
                    }`}
                >
                  {subject}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Path Container */}
        <div className="relative flex flex-col items-center space-y-8">

          {loading && (
            <div className="text-center py-10">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)] mx-auto"></div>
              <p className="mt-4 text-[var(--text-secondary)]">Loading your personalized path...</p>
            </div>
          )}

          {error && (
            <BrightLayer variant="elevated" className="border-l-4 border-l-red-500 text-center max-w-md">
              <p className="text-red-500 font-bold mb-4">{error}</p>
              {!onboardingCompleted ? (
                <Link href="/onboarding" className="block w-full">
                  <BrightButton size="md" variant="primary" className="w-full">
                    Complete Onboarding
                  </BrightButton>
                </Link>
              ) : (
                <BrightButton
                  size="md"
                  variant="primary"
                  className="w-full"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </BrightButton>
              )}
            </BrightLayer>
          )}

          {!loading && !error && learningModules.length === 0 && (
            <div className="text-center py-10">
              <p className="text-[var(--text-secondary)] mb-4">No learning objectives available.</p>
              {!onboardingCompleted ? (
                <Link href="/onboarding" className="text-[var(--brand-primary)] hover:underline font-black">
                  Complete onboarding to get started
                </Link>
              ) : (
                <button
                  onClick={() => window.location.reload()}
                  className="text-[var(--brand-primary)] hover:underline font-black"
                >
                  Retry
                </button>
              )}
            </div>
          )}

          {!loading && !error && learningModules.map((module, index) => {
            // Check if this is the module to animate unlocking (the first 'current' one)
            const isUnlocking = shouldAnimateUnlock && module.status === 'current' && index > 0;
            const isNext = module.status === 'current' || (module.status === 'locked' && index > 0 && learningModules[index - 1].status === 'completed');

            // Determine path direction for connector
            let pathVariant: 'straight' | 'left' | 'right' = 'straight';
            if (index % 4 === 0) pathVariant = 'left';       // 0 -> 1 goes left-ish
            if (index % 4 === 1) pathVariant = 'straight';   // 1 -> 2 straight
            if (index % 4 === 2) pathVariant = 'right';      // 2 -> 3 goes right-ish
            if (index % 4 === 3) pathVariant = 'straight';   // 3 -> 4 straight

            // Section Header every 5 modules
            const showHeader = index % 5 === 0;
            const moduleNum = Math.floor(index / 5) + 1;

            // Determine header theme based on module number
            const headerTheme = moduleNum === 1 ? 'startup' : moduleNum === 2 ? 'growth' : moduleNum === 3 ? 'mastery' : 'default';

            return (
              <div key={module.id} className="w-full flex flex-col items-center">
                {/* Section Header */}
                {showHeader && (
                  <SectionHeader
                    moduleNumber={moduleNum}
                    title={moduleNum === 1 ? "The Startup Phase" : moduleNum === 2 ? "Growth & Scaling" : "Market Dominance"}
                    theme={headerTheme}
                  />
                )}

                {/* Node Component */}
                <LearningPathNode
                  {...module}
                  id={String(module.id)}
                  index={index}
                  isUnlocking={isUnlocking}
                />

                {/* Connector Path (if not last) */}
                {index < learningModules.length - 1 && (
                  <PathConnector
                    fromIndex={index}
                    isCompleted={module.status === 'completed'}
                    isNext={isNext}
                    variant={pathVariant}
                  />
                )}
              </div>
            )
          })}
        </div>


        {/* Development Tools */}
        <div className="mt-20 border-t border-[var(--border-subtle)] pt-10 text-center">
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest mb-4">Development Options</p>
          <BrightButton
            variant="danger"
            size="sm"
            onClick={async () => {
              if (confirm('Are you sure you want to reset your learning progress? This cannot be undone.')) {
                try {
                  const token = await user?.getIdToken();
                  await fetch(`/api/progress?userId=${user?.uid}`, {
                    method: 'DELETE',
                    headers: {
                      'Authorization': `Bearer ${token}`
                    }
                  });
                  window.location.reload();
                } catch (e) {
                  alert('Failed to reset progress');
                }
              }
            }}
          >
            Reset Learning Map
          </BrightButton>
        </div>
      </div>
    </div >
  )
}
