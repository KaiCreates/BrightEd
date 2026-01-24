'use client'

import { useEffect } from 'react'

interface PrefetchOptions {
  objectiveIds: string[]
  subjectId?: string
  bufferSize?: number
}

import { useAuth } from '@/lib/auth-context'

export function useQuestionPrefetch({ objectiveIds, subjectId, bufferSize = 5 }: PrefetchOptions) {
  const { user } = useAuth()

  useEffect(() => {
    if (objectiveIds.length === 0 || !user) return

    // Prefetch questions for first few objectives
    const objectivesToPrefetch = objectiveIds.slice(0, bufferSize)

    const prefetchQuestions = async () => {
      const token = await user.getIdToken()
      const subjectParam = subjectId ? `&subjectId=${encodeURIComponent(subjectId)}` : ''

      const prefetchPromises = objectivesToPrefetch.map(async (objectiveId) => {
        try {
          // Prefetch variation 0 for each objective
          const res = await fetch(`/api/questions/generate?objectiveId=${objectiveId}&variation=0&useAI=false${subjectParam}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          })
          if (res.ok) {
            const data = await res.json()
            // Cache in localStorage
            const cacheKey = `question_${objectiveId}_0`
            localStorage.setItem(cacheKey, JSON.stringify({
              simulationSteps: data.simulationSteps,
              objective: data.objective,
              timestamp: Date.now()
            }))
          }
        } catch (err) {
          console.warn(`Failed to prefetch question for ${objectiveId}:`, err)
        }
      })

      await Promise.all(prefetchPromises)
    }

    // Delay prefetching to not block initial page load
    const timer = setTimeout(() => {
      prefetchQuestions()
    }, 2000)

    return () => clearTimeout(timer)
  }, [objectiveIds, subjectId, bufferSize, user])
}
