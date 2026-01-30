/**
 * Professor Bright - Personalized Learning Feedback System
 * 
 * Provides contextual, encouraging feedback based on:
 * - Answer correctness
 * - Error type (conceptual vs careless)
 * - Current streak
 * - Mastery level
 * - Time taken
 */

export interface FeedbackResponse {
  message: string
  emoji: string
  spriteClass: string // NEW: CSS class for sprite
  tone: 'celebratory' | 'encouraging' | 'supportive' | 'challenging'
  tip?: string
}

/**
 * Get personalized feedback from Professor Bright
 */
export const getProfessorBrightFeedback = (
  correct: boolean,
  errorType: 'conceptual' | 'careless' | null,
  streak: number,
  mastery: number = 0.5,
  timeToAnswer?: number
): FeedbackResponse => {

  // CORRECT ANSWERS
  if (correct) {
    // Milestone streaks
    if (streak >= 20) {
      return {
        message: "Hoo-ray! You're absolutely unstoppable! 20 in a row!",
        emoji: "🌟",
        spriteClass: "owl-magic",
        tone: 'celebratory',
        tip: "You're ready for the toughest challenges!"
      }
    }

    if (streak >= 10) {
      return {
        message: "Incredible! 10 perfect answers! You're in the zone!",
        emoji: "⚡",
        spriteClass: "owl-magic",
        tone: 'celebratory',
        tip: "This is exam-level performance!"
      }
    }

    if (streak >= 5) {
      return {
        message: "Hoo-ray! You're on fire! 5 in a row!",
        emoji: "🔥",
        spriteClass: "owl-happy",
        tone: 'celebratory',
        tip: "Keep this momentum going!"
      }
    }

    // High mastery
    if (mastery > 0.85) {
      return {
        message: "Excellent! You've truly mastered this concept!",
        emoji: "🎓",
        spriteClass: "owl-smart",
        tone: 'celebratory',
        tip: "Ready for Paper 2 level questions!"
      }
    }

    // Fast and correct
    if (timeToAnswer && timeToAnswer < 10) {
      return {
        message: "Lightning fast AND correct! Impressive!",
        emoji: "⚡",
        spriteClass: "owl-wink",
        tone: 'celebratory'
      }
    }

    // Standard correct
    const correctMessages = [
      "Great job! You got it!",
      "Exactly right! Well done!",
      "Perfect! You're getting the hang of this!",
      "Spot on! Keep it up!",
      "That's correct! Nice work!"
    ]

    return {
      message: correctMessages[Math.floor(Math.random() * correctMessages.length)],
      emoji: "✨",
      spriteClass: "owl-happy",
      tone: 'encouraging'
    }
  }

  // INCORRECT ANSWERS

  // Conceptual errors - need deeper understanding
  if (errorType === 'conceptual') {
    if (mastery < 0.3) {
      return {
        message: "Let's break this down together. This concept is tricky at first!",
        emoji: "📚",
        spriteClass: "owl-reading",
        tone: 'supportive',
        tip: "Take your time to review the explanation below"
      }
    }

    return {
      message: "Hmm, let's revisit this concept. You're close to understanding it!",
      emoji: "🤔",
      spriteClass: "owl-thinking",
      tone: 'supportive',
      tip: "Review the key principles and try again"
    }
  }

  // Careless errors - they know it but made a mistake
  if (errorType === 'careless') {
    if (streak > 0) {
      return {
        message: "Oops! That was close - you know this! Double-check your work.",
        emoji: "⚠️",
        spriteClass: "owl-shocked",
        tone: 'encouraging',
        tip: "Take a breath and read carefully"
      }
    }

    return {
      message: "Almost! You're on the right track, just be more careful.",
      emoji: "🎯",
      spriteClass: "owl-confused",
      tone: 'encouraging',
      tip: "Slow down and review each option"
    }
  }

  // General incorrect - no specific error type
  if (mastery < 0.3) {
    return {
      message: "No worries! Every expert was once a beginner. Let's learn together!",
      emoji: "🌱",
      spriteClass: "owl-studying",
      tone: 'supportive',
      tip: "Focus on understanding, not just memorizing"
    }
  }

  return {
    message: "Not quite, but you're learning! Every mistake is progress.",
    emoji: "💡",
    spriteClass: "owl-idea", // Or owl-thinking
    tone: 'supportive',
    tip: "Review the explanation and try a similar question"
  }
}

/**
 * Get encouragement for starting a session
 */
export const getSessionStartMessage = (
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night',
  streak: number,
  lastSessionDate?: string
): FeedbackResponse => {
  const greetings = {
    morning: "Good morning! Ready to brighten your mind?",
    afternoon: "Good afternoon! Let's keep that learning momentum!",
    evening: "Good evening! Perfect time for some focused practice!",
    night: "Burning the midnight oil? Let's make it count!"
  }

  // Check if returning after a break
  if (lastSessionDate) {
    const daysSince = Math.floor(
      (Date.now() - new Date(lastSessionDate).getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysSince > 7) {
      return {
        message: "Welcome back! Let's refresh your memory with a quick review.",
        emoji: "🔄",
        spriteClass: "owl-happy", // Welcoming
        tone: 'supportive',
        tip: "We'll start with concepts you've seen before"
      }
    }
  }

  // Streak-based greeting
  if (streak >= 7) {
    return {
      message: `${greetings[timeOfDay]} Your ${streak}-day streak is impressive!`,
      emoji: "🔥",
      spriteClass: "owl-magic",
      tone: 'celebratory'
    }
  }

  return {
    message: greetings[timeOfDay],
    emoji: "🦉",
    spriteClass: "owl-smart",
    tone: 'encouraging'
  }
}

/**
 * Get motivation for completing a session
 */
export const getSessionCompleteMessage = (
  questionsAnswered: number,
  correctCount: number,
  xpEarned: number
): FeedbackResponse => {
  const accuracy = (correctCount / questionsAnswered) * 100

  if (accuracy === 100) {
    return {
      message: `Perfect session! ${questionsAnswered}/${questionsAnswered} correct!`,
      emoji: "🏆",
      spriteClass: "owl-magic",
      tone: 'celebratory',
      tip: `You earned ${xpEarned} XP!`
    }
  }

  if (accuracy >= 80) {
    return {
      message: `Excellent work! ${correctCount}/${questionsAnswered} correct!`,
      emoji: "⭐",
      spriteClass: "owl-happy",
      tone: 'celebratory',
      tip: `You earned ${xpEarned} XP!`
    }
  }

  if (accuracy >= 60) {
    return {
      message: `Good effort! ${correctCount}/${questionsAnswered} correct. Keep practicing!`,
      emoji: "💪",
      spriteClass: "owl-wink",
      tone: 'encouraging',
      tip: `You earned ${xpEarned} XP!`
    }
  }

  return {
    message: `You completed ${questionsAnswered} questions! Every attempt builds understanding.`,
    emoji: "📈",
    spriteClass: "owl-studying", // Or relieved
    tone: 'supportive',
    tip: `You earned ${xpEarned} XP! Review the concepts and try again.`
  }
}

/**
 * Get time-of-day for contextual greetings
 */
export const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}
