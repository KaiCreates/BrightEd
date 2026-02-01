import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, setDoc, increment, serverTimestamp } from 'firebase/firestore';
import { calculateXPGain, getDayKey } from '@/lib/xp-utils';

interface TrainingUpdate {
  objectiveId: string;
  correct: boolean;
  timeSpent: number; // seconds
  attempts: number;
}

// XP Calculation Logic - Reduced values to encourage grinding
function calculateXP(correct: boolean, timeSpent: number, attemptCount: number): number {
  if (!correct) return 1; // Participation award (effort) (Reduced from 2)

  let baseXP = 8; // Reduced from 15

  // Speed bonus (if under 30s)
  if (timeSpent < 30) baseXP += 2; // Reduced from 5
  if (timeSpent < 10) baseXP += 2; // Reduced from 5

  // First try bonus
  if (attemptCount === 1) baseXP += 5; // Reduced from 10

  return baseXP;
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await verifyAuth(request);
    const uid = authUser.uid;

    const body: TrainingUpdate = await request.json();
    const { objectiveId, correct, timeSpent, attempts } = body;

    if (!objectiveId) {
      return NextResponse.json({ error: 'Objective ID is required' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const userRef = doc(db, 'users', uid);
    const progressRef = doc(db, 'users', uid, 'progress', objectiveId);

    // 1. Calculate XP Gained
    const xpGained = calculateXP(correct, timeSpent, attempts);

    // 2. Fetch current Objective Progress
    const progressSnap = await getDoc(progressRef);
    const currentData = progressSnap.exists() ? progressSnap.data() : {
      mastery: 0,
      attempts: 0,
      correctCount: 0,
      streak: 0
    };

    // 3. Update Objective Stats
    const newAttempts = (currentData.attempts || 0) + 1;
    const newCorrect = (currentData.correctCount || 0) + (correct ? 1 : 0);
    const currentStreak = correct ? (currentData.streak || 0) + 1 : 0; // Objective-specific streak

    // Simple mastery calculation: heavily weighted by recent streak
    let newMastery = (correct ? (currentData.mastery || 0) + 5 : (currentData.mastery || 0) - 2);
    newMastery = Math.min(100, Math.max(0, newMastery));

    // 4. Update Mastery Document
    await setDoc(progressRef, {
      objectiveId,
      mastery: newMastery,
      attempts: newAttempts,
      correctCount: newCorrect,
      streak: currentStreak,
      lastAttempt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    // 5. Update User Global Stats (XP, Daily Goal, User Streak)
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data() || {};
    const todayKey = getDayKey();

    // Check for global streak update (if daily goal crossed)
    const rawXpGained = calculateXP(correct, timeSpent, attempts);
    const { xpGain, isNewDay } = calculateXPGain(userData, rawXpGained, todayKey);
    const currentDailyXP = (isNewDay ? 0 : (userData?.xp_today || 0)) + xpGain;
    const dailyGoal = userData?.dailyGoal || 500;

    // Streak logic handled in daily reset, but we update XP here
    const updates: any = {
      xp: increment(xpGain),
      xp_today: isNewDay ? xpGain : increment(xpGain),
      lastLearningDay: todayKey,
      lastLearningAt: serverTimestamp(),
      lastActive: new Date().toISOString(),
      // Update local subject progress (denormalized for UI speed)
      [`subjectProgress.${objectiveId}`]: newMastery
    };

    await updateDoc(userRef, updates);

    return NextResponse.json({
      success: true,
      xpGained,
      newMastery,
      dailyProgress: {
        current: currentDailyXP,
        goal: dailyGoal,
        percent: Math.round((currentDailyXP / dailyGoal) * 100)
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
