'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { getSubjectFromSourceFile, getSubjectStyle } from '@/lib/subject-utils'
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system'
import { useAuth } from '@/lib/auth-context'

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
  const shouldAnimateUnlock = searchParams.get('animation') === 'unlock'
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
        const firestoreSubjects = (userData as any)?.onboardingData?.subjects
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

            return {
              id: obj.id,
              title,
              subject: getSubjectFromSourceFile(obj.source_file),
              level: obj.difficulty || 1,
              status,
              stars,
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
          <div className="mb-8 flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => setSelectedSubject(null)}
              className={`px-4 py-2 rounded-xl font-bold transition-all border-2 ${selectedSubject === null
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
                className={`px-4 py-2 rounded-xl font-bold transition-all border-2 ${selectedSubject === subject
                  ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/20'
                  : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)]'
                  }`}
              >
                {subject}
              </button>
            ))}
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
            // Calculate offset for "winding" effect
            let alignClass = ''
            if (index % 4 === 1) alignClass = '-ml-32' // Left
            if (index % 4 === 3) alignClass = 'ml-32'  // Right

            // Check if this is the module to animate unlocking (the first 'current' one)
            const isUnlocking = shouldAnimateUnlock && module.status === 'current' && index > 0;

            const isLocked = module.status === 'locked';
            const isCompleted = module.status === 'completed';

            return (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 50, scale: isUnlocking ? 0 : 1 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{
                  delay: index * 0.1,
                  type: isUnlocking ? "spring" : "tween",
                  stiffness: isUnlocking ? 200 : undefined
                }}
                className={`relative z-10 ${alignClass}`}
              >
                {/* Unlock Celebration Ring */}
                {isUnlocking && (
                  <motion.div
                    initial={{ scale: 1.5, opacity: 0 }}
                    animate={{ scale: 2.5, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 1 }}
                    className="absolute inset-0 bg-[var(--brand-accent)] rounded-full opacity-0 z-0 pointer-events-none"
                  />
                )}

                <Link
                  href={!isLocked ? `/simulate?objectiveId=${module.id}&subjectId=${encodeURIComponent(module.subject)}` : '#'}
                  className={`group relative flex flex-col items-center ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {/* Floating Tooltip/Label */}
                  <BrightLayer
                    variant="glass"
                    padding="sm"
                    className="absolute -top-16 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none mb-2 border border-[var(--border-subtle)]"
                  >
                    <span className="font-bold text-[var(--text-primary)]">{module.title}</span>
                  </BrightLayer>

                  {/* Node Circle */}
                  <div
                    className={`
                      w-24 h-24 rounded-full flex items-center justify-center text-4xl shadow-xl transition-all transform active:scale-95 border-b-[6px] border-4
                      ${isLocked
                        ? 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] grayscale opacity-70 text-[var(--text-muted)]'
                        : `bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] border-[var(--brand-primary)] text-white hover:scale-110 hover:shadow-2xl hover:shadow-[var(--brand-primary)]/30`
                      }
                      ${isCompleted ? 'border-[var(--state-success)] from-[var(--state-success)] to-green-400' : ''}
                    `}
                  >
                    {isCompleted ? (
                      <span className="drop-shadow-md">✓</span>
                    ) : isLocked ? (
                      <span className="opacity-50 text-2xl">🔒</span>
                    ) : (
                      <span className="animate-pulse">{module.icon}</span>
                    )}

                    {/* Stars - always show for unlocked nodes */}
                    {!isLocked && (
                      <div className="absolute -bottom-6 flex gap-1 bg-[var(--bg-primary)] px-2 py-1 rounded-full border border-[var(--border-subtle)] shadow-sm">
                        {[...Array(3)].map((_, i) => (
                          <span key={i} className={`text-sm transition-all ${i < module.stars ? 'text-[var(--brand-accent)] drop-shadow-sm' : 'text-[var(--text-muted)] opacity-30'}`}>
                            ★
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Link>

                {/* Connecting Path dots */}
                {index < learningModules.length - 1 && (
                  <div className={`absolute top-24 left-1/2 transform -translate-x-1/2 h-8 w-3 bg-[var(--border-subtle)] rounded-full -z-10 ${index % 4 === 1 ? 'rotate-[-30deg] origin-top' :
                    index % 4 === 3 ? 'rotate-[30deg] origin-top' : ''
                    }`}></div>
                )}
              </motion.div>
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
