'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import DragDropQuestion from '@/app/components/DragDropQuestion'
import FormulaBuilder from '@/app/components/FormulaBuilder'
import MathDiagram from '@/app/components/MathDiagram'
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system'
import { useAuth } from '@/lib/auth-context'
import { useQuestionLoader } from '@/app/hooks/useQuestionLoader'

interface SimulationStep {
  id: number
  type: 'decision' | 'outcome' | 'explanation' | 'reflection'
  content: string
  options?: string[]
  correctAnswer?: number
  storyElement?: string
  questionType?: 'multiple-choice' | 'drag-drop' | 'formula-builder'
  interactiveData?: {
    items?: string[]
    correctOrder?: number[]
    formulaParts?: string[]
    correctFormula?: string[]
    diagramType?: 'geometry' | 'graph' | 'equation'
    diagramData?: any
  }
}

export default function SimulatePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const objectiveId = searchParams.get('objective') || searchParams.get('objectiveId')
  const subjectId = searchParams.get('subject') || searchParams.get('subjectId')
  const { user, userData, loading: authLoading } = useAuth()


  // TOKEN CACHE & AUTHENTICATED FETCH
  // Token Cache primarily for preventing rapid refreshes
  const tokenCache = useRef<{ token: string | null; expiry: number }>({ token: null, expiry: 0 });

  // Helper for authenticated requests
  const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
    if (!user) throw new Error("No user found");

    let token = tokenCache.current.token;
    const now = Date.now();

    // Use cache if valid (5 min window), otherwise refresh
    if (!token || now > tokenCache.current.expiry) {
      token = await user.getIdToken(true); // Force refresh from Firebase
      tokenCache.current = {
        token,
        expiry: now + 5 * 60 * 1000 // Cache for 5 mins
      };
    }

    return fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  };

  // EXTRACTED HOOK LOGIC (Validation, Auth, Caching, Race Condition Fixes)
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
    nableState // NEW: NABLE State
  } = useQuestionLoader({
    objectiveId,
    subjectId,
    user,
    userData,
    authLoading,
    authenticatedFetch
  });

  // NABLE Engine state
  const [nableResponse, setNableResponse] = useState<{
    recommendedUIMood: 'Encouraging' | 'Challenging' | 'Supportive' | 'Celebratory';
    errorClassification: 'conceptual' | 'careless' | null;
    microLessonRequired: boolean;
    microLesson: { title: string; content: string; examples: string[] } | null;
    confidence: number;
    blockedProgression: boolean;
    currentStreak: number;
    masteryDelta: Record<string, number>;
  } | null>(null)
  const [showMicroLesson, setShowMicroLesson] = useState(false)
  const [answerStartTime, setAnswerStartTime] = useState<number>(Date.now())

  // Local UI State (Not covered by hook)
  const [currentStep, setCurrentStep] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [questionBuffer, setQuestionBuffer] = useState<SimulationStep[][]>([])
  const [showHint, setShowHint] = useState(false)
  const [hintContent, setHintContent] = useState<string>('')
  const [isAnswerCorrect, setIsAnswerCorrect] = useState<boolean | null>(null)

  // Generate variation based on timestamp and objective to ensure different questions
  // Used for ID generation
  const variation = (parseInt(objectiveId?.replace(/\D/g, '') || '0') || 0) % 10;

  const generateNewQuestion = async () => {
    // CRITICAL: Always use subjectId when generating new questions
    if (!subjectId) {
      console.error('Cannot generate new question: subjectId is missing!')
      setError('Subject information is missing. Please go back and select a subject.')
      return
    }

    // Use prefetched question if available (they should all have correct subjectId)
    if (questionBuffer.length > 0) {
      const nextQuestion = questionBuffer[0]
      setQuestionBuffer(prev => prev.slice(1))
      setSimulationSteps(nextQuestion)
      setCurrentStep(0)
      setSelectedAnswer(null)
      setShowFeedback(false)
      setShowHint(false)

      // Prefetch next question in background
      if (questionBuffer.length <= 2) {
        prefetchNextQuestion()
      }
    } else {
      // Generate new question with subjectId - force reload
      setQuestionVariation(prev => prev + 1)
      setCurrentStep(0)
      setSelectedAnswer(null)
      setShowFeedback(false)
      setShowHint(false)
      setLoading(true)

      // Manually fetch new question to ensure subjectId is used
      try {
        const subjectParam = `&subjectId=${encodeURIComponent(subjectId)}`
        const masteryParam = userData?.mastery ? `&mastery=${userData.mastery}` : ''
        const newVariation = questionVariation + 1
        const res = await authenticatedFetch(`/api/questions/generate?objectiveId=${objectiveId}&variation=${newVariation}&useAI=false${subjectParam}${masteryParam}`)

        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}))
          if (res.status === 400 && errorData.error && errorData.error.includes('Subject mismatch')) {
            setError(`Subject mismatch: This objective doesn't belong to ${subjectId}.`)
            setTimeout(() => {
              router.push('/learn')
            }, 3000)
            return
          }
          throw new Error(errorData.error || 'Failed to generate question')
        }

        const data = await res.json()

        // Validate subject matches
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
  }

  const prefetchNextQuestion = async () => {
    if (!objectiveId || !subjectId) return // CRITICAL: Must have both

    const subjectParam = `&subjectId=${encodeURIComponent(subjectId)}`
    const nextVariation = variation + questionBuffer.length + 1

    try {
      const masteryParam = userData?.mastery ? `&mastery=${userData.mastery}` : ''
      const res = await authenticatedFetch(`/api/questions/generate?objectiveId=${objectiveId}&variation=${nextVariation}&useAI=false${subjectParam}${masteryParam}`)
      if (res.ok) {
        const data = await res.json()
        // Validate subject matches before adding to buffer
        if (data.simulationSteps && (data.objective?.subject === subjectId || !data.objective?.subject)) {
          setQuestionBuffer(prev => [...prev, data.simulationSteps])
        } else {
          console.warn(`Prefetched question subject mismatch: expected ${subjectId}, got ${data.objective?.subject}`)
        }
      }
    } catch (err) {
      console.warn('Failed to prefetch next question:', err)
    }
  }

  const step = simulationSteps[currentStep]

  const handleAnswer = async (answerIndex: number) => {
    if (!user) return

    setSelectedAnswer(answerIndex)
    setShowFeedback(true)
    setIsTransitioning(true)

    const isCorrect = answerIndex === step.correctAnswer
    setIsAnswerCorrect(isCorrect) // Store correctness for outcome step

    // Calculate time to answer
    const timeToAnswer = Math.round((Date.now() - answerStartTime) / 1000)

    // Call NABLE Engine for adaptive learning
    try {
      const resolvedQuestionId = (step as any)?.questionId || `${objectiveId}-${questionVariation}`
      const nableRes = await authenticatedFetch('/api/nable/evaluate', {
        method: 'POST',
        body: JSON.stringify({
          userId: user.uid,
          questionId: resolvedQuestionId,
          objectiveId: objectiveId,
          selectedAnswer: answerIndex,
          correctAnswer: step.correctAnswer || 0,
          options: step.options || [],
          timeToAnswer,
          subSkills: [objectiveId, subjectId].filter(Boolean),
          questionDifficulty: objectiveInfo?.difficulty || 5,
          knowledgeGraph: nableState?.knowledgeGraph || {} // CRITICAL: Pass current knowledge state
        })
      })

      if (nableRes.ok) {
        const nableData = await nableRes.json()
        setNableResponse({
          recommendedUIMood: nableData.recommendedUIMood || 'Encouraging',
          errorClassification: nableData.errorClassification,
          microLessonRequired: nableData.microLessonRequired,
          microLesson: nableData.microLesson,
          confidence: nableData.confidence,
          blockedProgression: nableData.blockedProgression,
          currentStreak: nableData.currentStreak || 0,
          masteryDelta: nableData.masteryDelta || {}
        })

        // Show micro-lesson if needed (conceptual error)
        if (nableData.microLessonRequired && nableData.microLesson) {
          setShowMicroLesson(true)
        }
      }
    } catch (err) {
      console.warn('NABLE evaluation failed:', err)
    }

    // Update outcome step based on correctness
    if (simulationSteps.length > 1 && simulationSteps[1].type === 'outcome') {
      const updatedSteps = [...simulationSteps]
      if (isCorrect) {
        updatedSteps[1] = {
          ...updatedSteps[1],
          content: `You selected "${step.options?.[answerIndex]}". This is correct! You demonstrate good understanding of the concept.`,
          storyElement: '🎉 Great decision!'
        }
      } else {
        updatedSteps[1] = {
          ...updatedSteps[1],
          content: `You selected "${step.options?.[answerIndex]}". That&apos;s not quite right. The correct answer is "${step.options?.[step.correctAnswer || 0]}". Let&apos;s learn why.`,
          storyElement: '📚 Learning opportunity!'
        }
      }
      setSimulationSteps(updatedSteps)
    }

    // If wrong answer, show hint option
    if (!isCorrect && step.type === 'decision') {
      // Try to get hint from objective content
      const masteryParam = userData?.mastery ? `&mastery=${userData.mastery}` : ''
      authenticatedFetch(`/api/questions/generate?objectiveId=${objectiveId}&variation=${variation}&useAI=false${subjectId ? `&subjectId=${encodeURIComponent(subjectId)}` : ''}${masteryParam}`)
        .then(res => res.json())
        .then(data => {
          if (data.objective?.content) {
            setHintContent(data.objective.content.substring(0, 200))
          }
        })
        .catch(() => { })
    }

    // Prefetch next question when user answers (for seamless transition) - only if subjectId exists
    if (currentStep === 0 && questionBuffer.length <= 2 && subjectId) {
      prefetchNextQuestion()
    }

    // Reset answer timer for next question
    setAnswerStartTime(Date.now())

    setTimeout(() => {
      if (currentStep < simulationSteps.length - 1) {
        setCurrentStep(currentStep + 1)
        setSelectedAnswer(null)
        setShowFeedback(false)
        setIsTransitioning(false)
        setShowHint(false)
        setShowMicroLesson(false)
      }
    }, 2500)
  }

  const nextStep = () => {
    setIsTransitioning(true)
    setTimeout(() => {
      if (currentStep < simulationSteps.length - 1) {
        setCurrentStep(currentStep + 1)
        setSelectedAnswer(null)
        setShowFeedback(false)
        setIsTransitioning(false)
      }
    }, 300)
  }

  const handleComplete = async () => {
    if (!user) return

    // Determine if answer was correct
    const correct = isAnswerCorrect !== null ? isAnswerCorrect : (selectedAnswer === step.correctAnswer)

    // Calculate new stars based on current earned stars
    let newStars = earnedStars;

    if (correct && earnedStars < 3) {
      // Only increment stars on correct answer and if not already at max
      newStars = earnedStars + 1;

      // IMMEDIATELY update local state (optimistic update)
      setEarnedStars(newStars);

      // Trigger star animation
      setStarJustEarned(true);
      setTimeout(() => setStarJustEarned(false), 1500);
    }

    try {
      // Direct Firestore Write (Client SDK has Auth context)
      if (correct) {
        const { doc, setDoc, getDoc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase');

        const progressRef = doc(db, 'users', user.uid, 'progress', objectiveId as string);
        const userRef = doc(db, 'users', user.uid);

        // 1. Update Progress
        await setDoc(progressRef, {
          objectiveId,
          stars: newStars,
          completed: newStars >= 3,
          lastAttempt: new Date().toISOString()
        }, { merge: true });

        // 2. Update XP
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const curXP = userDoc.data()?.xp || 0;
          await setDoc(userRef, { xp: curXP + 10 }, { merge: true });
        }

        console.log(`Progress saved: ${objectiveId} now has ${newStars} stars`);
      }
    } catch (e) {
      console.error('Failed to save progress:', e);
      // Optional: Rollback if critical, but local state is already updated
      setEarnedStars(earnedStars);
    }

    // Check if we've completed the objective (3 stars)
    if (newStars >= 3) {
      // Celebration! Node completed
      setIsComplete(true);
      setLoading(false);
      return;
    }

    // Not yet complete - load next question
    setLoading(true);
    setIsTransitioning(true);

    // Small delay for UX, then fetch next question
    setTimeout(async () => {
      try {
        // Fetch next question with new variation
        const nextVariation = newStars + 1;
        const subjectParam = subjectId ? `&subjectId=${encodeURIComponent(subjectId)}` : '';
        const masteryParam = userData?.mastery ? `&mastery=${userData.mastery}` : ''
        const res = await authenticatedFetch(`/api/questions/generate?objectiveId=${objectiveId}&variation=${nextVariation}&useAI=false${subjectParam}${masteryParam}`);

        if (res.ok) {
          const data = await res.json();
          if (data.simulationSteps) {
            setSimulationSteps(data.simulationSteps);
            setObjectiveInfo(data.objective);
          }
        }
      } catch (err) {
        console.error('Error loading next question:', err);
      }

      // Reset UI state for new question
      setSelectedAnswer(null);
      setShowFeedback(false);
      setIsAnswerCorrect(null);
      setCurrentStep(0);
      setIsTransitioning(false);
      setLoading(false);
    }, 300);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <div className="text-center text-[var(--text-secondary)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)] mx-auto mb-4"></div>
          <p className="text-xl font-bold">Retrieving question...</p>
          <p className="text-sm opacity-80 mt-2">
            Accessing local learning database
          </p>
        </div>
      </div>
    )
  }

  if (error && simulationSteps.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <BrightLayer variant="elevated" className="text-center max-w-md">
          <BrightHeading level={2} className="mb-4 text-red-500">
            {error}
          </BrightHeading>
          <Link href="/learn" className="block w-full">
            <BrightButton variant="primary" className="w-full">
              Go to Learning Path
            </BrightButton>
          </Link>
        </BrightLayer>
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4 relative overflow-hidden">
        {/* Confetti Background */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--brand-accent)_0%,_transparent_70%)]" />

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <BrightLayer variant="glass" padding="lg" className="max-w-2xl w-full text-center relative z-10 border-[var(--brand-accent)] border-2">
            {/* OWL MASCOT */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="absolute -top-20 left-1/2 transform -translate-x-1/2"
            >
              <div className="w-40 h-40 bg-[var(--bg-primary)] rounded-full p-2 shadow-xl flex items-center justify-center border-4 border-[var(--brand-accent)]">
                <span className="text-7xl">🦉</span>
              </div>
            </motion.div>

            <div className="mt-16">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.4 }}
                className="text-8xl mb-4"
              >
                🎉
              </motion.div>

              <BrightHeading level={1} className="mb-2">
                Objective Completed!
              </BrightHeading>

              <p className="text-xl text-[var(--text-secondary)] mb-8 font-medium">
                &quot;Hoo-ray! You&apos;ve mastered key concepts in {objectiveInfo?.subject || 'this subject'}. Keep flying high!&quot;
              </p>

              <BrightLayer variant="elevated" className="mb-8 border border-[var(--brand-accent)]/50 bg-[var(--brand-accent)]/10">
                <div className="text-4xl font-mono font-black text-[var(--brand-accent)] mb-1">+100 XP</div>
                <div className="text-[var(--text-secondary)] font-bold text-sm uppercase tracking-widest">Map Point Unlocked! 🗺️</div>
              </BrightLayer>

              <Link href="/learn?animation=unlock">
                <BrightButton size="lg" variant="primary" className="w-full shadow-lg hover:shadow-xl transform hover:scale-105">
                  Return to Map & Unlock 🔓
                </BrightButton>
              </Link>
            </div>
          </BrightLayer>
        </motion.div>
      </div>
    )
  }

  if (!step) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
        <BrightLayer variant="glass" className="text-center">
          <p className="text-[var(--text-secondary)] mb-4">No question available. Please select an objective from your learning path.</p>
          <Link href="/learn">
            <BrightButton variant="outline">Go to Learning Path</BrightButton>
          </Link>
        </BrightLayer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-hidden flex flex-col">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--brand-primary)]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[var(--brand-secondary)]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10 w-full flex-1 flex flex-col">
        {/* Progress Header */}
        <BrightLayer variant="glass" padding="sm" className="mb-6 flex justify-between items-center sticky top-4 z-50 backdrop-blur-xl">
          <div className="flex items-center gap-4">
            <Link href="/learn" className="text-[var(--text-muted)] hover:text-[var(--brand-primary)] transition-colors">
              ← Exit
            </Link>
            <div className="h-6 w-px bg-[var(--border-subtle)]" />
            <span className="text-[var(--text-secondary)] font-bold text-sm">
              Step {currentStep + 1} of {simulationSteps.length}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Stars */}
            <div className="flex gap-2">
              {[...Array(3)].map((_, i) => (
                <motion.span
                  key={i}
                  animate={i === earnedStars && starJustEarned ? {
                    scale: [1, 1.5, 1.2],
                    rotate: [0, 15, -15, 0]
                  } : {}}
                  className={`text-2xl transition-all ${i < earnedStars
                    ? 'text-[var(--brand-accent)] drop-shadow-sm'
                    : 'text-[var(--text-muted)] opacity-20'
                    }`}
                >
                  ★
                </motion.span>
              ))}
            </div>

            {/* NABLE Streak Indicator */}
            {nableResponse && nableResponse.currentStreak > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-1 bg-[var(--brand-accent)]/20 border border-[var(--brand-accent)]/30 rounded-full"
              >
                <span className="text-sm">🔥</span>
                <span className="text-xs font-black text-[var(--brand-accent)]">{nableResponse.currentStreak}</span>
              </motion.div>
            )}

            {/* NABLE UI Mood Badge */}
            {nableResponse && (
              <span className={`px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-full ${nableResponse.recommendedUIMood === 'Celebratory' ? 'bg-[var(--state-success)]/20 text-[var(--state-success)]' :
                nableResponse.recommendedUIMood === 'Challenging' ? 'bg-[var(--brand-primary)]/20 text-[var(--brand-primary)]' :
                  nableResponse.recommendedUIMood === 'Supportive' ? 'bg-[var(--brand-secondary)]/20 text-[var(--brand-secondary)]' :
                    'bg-[var(--brand-accent)]/20 text-[var(--brand-accent)]'
                }`}>
                {nableResponse.recommendedUIMood}
              </span>
            )}
          </div>
        </BrightLayer>

        {/* Main Interaction Area */}
        <div className="grid md:grid-cols-3 gap-6 flex-1">
          <div className="md:col-span-2 flex flex-col">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="flex-1"
              >
                <BrightLayer variant="elevated" padding="lg" className="min-h-[400px] h-full relative overflow-hidden flex flex-col justify-center">

                  {/* Story Element Tag */}
                  {step.storyElement && (
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 bg-[var(--bg-secondary)] border border-[var(--border-subtle)] text-[var(--brand-primary)] text-xs font-black uppercase tracking-widest rounded-full">
                        {step.storyElement}
                      </span>
                    </div>
                  )}

                  {step.type === 'decision' && (
                    <>
                      <div className="mb-6">
                        <span className="inline-block px-3 py-1 bg-[var(--brand-secondary)] text-white text-xs font-bold uppercase tracking-widest rounded-md mb-4">
                          Decision Point
                        </span>
                        <BrightHeading level={2} className="leading-tight">
                          {step.content}
                        </BrightHeading>
                      </div>

                      {/* Math Diagram Support */}
                      {step.interactiveData?.diagramType && (
                        <div className="mb-6 p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]">
                          <MathDiagram
                            type={step.interactiveData.diagramType}
                            data={step.interactiveData.diagramData}
                          />
                        </div>
                      )}

                      {/* Question Content */}
                      {step.questionType === 'drag-drop' && step.interactiveData?.items && step.interactiveData?.correctOrder ? (
                        <DragDropQuestion
                          question={step.content}
                          items={step.interactiveData.items}
                          correctOrder={step.interactiveData.correctOrder}
                          onComplete={(isCorrect: boolean) => {
                            setSelectedAnswer(isCorrect ? 1 : 0)
                            setShowFeedback(true)
                            setTimeout(() => { if (currentStep < simulationSteps.length - 1) nextStep() }, 2000)
                          }}
                        />
                      ) : step.questionType === 'formula-builder' && step.interactiveData?.formulaParts && step.interactiveData?.correctFormula ? (
                        <FormulaBuilder
                          question={step.content}
                          parts={step.interactiveData.formulaParts}
                          correctFormula={step.interactiveData.correctFormula}
                          onComplete={(isCorrect: boolean) => {
                            setSelectedAnswer(isCorrect ? 1 : 0)
                            setShowFeedback(true)
                            setTimeout(() => { if (currentStep < simulationSteps.length - 1) nextStep() }, 2000)
                          }}
                        />
                      ) : (
                        <div className="space-y-3">
                          {step.options?.map((option: string, index: number) => {
                            const isSelected = selectedAnswer === index
                            const isCorrect = index === step.correctAnswer

                            return (
                              <button
                                key={index}
                                onClick={() => handleAnswer(index)}
                                disabled={showFeedback}
                                className={`
                                  w-full px-6 py-4 rounded-xl font-bold text-left transition-all border-2
                                  ${showFeedback
                                    ? isCorrect
                                      ? 'bg-[var(--state-success)] border-[var(--state-success)] text-white shadow-md'
                                      : isSelected
                                        ? 'bg-[var(--state-error)] border-[var(--state-error)] text-white shadow-md'
                                        : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)] opacity-50'
                                    : 'bg-[var(--bg-primary)] border-[var(--border-subtle)] hover:border-[var(--brand-primary)] hover:shadow-lg active:scale-[0.98]'
                                  }
                                `}
                              >
                                <div className="flex items-center justify-between">
                                  <span>{option}</span>
                                  {showFeedback && isCorrect && <span>✅</span>}
                                  {showFeedback && isSelected && !isCorrect && <span>❌</span>}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}

                  {/* Feedback Section */}
                  <AnimatePresence>
                    {showFeedback && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-6"
                      >
                        <BrightLayer variant="glass" className={`border-l-4 ${selectedAnswer === step.correctAnswer ? 'border-[var(--state-success)] bg-green-500/10' : 'border-[var(--state-error)] bg-red-500/10'}`}>
                          <div className="flex gap-3">
                            <div className="text-2xl">
                              {selectedAnswer === step.correctAnswer ? '🎉' : '💡'}
                            </div>
                            <div>
                              <p className="font-bold text-[var(--text-primary)]">
                                {selectedAnswer === step.correctAnswer ? 'Correct!' : 'Not quite right.'}
                              </p>
                              {selectedAnswer !== step.correctAnswer && !showHint && (
                                <button
                                  onClick={() => setShowHint(true)}
                                  className="text-sm text-[var(--brand-primary)] font-black hover:underline mt-1 uppercase tracking-wider"
                                >
                                  Show Hint
                                </button>
                              )}
                              {/* NABLE Mastery Feedback */}
                              {selectedAnswer === step.correctAnswer && nableResponse?.masteryDelta && objectiveId && nableResponse.masteryDelta[objectiveId] > 0 && (
                                <motion.div
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  className="mt-2 inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border border-emerald-500/20"
                                >
                                  <span>📈</span>
                                  <span>Mastery +{Math.round(nableResponse.masteryDelta[objectiveId] * 100)}%</span>
                                </motion.div>
                              )}
                            </div>
                          </div>
                        </BrightLayer>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Hint Section */}
                  <AnimatePresence>
                    {showHint && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-4 p-4 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-subtle)]"
                      >
                        <p className="text-sm text-[var(--text-secondary)] font-medium">
                          <span className="font-black text-[var(--brand-primary)] uppercase mr-2">Hint:</span>
                          {hintContent || "Think about the core concepts discussed in the learning objective."}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* NABLE Micro-Lesson (for conceptual errors) */}
                  <AnimatePresence>
                    {showMicroLesson && nableResponse?.microLesson && (
                      <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="mt-6 p-6 bg-gradient-to-br from-[var(--brand-primary)]/10 to-[var(--brand-secondary)]/10 rounded-2xl border-2 border-[var(--brand-primary)]/30"
                      >
                        <div className="flex items-start gap-4">
                          <div className="text-4xl">📚</div>
                          <div className="flex-1">
                            <p className="text-[10px] font-black text-[var(--brand-primary)] uppercase tracking-[0.2em] mb-2">
                              Quick Concept Review
                            </p>
                            <h4 className="text-lg font-black text-[var(--text-primary)] mb-3">
                              {nableResponse.microLesson.title}
                            </h4>
                            <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
                              {nableResponse.microLesson.content}
                            </p>
                            {nableResponse.microLesson.examples && nableResponse.microLesson.examples.length > 0 && (
                              <div className="space-y-2">
                                <p className="text-xs font-bold text-[var(--text-muted)] uppercase">Examples:</p>
                                {nableResponse.microLesson.examples.map((example, i) => (
                                  <div key={i} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                                    <span className="text-[var(--brand-accent)]">→</span>
                                    <span>{example}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setShowMicroLesson(false)}
                          className="mt-4 w-full py-2 text-sm font-bold text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/10 rounded-lg transition-colors"
                        >
                          Got it! Continue →
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Non-Decision Logic (Explanation, Outcome) */}
                  {step.type !== 'decision' && (
                    <div className="text-center py-8">
                      <div className="text-6xl mb-6 animate-bounce">
                        {step.type === 'outcome' ? (isAnswerCorrect ? '🌟' : '📚') : '💡'}
                      </div>
                      <BrightHeading level={2} className="mb-4">
                        {step.type === 'outcome' ? (isAnswerCorrect ? 'Great Result!' : 'Learning Frequency') : 'Insight'}
                      </BrightHeading>
                      <p className="text-xl text-[var(--text-secondary)] mb-8 leading-relaxed">
                        {step.content}
                      </p>
                      <BrightButton size="lg" onClick={currentStep < simulationSteps.length - 1 ? nextStep : handleComplete}>
                        {currentStep < simulationSteps.length - 1 ? 'Continue Journey →' : 'Complete Objective'}
                      </BrightButton>
                    </div>
                  )}

                </BrightLayer>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="hidden md:block">
            {/* Sidebar content could go here or be removed */}
          </div>
        </div>
      </div>
    </div>
  )
}
