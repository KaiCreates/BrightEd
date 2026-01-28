'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { getTotalXP } from '@/lib/xp-tracker'
import Link from 'next/link'
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system'
import { useAuth } from '@/lib/auth-context'

interface CompletionData {
  subject: string
  completed: number
  total: number
  percentage: number
  icon: string
  color: string
  bg: string
}

export default function ProgressPage() {
  const { user, userData } = useAuth()
  const [completions, setCompletions] = useState<CompletionData[]>([])
  const [totalXP, setTotalXP] = useState(0)
  const [streak, setStreak] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      if (!user || !userData) return

      try {
        // Source of truth from Auth Context
        setTotalXP(userData.xp || 0)
        setStreak(userData.streak || 0)

        // Fetch granular progress from Firestore subcollection
        const { db } = await import('@/lib/firebase')
        const { collection, getDocs } = await import('firebase/firestore')

        const progressRef = collection(db, 'users', user.uid, 'progress')
        const snapshot = await getDocs(progressRef)
        const userProgress: Record<string, any> = {}
        snapshot.forEach(doc => {
          userProgress[doc.id] = doc.data()
        })

        // Fetch Syllabus
        const objectivesResponse = await fetch('/api/syllabus')
        const objectives: any[] = await objectivesResponse.json()

        const subjects = userData.subjects || []
        const subjectsData: CompletionData[] = []

        // Get unique subjects from syllabus + user selection
        const allSubjects = new Set([...subjects, ...objectives.map((o: any) => extractSubjectFromFile(o.source_file))])

        allSubjects.forEach((subject: unknown) => {
          const subjName = subject as string
          const subjectObjectives = objectives.filter((o: any) =>
            extractSubjectFromFile(o.source_file).toLowerCase().includes(subjName.toLowerCase())
          )

          if (subjectObjectives.length > 0) {
            const style = getSubjectStyle(subjName)
            const completed = subjectObjectives.filter((o: any) => {
              const p = userProgress[o.id] // Use firestore data
              // Check if mastered (mastery >= 0.8 or 80, handle both scales)
              const m = p?.mastery || 0
              return m >= 85 || m >= 0.85
            }).length

            subjectsData.push({
              subject: subjName,
              completed,
              total: subjectObjectives.length,
              percentage: Math.round((completed / subjectObjectives.length) * 100),
              ...style
            })
          }
        })

        setCompletions(subjectsData.sort((a, b) => b.percentage - a.percentage))
        setLoading(false)

      } catch (error) {
        console.error("Failed to load progress:", error)
        setLoading(false)
      }
    }

    if (user && userData) {
      loadData()
    }
  }, [user, userData])

  const achievements = useMemo(() => {
    const list = []
    if (totalXP > 100) list.push({ icon: '🥉', title: 'Bronze Learner', desc: 'Earned 100+ XP' })
    if (totalXP > 500) list.push({ icon: '🥈', title: 'Silver Scholar', desc: 'Earned 500+ XP' })
    if (totalXP > 1000) list.push({ icon: '🥇', title: 'Gold Master', desc: 'Earned 1000+ XP' })
    if (streak >= 3) list.push({ icon: '🔥', title: 'On Fire', desc: '3 Day Streak' })
    return list
  }, [totalXP, streak])

  function extractSubjectFromFile(sourceFile: string): string {
    const lower = sourceFile.toLowerCase()
    if (lower.includes('mathematics') || lower.includes('math')) return 'Mathematics'
    if (lower.includes('english')) return 'English'
    if (lower.includes('business') || lower.includes('pob')) return 'Principles of Business'
    if (lower.includes('economic')) return 'Economics'
    if (lower.includes('biology')) return 'Biology'
    if (lower.includes('chemistry')) return 'Chemistry'
    if (lower.includes('social')) return 'Social Studies'
    if (lower.includes('information') || lower.includes('technology') || lower.includes('it')) return 'Information Technology'
    if (lower.includes('geography')) return 'Geography'
    return 'General'
  }

  function getSubjectStyle(subject: string): { icon: string; color: string; bg: string } {
    const lower = subject.toLowerCase()
    if (lower.includes('math')) return { icon: '📐', color: 'var(--accent-cyan)', bg: 'rgba(7, 190, 184, 0.1)' }
    if (lower.includes('business')) return { icon: '💼', color: 'var(--brand-primary)', bg: 'var(--brand-primary-light)' }
    if (lower.includes('economic')) return { icon: '📊', color: 'var(--accent-green)', bg: 'rgba(76, 175, 80, 0.1)' }
    if (lower.includes('english')) return { icon: '📝', color: 'var(--brand-secondary)', bg: 'var(--brand-secondary-light)' }
    if (lower.includes('science') || lower.includes('bio')) return { icon: '🔬', color: 'var(--accent-blue)', bg: 'rgba(33, 150, 243, 0.1)' }
    if (lower.includes('chem')) return { icon: '⚗️', color: 'var(--brand-tertiary)', bg: 'var(--brand-tertiary-light)' }
    if (lower.includes('it') || lower.includes('tech')) return { icon: '💻', color: 'var(--accent-purple)', bg: 'rgba(156, 39, 176, 0.1)' }
    return { icon: '📚', color: 'var(--text-secondary)', bg: 'var(--bg-secondary)' }
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] pb-20">
      <div className="bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-secondary)] pb-24 pt-12 px-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div>
              <BrightHeading level={1} className="text-white mb-2">Growth Journey</BrightHeading>
              <p className="text-white/80 text-lg font-medium">Tracking your mastery and achievements</p>
            </div>
            <div className="hidden md:block">
              <BrightLayer variant="glass" padding="none" className="w-16 h-16 rounded-full flex items-center justify-center text-3xl">
                👤
              </BrightLayer>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 -mt-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <BrightLayer variant="elevated" className="h-full">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[var(--text-secondary)] font-black uppercase text-[10px] tracking-[0.2em]">Streak</span>
                <span className="text-2xl">🔥</span>
              </div>
              <div className="text-4xl font-black text-[var(--text-primary)] mb-2">{streak} <span className="text-lg font-bold text-[var(--text-secondary)]">days</span></div>
              <div className="w-full bg-[var(--bg-secondary)] rounded-full h-2 mt-4 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (streak / 7) * 100)}%` }}
                  className="bg-[var(--brand-primary)] h-full rounded-full"
                />
              </div>
            </BrightLayer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <BrightLayer variant="elevated" className="h-full">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[var(--text-secondary)] font-black uppercase text-[10px] tracking-[0.2em]">Total XP</span>
                <span className="text-2xl">⭐</span>
              </div>
              <div className="text-4xl font-black text-[var(--text-primary)] mb-2">{totalXP.toLocaleString()}</div>
              <div className="text-sm text-[var(--accent-green)] font-bold">Growing fast</div>
            </BrightLayer>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <BrightLayer variant="elevated" className="h-full">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[var(--text-secondary)] font-black uppercase text-[10px] tracking-[0.2em]">Mastered</span>
                <span className="text-2xl">🎓</span>
              </div>
              <div className="text-4xl font-black text-[var(--text-primary)] mb-2">
                {completions.reduce((acc, curr) => acc + curr.completed, 0)}
              </div>
              <p className="text-sm text-[var(--text-secondary)] font-medium">Across {completions.length} subjects</p>
            </BrightLayer>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
            >
              <BrightHeading level={2} className="mb-8 flex items-center gap-3">
                <span>📊</span> Subject Mastery
              </BrightHeading>

              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <BrightLayer key={i} variant="elevated" className="h-28 animate-pulse" />
                  ))}
                </div>
              ) : (
                <div className="space-y-4">
                  {completions.map((item, index) => (
                    <motion.div
                      key={item.subject}
                      initial={{ x: -20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.1 * index }}
                    >
                      <BrightLayer variant="elevated" padding="md" className="hover:border-[var(--brand-primary)]/30 transition-all">
                        <div className="flex items-start justify-between mb-5">
                          <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner`} style={{ backgroundColor: item.bg }}>
                              {item.icon}
                            </div>
                            <div>
                              <h3 className="font-bold text-xl text-[var(--text-primary)]">{item.subject}</h3>
                              <p className="text-sm text-[var(--text-secondary)] font-bold">{item.completed}/{item.total} Objectives</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-black" style={{ color: item.color }}>
                              {item.percentage}%
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-[var(--bg-secondary)] rounded-full h-4 overflow-hidden border border-[var(--border-subtle)]">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${item.percentage}%` }}
                            transition={{ duration: 1.2, ease: "easeOut" }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                        </div>
                      </BrightLayer>
                    </motion.div>
                  ))}
                  {completions.length === 0 && (
                    <BrightLayer variant="secondary" className="text-center py-16 border-dashed">
                      <p className="text-[var(--text-secondary)] mb-6 font-bold">No subjects started yet.</p>
                      <Link href="/learn">
                        <BrightButton size="lg">Start Learning</BrightButton>
                      </Link>
                    </BrightLayer>
                  )}
                </div>
              )}
            </motion.div>
          </div>

          <div className="space-y-8">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <BrightLayer variant="glass" padding="md">
                <BrightHeading level={3} className="mb-6">🏆 Achievements</BrightHeading>
                <div className="space-y-4">
                  {achievements.length > 0 ? achievements.map((ach, i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-subtle)] transition-all hover:scale-[1.02]">
                      <div className="text-4xl drop-shadow-md">{ach.icon}</div>
                      <div>
                        <div className="font-bold text-[var(--text-primary)]">{ach.title}</div>
                        <div className="text-xs text-[var(--text-secondary)] font-medium">{ach.desc}</div>
                      </div>
                    </div>
                  )) : (
                    <p className="text-[var(--text-secondary)] text-sm text-center py-8 font-bold italic opacity-60">Complete lessons to earn badges!</p>
                  )}
                  <BrightButton variant="ghost" className="w-full" size="sm">
                    View All Badges
                  </BrightButton>
                </div>
              </BrightLayer>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 }}
            >
              <BrightLayer variant="elevated" padding="md">
                <BrightHeading level={3} className="mb-6">📅 Activity</BrightHeading>
                <div className="grid grid-cols-7 gap-1.5 p-1">
                  {[...Array(28)].map((_, i) => (
                    <div
                      key={i}
                      className={`aspect-square rounded-md border border-white/5 ${Math.random() > 0.7 ? 'bg-[var(--brand-primary)]' :
                        Math.random() > 0.4 ? 'bg-[var(--brand-primary)]/30' : 'bg-[var(--bg-secondary)]'
                        }`}
                    />
                  ))}
                </div>
                <p className="text-[10px] text-center text-[var(--text-secondary)] uppercase font-black tracking-widest mt-6">Last 4 weeks</p>
              </BrightLayer>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  )
}
