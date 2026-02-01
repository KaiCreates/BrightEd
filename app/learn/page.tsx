'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { getSubjectFromSourceFile, getSubjectStyle } from '@/lib/subject-utils'
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system'
import { useAuth } from '@/lib/auth-context'
import { LearningPathNode, SectionHeader, PathConnector, type NodeType, ProfessorBrightMascot, GuidebookModal, type GuidebookObjective } from '@/components/learning'
import { FeedbackResponse } from '@/lib/professor-bright'

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
  mastery?: number // NEW: Mastery score
}

import { Suspense } from 'react'

// Helper to get horizontal offset in pixels for a node index
const getHorizontalOffset = (index: number, nodeType: NodeType) => {
  if (nodeType === 'boss') return 0
  if (index % 4 === 1) return -120 // Shifted left
  if (index % 4 === 3) return 120  // Shifted right
  return 0 // Centered
}

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
  const [mascotFeedback, setMascotFeedback] = useState<FeedbackResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [subjects, setSubjects] = useState<string[]>([])
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [guidebookState, setGuidebookState] = useState<{
    isOpen: boolean;
    moduleNumber: number;
    title: string;
    objectives: GuidebookObjective[];
    theme: 'startup' | 'growth' | 'mastery' | 'default';
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
      // Redirect if not logged in
      router.push('/')
      return
    }

    const currentUser = user

    async function fetchLearningPath() {
      try {
        setLoading(true)
        // Get user's selected subjects from onboarding (prefer Firestore userData; fallback to localStorage)
        const onboardingData = localStorage.getItem('brighted_onboarding')

        // Fetch progress from server canonical source.
        // Note: gameplay writes progress into users/{uid}.progress.{objectiveId} (NOT a subcollection).
        const uid = currentUser.uid
        const token = await currentUser.getIdToken();
        let userProgress: Record<string, any> = {}
        try {
          const progressRes = await fetch(`/api/progress?userId=${uid}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            },
            cache: 'no-store'
          })
          if (progressRes.ok) {
            const progressJson = await progressRes.json()
            userProgress = progressJson?.progress && typeof progressJson.progress === 'object' ? progressJson.progress : {}
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

        // Fetch learning path with subject separation
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
        } else {
          objectives = Object.values(pathsBySubject).flat()
        }

        if (objectives.length === 0) {
          // Fallback or empty state
          console.log("No specific objectives found");
        }

        // Transform to UI format
        const mappedModules: LearningModule[] = objectives
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
              mastery: progress?.mastery || 0, // Pass mastery (default to 0 if missing)
              nodeType,
              lastVisited: progress?.lastVisited,
              ...style
            }
          })


        setLearningModules(mappedModules)

        // Mascot Greeting Logic
        const completedCount = mappedModules.filter(m => m.status === 'completed').length
        setTimeout(() => {
          setMascotFeedback({
            tone: completedCount > 5 ? 'celebratory' : 'encouraging',
            message: completedCount > 0
              ? `You've conquered ${completedCount} missions! Use that knowledge wisely.`
              : "Every master was once a beginner. Start your first mission!",
            emoji: completedCount > 0 ? '🦉' : '🗺️',
            spriteClass: completedCount > 5 ? 'owl-happy' : 'owl-neutral'
          })
        }, 800)
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
    <div className="min-h-screen min-h-[100dvh] bg-[var(--bg-primary)] pb-24 md:pb-24 relative overflow-hidden safe-padding">
      {/* Background Decor */}
      <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-[var(--brand-primary)]/5 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-[var(--brand-secondary)]/5 rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-2xl mx-auto px-4 py-6 md:py-8 relative z-10">

        {/* Header Area */}
        <div className="text-center mb-10">
          <BrightHeading level={1} className="mb-2">
            Learning Path
          </BrightHeading>
          <p className="text-[var(--text-secondary)] font-medium">Your personalized journey to CXC success</p>
        </div>

        {/* Subject Filter - Improved Horizontal Scroll */}
        {subjects.length > 1 && (
          <div className="mb-8 -mx-4 overflow-hidden">
            <div className="overflow-x-auto no-scrollbar touch-pan-x px-4 pb-6">
              <div className="flex gap-4 items-center min-w-max pr-12">
                <button
                  onClick={(e) => {
                    setSelectedSubject(null);
                    e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                  }}
                  className={`
                    whitespace-nowrap px-6 py-4 rounded-2xl font-black tracking-wide transition-all border-b-4 
                    active:border-b-0 active:translate-y-[4px] flex-shrink-0
                    ${selectedSubject === null
                      ? 'bg-[#1cb0f6] border-[#1899d6] text-white shadow-lg'
                      : 'bg-[#1a1c1e] border-[#2f3336] text-[#afafaf] hover:bg-[#25282b]'
                    }
                  `}
                >
                  All Subjects
                </button>
                {subjects.map((subject) => (
                  <button
                    key={subject}
                    onClick={(e) => {
                      setSelectedSubject(subject);
                      e.currentTarget.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }}
                    className={`
                      whitespace-nowrap px-6 py-4 rounded-2xl font-black tracking-wide transition-all border-b-4 
                      active:border-b-0 active:translate-y-[4px] flex-shrink-0
                      ${selectedSubject === subject
                        ? 'bg-[#1cb0f6] border-[#1899d6] text-white shadow-lg'
                        : 'bg-[#1a1c1e] border-[#2f3336] text-[#afafaf] hover:bg-[#25282b]'
                      }
                    `}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Path Container */}
        <div className="relative flex flex-col items-center">

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
                <Link href="/welcome" className="block w-full">
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
              {subjects.length === 0 && !onboardingCompleted ? (
                <Link href="/welcome" className="text-[var(--brand-primary)] hover:underline font-black">
                  Complete onboarding to get started
                </Link>
              ) : (
                <div className="flex flex-col gap-4 items-center">
                  <p className="text-sm text-[var(--text-muted)]">Check another subject above or try resetting.</p>
                  <BrightButton
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.reload()}
                  >
                    Refresh
                  </BrightButton>
                </div>
              )}
            </div>
          )}

          {!loading && !error && learningModules.map((module, index) => {
            // Check if this is the module to animate unlocking
            const isUnlocking = shouldAnimateUnlock && module.status === 'current' && index > 0;
            const isNext = module.status === 'current' || (module.status === 'locked' && index > 0 && learningModules[index - 1].status === 'completed');

            // Find offsets for pathing
            const currentOffset = getHorizontalOffset(index, module.nodeType);
            const nextModule = index < learningModules.length - 1 ? learningModules[index + 1] : null;
            const nextOffset = nextModule ? getHorizontalOffset(index + 1, nextModule.nodeType) : 0;

            // Section Header every 5 modules
            const showHeader = index % 5 === 0;
            const moduleNum = Math.floor(index / 5) + 1;
            const headerTheme = moduleNum === 1 ? 'startup' : moduleNum === 2 ? 'growth' : moduleNum === 3 ? 'mastery' : 'default';

            return (
              <div key={module.id} className="w-full flex flex-col items-center">
                {/* Section Header */}
                {showHeader && (
                  <SectionHeader
                    moduleNumber={moduleNum}
                    title={moduleNum === 1 ? "The Startup Phase" : moduleNum === 2 ? "Growth & Scaling" : "Market Dominance"}
                    theme={headerTheme}
                    onOpenGuidebook={() => {
                      // Get all objectives for this section (current index to next 5)
                      const sectionModules = learningModules.slice(index, index + 5);
                      const sectionObjectives: GuidebookObjective[] = sectionModules.map(m => ({
                        id: String(m.id),
                        objective: m.title,
                        content: m.subject // Using subject or some other field as content for now
                      }));

                      setGuidebookState({
                        isOpen: true,
                        moduleNumber: moduleNum,
                        title: moduleNum === 1 ? "The Startup Phase" : moduleNum === 2 ? "Growth & Scaling" : "Market Dominance",
                        objectives: sectionObjectives,
                        theme: headerTheme
                      });
                    }}
                  />
                )}

                {/* Node Component with Floating Mascot for Current Node */}
                <div className="relative">
                  <LearningPathNode
                    {...module}
                    id={String(module.id)}
                    index={index}
                    isUnlocking={isUnlocking}
                  />

                  {/* Floating Mascot (Professor Bright) on current node */}
                  {module.status === 'current' && (
                    <motion.div
                      initial={{ opacity: 0, x: 0 }}
                      animate={{ opacity: 1, x: 120 }}
                      className="absolute top-[-20%] right-[-40%] z-20 pointer-events-none hidden md:block"
                    >
                      <motion.div
                        animate={{ y: [0, -10, 0], rotate: [0, -2, 2, 0] }}
                        transition={{
                          y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
                          rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" }
                        }}
                      >
                        <ProfessorBrightMascot
                          feedback={{
                            tone: 'encouraging',
                            message: "Keep going!",
                            emoji: '🦉',
                            spriteClass: 'owl-happy'
                          }}
                          mini
                        />
                      </motion.div>
                    </motion.div>
                  )}
                </div>

                {/* Connector Path (if not last) */}
                {index < learningModules.length - 1 && (
                  <PathConnector
                    fromIndex={index}
                    isCompleted={module.status === 'completed'}
                    isNext={isNext}
                    fromOffset={currentOffset}
                    toOffset={nextOffset}
                  />
                )}
              </div>
            )
          })}
        </div>


        {/* Development Tools */}
        <div className="mt-20 border-t border-[var(--border-subtle)] pt-10 text-center">
          <p className="text-[var(--text-muted)] text-xs uppercase tracking-widest mb-4">Reset Learning Map?</p>
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

      {/* Professor Bright Mascot */}
      <ProfessorBrightMascot feedback={mascotFeedback} webMode={true} />

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
