'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { useQuestionLoader } from '@/hooks/useQuestionLoader'
import { DuoSessionLayout, DuoProgressBar } from '@/components/simulation/DuoSessionLayout'
import DecisionCard from '@/components/simulation/DecisionCard'
import { DuoActionBar } from '@/components/simulation/DuoActionBar'
import { DuoMascotBubble } from '@/components/simulation/DuoMascotBubble'
import ExplanationPanel from '@/components/learning/ExplanationPanel'
import { LevelCompletionScreen, StreakCelebration } from '@/components/learning'
import { getProfessorBrightFeedback, FeedbackResponse } from '@/lib/professor-bright'

interface SimulationStep {
  id: number
  type: 'decision' | 'outcome' | 'explanation' | 'reflection'
  content: string
  options?: string[]
  correctAnswer?: number
  subSkills?: string[]
  questionDifficulty?: number
  explanation?: string
  relatedConcepts?: string[]
}

interface SessionStats {
  questionsAnswered: number
  correctAnswers: number
  streak: number
  xpGained: number
}

function LessonLoadingFallback() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full border-4 border-t-[var(--brand-primary)] border-r-transparent border-b-[var(--brand-primary)] border-l-transparent animate-spin mx-auto mb-6" />
        <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2">Loading Lesson</h2>
        <p className="text-[var(--text-muted)] animate-pulse">Professor Bright is finding the perfect question...</p>
      </div>
    </div>
  )
}

export default function LessonPageWrapper() {
  return (
    <Suspense fallback={<LessonLoadingFallback />}>
      <LessonPage />
    </Suspense>
  )
}

function LessonPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const objectiveId = searchParams?.get('objective') || searchParams?.get('objectiveId') || null
  const subjectId = searchParams?.get('subject') || searchParams?.get('subjectId') || null
  const { user, userData, loading: authLoading } = useAuth()

  // Token Cache for authenticated requests
  const tokenCache = useRef<{ token: string | null; expiry: number }>({ token: null, expiry: 0 })

  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    if (!user) throw new Error("No user found")

    let token = tokenCache.current.token
    const now = Date.now()

    if (!token || now > tokenCache.current.expiry) {
      try {
        token = await user.getIdToken(true)
        tokenCache.current = { token, expiry: now + 5 * 60 * 1000 }
      } catch (tokenError) {
        console.error("Failed to refresh Firebase token:", tokenError)
        tokenCache.current = { token: null, expiry: 0 }
        throw new Error("Authentication expired. Please log in again.")
      }
    }

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
  }, [user])

  // Question loader hook
  const {
    loading,
    error,
    simulationSteps,
    setSimulationSteps,
    objectiveInfo,
    setObjectiveInfo,
    questionVariation,
    setQuestionVariation,
    earnedStars,
    setEarnedStars,
    isComplete,
    setIsComplete,
    starJustEarned,
    setStarJustEarned,
    setLoading,
    setError,
  } = useQuestionLoader({
    objectiveId,
    subjectId,
    user,
    userData,
    authLoading,
    authenticatedFetch
  })

  // UI State
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [questionBuffer, setQuestionBuffer] = useState<SimulationStep[][]>([])
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null)
  const [answerStartTime, setAnswerStartTime] = useState<number>(Date.now())

  // Enhanced State
  const [showExplanation, setShowExplanation] = useState(false)
  const [sessionStats, setSessionStats] = useState<SessionStats>({
    questionsAnswered: 0,
    correctAnswers: 0,
    streak: 0,
    xpGained: 0
  })

  // NABLE State
  const [nableResponse, setNableResponse] = useState<{
    recommendedUIMood: string
    currentStreak: number
    confidence: number
  } | null>(null)

  // Professor Bright feedback and streak celebration
  const [showStreakCelebration, setShowStreakCelebration] = useState(false)
  const [professorFeedback, setProfessorFeedback] = useState<FeedbackResponse | null>(null)
  const previousStreakRef = useRef<number>(0)

  const step = simulationSteps[currentStep]

  // Generate variation based on timestamp and objective
  const variation = (parseInt(objectiveId?.replace(/\D/g, '') || '0') || 0) % 10

  // Prefetch next question
  const prefetchNextQuestion = useCallback(async () => {
    if (!objectiveId || !subjectId) return

    const subjectParam = `&subjectId=${encodeURIComponent(subjectId)}`
    const nextVariation = variation + questionBuffer.length + 1

    try {
      const masteryParam = userData?.mastery ? `&mastery=${userData.mastery}` : ''
      const res = await authenticatedFetch(`/api/questions/generate?objectiveId=${objectiveId}&variation=${nextVariation}&useAI=false${subjectParam}${masteryParam}`)
      if (res.ok) {
        const data = await res.json()
        if (data.simulationSteps && (data.objective?.subject === subjectId || !data.objective?.subject)) {
          setQuestionBuffer(prev => [...prev, data.simulationSteps])
        }
      }
    } catch (err) {
      console.warn('Failed to prefetch next question:', err)
    }
  }, [objectiveId, subjectId, userData?.mastery, questionBuffer.length, variation, authenticatedFetch])

  // Generate new question
  const generateNewQuestion = useCallback(async () => {
    if (!subjectId) {
      setError('Subject information is missing. Please go back and select a subject.')
      return
    }

    if (questionBuffer.length > 0) {
      const nextQuestion = questionBuffer[0]
      setQuestionBuffer(prev => prev.slice(1))
      setSimulationSteps(nextQuestion)
      setCurrentStep(0)
      setSelectedAnswer(null)
      setShowFeedback(false)
      setShowExplanation(false)
      setIsAnswerCorrect(null)
      setAnswerStartTime(Date.now())

      if (questionBuffer.length <= 2) {
        prefetchNextQuestion()
      }
    } else {
      setQuestionVariation(prev => prev + 1)
      setCurrentStep(0)
      setSelectedAnswer(null)
      setShowFeedback(false)
      setShowExplanation(false)
      setIsAnswerCorrect(null)
      setAnswerStartTime(Date.now())
      setLoading(true)

      try {
        const subjectParam = `&subjectId=${encodeURIComponent(subjectId)}`
        const masteryParam = userData?.mastery ? `&mastery=${userData.mastery}` : ''
        const newVariation = questionVariation + 1
        const res = await authenticatedFetch(`/api/questions/generate?objectiveId=${objectiveId}&variation=${newVariation}&useAI=false${subjectParam}${masteryParam}`)

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to generate question')
        }

        const data = await res.json()

        if (data.objective?.subject && data.objective.subject !== subjectId) {
          setError(`Subject mismatch: Got ${data.objective.subject} but expected ${subjectId}`)
          return
        }

        if (data.simulationSteps && data.simulationSteps.length > 0) {
          setSimulationSteps(data.simulationSteps)
          setObjectiveInfo(data.objective)
          setLoading(false)
        } else {
          throw new Error('No questions generated')
        }
      } catch (err) {
        console.error('Error generating new question:', err)
        setError('Failed to generate new question. Please try again.')
        setLoading(false)
      }
    }
  }, [subjectId, questionBuffer, questionVariation, objectiveId, userData?.mastery, setSimulationSteps, setObjectiveInfo, setLoading, setError, prefetchNextQuestion, authenticatedFetch, setQuestionVariation])

  // Handle answer submission
  const handleAnswer = async (answerIndex: number) => {
    if (!user || !step) return

    setSelectedAnswer(answerIndex)
    setShowFeedback(true)
    setIsTransitioning(true)

    const isCorrect = answerIndex === step.correctAnswer
    setIsAnswerCorrect(isCorrect)

    const timeToAnswer = Math.round((Date.now() - answerStartTime) / 1000)

    // Update session stats
    setSessionStats(prev => ({
      questionsAnswered: prev.questionsAnswered + 1,
      correctAnswers: isCorrect ? prev.correctAnswers + 1 : prev.correctAnswers,
      streak: isCorrect ? prev.streak + 1 : 0,
      xpGained: prev.xpGained + (isCorrect ? 50 : 10)
    }))

    // Call NABLE Engine
    try {
      const resolvedQuestionId = (step as any)?.questionId || `${objectiveId}-${questionVariation}`
      const nableRes = await authenticatedFetch('/api/nable/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.uid,
          questionId: resolvedQuestionId,
          objectiveId: objectiveId,
          selectedAnswer: answerIndex,
          options: step.options || [],
          timeToAnswer,
          subSkills: Array.isArray(step.subSkills) && step.subSkills.length > 0 ? step.subSkills : [objectiveId].filter(Boolean),
          questionDifficulty: step.questionDifficulty || objectiveInfo?.difficulty || 5
        })
      })

      if (nableRes.ok) {
        const nableData = await nableRes.json()

        const nextStars = nableData?.progress?.stars
        if (typeof nextStars === 'number') {
          if (nextStars > earnedStars) {
            setStarJustEarned(true)
            setTimeout(() => setStarJustEarned(false), 1500)
          }
          setEarnedStars(nextStars)
        }

        if (nableData?.progress?.completed === true) {
          setIsComplete(true)
        }

        setNableResponse({
          recommendedUIMood: nableData.recommendedUIMood || 'Encouraging',
          currentStreak: nableData.currentStreak || 0,
          confidence: nableData.confidence,
        })

        // Generate Professor Bright feedback
        const currentStreak = nableData.currentStreak || 0
        const mastery = nableData.masteryDelta?.[objectiveId || ''] || 0.5
        const feedback = getProfessorBrightFeedback(
          isCorrect,
          nableData.errorClassification,
          currentStreak,
          mastery,
          timeToAnswer
        )
        setProfessorFeedback(feedback)

        // Trigger streak celebration on milestones
        const isMilestone = [5, 10, 15, 20].includes(currentStreak)
        const wasNotAtMilestone = ![5, 10, 15, 20].includes(previousStreakRef.current)
        if (isCorrect && isMilestone && wasNotAtMilestone) {
          setShowStreakCelebration(true)
        }
        previousStreakRef.current = currentStreak

        setTimeout(() => {
          setShowExplanation(true)
          setIsTransitioning(false)
        }, 800)
      }
    } catch (err) {
      const feedback = getProfessorBrightFeedback(isCorrect, null, 0, 0.5, timeToAnswer)
      setProfessorFeedback(feedback)
      console.warn('NABLE evaluation failed:', err)

      setTimeout(() => {
        setShowExplanation(true)
        setIsTransitioning(false)
      }, 800)
    }

    if (questionBuffer.length <= 2 && subjectId) {
      prefetchNextQuestion()
    }
  }

  const handleContinue = () => {
    if (isComplete) {
      return
    }

    if (earnedStars >= 3) {
      setIsComplete(true)
      return
    }

    setIsTransitioning(true)
    setShowExplanation(false)
    setShowFeedback(false)
    setSelectedAnswer(null)
    setIsAnswerCorrect(null)

    setTimeout(() => {
      generateNewQuestion()
      setIsTransitioning(false)
    }, 300)
  }

  const handleLevelComplete = () => {
    router.push('/learn?animation=unlock')
  }

  const handleRetry = () => {
    setIsComplete(false)
    setEarnedStars(0)
    setSessionStats({
      questionsAnswered: 0,
      correctAnswers: 0,
      streak: 0,
      xpGained: 0
    })
    generateNewQuestion()
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-4 border-t-[var(--brand-primary)] border-r-transparent border-b-[var(--brand-primary)] border-l-transparent animate-spin mx-auto mb-6" />
          <h2 className="text-2xl font-black text-[var(--text-primary)] mb-2">Loading Lesson</h2>
          <p className="text-[var(--text-muted)] animate-pulse">Professor Bright is finding the perfect question...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error && simulationSteps.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="text-center max-w-md p-8 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
          <div className="text-6xl mb-4">😅</div>
          <h2 className="text-2xl font-black mb-2 text-[var(--text-primary)]">Oops!</h2>
          <p className="text-[var(--text-secondary)] mb-6">{error}</p>
          <Link
            href="/learn"
            className="inline-block w-full py-4 rounded-2xl font-black text-white bg-[var(--brand-primary)] border-b-[6px] border-[#0284c7] hover:bg-[#0ea5e9] active:border-b-0 active:translate-y-[4px] transition-all uppercase tracking-widest"
          >
            Go Back
          </Link>
        </div>
      </div>
    )
  }

  // Level Complete state
  if (isComplete) {
    const accuracy = sessionStats.questionsAnswered > 0
      ? Math.round((sessionStats.correctAnswers / sessionStats.questionsAnswered) * 100)
      : 0

    return (
      <LevelCompletionScreen
        levelName={objectiveInfo?.title || 'Learning Objective'}
        subject={subjectId || 'General'}
        starsEarned={earnedStars}
        totalStars={3}
        streak={nableResponse?.currentStreak || sessionStats.streak}
        masteryPercentage={Math.round((nableResponse?.confidence || 0.5) * 100)}
        consistencyPercentage={userData?.consistency || 0}
        xpGained={sessionStats.xpGained}
        questionsAnswered={sessionStats.questionsAnswered}
        accuracy={accuracy}
        onContinue={handleLevelComplete}
        onRetry={handleRetry}
      />
    )
  }

  if (!step) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="text-center max-w-md p-8 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)]">
          <p className="text-[var(--text-secondary)] mb-6">No question available for this objective.</p>
          <Link
            href="/learn"
            className="inline-block w-full py-4 rounded-2xl font-black text-white bg-[var(--brand-primary)] border-b-[6px] border-[#0284c7] hover:bg-[#0ea5e9] active:border-b-0 active:translate-y-[4px] transition-all uppercase tracking-widest"
          >
            Back to Path
          </Link>
        </div>
      </div>
    )
  }

  return (
    <DuoSessionLayout
      currentStep={currentStep}
      totalSteps={simulationSteps.length}
      hearts={5} // Placeholder for lives system
      streak={sessionStats.streak}
      onClose={() => router.push('/learn')}
    >
      <div className="w-full py-4 md:py-8 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {showExplanation ? (
            <ExplanationPanel
              key="explanation"
              question={step.content}
              selectedAnswer={step.options?.[selectedAnswer || 0] || 'No answer'}
              correctAnswer={step.options?.[step.correctAnswer || 0] || 'Unknown'}
              explanation={step.explanation || `The correct answer is "${step.options?.[step.correctAnswer || 0]}".`}
              isCorrect={isAnswerCorrect || false}
              relatedConcepts={step.relatedConcepts || []}
              onContinue={handleContinue}
              onTryAgain={!isAnswerCorrect ? handleRetry : undefined}
            />
          ) : (
            <motion.div
              key="question"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              <DuoMascotBubble
                content={step.content}
                emotion={professorFeedback?.spriteClass || 'owl-happy'}
              />

              <div className="grid gap-4 mt-8">
                {step.options?.map((option: string, index: number) => (
                  <DecisionCard
                    key={index}
                    option={option}
                    index={index}
                    isSelected={selectedAnswer === index}
                    isCorrect={index === step.correctAnswer}
                    showResult={showFeedback}
                    disabled={showFeedback}
                    onSelect={() => !showFeedback && setSelectedAnswer(index)}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!showExplanation && (
        <DuoActionBar
          status={
            showFeedback
              ? (isAnswerCorrect ? 'correct' : 'wrong')
              : (selectedAnswer !== null ? 'selected' : 'idle')
          }
          onCheck={() => selectedAnswer !== null && handleAnswer(selectedAnswer)}
          onContinue={handleContinue}
          feedbackTitle={isAnswerCorrect ? 'Excellent!' : 'Correct solution:'}
          feedbackMessage={isAnswerCorrect ? professorFeedback?.message : step.options?.[step.correctAnswer || 0]}
        />
      )}

      <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
        <StreakCelebration
          streak={sessionStats.streak}
          show={showStreakCelebration}
          onClose={() => setShowStreakCelebration(false)}
        />
      </div>
    </DuoSessionLayout>
  )
}
