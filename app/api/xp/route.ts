import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-server';
import { z } from 'zod';
import { rateLimit, handleRateLimit } from '@/lib/rate-limit';

// Request validation schemas
const XPUpdateSchema = z.object({
  objectiveId: z.string().min(1, 'Objective ID is required'),
  xpEarned: z.number().min(0, 'XP earned must be non-negative'),
  reason: z.string().min(1, 'Reason is required').max(100, 'Reason must be 100 characters or less')
});

const XPQuerySchema = z.object({
  userId: z.string().optional()
});

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
    const limiter = rateLimit(request, 30, 60000, 'xp:POST');
    if (!limiter.success) return handleRateLimit(limiter.retryAfter!);

    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.uid;

    const body = await request.json();
    const result = XPUpdateSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ 
        error: 'Invalid request data', 
        details: result.error.format() 
      }, { status: 400 });
    }

    const { objectiveId, xpEarned, reason } = result.data;

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
    const limiter = rateLimit(request, 60, 60000, 'xp:GET');
    if (!limiter.success) return handleRateLimit(limiter.retryAfter!);

    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.uid;

    // Validate query parameters
    const { searchParams } = new URL(request.url);
    const queryResult = XPQuerySchema.safeParse({
      userId: searchParams.get('userId') || undefined
    });

    if (!queryResult.success) {
      return NextResponse.json({ 
        error: 'Invalid query parameters', 
        details: queryResult.error.format() 
      }, { status: 400 });
    }

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

