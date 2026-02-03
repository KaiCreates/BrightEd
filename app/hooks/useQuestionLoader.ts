import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { UserData } from '@/lib/auth-context'
import { NABLEState, createInitialState, loadState } from '@/lib/nable'

interface UseQuestionLoaderProps {
    objectiveId: string | null
    subjectId: string | null
    user: any
    userData: UserData | null
    authLoading: boolean
    authenticatedFetch: (url: string, options?: RequestInit) => Promise<Response>
}

export function useQuestionLoader({
    objectiveId,
    subjectId,
    user,
    userData,
    authLoading,
    authenticatedFetch
}: UseQuestionLoaderProps) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [simulationSteps, setSimulationSteps] = useState<any[]>([])
    const [objectiveInfo, setObjectiveInfo] = useState<{ title: string; subject: string; difficulty?: number } | null>(null)
    const [questionVariation, setQuestionVariation] = useState(0)
    const [earnedStars, setEarnedStars] = useState(0)
    const [isComplete, setIsComplete] = useState(false)
    const [starJustEarned, setStarJustEarned] = useState(false)

    // NABLE State
    const [nableState, setNableState] = useState<NABLEState | null>(null)

    // Prevent duplicate fetches from unstable dependencies
    const hasFetched = useRef(false)
    const fetchKey = useRef<string | null>(null)

    useEffect(() => {
        // Create a unique key for this fetch based on stable params
        const currentFetchKey = `${objectiveId}-${subjectId}-${user?.uid}`

        // Skip if we've already fetched for this exact configuration
        if (hasFetched.current && fetchKey.current === currentFetchKey) {
            return
        }

        let cancelled = false;

        async function loadQuestion() {
            // 1. Validation - Fail Fast
            if (!objectiveId || !subjectId) {
                setError('Please go to the Learning Path to begin your work.')
                setLoading(false)
                return
            }

            if (authLoading) return
            if (!user) {
                // Handled by auth protection wrapper usually, but safe guard
                return
            }

            try {
                setLoading(true)
                setError(null)
                setStarJustEarned(false)

                // 2. Load NABLE State via Secure API (Production Fortress)
                const [progressRes, nableStatusRes] = await Promise.all([
                    authenticatedFetch(`/api/progress?userId=${user.uid}`),
                    authenticatedFetch(`/api/nable/status`)
                ]);

                if (cancelled) return;

                // Process NABLE Status
                if (!nableStatusRes.ok) throw new Error('Failed to load NABLE status');
                const nableData = await nableStatusRes.json();

                // We recreate the state structure from the API response for the frontend
                // This keeps the UI working without exposing the full engine logic
                setNableState({
                    userId: user.uid,
                    knowledgeGraph: nableData.skills.details.reduce((acc: any, skill: any) => {
                        acc[skill.id] = {
                            mastery: skill.mastery / 100,
                            confidence: skill.confidence / 100,
                            streakCount: skill.streak,
                            lastTested: skill.lastTested
                        };
                        return acc;
                    }, {}),
                    sessionQuestions: [],
                    currentStreak: nableData.session.currentStreak,
                    consecutiveErrors: nableData.session.consecutiveErrors,
                    lastDifficulty: 5,
                    lastDistractorSimilarity: 0.5,
                    recentTopicIds: [],
                    personalStabilityFactor: 1.0,
                    hearts: 5,
                    sessionStarted: nableData.session.sessionStarted
                } as any);

                // Process Progress
                const progressData = progressRes.ok ? await progressRes.json() : { progress: {} };
                const existingProgress = progressData.progress && progressData.progress[objectiveId!];
                const serverStars = existingProgress?.stars ?? 0;

                // Update local star state from server
                setEarnedStars(serverStars);

                // If already completed (3 stars), redirect to path or allow practice
                if (serverStars >= 3) {
                    setIsComplete(true);
                    setLoading(false);
                    return;
                }

                // Determine which question variation to fetch (star + 1)
                const targetVariation = serverStars + 1;
                setQuestionVariation(targetVariation);

                // Fetch question with mastery for adaptive difficulty
                const subjectParam = subjectId ? `&subjectId=${encodeURIComponent(subjectId)}` : ''
                const masteryParam = userData?.mastery ? `&mastery=${userData.mastery}` : ''

                // Pass real-time NABLE stats for immediate difficulty adaptation
                // Use nableData directly to avoid React state update delay
                const streak = nableData?.session?.currentStreak || 0;
                const errors = nableData?.session?.consecutiveErrors || 0;
                const res = await authenticatedFetch(`/api/questions/generate?objectiveId=${objectiveId}&variation=${targetVariation}&useAI=true${subjectParam}${masteryParam}&streak=${streak}&errors=${errors}`)
                if (cancelled) return;

                if (!res.ok) throw new Error('Failed to load question')

                const data = await res.json()
                if (data.simulationSteps) {
                    setSimulationSteps(data.simulationSteps)
                    setObjectiveInfo(data.objective)
                    // Mark as fetched to prevent duplicate requests
                    hasFetched.current = true
                    fetchKey.current = currentFetchKey
                } else {
                    throw new Error('No steps returned')
                }
            } catch (err) {
                if (cancelled) return;
                console.error(err)
                setError('Failed to load question.')
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }
        loadQuestion()

        return () => { cancelled = true; }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [objectiveId, subjectId, user?.uid, authLoading])

    return {
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
        nableState,
        setNableState
    }
}
