import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth-server';
import { rateLimit, handleRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const limiter = rateLimit(request, 60, 60000, 'user:stats:GET');
    if (!limiter.success) return handleRateLimit(limiter.retryAfter!);

    const decodedToken = await verifyAuth(request);
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || decodedToken.uid;

    // Users can only view their own stats unless they're an admin
    if (userId !== decodedToken.uid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const userDoc = await adminDb.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data = userDoc.data() || {};

    return NextResponse.json({
      stats: {
        xp_total: data.xp || 0,
        b_coins_balance: data.bCoins || 0,
        streak_count: data.streak || 0,
        mastery_score: data.mastery || 0.1,
        questions_correct: data.questionsCorrect || 0,
        questions_wrong: data.questionsWrong || 0
      }
    });
  } catch (error: any) {
    if ((error as any).name === 'AuthError' || error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
