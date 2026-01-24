import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-server';

interface TrainingUpdate {
  objectiveId: string;
  correct: boolean;
  timeSpent: number; // seconds
  attempts: number;
}
interface UserProgress {
  [objectiveId: string]: {
    mastery: number;
    attempts: number;
    lastAttempt: string;
    stability: number;
    totalTime: number;
    correctCount: number;
    incorrectCount: number;
  };
}

// Adaptive learning algorithm - updates mastery and stability
function calculateMastery(progress: UserProgress[string]): number {
  if (!progress) return 0;

  const totalAttempts = progress.attempts;
  if (totalAttempts === 0) return 0;

  const correctRate = progress.correctCount / totalAttempts;
  const baseMastery = correctRate * 100;

  // Adjust based on stability (consistency matters)
  const stabilityBonus = progress.stability * 0.2;

  // Penalize for too many attempts (indicates struggle)
  const attemptPenalty = totalAttempts > 5 ? (totalAttempts - 5) * 2 : 0;

  return Math.min(100, Math.max(0, baseMastery + stabilityBonus - attemptPenalty));
}

function calculateStability(progress: UserProgress[string]): number {
  if (!progress || progress.attempts < 2) return 0;

  // Stability is based on consistency of correct answers
  const recentCorrectRate = progress.correctCount / progress.attempts;

  // If last few attempts were correct, stability increases
  const consistency = recentCorrectRate;

  // More attempts with consistent results = higher stability
  const attemptBonus = Math.min(progress.attempts * 5, 30);

  return Math.min(100, consistency * 70 + attemptBonus);
}
export async function POST(request: NextRequest) {
  try {
    await verifyAuth(request);

    const body: TrainingUpdate = await request.json();
    const { objectiveId, correct, timeSpent, attempts } = body;

    if (!objectiveId) {
      return NextResponse.json({ error: 'Objective ID is required' }, { status: 400 });
    }

    // In production, this would fetch from database
    // For now, we calculate and return the updated progress
    // The frontend will save it to localStorage

    // Get existing progress (would come from database)
    const existingProgress: UserProgress[string] = {
      mastery: 0,
      attempts: attempts || 1,
      lastAttempt: new Date().toISOString(),
      stability: 0,
      totalTime: timeSpent || 0,
      correctCount: correct ? 1 : 0,
      incorrectCount: correct ? 0 : 1,
    };

    // Update progress
    existingProgress.mastery = calculateMastery(existingProgress);
    existingProgress.stability = calculateStability(existingProgress);

    return NextResponse.json({
      objectiveId,
      updatedProgress: existingProgress,
      recommendations: {
        shouldReview: existingProgress.mastery < 70,
        shouldAdvance: existingProgress.mastery >= 85 && existingProgress.stability >= 70,
        nextDifficulty: existingProgress.mastery >= 90 ? 'increase' : 'maintain'
      }
    });
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error updating training:', error);
    return NextResponse.json(
      { error: 'Failed to update training' },
      { status: 500 }
    );
  }
}
