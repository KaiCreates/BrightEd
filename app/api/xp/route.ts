import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-server';

interface XPUpdate {
  objectiveId: string;
  xpEarned: number;
  reason: string;
}

// XP calculation based on performance
function calculateXP(correct: boolean, difficulty: number, timeSpent: number): number {
  let baseXP = 0;

  if (correct) {
    // Base XP for correct answer
    baseXP = 50;

    // Difficulty bonus
    baseXP += difficulty * 10;

    // Time bonus (faster = more XP, but capped)
    if (timeSpent < 60) {
      baseXP += 20; // Quick and correct
    } else if (timeSpent < 120) {
      baseXP += 10;
    }
  } else {
    // Partial XP for incorrect (learning still happened)
    baseXP = 25;
    baseXP += difficulty * 5;
  }

  return Math.round(baseXP);
}

export async function POST(request: NextRequest) {
  try {
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.uid;

    const body: XPUpdate = await request.json();
    const { objectiveId, xpEarned, reason } = body;

    // In production, this would update database
    // For now, return the XP calculation
    return NextResponse.json({
      userId,
      objectiveId,
      xpEarned,
      reason,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error updating XP:', error);
    return NextResponse.json(
      { error: 'Failed to update XP' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.uid;

    // In production, fetch from database
    // For now, calculate from localStorage data
    return NextResponse.json({
      userId,
      totalXP: 0, // Would calculate from user's progress
      message: 'XP is tracked per completion'
    });
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Failed to get XP' },
      { status: 500 }
    );
  }
}

