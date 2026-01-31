'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Image from 'next/image'
import DragDropQuestion from '@/app/components/DragDropQuestion'
import FormulaBuilder from '@/app/components/FormulaBuilder'
import MathDiagram from '@/app/components/MathDiagram'
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system'
import { useAuth } from '@/lib/auth-context'
import { useQuestionLoader } from '@/app/hooks/useQuestionLoader'
import { ScenarioBrief, DecisionCard, DuoSessionLayout, DuoActionBar, DuoMascotBubble } from '@/components/simulation'
import { StreakCelebration } from '@/components/learning'
import { getProfessorBrightFeedback, FeedbackResponse } from '@/lib/professor-bright'

interface SimulationStep {
  id: number
  type: 'decision' | 'outcome' | 'explanation' | 'reflection'
  content: string
  options?: string[]
  correctAnswer?: number
  subSkills?: string[]
  questionDifficulty?: number
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
  const objectiveId = searchParams?.get('objective') || searchParams?.get('objectiveId') || null
  const subjectId = searchParams?.get('subject') || searchParams?.get('subjectId') || null
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
    lastDifficulty?: number; // Added for UI difficulty indicator
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

  // Professor Bright feedback and streak celebration
  const [showStreakCelebration, setShowStreakCelebration] = useState(false)
  const [professorFeedback, setProfessorFeedback] = useState<FeedbackResponse | null>(null)
  const previousStreakRef = useRef<number>(0)

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
          errorClassification: nableData.errorClassification,
          microLessonRequired: nableData.microLessonRequired,
          microLesson: nableData.microLesson,
          confidence: nableData.confidence,
          blockedProgression: nableData.blockedProgression,
          currentStreak: nableData.currentStreak || 0,
          masteryDelta: nableData.masteryDelta || {}
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

        // Trigger streak celebration on milestones (5, 10, 15, 20)
        const isMilestone = [5, 10, 15, 20].includes(currentStreak)
        const wasNotAtMilestone = ![5, 10, 15, 20].includes(previousStreakRef.current)
        if (isCorrect && isMilestone && wasNotAtMilestone) {
          setShowStreakCelebration(true)
        }
        previousStreakRef.current = currentStreak

        // Show micro-lesson if needed (conceptual error)
        if (nableData.microLessonRequired && nableData.microLesson) {
          setShowMicroLesson(true)
        }
      }
    } catch (err) {
      // Fallback: Generate feedback without NABLE data
      const feedback = getProfessorBrightFeedback(isCorrect, null, 0, 0.5, timeToAnswer)
      setProfessorFeedback(feedback)
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
          content: `You selected "${step.options?.[answerIndex]}". That's not quite right. The correct answer is "${step.options?.[step.correctAnswer || 0]}". Let's learn why.`,
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

    // Stars/progress are persisted by the server during answer evaluation.
    // We only advance the flow here.
    if (earnedStars >= 3) {
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
        const nextVariation = earnedStars + 1;
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
      <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <h1 className="text-4xl font-black text-[#ffc800] mb-8 uppercase tracking-wider drop-shadow-sm">
            Perfect Lesson!
          </h1>

          <div className="grid grid-cols-2 gap-4 mb-12">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="bg-[#ffc800] rounded-2xl p-6 border-b-4 border-[#e5a000]"
            >
              <div className="text-white font-black text-xs uppercase tracking-widest mb-1">Total XP</div>
              <div className="text-white font-black text-3xl">+100</div>
            </motion.div>

            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-[#1cb0f6] rounded-2xl p-6 border-b-4 border-[#1899d6]"
            >
              <div className="text-white font-black text-xs uppercase tracking-widest mb-1">Accuracy</div>
              <div className="text-white font-black text-3xl">100%</div>
            </motion.div>
          </div>

          <div className="mb-12">
            <div className="w-48 h-48 mx-auto relative mb-4">
              <div className="owl-sprite owl-happy" style={{ transform: 'scale(1.5)', transformOrigin: 'center' }} />
            </div>
            <p className="text-xl font-bold text-[var(--text-secondary)]">
              &quot;Hoo-ray! You&apos;ve mastered this objective with flying colors!&quot;
            </p>
          </div>

          <Link href="/learn?animation=unlock" className="block w-full">
            <button className="w-full py-4 rounded-2xl bg-[#58cc02] border-b-4 border-[#46a302] text-white font-black text-xl uppercase tracking-widest hover:bg-[#61e002] transition-colors">
              Continue
            </button>
          </Link>
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

  const isFallbackState = step?.type === 'explanation' && step?.content.includes('end of the available questions')

  return (
    <DuoSessionLayout
      currentStep={currentStep}
      totalSteps={simulationSteps.length}
      onClose={() => router.push('/learn')}
      footer={
        <DuoActionBar
          status={showFeedback ? (isAnswerCorrect ? 'correct' : 'wrong') : (selectedAnswer !== null ? 'selected' : 'idle')}
          onCheck={() => handleAnswer(selectedAnswer!)}
          onContinue={currentStep < simulationSteps.length - 1 ? nextStep : (isFallbackState ? () => router.push('/learn') : handleComplete)}
          feedbackTitle={isAnswerCorrect ? 'Excellent!' : 'Correct solution:'}
          feedbackMessage={isAnswerCorrect ? professorFeedback?.message : step.options?.[step.correctAnswer || 0]}
        />
      }
    >
      <div className="w-full py-8 md:py-12">
        {!isFallbackState && (
          <h1 className="text-2xl md:text-4xl font-black text-[var(--text-primary)] mb-10 text-center md:text-left transition-all duration-300">
            {step.type === 'decision' ? 'Select the correct answer' : 'Learning Moment'}
          </h1>
        )}

        <div className="flex flex-col items-center">
          <DuoMascotBubble
            content={step.content}
            emotion={isFallbackState ? 'owl-magic' : (professorFeedback?.spriteClass || 'owl-happy')}
          />

          {!isFallbackState ? (
            <div className="w-full max-w-2xl grid gap-4 mt-4">
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
          ) : (
            <div className="w-full max-w-sm mt-8">
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                whileTap={{ y: 2 }}
                onClick={() => router.push('/learn')}
                className="w-full py-5 rounded-2xl bg-[#58cc02] border-b-[6px] border-[#46a302] text-white font-black text-xl uppercase tracking-widest hover:bg-[#61e002] active:border-b-0 active:translate-y-[4px] shadow-lg shadow-green-500/20 transition-all font-black"
              >
                Back to Map
              </motion.button>
            </div>
          )}
        </div>
      </div>

      <StreakCelebration
        streak={nableResponse?.currentStreak || 0}
        show={showStreakCelebration}
        onClose={() => setShowStreakCelebration(false)}
      />
    </DuoSessionLayout>
  )
}
